import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '../../header/Header';
import { BusRoute, RouteStop } from '../../../types';
import { api } from '../../../services/api';
import { useThemeStyles } from '../../../hooks/useThemeStyles';
import { BusRouteStopCard } from './BusRouteStopCard';
import { BusCompanyIcon } from './BusCompanyIcon';
import { RouteMapCard, convertBusRouteStopsToMapStops } from '../RouteMapCard';
import { MainNavigation } from '../MainNavigation';
import { RouteCodeIcon } from '../RouteCodeIcon';

// One travelling direction of a route. KMB models these as (direction,
// service_type) pairs — outbound/inbound plus extra service types for special
// departures — and each has its own ordered stop sequence.
interface RouteVariant {
  key: string;
  direction: string;
  serviceType: string;
  stops: RouteStop[];
  origEn: string;
  origTc: string;
  destEn: string;
  destTc: string;
}

// Outbound first, then inbound, then anything else.
const directionRank = (direction: string): number => {
  if (direction === 'O') return 0;
  if (direction === 'I') return 1;
  return 2;
};

export const BusRouteDetails: React.FC = () => {
  const { routeId } = useParams<{ routeId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // `company` disambiguates route numbers served by more than one operator
  // (both KMB and Citybus run a route "1"). It travels in the URL so a refresh
  // or shared link resolves to the same route.
  const companyParam = searchParams.get('company') || undefined;

  const [variantMeta, setVariantMeta] = useState<BusRoute[]>([]);
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const {
    getBackgroundClass,
    getCardClass,
    getTextClass,
    getGrayTextClass,
    getSecondaryTextClass,
  } = useThemeStyles();

  useEffect(() => {
    const fetchRoute = async () => {
      if (!routeId) {
        setError('Route ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setSelectedKey(null);

        // route-variants is an exact-match lookup; the fuzzy search endpoint
        // cannot resolve a route number (it matches substrings and caps at 50
        // rows, so e.g. "3" never returned the route itself).
        const meta = await api.getBusRouteVariants(routeId, companyParam);
        const resolvedCompany = companyParam || meta[0]?.company;

        // Filtering by company matters: without it a shared route number
        // returns both operators' stops interleaved.
        const routeStops = await api.getBusRouteStops(routeId, {
          company: resolvedCompany,
        });

        if (meta.length === 0 && routeStops.length === 0) {
          setError('Route not found');
          return;
        }

        setVariantMeta(meta);
        setStops(routeStops);
      } catch (err) {
        setError('Failed to load route');
        console.error('Error fetching route:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRoute();
  }, [routeId, companyParam]);

  const company = useMemo(
    () => companyParam || variantMeta[0]?.company || stops[0]?.company || '',
    [companyParam, variantMeta, stops]
  );

  const variants = useMemo<RouteVariant[]>(() => {
    // Group by the stop data rather than the route rows: it is the only
    // source that always carries a direction (Citybus route rows do not).
    const grouped = new Map<string, RouteStop[]>();
    for (const stop of stops) {
      const key = `${stop.direction}|${stop.service_type}`;
      const bucket = grouped.get(key);
      if (bucket) {
        bucket.push(stop);
      } else {
        grouped.set(key, [stop]);
      }
    }

    return Array.from(grouped.entries())
      .map(([key, group]) => {
        const ordered = [...group].sort((a, b) => parseInt(a.seq) - parseInt(b.seq));
        const [direction, serviceType] = key.split('|');

        // Prefer the operator's own origin/destination naming, falling back to
        // the first and last stop of the sequence.
        const meta = variantMeta.find(
          (r) => r.direction === direction && r.service_type === serviceType
        );
        const first = ordered[0];
        const last = ordered[ordered.length - 1];

        return {
          key,
          direction,
          serviceType,
          stops: ordered,
          origEn: meta?.orig_en || first?.name_en || '',
          origTc: meta?.orig_tc || first?.name_tc || '',
          destEn: meta?.dest_en || last?.name_en || '',
          destTc: meta?.dest_tc || last?.name_tc || '',
        };
      })
      .sort(
        (a, b) =>
          directionRank(a.direction) - directionRank(b.direction) ||
          a.serviceType.localeCompare(b.serviceType)
      );
  }, [stops, variantMeta]);

  const selected = useMemo(
    () => variants.find((v) => v.key === selectedKey) || variants[0] || null,
    [variants, selectedKey]
  );

  if (loading) {
    return (
      <div className={`min-h-screen transition-colors duration-300 ${getBackgroundClass()}`}>
        <Header />
        <div className="text-center">
          <p className={`text-lg ${getTextClass()}`}>Loading route details...</p>
        </div>
      </div>
    );
  }

  if (error || !selected) {
    return (
      <div className={`min-h-screen transition-colors duration-300 ${getBackgroundClass()}`}>
        <Header />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className={`text-lg text-red-500 mb-4`}>{error || 'Route not found'}</p>
            <button
              onClick={() => navigate('/')}
              className={`px-4 py-2 rounded-lg transition-colors duration-300 bg-blue-500 text-white hover:bg-blue-600`}
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${getBackgroundClass()}`}>
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Main Navigation */}
        <MainNavigation currentType="bus-route" />

        {/* Route Header */}
        <div className={`rounded-lg shadow-md p-6 mb-6 transition-colors duration-300 ${getCardClass()}`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-4">
                <RouteCodeIcon routeCode={routeId || ''} type={company as 'KMB' | 'CTB'} size="lg" />
                <div>
                  <h1 className={`text-3xl font-bold mb-2 transition-colors duration-300 ${getTextClass()}`}>
                    <BusCompanyIcon company={company} />
                  </h1>
                  <h2 className={`text-xl mb-2 transition-colors duration-300 ${getGrayTextClass()}`}>
                    {selected.origEn} → {selected.destEn}
                  </h2>
                  <p className={`text-lg transition-colors duration-300 ${getGrayTextClass()}`}>
                    {selected.origTc} → {selected.destTc}
                  </p>
                </div>
              </div>

              {/* Direction switcher — one button per direction, plus extra
                  entries for routes that run special service types. */}
              {variants.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {variants.map((variant) => {
                    const isActive = variant.key === selected.key;
                    return (
                      <button
                        key={variant.key}
                        onClick={() => setSelectedKey(variant.key)}
                        className={`px-4 py-2 rounded-lg text-sm transition-colors duration-300 ${
                          isActive
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        往 {variant.destTc || variant.destEn}
                        {variant.serviceType && variant.serviceType !== '1' && (
                          <span className="ml-1 opacity-75">(特別班 {variant.serviceType})</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Two-column layout: Route Stops and Map */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Route Stops - Left Column */}
          <div className={`rounded-lg shadow-md p-6 transition-colors duration-300 ${getCardClass()}`}>
            <h3 className={`text-lg font-semibold mb-3 ${getGrayTextClass()}`}>
              途經巴士站 Route Stops ({selected.stops.length})
            </h3>
            {selected.stops.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {selected.stops.map((routeStop) => (
                  <BusRouteStopCard
                    key={`${routeStop.direction}-${routeStop.service_type}-${routeStop.seq}-${routeStop.stop}`}
                    shouldBusCompanyIcon={false}
                    routeStop={routeStop}
                    onClick={() => navigate(`/bus/stop/${routeStop.stop}`)}
                  />
                ))}
              </div>
            ) : (
              <p className={`text-sm ${getSecondaryTextClass()}`}>No stops data available</p>
            )}
          </div>

          {/* Route Map - Right Column */}
          <div className="lg:sticky lg:top-6 lg:h-fit">
            {selected.stops.length > 0 && (
              <RouteMapCard routeStops={convertBusRouteStopsToMapStops(selected.stops)} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
