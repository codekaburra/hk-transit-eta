import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useThemeStyles } from '../../hooks/useThemeStyles';
import { Header } from '../Header';
import { MinibusRouteCard } from './MinibusRouteCard';
import { api } from '../../services/api';
import { MainNavigation } from '../MainNavigation';

export const MinibusStopDetails: React.FC = () => {
  const { stopId } = useParams<{ stopId: string }>();
  const navigate = useNavigate();
  const [stop, setStop] = useState<any>(null);
  const [routes, setRoutes] = useState<any[]>([]);
  const [etaData, setEtaData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [etaLoading, setEtaLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    getBackgroundClass,
    getTextClass,
    getSecondaryTextClass,
    getCardClass,
    getButtonClass,
    getHoverClass,
    getAccentClass
  } = useThemeStyles();

  useEffect(() => {
    if (stopId) {
      fetchStopDetails();
    }
  }, [stopId]);

  const fetchStopDetails = async () => {
    if (!stopId) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch stop details and routes serving this stop in parallel
      const [stopData, routesData] = await Promise.all([
        api.getMinibusStopById(stopId),
        api.getMinibusRoutesByStop(stopId)
      ]);

      setStop(stopData);
      setRoutes(routesData || []);
      
      // Start fetching ETA data
      fetchETAData();
    } catch (err) {
      console.error('Error fetching stop details:', err);
      setError('Failed to load stop details');
    } finally {
      setLoading(false);
    }
  };

  const fetchETAData = useCallback(async () => {
    if (!stopId) return;

    setEtaLoading(true);

    try {
      const url = `https://data.etagmb.gov.hk/eta/stop/${stopId}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();

      // Handle the GMB stop ETA API response structure
      if (responseData.data && Array.isArray(responseData.data)) {
        setEtaData(responseData.data);
      } else {
        setEtaData([]);
      }
    } catch (error) {
      console.error('Error fetching stop ETA:', error);
      setEtaData([]);
    } finally {
      setEtaLoading(false);
    }
  }, [stopId]);

  // Auto-refresh ETA data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchETAData();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchETAData]);

  // Format minibus ETA with additional info
  const formatMinibusETA = (etaItem: any) => {
    try {
      const timestamp = etaItem.timestamp;
      const diff = etaItem.diff;
      const remarksTC = etaItem.remarks_tc;
      
      if (diff <= 0) return '即將到達 Arriving';
      if (diff < 60) return `${diff}分鐘 ${diff}m`;
      
      // Also show the actual time
      const etaDate = new Date(timestamp);
      const timeString = etaDate.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' });
      
      if (remarksTC && remarksTC !== '') {
        return `${timeString} - ${diff}m (${remarksTC})`;
      }
      
      return `${timeString} - ${diff}m`;
    } catch {
      return '';
    }
  };

  // Get route information for ETA display
  const getRouteInfo = (routeId: number) => {
    return routes.find(route => route.route_id === routeId);
  };

  const handleRouteClick = (route: any) => {
    navigate(`/minibus/route/${route.route_id}/${route.route_seq}`);
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
              Loading stop details...
            </p>
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
          <MainNavigation currentType="minibus-stop" />
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
        {/* Main Navigation */}
        <MainNavigation currentType="minibus-stop" />

        {/* Stop Header */}
        <div className={`rounded-lg shadow-md p-6 mb-6 transition-colors duration-300 ${getCardClass()}`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className={`text-3xl font-bold mb-2 transition-colors duration-300 ${getTextClass()}`}>
                {stop.name_tc || `Stop ${stopId}`}
              </h1>
              <h2 className={`text-xl mb-4 transition-colors duration-300 ${getSecondaryTextClass()}`}>
                {stop.name_en || `Minibus Stop ${stopId}`}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className={`ml-2 transition-colors duration-300 ${getSecondaryTextClass()}`}>
                    🚐 Minibus Stop
                  </span>
                </div>
              </div>
            </div>
            {stop.latitude && stop.longitude && (
              <div className="w-64 h-48 ml-4">
                <iframe
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${stop.latitude},${stop.longitude}&zoom=15`}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`Map showing ${stop.name_en || 'Minibus Stop'}`}
                />
              </div>
            )}
          </div>
        </div>

        {/* Routes and Related Info in 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Routes Section */}
          <div className={`lg:col-span-2 rounded-lg shadow-md p-6 transition-colors duration-300 ${getCardClass()}`}>
            <h3 className={`text-xl font-bold mb-4 transition-colors duration-300 ${getTextClass()}`}>
              途經此站的小巴路線 Minibus Routes Serving This Stop ({routes.length})
            </h3>
            
            {routes.length === 0 && (
              <div className={`text-center py-8 transition-colors duration-300 ${getSecondaryTextClass()}`}>
                <div className="text-4xl mb-4">🚐</div>
                <p>No minibus routes serve this stop</p>
              </div>
            )}

            {routes.length > 0 && (
              <div className="grid gap-4">
                {routes.map((route, index) => (
                  <MinibusRouteCard
                    key={`${route.route_id}-${route.route_seq}-${index}`}
                    route={route}
                    onClick={handleRouteClick}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Live ETA Section */}
          <div className={`rounded-lg shadow-md p-6 transition-colors duration-300 ${getCardClass()}`}>
            <div className="flex items-center space-x-2 mb-4">
              <h3 className={`text-xl font-bold transition-colors duration-300 ${getTextClass()}`}>
                即時到站預報 Live Arrivals
              </h3>
              {etaLoading && (
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              )}
            </div>
            
            {etaData.length > 0 ? (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {etaData.map((routeETA, index) => {
                  const routeInfo = getRouteInfo(routeETA.route_id);
                  
                  return (
                    <div
                      key={`${routeETA.route_id}-${routeETA.route_seq}-${index}`}
                      className={`border rounded-lg p-3 transition-colors duration-300`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${getAccentClass()}`}>
                            {routeInfo?.route_code || `${routeETA.route_id}`}
                          </div>
                          <div>
                            <p className={`text-xs font-medium ${getTextClass()}`}>
                              Dir {routeETA.route_seq}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          {routeETA.enabled ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              ✓
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              ✗
                            </span>
                          )}
                        </div>
                      </div>

                      {/* ETA Display */}
                      {routeETA.enabled && routeETA.eta && routeETA.eta.length > 0 ? (
                        <div className="space-y-1">
                          {routeETA.eta.slice(0, 2).map((eta: any, etaIndex: number) => (
                            <div key={`eta-${etaIndex}`} className="flex items-center justify-between">
                              <span className={`text-xs ${getSecondaryTextClass()}`}>
                                {eta.eta_seq}
                              </span>
                              <span className={`text-xs font-medium ${getTextClass()}`}>
                                {formatMinibusETA(eta)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : routeETA.enabled && (!routeETA.eta || routeETA.eta.length === 0) ? (
                        <p className={`text-xs ${getSecondaryTextClass()}`}>
                          No ETA
                        </p>
                      ) : (
                        <div className={`text-xs ${getSecondaryTextClass()}`}>
                          Service unavailable
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={`text-center py-8 transition-colors duration-300 ${getSecondaryTextClass()}`}>
                <div className="text-4xl mb-4">⏱️</div>
                <p>{etaLoading ? 'Loading...' : 'No ETA data'}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}; 