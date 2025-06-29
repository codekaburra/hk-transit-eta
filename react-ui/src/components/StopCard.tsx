import React from 'react';
import { StopCardProps } from '../types';
import { useThemeStyles } from '../hooks/useThemeStyles';

export const StopCard: React.FC<StopCardProps> = ({ stop }) => {
  const { getHoverClass, getTextClass, getSecondaryTextClass, getAccentClass } = useThemeStyles();

  return (
    <div className={`px-6 py-4 transition-colors duration-300 ${getHoverClass()}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors duration-300 ${getAccentClass()}`}>
              <span className="font-bold text-lg">🚏</span>
            </div>
          </div>
        </div>
            <div className={`text-sm transition-colors duration-300 ${getSecondaryTextClass()}`}>
            {stop.name_tc}
            </div>
            <div className={`text-sm font-medium transition-colors duration-300 ${getTextClass()}`}>
              {stop.name_en}
            </div>
        {/* <div className={`text-sm transition-colors duration-300 ${getSecondaryTextClass()}`}>
              ID: {stop.stop}
        </div>
        <div className={`text-sm transition-colors duration-300 ${getSecondaryTextClass()}`}>
          {stop.lat}, {stop.long}
        </div> */}
      </div>
    </div>
  );
}; 