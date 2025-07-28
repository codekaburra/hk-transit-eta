import React from 'react';
import { useThemeStyles } from '../../hooks/useThemeStyles';

interface MinibusStopCardProps {
  stop: any;
  onClick?: (stop: any) => void;
}

export const MinibusStopCard: React.FC<MinibusStopCardProps> = ({ stop, onClick }) => {
  const { getCardClass, getTextClass, getSecondaryTextClass, getHoverClass } = useThemeStyles();

  const handleClick = () => {
    if (onClick) {
      onClick(stop);
    }
  };

  return (
    <div 
      className={`rounded-lg shadow-md p-4 transition-all duration-300 hover:shadow-lg cursor-pointer ${getCardClass()} ${getHoverClass()}`}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className={`text-lg font-bold transition-colors duration-300 ${getTextClass()}`}>
              {stop.stop_id}
            </h3>
          </div>
          
          <div className="space-y-1">
            <p className={`text-sm font-medium transition-colors duration-300 ${getTextClass()}`}>
              {stop.name_tc}
            </p>
            <p className={`text-sm transition-colors duration-300 ${getSecondaryTextClass()}`}>
              {stop.name_en}
            </p>
            
            {/* Show coordinates if available */}
            {stop.latitude && stop.longitude && (
              <div className={`text-xs transition-colors duration-300 ${getSecondaryTextClass()}`}>
                📍 {parseFloat(stop.latitude).toFixed(4)}, {parseFloat(stop.longitude).toFixed(4)}
              </div>
            )}
          </div>
        </div>
        
        {/* Minibus Stop Icon */}
        <div className="ml-4 flex-shrink-0">
          <div className="w-10 h-8 bg-green-100 rounded-md flex items-center justify-center">
            <span className="text-sm">🚐🚏</span>
          </div>
        </div>
      </div>
    </div>
  );
}; 