import React, { useEffect, useState, useCallback } from 'react';
import { RouteCardProps } from '../types';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { ETAData, api } from '../services/api';

export const RouteCard: React.FC<RouteCardProps> = ({  route, busStop, onClick }) => {

  const [etaData, setEtaData] = useState<string[]>([]);
  const [loadingETA, setLoadingETA] = useState(false);
  const [etaError, setEtaError] = useState<string | null>(null);
  
  const fetchETA = useCallback(async () => {
    if (!busStop) return; // Only fetch for Citybus stops
    
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
      const interval = setInterval(fetchETA, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
  }, [fetchETA]);
  
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
  

  const { getHoverClass, getCardClass, getSecondaryTextClass, getAccentClass } = useThemeStyles();
  return (
    <div 
      className={`rounded-lg px-6 py-4 transition-colors duration-300 cursor-pointer ${getCardClass()} ${getHoverClass()}`}
      onClick={() => onClick?.(route)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors duration-300 ${getAccentClass()}`}>
              <span className="font-bold text-lg">{route.route}</span>
            </div>
          </div>
          <div>
            {/* <div className={`text-sm font-medium transition-colors duration-300 ${getTextClass()}`}>
              Route {route.route} ({route.bound === '1' ? 'Inbound' : 'Outbound'})
            </div> */}
            <div className={`text-sm transition-colors duration-300 ${getSecondaryTextClass()}`}>
              {route.orig_en} → {route.dest_en}
            </div>
            <div className={`text-sm transition-colors duration-300 ${getSecondaryTextClass()}`}>
              {route.orig_tc} → {route.dest_tc}
            </div>
          </div>
        </div>
        {/* <div className={`text-sm transition-colors duration-300 ${getSecondaryTextClass()}`}>
          Service Type: {route.service_type}
        </div> */}
          <div className="flex flex-col">
          {etaData.map((eta) => {
            return (
              <div className={`text-sm transition-colors duration-300 ${getSecondaryTextClass()}`}>
                {formatETA(eta)}
              </div>
            )
          })}
          </div>
      </div>
    </div>
  );
}; 