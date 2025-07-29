import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemeStyles } from '../hooks/useThemeStyles';

interface MainNavigationProps {
  currentType?: 'bus-route' | 'bus-stop' | 'minibus-route' | 'minibus-stop';
}

export const MainNavigation: React.FC<MainNavigationProps> = ({ currentType }) => {
  const navigate = useNavigate();
  const { getCardClass, getButtonClass } = useThemeStyles();

  const handleNavigation = (searchType: 'bus-route' | 'bus-stop' | 'minibus-route' | 'minibus-stop') => {
    // Navigate to home with the selected search type
    navigate('/', { state: { searchType } });
  };

  return (
    <div className="flex mb-6 items-center justify-center">
      <div className={`flex flex-wrap space-x-1 rounded-lg p-1 ${getCardClass()} `}>
        <button
          onClick={() => handleNavigation('bus-route')}
          className={`px-4 py-3 font-medium text-base rounded-md transition-colors duration-300 ${getButtonClass(currentType === 'bus-route')}`}
        >
          🚌 巴士路線 Bus Routes
        </button>
        <button
          onClick={() => handleNavigation('bus-stop')}
          className={`px-4 py-3 font-medium text-base rounded-md transition-colors duration-300 ${getButtonClass(currentType === 'bus-stop')}`}
        >
          🚏 巴士站 Bus Stops
        </button>
        <button
          onClick={() => handleNavigation('minibus-route')}
          className={`px-4 py-3 font-medium text-base rounded-md transition-colors duration-300 ${getButtonClass(currentType === 'minibus-route')}`}
        >
          🚐 小巴路線 Minibus Routes
        </button>
        <button
          onClick={() => handleNavigation('minibus-stop')}
          className={`px-4 py-3 font-medium text-base rounded-md transition-colors duration-300 ${getButtonClass(currentType === 'minibus-stop')}`}
        >
          🚏 小巴站 Minibus Stops
        </button>
      </div>
    </div>
  );
}; 