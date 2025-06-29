import React from 'react';
import { ThemeToggle } from './DarkModeToggle';
import { useThemeStyles } from '../hooks/useThemeStyles';

export const Header: React.FC = () => {
  const { getHeaderClass, getTitleClass } = useThemeStyles();

  return (
    <header className={`shadow-lg transition-colors duration-300 ${getHeaderClass()}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className={`text-3xl font-bold transition-colors duration-300 ${getTitleClass()}`}>
                🚌 香港巴士實時抵站時間 Hong Kong Bus Estimated Time of Arrival
              </h1>
            </div>
          </div>
          <div className="flex items-center">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}; 