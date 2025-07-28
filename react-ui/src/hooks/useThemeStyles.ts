import { useTheme } from '../contexts/ThemeContext';

export const useThemeStyles = () => {
  const { themeMode } = useTheme();

  const getBackgroundClass = () => {
    switch (themeMode) {
      case 'light':
        return 'bg-light1/80';
      default:
        case 'custom-light':
        return 'bg-custom-light1/80';
      case 'warm':
        return 'bg-warm1/80';
      case 'red':
        return 'bg-red1/80';
      case 'dark':
        return 'bg-custom-dark1/80';
    }
  };

  const getHeaderClass = () => {
    switch (themeMode) {
      case 'light':
        return 'bg-light1 border-light1';
      default:
        case 'custom-light':
        return 'bg-custom-light2 border-custom-light3';
      case 'warm':
        return 'bg-warm3 border-warm2';
      case 'red':
        return 'bg-red3 border-red2';
      case 'dark':
        return 'bg-custom-dark2 border-custom-dark3';
    }
  };

  const getTitleClass = () => {
    switch (themeMode) {
      case 'light':
        return 'text-light3';
      default:
        case 'custom-light':
        return 'text-custom-light4';
      case 'warm':
        return 'text-warm1';
      case 'red':
        return 'text-red1';
      case 'dark':
        return 'text-custom-dark4';
    }
  };

  const getCardClass = () => {
    switch (themeMode) {
      case 'light':
        return 'bg-light3/80 border border-light2';
      default:
        case 'custom-light':
        return 'bg-custom-light1/80 border border-custom-light3';
      case 'warm':
        return 'bg-warm4/80 border border-warm2';
      case 'red':
        return 'bg-red4/80 border border-red3';
      case 'dark':
        return 'bg-custom-dark2/80 border border-custom-dark3';
    }
  };

  const getTextClass = () => {
    switch (themeMode) {
      case 'light':
        return 'text-light3';
      default:
        case 'custom-light':
        return 'text-custom-light4';
      case 'warm':
        return 'text-warm1';
      case 'red':
        return 'text-red1';
      case 'dark':
        return 'text-custom-dark4';
    }
  };

  const getSecondaryTextClass = () => {
    switch (themeMode) {
      case 'light':
        return 'text-light1/80';
      default:
        case 'custom-light':
        return 'text-custom-light4/80';
      case 'warm':
        return 'text-warm1/80';
      case 'red':
        return 'text-red1/80';
      case 'dark':
        return 'text-custom-dark4/80';
    }
  };

  const getBorderClass = () => {
    switch (themeMode) {
      case 'light':
        return 'border-light2';
      default:
      case 'custom-light':
        return 'border-custom-light3';
      case 'warm':
        return 'border-warm2';
      case 'red':
        return 'border-red2';
      case 'dark':
        return 'border-custom-dark3';
    }
  };

  const getInputClass = () => {
    switch (themeMode) {
      case 'light':
        return 'bg-light3 border-light2 text-light1 placeholder-light1/60 focus:border-light1';
      default:
      case 'custom-light':
        return 'bg-custom-light1 border-custom-light3 text-custom-light4 placeholder-custom-light4/60 focus:border-custom-light4';
      case 'warm':
        return 'bg-warm4 border-warm2 text-warm1 placeholder-warm1/60 focus:border-warm1';
      case 'red':
        return 'bg-red4 border-red3 text-red1 placeholder-red1/60 focus:border-red1';
      case 'dark':
        return 'bg-custom-dark1 border-custom-dark3 text-custom-dark4 placeholder-custom-dark4/60 focus:border-custom-dark3';
    }
  };

  const getButtonClass = (isActive: boolean) => {
    if (isActive) {
      switch (themeMode) {
        case 'light':
          return 'bg-light2 text-light1';
        default:
        case 'custom-light':
          return 'bg-custom-light3 text-custom-light4';
        case 'warm':
          return 'bg-warm2 text-warm4';
        case 'red':
          return 'bg-red2 text-red4';
        case 'dark':
          return 'bg-custom-dark3 text-custom-dark4';
      }
    } else {
      switch (themeMode) {
        case 'light':
          return 'text-light1/70 hover:text-light1';
        case 'custom-light':
          return 'text-custom-light4/70 hover:text-custom-light4';
        case 'warm':
          return 'text-warm1/70 hover:text-warm1';
        case 'red':
          return 'text-red1/70 hover:text-red1';
        case 'dark':
          return 'text-custom-dark4/70 hover:text-custom-dark4';
        default:
          return 'text-gray-500 hover:text-gray-700';
      }
    }
  };

  const getHoverClass = () => {
    switch (themeMode) {
      case 'light':
        return 'hover:bg-light2/80';
      default:
      case 'custom-light':
        return 'hover:bg-custom-light2/80';
      case 'warm':
        return 'hover:bg-warm3/80';
      case 'red':
        return 'hover:bg-red3/80';
      case 'dark':
        return 'hover:bg-custom-dark1/80';
    }
  };

  const getAccentClass = () => {
    switch (themeMode) {
      case 'light':
        return 'bg-light4 text-light3';
      default:
      case 'custom-light':
        return 'bg-custom-light3 text-custom-light4';
      case 'warm':
        return 'bg-warm2 text-warm4';
      case 'red':
        return 'bg-red2 text-red4';
      case 'dark':
        return 'bg-custom-dark3 text-custom-dark4';
    }
  };

  const getAccentClass2 = () => {
    switch (themeMode) {
      case 'light':
        return 'bg-light2 text-light1';
      default:
      case 'custom-light':
        return 'bg-custom-light text-custom-light4';
      case 'warm':
        return 'bg-warm2 text-warm4';
      case 'red':
        return 'bg-red3 text-red1';
      case 'dark':
        return 'bg-custom-dark2 text-custom-dark4';
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
    getAccentClass2,
  };
}; 