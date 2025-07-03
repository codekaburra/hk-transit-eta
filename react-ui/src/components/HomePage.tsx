import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { Header } from './Header';
import { SearchBox } from './SearchBox';
import { ResultsList } from './ResultsList';
import { AboutPage } from './AboutPage';
import { BusRoute, BusStop } from '../types';
import { api } from '../services/api';

export const HomePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'search' | 'about'>('search');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'route' | 'stop'>('route');
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [stops, setStops] = useState<BusStop[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const { getBackgroundClass, getTextClass, getSecondaryTextClass } = useThemeStyles();
  const navigate = useNavigate();

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
        const allRoutes = await api.getRoutes();
        setRoutes(allRoutes.slice(0, 100));
        setStops([]);
      } else {
        const allStops = await api.getStops();
        setStops(allStops.slice(0, 100));
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

  const handleStopClick = (stop: BusStop) => {
    navigate(`/stop/${stop.stop}`);
  };

  const tabOptionClass = (thisTab: string, thisSearchType: string) => {
    return `px-6 py-3 font-medium transition-colors duration-300 ${
      activeTab === thisTab && searchType === thisSearchType
        ? `border-2 border-500 border-custom-light3 bg-custom-light rounded-lg text-600 ${getSecondaryTextClass()}`
        : 'text-gray-500 hover:text-gray-700'
    }`;
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${getBackgroundClass()}`}>
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <div className="flex mb-8 items-center justify-center text-3xl">
          <button
            onClick={() => {
              setActiveTab('search');
              setSearchType('route');
            }}
            className={tabOptionClass('search', 'route')}
          >
            🚌 路線 Routes
          </button>
          <button
            onClick={() => {
              setActiveTab('search');
              setSearchType('stop');
            }}
            className={tabOptionClass('search', 'stop')}
          >
            🚏 巴士站 Stops
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={tabOptionClass('about', 'null')}
          >
            ℹ️ About
          </button>
        </div>

        {/* Tab Content */}
        {(() => {
          switch(activeTab) {
            case 'search':
              return (
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
                    onStopClick={handleStopClick}
                  />
                </div>
              );
            case 'about':
              return <AboutPage />;
            default:
              return null;
          }
        })()}
      </main>
    </div>
  );
}; 