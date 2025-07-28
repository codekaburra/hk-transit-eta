import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BusStop, BusRoute } from '../../types';
import { useThemeStyles } from '../../hooks/useThemeStyles';
import { api } from '../../services/api';
import { Header } from '../Header';
import { StopCard } from './StopCard';
import { RouteCard } from './RouteCard';
import { BusCompanyIcon } from './BusCompanyIcon';

export const StopDetails: React.FC = () => {
  const { stopId } = useParams<{ stopId: string }>();
  const navigate = useNavigate();
  const { getCardClass, getTextClass, getSecondaryTextClass, getBackgroundClass } = useThemeStyles();
  const [stop, setStop] = useState<BusStop | null>(null);
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [nearbyStops, setNearbyStops] = useState<BusStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [nearbyLoading, setNearbyLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stopId) {
      setError('No stop ID provided');
      setLoading(false);
      return;
    }

    const fetchStopData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // First, get the stop details using the new endpoint
        const foundStop = await api.getBusStopById(stopId);
        if (!foundStop) {
          setError('Stop not found');
          setLoading(false);
          return;
        }
        setStop(foundStop);
        
        // Then fetch routes and nearby stops
        const [routesData, nearbyData] = await Promise.all([
          api.getBusRoutesByStop(stopId),
          api.getBusStopsNearby(stopId)
        ]);
        
        setRoutes(routesData);
        // Filter out the current stop from nearby stops
        const filteredNearby = nearbyData.filter(nearbyStop => nearbyStop.stop !== stopId);
        setNearbyStops(filteredNearby);
        
      } catch (err) {
        setError('Failed to load stop data');
        console.error('Error fetching stop data:', err);
      } finally {
        setLoading(false);
        setNearbyLoading(false);
      }
    };

    fetchStopData();
  }, [stopId]);

  const handleBackToSearch = () => {
    navigate('/');
  };

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

  if (loading) {
    return (
      <div className={`min-h-screen transition-colors duration-300 ${getBackgroundClass()}`}>
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className={`mt-2 ${getTextClass()}`}>Loading stop details...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !stop) {
    return (
      <div className={`min-h-screen transition-colors duration-300 ${getBackgroundClass()}`}>
        <Header />
        <main className="container mx-auto px-4 py-8">
          <button
            onClick={handleBackToSearch}
            className={`mb-6 px-4 py-2 rounded-md transition-colors duration-300 ${getSecondaryTextClass()} hover:bg-gray-100 dark:hover:bg-gray-700`}
          >
            ← Back to Search
          </button>
          <div className={`text-center py-8 ${getTextClass()}`}>
            <div className="text-4xl mb-4">❌</div>
            <p>{error || 'Stop not found'}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${getBackgroundClass()}`}>
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={handleBackToSearch}
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
                {/* <div>
                  <span className={`font-medium transition-colors duration-300 ${getTextClass()}`}>
                    Stop ID:
                  </span>
                  <span className={`ml-2 transition-colors duration-300 ${getSecondaryTextClass()}`}>
                    {stop.stop}
                  </span>
                </div> */}
                <div>
                  {/* <span className={`font-medium transition-colors duration-300 ${getTextClass()}`}>
                    Company:
                  </span> */}
                  <span className={`ml-2 transition-colors duration-300 ${getSecondaryTextClass()}`}>
                    <BusCompanyIcon company={stop.company} />
                  </span>
                </div>
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

        {/* Routes and Nearby Stops in 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Routes Section */}
          <div className={`lg:col-span-2 rounded-lg shadow-md p-6 transition-colors duration-300 ${getCardClass()}`}>
            <h3 className={`text-xl font-bold mb-4 transition-colors duration-300 ${getTextClass()}`}>
              途經此站的巴士路線 Routes Serving This Stop ({sortedRoutes.length})
            </h3>
            
            {!loading && !error && sortedRoutes.length === 0 && (
              <div className={`text-center py-8 transition-colors duration-300 ${getSecondaryTextClass()}`}>
                <div className="text-4xl mb-4">🚌</div>
                <p> - - - </p>
              </div>
            )}

            {!loading && !error && sortedRoutes.length > 0 && (
              <div className="grid gap-4">
                {sortedRoutes.map((route, index) => (
                  <RouteCard
                    key={`${route.route}-${route.direction}-${index}`}
                    shouldBusCompanyIcon={false}
                    route={route}
                    busStop={stop}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Nearby Stops Section */}
          <div className={`rounded-lg shadow-md p-6 transition-colors duration-300 ${getCardClass()}`}>
            <h3 className={`text-xl font-bold mb-4 transition-colors duration-300 ${getTextClass()}`}>
              鄰近巴士站 Nearby Stops ({nearbyStops.length})
            </h3>
            {/* <p className={`text-sm mb-4 transition-colors duration-300 ${getSecondaryTextClass()}`}>
              Stops within ±0.001 latitude and ±0.001 longitude (approximately ±111m × ±111m area)
            </p> */}
            
            {!nearbyLoading && nearbyStops.length > 0 && (
              <div className="grid gap-3">
                {nearbyStops.map((nearbyStop: BusStop, index) => (
                  <StopCard
                    key={`${nearbyStop.stop}-${index}`}
                    stop={nearbyStop}
                    onClick={(stop) => navigate(`/stop/${stop.stop}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}; 