import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MinibusRouteStop } from '../../types';
import { useThemeStyles } from '../../hooks/useThemeStyles';

export interface MinibusRouteStopCardProps {
  routeStop: MinibusRouteStop;
  onClick?: (routeStop: MinibusRouteStop) => void;
}

export const MinibusRouteStopCard: React.FC<MinibusRouteStopCardProps> = ({ routeStop, onClick }) => {
  const { getTextClass, getHoverClass, getSecondaryTextClass } = useThemeStyles();
  const navigate = useNavigate();

  return (
    <div
      className={`flex items-center space-x-3 p-2 rounded ${getHoverClass()} cursor-pointer`}
      onClick={() => {
        if (onClick) {
          onClick(routeStop);
        } else {
          navigate(`/minibus/stop/${routeStop.stop_id}`);
        }
      }}
    >
      <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">
        {routeStop.route_seq}
      </div>
      <div className="flex items-center space-x-2">
        <span className="text-lg">🚐</span>
      </div>
      <div className="flex-1">
        <p className={`text-sm font-medium ${getTextClass()}`}>{routeStop.stop_namec}</p>
        <p className={`text-sm font-medium ${getTextClass()}`}>{routeStop.stop_namee}</p>
      </div>
      <div className="flex flex-col items-end">
        <div className={`text-sm font-medium transition-colors duration-300 ${getTextClass()}`}>
          ${routeStop.fare}
        </div>
        <div className={`text-xs transition-colors duration-300 ${getSecondaryTextClass()}`}>
          Fare
        </div>
      </div>
    </div>
  );
}; 