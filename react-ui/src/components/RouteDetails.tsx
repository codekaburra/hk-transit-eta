import React, { useEffect, useState, useCallback } from 'react';
import { BusRoute, BusStop, RouteStop } from '../types';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { api } from '../services/api';
import { RouteStopCard } from './RouteStopCard';
import { useNavigate } from 'react-router-dom';

export interface RouteDetailsProps {
  route: BusRoute;
  busStop?: BusStop;
  onClose?: () => void;
}

export const RouteDetails: React.FC<RouteDetailsProps> = ({ route, onClose }) => {
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [loadingStops, setLoadingStops] = useState(false);
  const [stopsError, setStopsError] = useState<string | null>(null);

  const fetchRouteStops = useCallback(async () => {
    setLoadingStops(true);
    setStopsError(null);
    try {
      const routeStops = await api.getRouteStops(route.route, route.direction);
      setRouteStops(routeStops);
    } catch (error) {
      setStopsError('Failed to load route stops');
      console.error('Error fetching route stops:', error);
    } finally {
      setLoadingStops(false);
    }
  }, [route]);

  // Load route stops on component mount
  useEffect(() => {
    fetchRouteStops();
  }, [fetchRouteStops]);

  const { 
    getBackgroundClass,
    getCardClass, 
    getTextClass, 
    getSecondaryTextClass, 
    getAccentClass, 
    getBorderClass,
    getHoverClass 
  } = useThemeStyles();
  const navigate = useNavigate();

  return (
    <div className={`min-h-screen ${getBackgroundClass()}`}>
      <div className={`w-full max-w-6xl mx-auto p-4 ${getCardClass()}`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b ${getBorderClass()} ${getCardClass()}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${getAccentClass()}`}>
              <span className="font-bold text-2xl">{route.route}</span>
            </div>
            <div>
              <h2 className={`text-xl font-bold ${getTextClass()}`}>
                {route.company}
              </h2>
              <p className={`text-sm ${getSecondaryTextClass()}`}>
                {route.orig_en} → {route.dest_en}
              </p>
              <p className={`text-sm ${getSecondaryTextClass()}`}>
                {route.orig_tc} → {route.dest_tc}
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors duration-300 ${getHoverClass()}`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Route Stops */}
        <div className={`p-4 rounded-lg border ${getBorderClass()}`}>
          <h3 className={`text-lg font-semibold mb-3 ${getTextClass()}`}>路線途經巴士站 Route Stops</h3>
          {loadingStops ? (
            <p className={`text-sm ${getSecondaryTextClass()}`}>Loading stops...</p>
          ) : stopsError ? (
            <p className={`text-sm text-red-500`}>{stopsError}</p>
          ) : routeStops.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {routeStops.sort((a, b) => parseInt(a.seq) - parseInt(b.seq)).map((routeStop, index) => (
                <RouteStopCard key={index} routeStop={routeStop} onClick={() => navigate(`/stop/${routeStop.stop}`)} />
              ))}
            </div>
          ) : (
            <p className={`text-sm ${getSecondaryTextClass()}`}>No stops data available</p>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}; 