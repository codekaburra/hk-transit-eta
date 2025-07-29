import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useThemeStyles } from '../../hooks/useThemeStyles';
import { Header } from '../Header';
import { MinibusRouteCard } from './MinibusRouteCard';
import { api } from '../../services/api';
import { MainNavigation } from '../MainNavigation';
import { MinibusETA } from '../../services/utils';

export const MinibusStopDetails: React.FC = () => {
  const { stopId } = useParams<{ stopId: string }>();
  const navigate = useNavigate();
  const [stop, setStop] = useState<any>(null);
  const [routes, setRoutes] = useState<any[]>([]);
  const [etaData, setEtaData] = useState<{ [key: number]: MinibusETA[] }>({});
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
      
      // Sleep for 5 seconds before allowing next request
      await new Promise(resolve => setTimeout(resolve, 5000));
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
        const mappedData: { [key: number]: MinibusETA[] } = {};
        for (const item of responseData.data) {
          mappedData[item.route_id] = item.eta;
        }
        setEtaData(mappedData);
      } else {
        console.log('No ETA data available');
        setEtaData({});
      }
    } catch (error) {
      console.error('Error fetching stop ETA:', error);
      setEtaData({});
      
      // Sleep for 5 seconds before allowing next request
      await new Promise(resolve => setTimeout(resolve, 5000));
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

  const handleRouteClick = (route: any) => {
    navigate(`/minibus/route/${route.route_id}/${route.route_seq}`);
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
                {/* <div>
                  <span className={`ml-2 transition-colors duration-300 ${getSecondaryTextClass()}`}>
                    🚐 Minibus Stop
                  </span>
                </div> */}
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
            即時到站預報 Live Arrivals ({routes.length})
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
                    etaData={etaData[route.route_id]}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Live ETA Section */}
          <div className={`rounded-lg shadow-md p-6 transition-colors duration-300 ${getCardClass()}`}>

          </div>
        </div>
      </main>
    </div>
  );
}; 