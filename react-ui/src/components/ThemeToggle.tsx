import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { themeMode, toggleTheme } = useTheme();

  const getThemeIcon = () => {
    switch (themeMode) {
      case 'light':
        return (
          <svg className="h-4 w-4 text-light1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
          </svg>
        );
      // case 'custom-light':
      //   return (
      //     <svg className="h-4 w-4 text-custom-light4" fill="currentColor" viewBox="0 0 20 20">
      //       <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      //     </svg>
      //   );
      // case 'warm':
      //   return (
      //     <svg className="h-4 w-4 text-warm1" fill="currentColor" viewBox="0 0 20 20">
      //       <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
      //     </svg>
      //   );
      case 'dark':
        return (
          <svg className="h-4 w-4 text-dark4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        );
      default:
        return (
          <svg className="h-4 w-4 text-custom-light4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        );
    }
  };

  const getThemeColors = () => {
    switch (themeMode) {
      case 'light':
        return 'bg-light2 hover:bg-light1';
      case 'custom-light':
        return 'bg-custom-light2 hover:bg-custom-light3';
      case 'warm':
        return 'bg-warm2 hover:bg-warm1';
      case 'red':
        return 'bg-red2 hover:bg-red1';
      case 'dark':
        return 'bg-dark3 hover:bg-dark2';
      default:
        return 'bg-dark3 hover:bg-dark2';
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className={`inline-flex items-center justify-center h-12 w-12 rounded-full ${getThemeColors()} transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-custom-light4 dark:focus:ring-custom-dark4 focus:ring-offset-2 dark:focus:ring-offset-custom-dark1`}
      aria-label="Toggle theme"
      title="Toggle theme"
    >
        {getThemeIcon()}
    </button>
  );
}; 