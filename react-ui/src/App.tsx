import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { useThemeStyles } from './hooks/useThemeStyles';
import { Header } from './components/Header';
import { SearchBox } from './components/SearchBox';
import { ResultsList } from './components/ResultsList';
import { AboutPage } from './components/AboutPage';
import { BusRoute, BusStop } from './types';
import { api } from './services/api';
import './App.css';

function AppContent() {
  const [activeTab, setActiveTab] = useState<'search' | 'about'>('search');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'route' | 'stop'>('route');
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [stops, setStops] = useState<BusStop[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const { getBackgroundClass, getTextClass } = useThemeStyles();

  // Load initial data on component mount
  useEffect(() => {
    loadInitialData();
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim()) {
        performSearch();
      } else {
        // If search is cleared, load initial data again
        loadInitialData();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, searchType]);

  const loadInitialData = async () => {
    setInitialLoading(true);
    try {
      if (searchType === 'route') {
        const kmbRoutes = await api.getKmbRoutes();
        const citybusRoutes = await api.getCitybusRoutes();
        // Combine and limit results to prevent overwhelming the UI
        const allRoutes = [...kmbRoutes, ...citybusRoutes].slice(0, 100);
        setRoutes(allRoutes);
        setStops([]);
      } else {
        const kmbStops = await api.getKmbStops();
        const citybusStops = await api.getCitybusStops();
        // Combine and limit results to prevent overwhelming the UI
        const allStops = [...kmbStops, ...citybusStops].slice(0, 100);
        setStops(allStops);
        setRoutes([]);
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const performSearch = async () => {
    setLoading(true);
    try {
      if (searchType === 'route') {
        const results = await api.searchRoutes(searchTerm);
        setRoutes(results);
        setStops([]);
      } else {
        const results = await api.searchStops(searchTerm);
        setStops(results);
        setRoutes([]);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${getBackgroundClass()}`}>
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <div className="flex mb-8 border-b">
          <button
            onClick={() => setActiveTab('search')}
            className={`px-6 py-3 font-medium transition-colors duration-300 ${
              activeTab === 'search'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🔍 Search
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`px-6 py-3 font-medium transition-colors duration-300 ${
              activeTab === 'about'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            ℹ️ About
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'search' ? (
          <div className="space-y-6">
            <SearchBox
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              searchType={searchType}
              onSearchTypeChange={setSearchType}
            />
            
            {(loading || initialLoading) && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p className={`mt-2 transition-colors duration-300 ${getTextClass()}`}>
                  {initialLoading ? 'Loading data...' : 'Searching...'}
                </p>
              </div>
            )}
            
            <ResultsList
              searchType={searchType}
              routes={routes}
              stops={stops}
              searchTerm={searchTerm}
            />
          </div>
        ) : (
          <AboutPage />
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
