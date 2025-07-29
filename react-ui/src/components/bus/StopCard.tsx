import React, {  } from 'react';
import { StopCardProps } from '../../types';
import { useThemeStyles } from '../../hooks/useThemeStyles';
import { BusCompanyIcon } from './BusCompanyIcon';

export const StopCard: React.FC<StopCardProps> = ({ stop, onClick }) => {
  const { getCardClass, getTextClass, getSecondaryTextClass, getGrayTextClass, getHoverClass, getAccentClass2 } = useThemeStyles();
  return (
    <div 
      className={`rounded-lg shadow-md p-4 transition-all duration-300 cursor-pointer ${getCardClass()} ${getHoverClass()}`}
      onClick={() => onClick && onClick(stop)}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <span className={`text-2xl mr-3 w-12 h-12 rounded-lg flex items-center justify-center transition-colors duration-300 ${getAccentClass2()}`}>🚏</span>
            <div>
              <div className={`text-sm font-medium transition-colors duration-300 ${getGrayTextClass()}`}>
                {stop.name_tc}
              </div>
              <div className={`text-sm transition-colors duration-300 ${getGrayTextClass()}`}>
                {stop.name_en}
              </div>
            </div>
          </div>
        </div>
        <div className="text-gray-400 ml-4">
          <div className={`text-sm transition-colors duration-300 ${getSecondaryTextClass()}`}>
             <BusCompanyIcon company={stop.company} />
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