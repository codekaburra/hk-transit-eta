import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../Header';
import { BusRoute, RouteStop } from '../../types';
import { api } from '../../services/api';
import { useThemeStyles } from '../../hooks/useThemeStyles';
import { RouteStopCard } from './RouteStopCard';
import { BusCompanyIcon } from './BusCompanyIcon';
import { RouteMapCard, convertBusRouteStopsToMapStops } from '../RouteMapCard';

export const RouteDetails: React.FC = () => {
  const { routeId } = useParams<{ routeId: string }>();
  const navigate = useNavigate();
  const [route, setRoute] = useState<BusRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
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
        
        // Search for the route by ID
        const routes = await api.searchRoutes(routeId);
        
        if (routes.length > 0) {
          // Use the first matching route
          setRoute(routes[0]);
        } else {
          setError('Route not found');
        }
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
    
    // Validate route parameter
    if (!route.route) {
      setStopsError(`Missing route parameter: ${route.route}`);
      return;
    }
    
    setLoadingStops(true);
    setStopsError(null);
    try {
      let effectiveDirection = route.direction;
      
      // If direction is empty or invalid, try to find available directions
      if (!effectiveDirection || effectiveDirection.trim() === '') {
        const allRoutes = await api.searchRoutes(route.route);
        const routesWithDirection = allRoutes.filter(r => r.route === route.route && r.direction && r.direction.trim() !== '');
        
        if (routesWithDirection.length > 0) {
          effectiveDirection = routesWithDirection[0].direction;
          console.log('Found route with direction:', effectiveDirection);
          
          // Update the route object with the found direction
          setRoute({...route, direction: effectiveDirection});
        } else {
          setStopsError('No valid direction found for this route');
          return;
        }
      }
      
      const stops = await api.getBusRouteStops(route.route, effectiveDirection);
      setRouteStops(stops);
    } catch (error) {
      console.error('Error fetching route stops:', error);
      setStopsError(`Failed to load route stops: ${error}`);
    } finally {
      setLoadingStops(false);
    }
  }, [route]);

  // Load route stops when route is loaded
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
          <p className={`text-lg ${getTextClass()}`}>Loading route details...</p>
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
                <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${getAccentClass()}`}>
                  <span className="font-bold text-2xl">{route.route}</span>
                </div>
                <div>
                  <h1 className={`text-3xl font-bold mb-2 transition-colors duration-300 ${getTextClass()}`}>
                    <BusCompanyIcon company={route.company} />
                  </h1>
                  <h2 className={`text-xl mb-2 transition-colors duration-300 ${getSecondaryTextClass()}`}>
                    {route.orig_en} → {route.dest_en}
                  </h2>
                  <p className={`text-lg transition-colors duration-300 ${getSecondaryTextClass()}`}>
                    {route.orig_tc} → {route.dest_tc}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Route Stops */}
        <div className={`rounded-lg shadow-md p-6 transition-colors duration-300 ${getCardClass()}`}>
          <h3 className={`text-lg font-semibold mb-3 ${getTextClass()}`}>路線途經巴士站 Route Stops</h3>
          {loadingStops ? (
            <p className={`text-sm ${getSecondaryTextClass()}`}>Loading stops...</p>
          ) : stopsError ? (
            <p className={`text-sm text-red-500`}>{stopsError}</p>
          ) : routeStops.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {routeStops.sort((a, b) => parseInt(a.seq) - parseInt(b.seq)).map((routeStop, index) => (
                <RouteStopCard key={index} shouldBusCompanyIcon={false} routeStop={routeStop} onClick={() => navigate(`/stop/${routeStop.stop}`)} />
              ))}
            </div>
          ) : (
            <p className={`text-sm ${getSecondaryTextClass()}`}>No stops data available</p>
          )}
        </div>

        {/* Route Map */}
        {routeStops.length > 0 && (
          <RouteMapCard routeStops={convertBusRouteStopsToMapStops(routeStops)} />
        )}
      </main>
    </div>
  );
}; 