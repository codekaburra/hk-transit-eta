import React from 'react';
import { MinibusStop } from '../../types';
import { useThemeStyles } from '../../hooks/useThemeStyles';

export interface MinibusStopCardProps {
  stop: MinibusStop;
  onClick?: (stop: MinibusStop) => void;
}

export const MinibusStopCard: React.FC<MinibusStopCardProps> = ({ stop, onClick }) => {
  const { getCardClass, getTextClass, getSecondaryTextClass, getHoverClass } = useThemeStyles();
  
  return (
    <div 
      className={`rounded-lg shadow-md p-4 transition-all duration-300 cursor-pointer ${getCardClass()} ${getHoverClass()}`}
      onClick={() => onClick && onClick(stop)}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <span className="text-2xl mr-3 w-12 h-12 rounded-lg bg-green-100 text-green-600 flex items-center justify-center transition-colors duration-300">
              🚐
            </span>
            <div>
              <div className={`text-sm font-medium transition-colors duration-300 ${getTextClass()}`}>
                {stop.stop_namec}
              </div>
              <div className={`text-sm transition-colors duration-300 ${getSecondaryTextClass()}`}>
                {stop.stop_namee}
              </div>
            </div>
          </div>
        </div>
        <div className="text-gray-400 ml-4">
          <div className={`text-sm transition-colors duration-300 ${getSecondaryTextClass()}`}>
            {stop.district_code}
          </div>
        </div>
        <div className="text-gray-400 ml-4">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
}; 