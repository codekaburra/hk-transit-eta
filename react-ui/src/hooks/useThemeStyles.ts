import { useTheme } from '../contexts/ThemeContext';

export const THEME_MODES = ['light', 'dark', 'red', 'warm'] as const;

export const useThemeStyles = () => {
  const { themeMode } = useTheme();

  const getBackgroundClass = () => {
    switch (themeMode) {
      default:
      case 'light':
        return 'bg-light3/80';
      case 'warm':
        return 'bg-warm2/80';
      case 'red':
        return 'bg-red3/80';
      case 'dark':
        return 'bg-dark4/80';
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
        return 'bg-warm3 border-warm3';
      case 'red':
        return 'bg-red2 border-red3';
      case 'dark':
        return 'bg-dark3 border-dark2';
    }
  };

  const getTitleClass = () => {
    switch (themeMode) {
      default:
      case 'light':
        return 'text-light4';
      case 'warm':
        return 'text-warm4';
      case 'red':
        return 'text-red4';
      case 'dark':
        return 'text-dark1';
    }
  };

  const getCardClass = () => {
    switch (themeMode) {
      default:
      case 'light':
        return 'bg-light1/80 border border-light3';
      case 'warm':
        return 'bg-warm2/50 border border-warm3/50';
      case 'red':
        return 'bg-red2/80 border border-red2';
      case 'dark':
        return 'bg-dark3/80 border border-dark2';
    }
  };

  const getTextClass = () => {
    switch (themeMode) {
      default:
      case 'light':
        return 'text-light4';
      case 'warm':
        return 'text-warm4';
      case 'red':
        return 'text-red3';
      case 'dark':
        return 'text-dark1';
    }
  };

  const getSecondaryTextClass = () => {
    switch (themeMode) {
      default:
      case 'light':
        return 'text-light4/80';
      case 'warm':
        return 'text-warm4/80';
      case 'red':
        return 'text-red3/80';
      case 'dark':
        return 'text-dark1/80';
    }
  };

  const getBorderClass = () => {
    switch (themeMode) {
      default:
      case 'light':
        return 'border-light3';
      case 'warm':
        return 'border-warm3/50';
      case 'red':
        return 'border-red3';
      case 'dark':
        return 'border-dark2';
    }
  };

  const getSecondaryBorderClass = () => {
    switch (themeMode) {
      default:
      case 'light':
        return 'border border-light2';
      case 'warm':
        return 'border border-warm2';
      case 'red':
        return 'border border-red3';
      case 'dark':
        return 'border border-dark2';
    }
  };

  const getInputClass = () => {
    switch (themeMode) {
      default:
      case 'light':
        return 'bg-light1/80 border-light3 text-light4 placeholder-light4/60 focus:border-light4';
      case 'warm':
        return 'bg-warm1/80 border-warm3 text-warm4 placeholder-warm4/60 focus:border-warm4';
      case 'red':
        return 'bg-red1/80 border-red2 text-red3 placeholder-red3/60 focus:border-red3';
      case 'dark':
        return 'bg-dark4/80 border-dark2 text-dark1 placeholder-dark1/60 focus:border-dark2';
    }
  };

  const getButtonClass = (isActive: boolean) => {
    if (isActive) {
      switch (themeMode) {
        default:
        case 'light':
          return 'bg-light3 text-light4';
        case 'warm':
          return 'bg-warm3 text-warm1';
        case 'red':
          return 'bg-red3 text-red1';
        case 'dark':
          return 'bg-dark2 text-dark1';
      }
    } else {
      switch (themeMode) {
        default:
        case 'light':
          return 'text-light4/70 hover:text-light4';
        case 'warm':
          return 'text-warm4/70 hover:text-warm4';
        case 'red':
          return 'text-red3/70 hover:text-red3';
        case 'dark':
          return 'text-dark1/70 hover:text-dark4';
      }
    }
  };

  const getHoverClass = () => {
    switch (themeMode) {
      default:
      case 'light':
        return 'hover:bg-light2/80';
      case 'warm':
        return 'hover:bg-warm2/80';
      case 'red':
        return 'hover:bg-red2/80';
      case 'dark':
        return 'hover:bg-dark4/80';
    }
  };

  const getAccentClass = () => {
    switch (themeMode) {
      default:
      case 'light':
        return 'bg-light3 text-light4';
      case 'warm':
        return 'bg-warm3 text-warm1';
      case 'red':
        return 'bg-red3 text-red1';
      case 'dark':
        return 'bg-dark2 text-dark1';
    }
  };

  const getAccentClass2 = () => {
    switch (themeMode) {
      default:
      case 'light':
        return 'bg-light text-light4';
      case 'warm':
        return 'bg-warm3 text-warm1';
      case 'red':
        return 'bg-red3 text-red1';
      case 'dark':
        return 'bg-dark3 text-dark1';
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
    getSecondaryBorderClass,
    getInputClass,
    getButtonClass,
    getHoverClass,
    getAccentClass,
    getAccentClass2,
    getGrayTextClass,
  };
}; 