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
import { groupStopsIntoVariants } from './routeVariants';

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

        // route-variants is an exact-match lookup. The fuzzy search endpoint
        // cannot resolve a route number: it matches substrings, caps at 50
        // rows and has no ordering, so the wanted route may not come back.
        const meta = await api.getBusRouteVariants(routeId, companyParam);
        const resolvedCompany = companyParam || meta[0]?.company;

        // Filtering by company matters: without it a shared route number
        // returns both operators' stops interleaved.
        const routeStops = await api.getBusRouteStops(routeId, {
          company: resolvedCompany,
        });

        // Reaching here means the backend answered; empty results therefore
        // mean the route genuinely does not exist. A request that failed
        // throws instead, and is reported as an error below rather than being
        // shown to the user as a missing route.
        if (meta.length === 0 && routeStops.length === 0) {
          setError('Route not found');
          return;
        }

        // A handful of routes are listed by the operator but published with no
        // stop sequence at all. Saying "not found" would be wrong — the route
        // exists, its stops just are not available.
        if (routeStops.length === 0) {
          setError('This route has no stop information available.');
          return;
        }

        setVariantMeta(meta);
        setStops(routeStops);
      } catch (err) {
        setError('Could not reach the server. Please try again.');
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

  const variants = useMemo(
    () => groupStopsIntoVariants(stops, variantMeta),
    [stops, variantMeta]
  );

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
