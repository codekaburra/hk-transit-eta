import { useTheme } from '../contexts/ThemeContext';

export const THEME_MODES = ['light', 'dark', 'red', 'warm'] as const;

export const useThemeStyles = () => {
  const { themeMode } = useTheme();

  const getBackgroundClass = () => {
    switch (themeMode) {
      default:
      case 'light':
        return 'bg-light1/80';
      case 'warm':
        return 'bg-warm1/80';
      case 'red':
        return 'bg-red1/80';
      case 'dark':
        return 'bg-dark1/80';
    }
  };

  const getHeaderClass = () => {
    switch (themeMode) {
      // case 'light':
      //   return 'bg-light1 border-light1';
      default:
      case 'light':
        return 'bg-light2 border-light3';
      case 'warm':
        return 'bg-warm3 border-warm2';
      case 'red':
        return 'bg-red3 border-red2';
      case 'dark':
        return 'bg-dark2 border-dark3';
    }
  };

  const getTitleClass = () => {
    switch (themeMode) {
      default:
      case 'light':
        return 'text-light4';
      case 'warm':
        return 'text-warm1';
      case 'red':
        return 'text-red1';
      case 'dark':
        return 'text-dark4';
    }
  };

  const getCardClass = () => {
    switch (themeMode) {
      default:
      case 'light':
        return 'bg-light1/80 border border-light3';
      case 'warm':
        return 'bg-warm4/80 border border-warm2';
      case 'red':
        return 'bg-red4/80 border border-red3';
      case 'dark':
        return 'bg-dark2/80 border border-dark3';
    }
  };

  const getTextClass = () => {
    switch (themeMode) {
      default:
      case 'light':
        return 'text-light4';
      case 'warm':
        return 'text-warm1';
      case 'red':
        return 'text-red1';
      case 'dark':
        return 'text-dark4';
    }
  };

  const getSecondaryTextClass = () => {
    switch (themeMode) {
      default:
      case 'light':
        return 'text-light4/80';
      case 'warm':
        return 'text-warm1/80';
      case 'red':
        return 'text-red1/80';
      case 'dark':
        return 'text-dark4/80';
    }
  };

  const getBorderClass = () => {
    switch (themeMode) {
      default:
      case 'light':
        return 'border-light3';
      case 'warm':
        return 'border-warm2';
      case 'red':
        return 'border-red2';
      case 'dark':
        return 'border-dark3';
    }
  };

  const getInputClass = () => {
    switch (themeMode) {
      default:
      case 'light':
        return 'bg-light1 border-light3 text-light4 placeholder-light4/60 focus:border-light4';
      case 'warm':
        return 'bg-warm4 border-warm2 text-warm1 placeholder-warm1/60 focus:border-warm1';
      case 'red':
        return 'bg-red4 border-red3 text-red1 placeholder-red1/60 focus:border-red1';
      case 'dark':
        return 'bg-dark1 border-dark3 text-dark4 placeholder-dark4/60 focus:border-dark3';
    }
  };

  const getButtonClass = (isActive: boolean) => {
    if (isActive) {
      switch (themeMode) {
        default:
        case 'light':
          return 'bg-light3 text-light4';
        case 'warm':
          return 'bg-warm2 text-warm4';
        case 'red':
          return 'bg-red1 text-red4';
        case 'dark':
          return 'bg-dark3 text-dark4';
      }
    } else {
      switch (themeMode) {
        default:
        case 'light':
          return 'text-light4/70 hover:text-light4';
        case 'warm':
          return 'text-warm1/70 hover:text-warm1';
        case 'red':
          return 'text-red1/70 hover:text-red1';
        case 'dark':
          return 'text-dark4/70 hover:text-dark4';
      }
    }
  };

  const getHoverClass = () => {
    switch (themeMode) {
      default:
      case 'light':
        return 'hover:bg-light2/80';
      case 'warm':
        return 'hover:bg-warm3/80';
      case 'red':
        return 'hover:bg-red3/80';
      case 'dark':
        return 'hover:bg-dark1/80';
    }
  };

  const getAccentClass = () => {
    switch (themeMode) {
      default:
      case 'light':
        return 'bg-light3 text-light4';
      case 'warm':
        return 'bg-warm2 text-warm4';
      case 'red':
        return 'bg-red2 text-red4';
      case 'dark':
        return 'bg-dark3 text-dark4';
    }
  };

  const getAccentClass2 = () => {
    switch (themeMode) {
      default:
      case 'light':
        return 'bg-light text-light4';
      case 'warm':
        return 'bg-warm2 text-warm4';
      case 'red':
        return 'bg-red3 text-red1';
      case 'dark':
        return 'bg-dark2 text-dark4';
    }
  };

  const getGrayTextClass = () => {
    switch (themeMode) {
      case 'dark':
        return 'text-gray-200';
      default:
        return 'text-gray-800';
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
    getGrayTextClass,
  };
}; 