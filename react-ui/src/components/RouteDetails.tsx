import React, { useEffect, useState, useCallback } from 'react';
import { BusRoute, BusStop, RouteStop } from '../types';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { api } from '../services/api';

export interface RouteDetailsProps {
  route: BusRoute;
  busStop?: BusStop;
  onClose?: () => void;
}

export const RouteDetails: React.FC<RouteDetailsProps> = ({ route, busStop, onClose }) => {
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [etaData, setEtaData] = useState<string[]>([]);
  const [loadingStops, setLoadingStops] = useState(false);
  const [loadingETA, setLoadingETA] = useState(false);
  const [stopsError, setStopsError] = useState<string | null>(null);
  const [etaError, setEtaError] = useState<string | null>(null);

  const fetchRouteStops = useCallback(async () => {
    setLoadingStops(true);
    setStopsError(null);
    try {
      const stops = await api.getRouteStops(route.route, route.direction);
      setRouteStops(stops);
    } catch (error) {
      setStopsError('Failed to load route stops');
      console.error('Error fetching route stops:', error);
    } finally {
      setLoadingStops(false);
    }
  }, [route]);

  const fetchETA = useCallback(async () => {
    if (!busStop) return;
    
    setLoadingETA(true);
    setEtaError(null);
    try {
      if (busStop.company === 'CTB') {
        const etaResults = await api.getCitybusETA(busStop.stop, route);
        setEtaData(etaResults);
      } else if (busStop.company === 'KMB') {
        const etaResults = await api.getKmbETA(busStop.stop, route);
        setEtaData(etaResults);
      }
    } catch (error) {
      setEtaError('Failed to load ETA data');
      console.error('Error fetching ETA:', error);
    } finally {
      setLoadingETA(false);
    }
  }, [busStop, route]);

  // Auto-refresh ETA data every 30 seconds
  useEffect(() => {
    fetchETA();
    const interval = setInterval(fetchETA, 30000);
    return () => clearInterval(interval);
  }, [fetchETA]);

  // Load route stops on component mount
  useEffect(() => {
    fetchRouteStops();
  }, [fetchRouteStops]);

  // Format ETA time
  const formatETA = (etaString: string) => {
    try {
      const etaDate = new Date(etaString);
      const etaDateString = etaDate.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' });
      const now = new Date();
      const diffMs = etaDate.getTime() - now.getTime();
      const diffMins = Math.round(diffMs / 60000);
      
      if (diffMins <= 0) return 'Arriving';
      if (diffMins < 60) return `${etaDateString} - ${diffMins}m`;
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${etaDateString} ${hours}h ${mins}m`;
    } catch {
      return '';
    }
  };

  const { 
    getCardClass, 
    getTextClass, 
    getSecondaryTextClass, 
    getAccentClass, 
    getBorderClass,
    getButtonClass,
    getHoverClass 
  } = useThemeStyles();

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4`}>
      <div className={`max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-lg shadow-xl ${getCardClass()}`}>
        {/* Header */}
        <div className={`sticky top-0 z-10 px-6 py-4 border-b ${getBorderClass()} ${getCardClass()}`}>
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
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors duration-300 ${getHoverClass()}`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* ETA Information */}
          {busStop && (
            <div className={`p-4 rounded-lg border ${getBorderClass()}`}>
              <h3 className={`text-lg font-semibold mb-3 ${getTextClass()}`}>
                ETA at {busStop.name_en}
              </h3>
              {loadingETA ? (
                <p className={`text-sm ${getSecondaryTextClass()}`}>Loading ETA...</p>
              ) : etaError ? (
                <p className={`text-sm text-red-500`}>{etaError}</p>
              ) : etaData.length > 0 ? (
                <div className="space-y-2">
                  {etaData.map((eta, index) => (
                    <div key={index} className={`text-lg font-medium ${getTextClass()}`}>
                      {formatETA(eta)}
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`text-sm ${getSecondaryTextClass()}`}>No ETA data available</p>
              )}
            </div>
          )}

          {/* Route Stops */}
          <div className={`p-4 rounded-lg border ${getBorderClass()}`}>
            <h3 className={`text-lg font-semibold mb-3 ${getTextClass()}`}>路線途經巴士站 Route Stops</h3>
            {loadingStops ? (
              <p className={`text-sm ${getSecondaryTextClass()}`}>Loading stops...</p>
            ) : stopsError ? (
              <p className={`text-sm text-red-500`}>{stopsError}</p>
            ) : routeStops.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {routeStops.sort((a, b) => parseInt(a.seq) - parseInt(b.seq)).map((stop, index) => (
                  <div key={index} className={`flex items-center space-x-3 p-2 rounded ${getHoverClass()}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${getAccentClass()}`}>
                      {stop.seq}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${getTextClass()}`}>{stop.name_tc}</p>
                      <p className={`text-sm font-medium ${getTextClass()}`}>{stop.name_en}</p>
                    </div>
                  </div>
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