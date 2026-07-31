import React, { useCallback } from 'react';
import { RouteStop } from '../../../types';
import { useThemeStyles } from '../../../hooks/useThemeStyles';
import { formatETA } from '../../../services/utils';
import { useNavigate } from 'react-router-dom';
import { BusCompanyIcon } from './BusCompanyIcon';
import { getBusETA } from '../../../services/api';
import { usePollingFetch } from '../../../hooks/usePollingFetch';

export interface RouteStopCardProps {
  routeStop: RouteStop;
  shouldBusCompanyIcon?: boolean;
  onClick?: (routeStop: RouteStop) => void;
}

export const BusRouteStopCard: React.FC<RouteStopCardProps> = ({ routeStop, onClick, shouldBusCompanyIcon = true }) => {
  const { getGrayTextClass, getAccentClass, getHoverClass, getSecondaryTextClass } = useThemeStyles();
  const navigate = useNavigate();

  const fetchETA = useCallback(
    () => getBusETA(
      routeStop.company,
      routeStop.stop,
      routeStop.route,
      routeStop.service_type,
      routeStop.direction
    ),
    [routeStop]
  );
  const { data: etaData } = usePollingFetch<string[]>(routeStop ? fetchETA : null, []);

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
        {routeStop.name_tc || routeStop.name_en ? (
          <>
            <p className={`text-sm font-medium ${getGrayTextClass()}`}>{routeStop.name_tc}</p>
            <p className={`text-sm font-medium ${getGrayTextClass()}`}>{routeStop.name_en}</p>
          </>
        ) : (
          // The operator publishes no details for this stop, but it is still
          // part of the sequence, so show it rather than leaving a blank row.
          <p className={`text-sm italic ${getGrayTextClass()}`}>
            未有站名資料 Stop {routeStop.stop}
          </p>
        )}
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