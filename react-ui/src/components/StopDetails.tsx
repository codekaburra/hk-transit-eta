import React, { useState, useEffect } from 'react';
import { BusStop, BusRoute } from '../types';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { api } from '../services/api';

interface StopDetailsProps {
  stop: BusStop;
  onBack: () => void;
}

export const StopDetails: React.FC<StopDetailsProps> = ({ stop, onBack }) => {
  const { getCardClass, getTextClass, getSecondaryTextClass, getBorderClass, getHoverClass } = useThemeStyles();
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [nearbyStops, setNearbyStops] = useState<BusStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [nearbyLoading, setNearbyLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nearbyError, setNearbyError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        setLoading(true);
        setError(null);
        const routesData = await api.getRoutesByStop(stop.stop);
        setRoutes(routesData);
      } catch (err) {
        setError('Failed to load routes for this stop');
        console.error('Error fetching routes by stop:', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchNearbyStops = async () => {
      try {
        setNearbyLoading(true);
        setNearbyError(null);
        const nearbyData = await api.getStopsNearby(stop.stop);
        // Filter out the current stop from nearby stops
        const filteredNearby = nearbyData.filter(nearbyStop => nearbyStop.stop !== stop.stop);
        setNearbyStops(filteredNearby);
      } catch (err) {
        setNearbyError('Failed to load nearby stops');
        console.error('Error fetching nearby stops:', err);
      } finally {
        setNearbyLoading(false);
      }
    };

    fetchRoutes();
    fetchNearbyStops();
  }, [stop.stop]);

  // Group routes by route number and direction
  const groupedRoutes = routes.reduce((acc, route) => {
    const key = `${route.route}-${route.direction}`;
    if (!acc[key]) {
      acc[key] = route;
    }
    return acc;
  }, {} as Record<string, BusRoute>);

  const sortedRoutes = Object.values(groupedRoutes).sort((a, b) => {
    // Sort by route number first, then by direction
    const routeA = parseInt(a.route) || 0;
    const routeB = parseInt(b.route) || 0;
    if (routeA !== routeB) return routeA - routeB;
    return a.direction.localeCompare(b.direction);
  });

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Button */}
      <button
        onClick={onBack}
        className={`mb-6 px-4 py-2 rounded-md transition-colors duration-300 ${getSecondaryTextClass()} hover:bg-gray-100 dark:hover:bg-gray-700`}
      >
        ← Back to Search
      </button>

      {/* Stop Header */}
      <div className={`rounded-lg shadow-md p-6 mb-6 transition-colors duration-300 ${getCardClass()}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className={`text-3xl font-bold mb-2 transition-colors duration-300 ${getTextClass()}`}>
              {stop.name_tc}
            </h1>
            <h2 className={`text-xl mb-4 transition-colors duration-300 ${getSecondaryTextClass()}`}>
              {stop.name_en}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className={`font-medium transition-colors duration-300 ${getTextClass()}`}>
                  Stop ID:
                </span>
                <span className={`ml-2 transition-colors duration-300 ${getSecondaryTextClass()}`}>
                  {stop.stop}
                </span>
              </div>
              <div>
                <span className={`font-medium transition-colors duration-300 ${getTextClass()}`}>
                  Company:
                </span>
                <span className={`ml-2 transition-colors duration-300 ${getSecondaryTextClass()}`}>
                  {stop.company}
                </span>
              </div>
            </div>

      {/* Routes Section */}
      <div className={`rounded-lg shadow-md p-6 mb-6 transition-colors duration-300 `}>
        {/* <h3 className={`text-xl font-bold mb-4 transition-colors duration-300 ${getTextClass()}`}>
          Routes Serving This Stop ({sortedRoutes.length})
        </h3>
        
        {loading && (
          <div className={`text-center py-8 transition-colors duration-300 ${getSecondaryTextClass()}`}>
            <div className="text-4xl mb-4">⏳</div>
            <p>Loading routes...</p>
          </div>
        )}

        {error && (
          <div className={`text-center py-8 transition-colors duration-300 ${getSecondaryTextClass()}`}>
            <div className="text-4xl mb-4">❌</div>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && sortedRoutes.length === 0 && (
          <div className={`text-center py-8 transition-colors duration-300 ${getSecondaryTextClass()}`}>
            <div className="text-4xl mb-4">🚌</div>
            <p>No routes found for this stop</p>
          </div>
        )} */}

        {!loading && !error && sortedRoutes.length > 0 && (
          <div className="grid gap-4">
            {sortedRoutes.map((route, index) => (
              <div
                key={`${route.route}-${route.direction}-${index}`}
                className={`p-4 rounded-lg border transition-colors duration-300 ${getBorderClass()} ${getHoverClass()}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`text-2xl font-bold px-3 py-1 rounded ${getSecondaryTextClass()}`}>
                      {route.route}
                    </div>
                    <div className={`text-xs transition-colors duration-300 ${getSecondaryTextClass()}`}>
                      {route.company}
                    </div>
                    <div className="flex-1">
                      <div className={`font-semibold transition-colors duration-300 ${getTextClass()}`}>
                        {route.orig_tc} → {route.dest_tc}
                      </div>
                      <div className={`text-sm transition-colors duration-300 ${getSecondaryTextClass()}`}>
                        {route.orig_en} → {route.dest_en}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium transition-colors duration-300 ${getSecondaryTextClass()}`}>
                      5 mins
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
          </div>
          <div className="w-64 h-48 ml-4">
            <iframe
              width="100%"
              height="100%"
              style={{ border: 0 }}
              src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${stop.lat},${stop.long}&zoom=15`}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`Map showing ${stop.name_en}`}
            />
          </div>
        </div>
      </div>


      {/* Nearby Stops Section */}
      <div className={`rounded-lg shadow-md p-6 transition-colors duration-300 ${getCardClass()}`}>
        <h3 className={`text-xl font-bold mb-4 transition-colors duration-300 ${getTextClass()}`}>
          Nearby Stops ({nearbyStops.length})
        </h3>
        <p className={`text-sm mb-4 transition-colors duration-300 ${getSecondaryTextClass()}`}>
          Stops within ±0.001 latitude and ±0.001 longitude (approximately ±111m × ±111m area)
        </p>
        
        {nearbyLoading && (
          <div className={`text-center py-8 transition-colors duration-300 ${getSecondaryTextClass()}`}>
            <div className="text-4xl mb-4">🔍</div>
            <p>Finding nearby stops...</p>
          </div>
        )}

        {nearbyError && (
          <div className={`text-center py-8 transition-colors duration-300 ${getSecondaryTextClass()}`}>
            <div className="text-4xl mb-4">❌</div>
            <p>{nearbyError}</p>
          </div>
        )}

        {!nearbyLoading && !nearbyError && nearbyStops.length === 0 && (
          <div className={`text-center py-8 transition-colors duration-300 ${getSecondaryTextClass()}`}>
            <div className="text-4xl mb-4">📍</div>
            <p>No nearby stops found</p>
            <p className="text-sm mt-2">This stop appears to be isolated</p>
          </div>
        )}

        {!nearbyLoading && !nearbyError && nearbyStops.length > 0 && (
          <div className="grid gap-3">
            {nearbyStops.map((nearbyStop, index) => (
              <div
                key={`${nearbyStop.stop}-${index}`}
                className={`p-3 rounded-lg border transition-colors duration-300 ${getBorderClass()} ${getHoverClass()}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className={`font-semibold transition-colors duration-300 ${getTextClass()}`}>
                      {nearbyStop.name_tc}
                    </div>
                    <div className={`text-sm transition-colors duration-300 ${getSecondaryTextClass()}`}>
                      {nearbyStop.name_en}
                    </div>
                  </div>
                  <div className="text-right">
                    {/* <div className={`text-xs font-medium transition-colors duration-300 ${getSecondaryTextClass()}`}>
                      ID: {nearbyStop.stop}
                    </div> */}
                    <div className={`text-xs transition-colors duration-300 ${getSecondaryTextClass()}`}>
                      {nearbyStop.company}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}; 