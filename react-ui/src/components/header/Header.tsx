import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';
import { Clock } from './Clock';
import { useThemeStyles } from '../../hooks/useThemeStyles';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const { getHeaderClass, getTitleClass, getHoverClass } = useThemeStyles();

  const handleTitleClick = () => {
    navigate('/');
  };

  return (
    <header className={`shadow-lg transition-colors duration-300 ${getHeaderClass()}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <button
                onClick={handleTitleClick}
                className={`text-3xl font-bold transition-all duration-300 ${getTitleClass()} ${getHoverClass()} hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-300 rounded-lg px-2 py-1`}
              >
                * ੈ✩‧₊˚─=≡Σ(っﾟДﾟ)っ
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <Clock />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}; 