import React from 'react';
import { RouteCardProps } from '../types';
import { useThemeStyles } from '../hooks/useThemeStyles';

export const RouteCard: React.FC<RouteCardProps> = ({ route }) => {
  const { getHoverClass, getTextClass, getSecondaryTextClass, getAccentClass } = useThemeStyles();
  return (
    <div className={`px-6 py-4 transition-colors duration-300 ${getHoverClass()}`}>
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
      </div>
    </div>
  );
}; 