import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../Header';
import { MinibusRoute, MinibusRouteStop } from '../../types';
import { useThemeStyles } from '../../hooks/useThemeStyles';
import { MinibusRouteStopCard } from './MinibusRouteStopCard';

export const MinibusRouteDetails: React.FC = () => {
  const { routeId } = useParams<{ routeId: string }>();
  const navigate = useNavigate();
  const [route, setRoute] = useState<MinibusRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [routeStops, setRouteStops] = useState<MinibusRouteStop[]>([]);
  const [loadingStops, setLoadingStops] = useState(false);
  const [stopsError, setStopsError] = useState<string | null>(null);
  
  const { 
    getBackgroundClass,
    getCardClass, 
    getTextClass, 
    getSecondaryTextClass, 
    getAccentClass, 
    getHoverClass 
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
        
        // Mock data for now - replace with actual API call
        const mockRoute: MinibusRoute = {
          route_id: routeId,
          route_namee: `Minibus Route ${routeId}`,
          route_namec: `小巴路線 ${routeId}`,
          company_code: 'MB',
          min_fare: '4.50',
          max_fare: '8.00',
          full_fare: '8.00',
          service_mode: 'Fixed Route'
        };
        
        setRoute(mockRoute);
      } catch (err) {
        setError('Failed to load route');
        console.error('Error fetching route:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRoute();
  }, [routeId]);

  const fetchRouteStops = useCallback(async () => {
    if (!route) return;
    setLoadingStops(true);
    setStopsError(null);
    try {
      // Mock data for now - replace with actual API call
      const mockStops: MinibusRouteStop[] = [
        {
          route_id: route.route_id,
          route_seq: '1',
          stop_id: 'MB001',
          stop_namee: 'Central Pier',
          stop_namec: '中環碼頭',
          fare: '4.50'
        },
        {
          route_id: route.route_id,
          route_seq: '2',
          stop_id: 'MB002',
          stop_namee: 'Admiralty Station',
          stop_namec: '金鐘站',
          fare: '5.00'
        }
      ];
      setRouteStops(mockStops);
    } catch (error) {
      setStopsError('Failed to load route stops');
    } finally {
      setLoadingStops(false);
    }
  }, [route]);

  useEffect(() => {
    if (route) {
      fetchRouteStops();
    }
  }, [route, fetchRouteStops]);

  const handleClose = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className={`min-h-screen transition-colors duration-300 ${getBackgroundClass()}`}>
        <Header />
        <div className="text-center">
          <p className={`text-lg ${getTextClass()}`}>Loading minibus route details...</p>
        </div>
      </div>
    );
  }

  if (error || !route) {
    return (
      <div className={`min-h-screen transition-colors duration-300 ${getBackgroundClass()}`}>
        <Header />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className={`text-lg text-red-500 mb-4`}>{error || 'Route not found'}</p>
            <button
              onClick={handleClose}
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
        {/* Back Button */}
        <button
          onClick={handleClose}
          className={`mb-6 px-4 py-2 rounded-md transition-colors duration-300 ${getSecondaryTextClass()} ${getHoverClass()}`}
        >
          ← Back to Search
        </button>

        {/* Route Header */}
        <div className={`rounded-lg shadow-md p-6 mb-6 transition-colors duration-300 ${getCardClass()}`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-16 h-16 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                  <span className="font-bold text-2xl">🚐</span>
                </div>
                <div>
                  <h1 className={`text-3xl font-bold mb-2 transition-colors duration-300 ${getTextClass()}`}>
                    {route.route_namee}
                  </h1>
                  <h2 className={`text-xl mb-2 transition-colors duration-300 ${getSecondaryTextClass()}`}>
                    {route.route_namec}
                  </h2>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <span className={`text-sm font-medium ${getTextClass()}`}>Company: </span>
                      <span className={`text-sm ${getSecondaryTextClass()}`}>{route.company_code}</span>
                    </div>
                    <div>
                      <span className={`text-sm font-medium ${getTextClass()}`}>Service: </span>
                      <span className={`text-sm ${getSecondaryTextClass()}`}>{route.service_mode}</span>
                    </div>
                    <div>
                      <span className={`text-sm font-medium ${getTextClass()}`}>Fare Range: </span>
                      <span className={`text-sm ${getSecondaryTextClass()}`}>${route.min_fare} - ${route.max_fare}</span>
                    </div>
                    <div>
                      <span className={`text-sm font-medium ${getTextClass()}`}>Full Fare: </span>
                      <span className={`text-sm ${getSecondaryTextClass()}`}>${route.full_fare}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Route Stops */}
        <div className={`rounded-lg shadow-md p-6 transition-colors duration-300 ${getCardClass()}`}>
          <h3 className={`text-lg font-semibold mb-3 ${getTextClass()}`}>小巴路線站點 Minibus Route Stops</h3>
          {loadingStops ? (
            <p className={`text-sm ${getSecondaryTextClass()}`}>Loading stops...</p>
          ) : stopsError ? (
            <p className={`text-sm text-red-500`}>{stopsError}</p>
          ) : routeStops.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {routeStops.sort((a, b) => parseInt(a.route_seq) - parseInt(b.route_seq)).map((routeStop, index) => (
                <MinibusRouteStopCard key={index} routeStop={routeStop} onClick={() => navigate(`/minibus/stop/${routeStop.stop_id}`)} />
              ))}
            </div>
          ) : (
            <p className={`text-sm ${getSecondaryTextClass()}`}>No stops data available</p>
          )}
        </div>
      </main>
    </div>
  );
}; 