import React, { useState, useCallback, useEffect } from 'react';
import { RouteStop } from '../../../types';
import { useThemeStyles } from '../../../hooks/useThemeStyles';
import { formatETA } from '../../../services/utils';
import { useNavigate } from 'react-router-dom';
import { BusCompanyIcon } from './BusCompanyIcon';
import { getBusETA } from '../../../services/api';

export interface RouteStopCardProps {
  routeStop: RouteStop;
  shouldBusCompanyIcon?: boolean;
  onClick?: (routeStop: RouteStop) => void;
}

export const BusRouteStopCard: React.FC<RouteStopCardProps> = ({ routeStop, onClick, shouldBusCompanyIcon = true }) => {
  const [etaData, setEtaData] = useState<string[]>([]);
  const [, setLoadingETA] = useState(false);
  const [, setEtaError] = useState<string | null>(null);
  const { getGrayTextClass, getAccentClass, getHoverClass, getSecondaryTextClass } = useThemeStyles();
  const navigate = useNavigate();

  const fetchETA = useCallback(async () => {
    if (!routeStop) return;
    setLoadingETA(true);
    setEtaError(null);
    try {
      const etaList = await getBusETA(
        routeStop.company,
        routeStop.stop,
        routeStop.route,
        routeStop.service_type,
        routeStop.direction
      );
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
          navigate(`/bus/stop/${routeStop.stop}`);
        }
      }}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${getAccentClass()}`}>
        {routeStop.seq}
      </div>
      <div className="flex-1">
        <p className={`text-sm font-medium ${getGrayTextClass()}`}>{routeStop.name_tc}</p>
        <p className={`text-sm font-medium ${getGrayTextClass()}`}>{routeStop.name_en}</p>
      </div>
      {/* <div className="flex-1">
        <p className={`text-sm font-medium ${getSecondaryTextClass()}`}>stopID: {routeStop.stop}</p>
        <p className={`text-xs ${getSecondaryTextClass()}`}>
          Route: {routeStop.route} | Dir: {routeStop.direction} | Type: {routeStop.service_type}
        </p>
      </div> */}
      <div className="flex items-center space-x-2">
        {shouldBusCompanyIcon && <BusCompanyIcon company={routeStop.company} />}
      </div>
      <div className="flex flex-col">
        {etaData.map((eta, index) => {
          return (
            <div key={`eta-${index}`} className={`text-sm transition-colors duration-300 ${getSecondaryTextClass()}`}>
              {formatETA(eta)}
            </div>
          )
        })}
      </div>
    </div>
  );
}; 