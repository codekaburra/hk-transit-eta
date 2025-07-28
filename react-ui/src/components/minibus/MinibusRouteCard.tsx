import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MinibusRoute } from '../../types';
import { useThemeStyles } from '../../hooks/useThemeStyles';

export interface MinibusRouteCardProps {
  route: MinibusRoute;
  onClick?: (route: MinibusRoute) => void;
}

export const MinibusRouteCard: React.FC<MinibusRouteCardProps> = ({ route, onClick }) => {
  const navigate = useNavigate();
  const { getHoverClass, getCardClass, getSecondaryTextClass, getAccentClass, getTextClass } = useThemeStyles();

  return (
    <div 
      className={`rounded-lg px-6 py-4 transition-colors duration-300 cursor-pointer ${getCardClass()} ${getHoverClass()}`}
      onClick={() => {
        if (onClick) {
          onClick(route);
        } else {
          navigate(`/minibus/route/${route.route_id}`);
        }
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 flex items-center space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center transition-colors duration-300 bg-green-100 text-green-600">
              <span className="font-bold text-lg">🚐</span>
            </div>
          </div>
          <div>
            <div className={`text-sm font-medium transition-colors duration-300 ${getTextClass()}`}>
              {route.route_namee}
            </div>
            <div className={`text-sm transition-colors duration-300 ${getSecondaryTextClass()}`}>
              {route.route_namec}
            </div>
            <div className={`text-xs transition-colors duration-300 ${getSecondaryTextClass()}`}>
              Company: {route.company_code} • Service: {route.service_mode}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-end">
          <div className={`text-sm font-medium transition-colors duration-300 ${getTextClass()}`}>
            ${route.min_fare} - ${route.max_fare}
          </div>
          <div className={`text-xs transition-colors duration-300 ${getSecondaryTextClass()}`}>
            Full: ${route.full_fare}
          </div>
        </div>
        
        <div className="w-1/5 flex items-center">
          <span className="ml-auto text-2xl">🚐</span>
        </div>
      </div>
    </div>
  );
}; 