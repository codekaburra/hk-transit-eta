import React, { createContext, useContext, useEffect, useState } from 'react';
import { THEME_MODES } from '../hooks/useThemeStyles';

type ThemeMode = typeof THEME_MODES[number];

interface ThemeContextType {
  themeMode: ThemeMode;
  isDarkMode: boolean;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    // Check localStorage for saved preference
    const saved = localStorage.getItem('themeMode');
    if (saved && THEME_MODES.includes(saved as ThemeMode)) {
      return saved as ThemeMode;
    }
    // Check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const isDarkMode = themeMode === 'dark';

  useEffect(() => {
    // Save preference to localStorage
    localStorage.setItem('themeMode', themeMode);
    
    // Apply theme classes to document
    document.documentElement.classList.remove(...THEME_MODES);
    document.documentElement.classList.add(themeMode);
  }, [themeMode]);

  const toggleTheme = () => {
    const currentIndex = THEME_MODES.indexOf(themeMode);
    const nextIndex = (currentIndex + 1) % THEME_MODES.length;
    setThemeMode(THEME_MODES[nextIndex]);
  };

  return (
    <ThemeContext.Provider value={{ themeMode, isDarkMode, toggleTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}; 