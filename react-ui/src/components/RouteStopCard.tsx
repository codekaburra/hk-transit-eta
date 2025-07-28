import React, { useState, useCallback, useEffect } from 'react';
import { RouteStop } from '../types';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { formatETA } from '../services/utils';
import { useNavigate } from 'react-router-dom';
import { BusCompanyIcon } from './BusCompanyIcon';

export interface RouteStopCardProps {
  routeStop: RouteStop;
  shouldBusCompanyIcon?: boolean;
  onClick?: (routeStop: RouteStop) => void;
}

export const RouteStopCard: React.FC<RouteStopCardProps> = ({ routeStop, onClick, shouldBusCompanyIcon = true }) => {
  const [etaData, setEtaData] = useState<string[]>([]);
  const [loadingETA, setLoadingETA] = useState(false);
  const [etaError, setEtaError] = useState<string | null>(null);
  const { getTextClass, getAccentClass, getHoverClass, getSecondaryTextClass } = useThemeStyles();
  const navigate = useNavigate();

  const fetchETA = useCallback(async () => {
    if (!routeStop) return;
    setLoadingETA(true);
    setEtaError(null);
    try {
      let url = '';
      if (routeStop.company === 'KMB') {
        // Fetch from KMB public API directly
        url = `https://data.etabus.gov.hk/v1/transport/kmb/eta/${routeStop.stop}/${routeStop.route}/${routeStop.service_type}`;
      } else if (routeStop.company === 'CTB') {
        // Fetch from Citybus public API directly
        url = `https://rt.data.gov.hk/v2/transport/citybus/eta/ctb/${routeStop.stop}/${routeStop.route}`;
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch Citybus ETA');
      const data = await response.json();
      const etaList = (data.data || []).filter((item: any) => routeStop.direction === item.dir).map((item: any) => item.eta);
      setEtaData(etaList);
      
    } catch (error) {
      setEtaError('Failed to load ETA data');
      console.error('Error fetching ETA:', error);
    } finally {
      setLoadingETA(false);
    }
  }, [routeStop]);
  
  // Auto-refresh ETA data every 30 seconds
  useEffect(() => {
    fetchETA();
    const interval = setInterval(fetchETA, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
}, [fetchETA]);

  return (
    <div
      className={`flex items-center space-x-3 p-2 rounded ${getHoverClass()} cursor-pointer`}
      onClick={() => {
        if (onClick) {
          onClick(routeStop);
        } else {
          navigate(`/stop/${routeStop.stop}`);
        }
      }}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${getAccentClass()}`}>
        {routeStop.seq}
      </div>
      <div className="flex-1">
        <p className={`text-sm font-medium ${getTextClass()}`}>{routeStop.name_tc}</p>
        <p className={`text-sm font-medium ${getTextClass()}`}>{routeStop.name_en}</p>
      </div>
      <div className="flex items-center space-x-2">
        {shouldBusCompanyIcon && <BusCompanyIcon company={routeStop.company} />}
      </div>
      <div className="flex flex-col">
        {etaData.map((eta, index) => {
          return (
            <div key={`eta-${index}`} className={`text-sm transition-colors duration-300 ${getSecondaryTextClass()}`}>
              {formatETA(eta)}
              {/* {eta.toString()} */}
            </div>
          )
        })}
      </div>
    </div>
  );
}; 