import { useTheme } from '../contexts/ThemeContext';

export const useThemeStyles = () => {
  const { themeMode } = useTheme();

  const getBackgroundClass = () => {
    switch (themeMode) {
      // case 'light':
      //   return 'bg-gradient-to-br from-blue-50 to-indigo-100';
      default:
        case 'custom-light':
        return 'bg-gradient-to-br from-custom-light1 to-custom-light2';
      case 'warm':
        return 'bg-gradient-to-br from-warm4 to-warm3';
      case 'dark':
        return 'bg-gradient-to-br from-custom-dark1 via-custom-dark2 to-custom-dark1';
    }
  };

  const getHeaderClass = () => {
    switch (themeMode) {
      // case 'light':
      //   return 'bg-white';
      default:
        case 'custom-light':
        return 'bg-custom-light2 border-custom-light3';
      case 'warm':
        return 'bg-warm3 border-warm2';
      case 'dark':
        return 'bg-custom-dark2 border-custom-dark3';
    }
  };

  const getTitleClass = () => {
    switch (themeMode) {
      // case 'light':
      //   return 'text-gray-900';
      default:
        case 'custom-light':
        return 'text-custom-light4';
      case 'warm':
        return 'text-warm1';
      case 'dark':
        return 'text-custom-dark4';
    }
  };

  const getCardClass = () => {
    switch (themeMode) {
      // case 'light':
      //   return 'bg-white';
      default:
        case 'custom-light':
        return 'bg-custom-light1 border border-custom-light3';
      case 'warm':
        return 'bg-warm4 border border-warm2';
      case 'dark':
        return 'bg-custom-dark2 border border-custom-dark3';
    }
  };

  const getTextClass = () => {
    switch (themeMode) {
      // case 'light':
      //   return 'text-gray-900';
      default:
        case 'custom-light':
        return 'text-custom-light4';
      case 'warm':
        return 'text-warm1';
      case 'dark':
        return 'text-custom-dark4';
    }
  };

  const getSecondaryTextClass = () => {
    switch (themeMode) {
      // case 'light':
      //   return 'text-gray-600';
      default:
        case 'custom-light':
        return 'text-custom-light4/80';
      case 'warm':
        return 'text-warm1/80';
      case 'dark':
        return 'text-custom-dark4/80';
    }
  };

  const getBorderClass = () => {
    switch (themeMode) {
      // case 'light':
      //   return 'border-gray-200';
      default:
      case 'custom-light':
        return 'border-custom-light3';
      case 'warm':
        return 'border-warm2';
      case 'dark':
        return 'border-custom-dark3';
    }
  };

  const getInputClass = () => {
    switch (themeMode) {
      // case 'light':
      //   return 'bg-white border-gray-300 text-gray-900 focus:border-indigo-500';
      default:
      case 'custom-light':
        return 'bg-custom-light1 border-custom-light3 text-custom-light4 placeholder-custom-light4/60 focus:border-custom-light4';
      case 'warm':
        return 'bg-warm4 border-warm2 text-warm1 placeholder-warm1/60 focus:border-warm1';
      case 'dark':
        return 'bg-custom-dark1 border-custom-dark3 text-custom-dark4 placeholder-custom-dark4/60 focus:border-custom-dark3';
    }
  };

  const getButtonClass = (isActive: boolean) => {
    if (isActive) {
      switch (themeMode) {
        // case 'light':
        //   return 'bg-indigo-100 text-indigo-700';
        default:
        case 'custom-light':
          return 'bg-custom-light3 text-custom-light4';
        case 'warm':
          return 'bg-warm2 text-warm4';
        case 'dark':
          return 'bg-custom-dark3 text-custom-dark4';
      }
    } else {
      switch (themeMode) {
        // case 'light':
        //   return 'text-gray-500 hover:text-gray-700';
        case 'custom-light':
          return 'text-custom-light4/70 hover:text-custom-light4';
        case 'warm':
          return 'text-warm1/70 hover:text-warm1';
        case 'dark':
          return 'text-custom-dark4/70 hover:text-custom-dark4';
        default:
          return 'text-gray-500 hover:text-gray-700';
      }
    }
  };

  const getHoverClass = () => {
    switch (themeMode) {
      // case 'light':
      //   return 'hover:bg-gray-50';
      default:
      case 'custom-light':
        return 'hover:bg-custom-light2';
      case 'warm':
        return 'hover:bg-warm3';
      case 'dark':
        return 'hover:bg-custom-dark1';
    }
  };

  const getAccentClass = () => {
    switch (themeMode) {
      // case 'light':
      //   return 'bg-indigo-100 text-indigo-600';
      default:
      case 'custom-light':
        return 'bg-custom-light3 text-custom-light4';
      case 'warm':
        return 'bg-warm2 text-warm4';
      case 'dark':
        return 'bg-custom-dark3 text-custom-dark4';
    }
  };

  return {
    getBackgroundClass,
    getHeaderClass,
    getTitleClass,
    getCardClass,
    getTextClass,
    getSecondaryTextClass,
    getBorderClass,
    getInputClass,
    getButtonClass,
    getHoverClass,
    getAccentClass,
  };
}; 