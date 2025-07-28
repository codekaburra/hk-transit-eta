import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RouteDetails } from './RouteDetails';
import { BusRoute } from '../types';
import { api } from '../services/api';
import { useThemeStyles } from '../hooks/useThemeStyles';

export const RouteDetailsPage: React.FC = () => {
  const { routeId } = useParams<{ routeId: string }>();
  const navigate = useNavigate();
  const [route, setRoute] = useState<BusRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { getTextClass, getSecondaryTextClass } = useThemeStyles();

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

  const handleClose = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className={`text-lg ${getTextClass()}`}>Loading route details...</p>
        </div>
      </div>
    );
  }

  if (error || !route) {
    return (
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
    );
  }

  return (
    <RouteDetails 
      route={route} 
      onClose={handleClose}
    />
  );
}; 