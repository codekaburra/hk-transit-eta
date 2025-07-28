import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MinibusStop, MinibusRoute } from '../../types';
import { useThemeStyles } from '../../hooks/useThemeStyles';
import { Header } from '../Header';
import { MinibusStopCard } from './MinibusStopCard';
import { MinibusRouteCard } from './MinibusRouteCard';

export const MinibusStopDetails: React.FC = () => {
  const { stopId } = useParams<{ stopId: string }>();
  const navigate = useNavigate();
  const { getCardClass, getTextClass, getSecondaryTextClass, getBackgroundClass } = useThemeStyles();
  const [stop, setStop] = useState<MinibusStop | null>(null);
  const [routes, setRoutes] = useState<MinibusRoute[]>([]);
  const [nearbyStops, setNearbyStops] = useState<MinibusStop[]>([]);
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
        
        // Mock data for now - replace with actual API call
        const mockStop: MinibusStop = {
          stop_id: stopId,
          stop_namee: `Minibus Stop ${stopId}`,
          stop_namec: `小巴站 ${stopId}`,
          district_code: 'Central',
          lat: '22.2787',
          long: '114.1747'
        };
        
        setStop(mockStop);
        
        // Mock routes data
        const mockRoutes: MinibusRoute[] = [
          {
            route_id: 'MB1',
            route_namee: 'Central - Mid-Levels',
            route_namec: '中環 - 半山',
            company_code: 'MB',
            min_fare: '4.50',
            max_fare: '8.00',
            full_fare: '8.00',
            service_mode: 'Fixed Route'
          }
        ];
        
        // Mock nearby stops
        const mockNearbyStops: MinibusStop[] = [
          {
            stop_id: 'MB002',
            stop_namee: 'Nearby Stop 1',
            stop_namec: '附近站點 1',
            district_code: 'Central',
            lat: '22.2790',
            long: '114.1750'
          }
        ];
        
        setRoutes(mockRoutes);
        setNearbyStops(mockNearbyStops);
        
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

  if (loading) {
    return (
      <div className={`min-h-screen transition-colors duration-300 ${getBackgroundClass()}`}>
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            <p className={`mt-2 ${getTextClass()}`}>Loading minibus stop details...</p>
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
                {stop.stop_namec}
              </h1>
              <h2 className={`text-xl mb-4 transition-colors duration-300 ${getSecondaryTextClass()}`}>
                {stop.stop_namee}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className={`text-sm font-medium ${getTextClass()}`}>District: </span>
                  <span className={`text-sm ${getSecondaryTextClass()}`}>{stop.district_code}</span>
                </div>
                <div>
                  <span className={`text-sm font-medium ${getTextClass()}`}>Stop ID: </span>
                  <span className={`text-sm ${getSecondaryTextClass()}`}>{stop.stop_id}</span>
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
                title={`Map showing ${stop.stop_namee}`}
              />
            </div>
          </div>
        </div>

        {/* Routes and Nearby Stops in 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Routes Section */}
          <div className={`lg:col-span-2 rounded-lg shadow-md p-6 transition-colors duration-300 ${getCardClass()}`}>
            <h3 className={`text-xl font-bold mb-4 transition-colors duration-300 ${getTextClass()}`}>
              途經此站的小巴路線 Minibus Routes Serving This Stop ({routes.length})
            </h3>
            
            {!loading && !error && routes.length === 0 && (
              <div className={`text-center py-8 transition-colors duration-300 ${getSecondaryTextClass()}`}>
                <div className="text-4xl mb-4">🚐</div>
                <p>No minibus routes found</p>
              </div>
            )}

            {!loading && !error && routes.length > 0 && (
              <div className="grid gap-4">
                {routes.map((route, index) => (
                  <MinibusRouteCard
                    key={`${route.route_id}-${index}`}
                    route={route}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Nearby Stops Section */}
          <div className={`rounded-lg shadow-md p-6 transition-colors duration-300 ${getCardClass()}`}>
            <h3 className={`text-xl font-bold mb-4 transition-colors duration-300 ${getTextClass()}`}>
              鄰近小巴站 Nearby Minibus Stops ({nearbyStops.length})
            </h3>
            
            {!nearbyLoading && nearbyStops.length > 0 && (
              <div className="grid gap-3">
                {nearbyStops.map((nearbyStop: MinibusStop, index) => (
                  <MinibusStopCard
                    key={`${nearbyStop.stop_id}-${index}`}
                    stop={nearbyStop}
                    onClick={(stop) => navigate(`/minibus/stop/${stop.stop_id}`)}
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