import React, { createContext, useContext, useEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark' | 'custom-light';

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
    if (saved && ['light', 'dark', 'custom-light'].includes(saved)) {
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
    document.documentElement.classList.remove('light', 'dark', 'custom-light');
    document.documentElement.classList.add(themeMode);
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode(current => {
      switch (current) {
        case 'light':
          return 'custom-light';
        case 'custom-light':
          return 'dark';
        case 'dark':
          return 'light';
        default:
          return 'light';
      }
    });
  };

  return (
    <ThemeContext.Provider value={{ themeMode, isDarkMode, toggleTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}; 