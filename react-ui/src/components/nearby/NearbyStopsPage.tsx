import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemeStyles } from '../../hooks/useThemeStyles';
import { Header } from '../header/Header';
import { MainNavigation } from '../transport/MainNavigation';
import { api, NearbyStop, NearbyStops } from '../../services/api';
import { HttpError } from '../../services/http';
import { NearbyStopsMap } from './NearbyStopsMap';

// The radii the backend accepts, as the few a rider actually wants: the corner,
// the block, the walk.
const RADII = [100, 250, 500, 1000] as const;

// Central, as a starting point that returns results rather than an empty list.
// Someone opening the page with no coordinate to hand has nothing to judge the
// output by otherwise.
const DEFAULT_LAT = '22.2819';
const DEFAULT_LON = '114.1582';

// Shared with the backend's own default, so an API caller and a rider on the
// page mean the same thing by "nearby".
const DEFAULT_RADIUS = 250;

const KIND_LABEL: Record<NearbyStop['kind'], string> = {
  bus: '🚌 巴士 Bus',
  minibus: '🚐 小巴 Minibus',
};

export const NearbyStopsPage: React.FC = () => {
  const [lat, setLat] = useState(DEFAULT_LAT);
  const [lon, setLon] = useState(DEFAULT_LON);
  const [radius, setRadius] = useState<number>(DEFAULT_RADIUS);
  const [result, setResult] = useState<NearbyStops | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const {
    getBackgroundClass,
    getCardClass,
    getTextClass,
    getSecondaryTextClass,
    getTitleClass,
    getGrayTextClass,
    getInputClass,
    getButtonClass,
    getHoverClass,
    getBorderClass,
  } = useThemeStyles();

  // Searches are not cancelled, only superseded: widen the radius and search
  // again while the first call is still out, and the slower answer would
  // otherwise arrive last and replace the one that was asked for.
  const latestRequest = useRef(0);

  const runSearch = useCallback(async (latValue: number, lonValue: number, radiusM: number) => {
    const request = ++latestRequest.current;
    setLoading(true);
    setError(null);
    try {
      const found = await api.getStopsNearby(latValue, lonValue, radiusM);
      if (request !== latestRequest.current) return;
      setResult(found);
    } catch (err) {
      if (request !== latestRequest.current) return;
      // The backend rejects coordinates outside Hong Kong, which is what a
      // swapped pair looks like, so its own message is the useful one. Its
      // body alone: the status line would stack in front of the label below.
      const detail = err instanceof HttpError ? err.detail : err instanceof Error ? err.message : '';
      setError(`搜尋失敗 Search failed${detail ? `: ${detail}` : ''}`);
      setResult(null);
    } finally {
      if (request === latestRequest.current) setLoading(false);
    }
  }, []);

  // The page opens on its default coordinate with the results already there.
  // Filled fields above an empty list read as a search that returned nothing,
  // which is the one thing the default was chosen to avoid.
  useEffect(() => {
    runSearch(Number(DEFAULT_LAT), Number(DEFAULT_LON), DEFAULT_RADIUS);
  }, [runSearch]);

  const search = (event: React.FormEvent) => {
    event.preventDefault();

    // Checked here as well as on the server so a typo is answered immediately,
    // and so the message names the field rather than arriving as a 400.
    const latValue = Number(lat);
    const lonValue = Number(lon);
    if (!lat.trim() || !lon.trim() || Number.isNaN(latValue) || Number.isNaN(lonValue)) {
      // Supersedes anything in flight as well, or its answer would land on top
      // of this message.
      latestRequest.current++;
      setLoading(false);
      setError('請輸入有效的座標 Enter a valid pair of coordinates');
      setResult(null);
      return;
    }

    void runSearch(latValue, lonValue, radius);
  };

  const openStop = (stop: NearbyStop) => {
    switch (stop.kind) {
      case 'bus':
        navigate(`/bus/stop/${stop.stop}`);
        break;
      case 'minibus':
        navigate(`/minibus/stop/${stop.stop}`);
        break;
      default:
        // A kind this build has no page for — a mode added later, or a bad
        // payload. Opening one of the two anyway lands on a stop that does not
        // exist, which reads as a broken link rather than as unknown data.
        break;
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${getBackgroundClass()}`}>
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MainNavigation />

        <h1 className={`text-2xl font-bold mb-2 transition-colors duration-300 ${getTitleClass()}`}>
          附近車站 Nearby Stops
        </h1>
        <p className={`text-sm mb-6 transition-colors duration-300 ${getGrayTextClass()}`}>
          輸入座標，尋找附近的巴士及小巴站 Enter a coordinate to find bus and minibus stops nearby
        </p>

        <form onSubmit={search} className={`p-4 rounded-lg mb-6 ${getCardClass()}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <label className="block">
              <span className={`block text-sm font-medium mb-1 ${getTextClass()}`}>
                緯度 Latitude
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={lat}
                onChange={event => setLat(event.target.value)}
                className={`w-full px-3 py-2 rounded-md transition-colors duration-300 ${getInputClass()}`}
              />
            </label>
            <label className="block">
              <span className={`block text-sm font-medium mb-1 ${getTextClass()}`}>
                經度 Longitude
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={lon}
                onChange={event => setLon(event.target.value)}
                className={`w-full px-3 py-2 rounded-md transition-colors duration-300 ${getInputClass()}`}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className={`text-sm font-medium ${getTextClass()}`}>範圍 Radius</span>
            {RADII.map(option => (
              <button
                key={option}
                type="button"
                onClick={() => setRadius(option)}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors duration-300 ${getButtonClass(radius === option)}`}
              >
                {option} m
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`px-4 py-2 font-medium rounded-md transition-colors duration-300 disabled:opacity-60 ${getButtonClass(true)}`}
          >
            {loading ? '搜尋中… Searching…' : '搜尋 Search'}
          </button>
        </form>

        {error && (
          <div className={`p-4 rounded-lg mb-6 ${getCardClass()}`}>
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {result && !error && (
          <>
            <p className={`text-sm mb-3 transition-colors duration-300 ${getSecondaryTextClass()}`}>
              {result.centre.lat}, {result.centre.long} 半徑 {result.radius_m} 米內共 {result.stops.length} 個車站
              {' '}({result.stops.length} stops within {result.radius_m} m)
            </p>

            {result.stops.length > 0 && (
              <NearbyStopsMap result={result} onStopClick={openStop} />
            )}

            {result.stops.length === 0 ? (
              <div className={`p-6 rounded-lg text-center ${getCardClass()}`}>
                <p className={getTextClass()}>
                  附近沒有車站，試試擴大範圍 No stops nearby — try a wider radius
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {result.stops.map(stop => (
                  <li key={`${stop.kind}-${stop.stop}`}>
                    <button
                      onClick={() => openStop(stop)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors duration-300 ${getCardClass()} ${getBorderClass()} ${getHoverClass()}`}
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className={`font-medium ${getTitleClass()}`}>
                          {stop.name_tc || stop.name_en || stop.stop}
                        </span>
                        <span className={`text-sm whitespace-nowrap ${getGrayTextClass()}`}>
                          {stop.distance_m} m
                        </span>
                      </div>
                      <div className={`text-sm ${getSecondaryTextClass()}`}>
                        {stop.name_en}
                      </div>
                      <div className={`text-xs mt-1 ${getGrayTextClass()}`}>
                        {KIND_LABEL[stop.kind]} · {stop.company}
                      </div>
                      {stop.routes.length > 0 && (
                        <div className={`text-sm mt-2 ${getTextClass()}`}>
                          {stop.routes.join('、')}
                        </div>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
};
