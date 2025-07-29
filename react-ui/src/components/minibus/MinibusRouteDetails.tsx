import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useThemeStyles } from '../../hooks/useThemeStyles';
import { Header } from '../Header';
import { MinibusRouteStopCard } from './MinibusRouteStopCard';
import { RouteMapCard, convertMinibusRouteStopsToMapStops } from '../RouteMapCard';
import { api } from '../../services/api';

export const MinibusRouteDetails: React.FC = () => {
  const { routeId, routeSeq } = useParams<{ routeId: string; routeSeq: string }>();
  const navigate = useNavigate();
  const [route, setRoute] = useState<any>(null);
  const [routeStops, setRouteStops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { 
    getBackgroundClass, 
    getTextClass, 
    getSecondaryTextClass, 
    getCardClass, 
    getButtonClass, 
    getHoverClass 
  } = useThemeStyles();

  useEffect(() => {
    if (routeId && routeSeq) {
      fetchRouteDetails();
    }
  }, [routeId, routeSeq]);

  const fetchRouteDetails = async () => {
    if (!routeId || !routeSeq) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch route information and route stops in parallel
      const [routeData, stopsData] = await Promise.all([
        fetchRouteInfo(),
        api.getMinibusRouteStops(routeId, routeSeq)
      ]);
      
      setRoute(routeData);
      setRouteStops(stopsData || []);
    } catch (err) {
      console.error('Error fetching route details:', err);
      setError('Failed to load route details');
    } finally {
      setLoading(false);
    }
  };

  const fetchRouteInfo = async () => {
    // Get route information from the routes API
    const allRoutes = await api.getMinibusRoutes();
    return allRoutes.find(r => 
      r.route_id.toString() === routeId && 
      r.route_seq.toString() === routeSeq
    );
  };

  const handleStopClick = (stop: any) => {
    navigate(`/minibus/stop/${stop.stop_id}`);
  };

  const handleBackClick = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className={`min-h-screen transition-colors duration-300 ${getBackgroundClass()}`}>
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className={`mt-2 transition-colors duration-300 ${getTextClass()}`}>
              Loading route details...
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !route) {
    return (
      <div className={`min-h-screen transition-colors duration-300 ${getBackgroundClass()}`}>
        <Header />
        <main className="container mx-auto px-4 py-8">
          <button
            onClick={handleBackClick}
            className={`mb-6 px-4 py-2 rounded-md transition-colors duration-300 ${getSecondaryTextClass()} hover:bg-gray-100 dark:hover:bg-gray-700`}
          >
            ← Back to Search
          </button>
          <div className={`text-center py-8 ${getTextClass()}`}>
            <div className="text-4xl mb-4">❌</div>
            <p>{error || 'Route not found'}</p>
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
          onClick={handleBackClick}
          className={`mb-6 px-4 py-2 rounded-md transition-colors duration-300 ${getSecondaryTextClass()} hover:bg-gray-100 dark:hover:bg-gray-700`}
        >
          ← Back to Search
        </button>

        {/* Route Header */}
        <div className={`rounded-lg shadow-md p-6 mb-6 transition-colors duration-300 ${getCardClass()}`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className={`w-16 h-16 rounded-lg bg-yellow-400 flex items-center justify-center`}>
                  <span className="font-bold text-2xl text-black">🚐</span>
                </div>
                <div>
                  <h1 className={`text-3xl font-bold mb-2 transition-colors duration-300 ${getTextClass()}`}>
                    Route {route.route_code}
                  </h1>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm px-3 py-1 bg-green-100 text-green-800 rounded-full font-medium">
                      {route.region}
                    </span>
                    <span className="text-sm px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                      Direction {route.route_seq}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className={`text-lg font-medium transition-colors duration-300 ${getTextClass()}`}>
                  {route.description_tc || route.description_en}
                </p>
                
                <div className={`transition-colors duration-300 ${getSecondaryTextClass()}`}>
                  {route.orig_tc} → {route.dest_tc}
                </div>
                {route.orig_en && route.dest_en && (
                  <div className={`transition-colors duration-300 ${getSecondaryTextClass()}`}>
                    {route.orig_en} → {route.dest_en}
                  </div>
                )}
                
                {route.remarks_tc && (
                  <div className={`text-sm italic transition-colors duration-300 ${getSecondaryTextClass()}`}>
                    {route.remarks_tc}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Route Stops */}
        <div className={`rounded-lg shadow-md p-6 transition-colors duration-300 ${getCardClass()}`}>
          <h3 className={`text-xl font-bold mb-4 transition-colors duration-300 ${getTextClass()}`}>
            小巴路線站點 Route Stops ({routeStops.length})
          </h3>
          
          {routeStops.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {routeStops.map((stop, index) => {
                // Enhance stop data with route information for ETA fetching
                const enhancedStop = {
                  ...stop,
                  route_id: route.route_id,
                  route_seq: route.route_seq
                };
                
                return (
                  <MinibusRouteStopCard
                    key={`${stop.stop_id}-${stop.stop_seq}`}
                    routeStop={enhancedStop}
                    index={index + 1}
                    onClick={() => handleStopClick(stop)}
                  />
                );
              })}
            </div>
          ) : (
            <div className={`text-center py-8 transition-colors duration-300 ${getSecondaryTextClass()}`}>
              <div className="text-4xl mb-4">🚐</div>
              <p>No stops available for this route</p>
            </div>
          )}
        </div>

        {/* Route Map */}
        {routeStops.length > 0 && (
          <RouteMapCard routeStops={convertMinibusRouteStopsToMapStops(routeStops)} />
        )}
      </main>
    </div>
  );
}; 