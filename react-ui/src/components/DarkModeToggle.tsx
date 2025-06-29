import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { themeMode, toggleTheme } = useTheme();

  const getThemeIcon = () => {
    switch (themeMode) {
      case 'light':
        return (
          <svg className="h-4 w-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
          </svg>
        );
      case 'custom-light':
        return (
          <svg className="h-4 w-4 text-custom-light4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        );
      case 'dark':
        return (
          <svg className="h-4 w-4 text-custom-dark4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getThemeColors = () => {
    switch (themeMode) {
      case 'light':
        return 'bg-gray-200 hover:bg-gray-300';
      case 'custom-light':
        return 'bg-custom-light2 hover:bg-custom-light3';
      case 'dark':
        return 'bg-custom-dark3 hover:bg-custom-dark2';
      default:
        return 'bg-gray-200';
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className={`relative inline-flex h-10 w-20 items-center rounded-full ${getThemeColors()} transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-custom-light4 dark:focus:ring-custom-dark4 focus:ring-offset-2 dark:focus:ring-offset-custom-dark1`}
      aria-label="Toggle theme"
      title={`Current theme: ${themeMode === 'light' ? 'Default Light' : themeMode === 'custom-light' ? 'Custom Light' : 'Dark'}`}
    >
      <span className="inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform duration-300 translate-x-1">
        <div className="flex h-full w-full items-center justify-center">
          {getThemeIcon()}
        </div>
      </span>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-xs font-medium text-gray-600 dark:text-custom-dark4">
          {themeMode === 'light' ? 'L' : themeMode === 'custom-light' ? 'C' : 'D'}
        </div>
      </div>
    </button>
  );
}; 