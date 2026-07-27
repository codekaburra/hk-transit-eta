import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useThemeStyles } from '../../../hooks/useThemeStyles';
import { Header } from '../../header/Header';
import { MinibusRouteStopCard } from './MinibusRouteStopCard';
import { MinibusServiceFrequency } from './MinibusServiceFrequency';
import { RouteMapCard, convertMinibusRouteStopsToMapStops } from '../RouteMapCard';
import { RouteCodeIcon } from '../RouteCodeIcon';
import { MainNavigation } from '../MainNavigation';
import { api, getMinibusRouteDetails } from '../../../services/api';

export const MinibusRouteDetails: React.FC = () => {
  const { routeId, routeSeq } = useParams<{ routeId: string; routeSeq: string }>();
  const navigate = useNavigate();
  const [route, setRoute] = useState<any>(null);
  const [routeStops, setRouteStops] = useState<any[]>([]);
  const [routeDetails, setRouteDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { 
    getBackgroundClass, 
    getTextClass, 
    getSecondaryTextClass, 
    getCardClass, 
    getTitleClass,
  } = useThemeStyles();

  useEffect(() => {
    if (routeId && routeSeq) {
      fetchRouteDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      
      // Fetch detailed route information after getting basic route data
      await fetchDetailedRouteInfo();
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

  const fetchDetailedRouteInfo = async () => {
    if (!routeId || !routeSeq) return;
    
    try {
      console.log('Fetching route details from backend API...');
      const routeDetails = await getMinibusRouteDetails(routeId, routeSeq);
      
      if (routeDetails) {
        console.log('Backend route details:', routeDetails);
        setRouteDetails(routeDetails);
      } else {
        console.log('No route details available from backend');
        setRouteDetails({ headways: [] });
      }
    } catch (error) {
      console.error('Error fetching detailed route info:', error);
      setRouteDetails({ headways: [] });
    }
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
          <MainNavigation currentType="minibus-route" />
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
        {/* Main Navigation */}
        <MainNavigation currentType="minibus-route" />

        {/* Route Header */}
        <div className={`rounded-lg shadow-md p-6 mb-6 transition-colors duration-300 ${getCardClass()}`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-4">
                                  <RouteCodeIcon 
                    routeCode={route.route_code}
                    type="minibus"
                    size="lg"
                  />
                  <div>
                    {/* <div className="flex items-center space-x-3 mb-2">
                      <span className="text-sm px-3 py-1 bg-green-100 text-green-800 rounded-full font-medium">
                        {route.region}
                      </span>
                      <span className="text-sm px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                        Direction {route.route_seq}
                      </span>
                    </div> */}
                    <h2 className={`text-lg transition-colors duration-300 ${getTitleClass()}`}>
                      {route.orig_tc} → {route.dest_tc}
                    </h2>
                    <h2 className={`text-xl mb-2 transition-colors duration-300 ${getTitleClass()}`}>
                      {route.orig_en && route.dest_en ? `${route.orig_en} → ${route.dest_en}` : (route.description_en || '')}
                    </h2>
                    
                    {/* Route Description */}
                    {(route.description_tc || route.description_en) && (
                      <div className={`mt-2 p-2 rounded-lg bg-opacity-50 ${getSecondaryTextClass()}`}>
                        {route.description_tc && (
                          <span className="text-sm font-medium">{route.description_tc}</span>
                        )}
                        {route.description_en && (
                          <span className="text-sm">{route.description_en}</span>
                        )}
                      </div>
                    )}
                  </div>
              </div>
            </div>
          </div>
        </div>

        {/* Two-column layout: Route Stops and Map */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Route Stops - Left Column */}
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

          {/* Right Column - Service Frequency and Route Map */}
          <div className="lg:sticky lg:top-6 lg:h-fit space-y-6">
            {/* Service Frequency */}
            <MinibusServiceFrequency routeDetails={routeDetails} />

            {/* Route Map */}
            {routeStops.length > 0 && (
              <RouteMapCard routeStops={convertMinibusRouteStopsToMapStops(routeStops)} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}; 