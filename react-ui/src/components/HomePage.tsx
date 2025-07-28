import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { Header } from './Header';
import { SearchBox } from './SearchBox';
import { ResultsList } from './ResultsList';
import { BusRoute, BusStop } from '../types';
import { api } from '../services/api';

export const HomePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'search' | 'about'>('search');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'bus-route' | 'bus-stop'>('bus-route');
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [stops, setStops] = useState<BusStop[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const { 
    getBackgroundClass, 
    getTextClass, 
    getSecondaryTextClass, 
    getCardClass, 
    getButtonClass, 
    getHoverClass, 
    getBorderClass 
  } = useThemeStyles();
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
      if (searchType === 'bus-route') {
        const allRoutes = await api.getBusRoutes();
        setRoutes(allRoutes.slice(0, 100));
        setStops([]);
      } else {
        const allStops = await api.getBusStops();
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
      if (searchType === 'bus-route') {
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
    const isActive = activeTab === thisTab && searchType === thisSearchType;
    return `px-6 py-3 font-medium rounded-md transition-colors duration-300 ${getButtonClass(isActive)}`;
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${getBackgroundClass()}`}>
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Tab navigation */}
        {/* <div className="flex justify-center mb-8">
          <div className={`flex space-x-1 rounded-lg p-1 ${getCardClass()}`}>
            <button
              onClick={() => setActiveTab('search')}
              className={`px-6 py-3 font-medium rounded-md transition-colors duration-300 ${getButtonClass(activeTab === 'search')}`}
            >
              🔍 Search
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`px-6 py-3 font-medium rounded-md transition-colors duration-300 ${getButtonClass(activeTab === 'about')}`}
            >
              ℹ️ About
            </button>
          </div>
        </div> */}

        {/* Search Type Selection - only show when on search tab */}
        {activeTab === 'search' && (
          <div className="flex mb-8 items-center justify-center">
            <div className={`flex space-x-1 rounded-lg p-1 ${getCardClass()}`}>
              <button
                onClick={() => setSearchType('bus-route')}
                className={`px-6 py-3 font-medium text-xl rounded-md transition-colors duration-300 ${getButtonClass(searchType === 'bus-route')}`}
              >
                🚌 巴士路線 Bus Routes
              </button>
              <button
                onClick={() => setSearchType('bus-stop')}
                className={`px-6 py-3 font-medium text-xl rounded-md transition-colors duration-300 ${getButtonClass(searchType === 'bus-stop')}`}
              >
                🚏 巴士站 Stops
              </button>
            </div>
          </div>
        )}

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
              return (
                <div className="max-w-4xl mx-auto">
                  <div className={`rounded-lg shadow-lg p-8 ${getCardClass()}`}>
                    <h2 className={`text-3xl font-bold mb-6 transition-colors duration-300 ${getTextClass()}`}>
                      About HK Bus Tool
                    </h2>
                    <div className="space-y-4">
                      <p className={`text-lg transition-colors duration-300 ${getSecondaryTextClass()}`}>
                        HK Bus Tool is a web application designed to help users find bus routes and stops in Hong Kong.
                        It provides a user-friendly interface to search for bus routes by name or number,
                        and to locate bus stops by their name or identifier.
                      </p>
                      <p className={`text-lg transition-colors duration-300 ${getSecondaryTextClass()}`}>
                        The application uses real-time data from the Hong Kong Transport Department's API,
                        ensuring that all route and stop information is up-to-date.
                      </p>
                      <p className={`text-lg transition-colors duration-300 ${getSecondaryTextClass()}`}>
                        You can search for routes by entering the route name or number, and for stops by entering
                        the stop name or identifier. The search results will show you the relevant routes or stops,
                        along with their details and locations on the map.
                      </p>
                      <p className={`text-lg transition-colors duration-300 ${getSecondaryTextClass()}`}>
                        For more information about the Hong Kong bus system, please visit the official website:
                        <a href="https://www.td.gov.hk/en/index.html" target="_blank" rel="noopener noreferrer" className={`ml-2 underline transition-colors duration-300 ${getTextClass()} ${getHoverClass()}`}>
                          Transport Department of Hong Kong
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              );
            default:
              return null;
          }
        })()}
      </main>
    </div>
  );
}; 