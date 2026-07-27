import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useThemeStyles } from '../../hooks/useThemeStyles';
import { Header } from '../header/Header';
import { SearchBox } from './SearchBox';
import { ResultsList } from './ResultsList';
import { MTRStationsList } from './MTRStationsList';
import { BusRoute, BusStop } from '../../types';
import { api } from '../../services/api';

export const HomePage: React.FC = () => {
  const [activeTab] = useState<'search' | 'about'>('search');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'bus-route' | 'bus-stop' | 'minibus-route' | 'minibus-stop' | 'mtr'>('bus-route');
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [stops, setStops] = useState<BusStop[]>([]);
  const [minibusRoutes, setMinibusRoutes] = useState<any[]>([]);
  const [minibusStops, setMinibusStops] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [totalBusRoutes, setTotalBusRoutes] = useState<number>(0);
  const [totalMinibusRoutes, setTotalMinibusRoutes] = useState<number>(0);
  const {
    getBackgroundClass,
    getTextClass,
    getCardClass,
    getButtonClass,
    getTitleClass
  } = useThemeStyles();
  const navigate = useNavigate();
  const location = useLocation();

  // Handle navigation state for search type
  useEffect(() => {
    const state = location.state as { searchType?: 'bus-route' | 'bus-stop' | 'minibus-route' | 'minibus-stop' | 'mtr' };
    if (state?.searchType) {
      setSearchType(state.searchType);
      // Clear the state
      navigate('/', { replace: true });
    }
  }, [location.state, navigate]);

  // Load initial data on component mount
  useEffect(() => {
    loadInitialData();
    loadTotalRouteCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, searchType]);

  const loadTotalRouteCounts = async () => {
    try {
      const [busCount, minibusCount] = await Promise.all([
        api.getRouteCount('bus'),
        api.getRouteCount('minibus')
      ]);
      setTotalBusRoutes(busCount.count);
      setTotalMinibusRoutes(minibusCount.count);
    } catch (error) {
      console.error('Failed to load total route counts:', error);
    }
  };

  const loadInitialData = async () => {
    setInitialLoading(true);
    try {
      // Clear all data first
      setRoutes([]);
      setStops([]);
      setMinibusRoutes([]);
      setMinibusStops([]);

      if (searchType === 'bus-route') {
        const allRoutes = await api.getBusRoutes();
        setRoutes(Array.isArray(allRoutes) ? allRoutes.slice(0, 100) : []);
      } else if (searchType === 'bus-stop') {
        const allStops = await api.getBusStops();
        setStops(Array.isArray(allStops) ? allStops.slice(0, 100) : []);
      } else if (searchType === 'minibus-route') {
        const allMinibusRoutes = await api.getMinibusRoutes();
        setMinibusRoutes(Array.isArray(allMinibusRoutes) ? allMinibusRoutes.slice(0, 100) : []);
      } else if (searchType === 'minibus-stop') {
        const allMinibusStops = await api.getMinibusStops();
        setMinibusStops(Array.isArray(allMinibusStops) ? allMinibusStops.slice(0, 100) : []);
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
      // Clear all data first
      setRoutes([]);
      setStops([]);
      setMinibusRoutes([]);
      setMinibusStops([]);

      if (searchType === 'bus-route') {
        const results = await api.searchRoutes(searchTerm);
        setRoutes(Array.isArray(results) ? results : []);
      } else if (searchType === 'bus-stop') {
        const results = await api.searchStops(searchTerm);
        setStops(Array.isArray(results) ? results : []);
      } else if (searchType === 'minibus-route') {
        const results = await api.searchMinibusRoutes(searchTerm);
        setMinibusRoutes(Array.isArray(results) ? results : []);
      } else if (searchType === 'minibus-stop') {
        const results = await api.searchMinibusStops(searchTerm);
        setMinibusStops(Array.isArray(results) ? results : []);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStopClick = (stop: BusStop) => {
    navigate(`/bus/stop/${stop.stop}`);
  };

  const handleMinibusStopClick = (stop: any) => {
    navigate(`/minibus/stop/${stop.stop_id}`);
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${getBackgroundClass()}`}>
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div>
          <h1 className={`text-4xl text-center font-bold transition-colors duration-300 ${getTitleClass()}`}>
            香港交通實時抵站時間
          </h1>
          <h1 className={`text-4xl text-center font-bold transition-colors duration-300 ${getTitleClass()}`}>
            Hong Kong Transport Estimated Time of Arrival
          </h1>
        </div>
        {/* Search Type Selection - only show when on search tab */}
        {activeTab === 'search' && (
          <div className="flex mb-8 items-center justify-center">
            <div className={`flex flex-wrap space-x-1 rounded-lg p-1 ${getCardClass()}`}>
              <button
                onClick={() => setSearchType('bus-route')}
                className={`px-4 py-3 font-medium text-base rounded-md transition-colors duration-300 ${getButtonClass(searchType === 'bus-route')}`}
              >
                🚌 巴士路線 Bus Routes
              </button>
              <button
                onClick={() => setSearchType('bus-stop')}
                className={`px-4 py-3 font-medium text-base rounded-md transition-colors duration-300 ${getButtonClass(searchType === 'bus-stop')}`}
              >
                🚏 巴士站 Bus Stops
              </button>
            </div>
            <div className={`flex flex-wrap space-x-1 rounded-lg p-1 ${getCardClass()}`}>
              <button
                onClick={() => setSearchType('minibus-route')}
                className={`px-4 py-3 font-medium text-base rounded-md transition-colors duration-300 ${getButtonClass(searchType === 'minibus-route')}`}
              >
                🚐 小巴路線 Minibus Routes
              </button>
              <button
                onClick={() => setSearchType('minibus-stop')}
                className={`px-4 py-3 font-medium text-base rounded-md transition-colors duration-300 ${getButtonClass(searchType === 'minibus-stop')}`}
              >
                🚏 小巴站 Minibus Stops
              </button>
            </div>
            <div className={`flex flex-wrap space-x-1 rounded-lg p-1 ${getCardClass()}`}>
              <button
                onClick={() => setSearchType('mtr')}
                className={`px-4 py-3 font-medium text-base rounded-md transition-colors duration-300 ${getButtonClass(searchType === 'mtr')}`}
              >
                🚇 港鐵 MTR
              </button>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {(() => {
          switch (activeTab) {
            case 'search':
              return (
                <div className="space-y-6">
                  {searchType === 'mtr' ? (
                    <MTRStationsList />
                  ) : (
                    <>
                      <SearchBox
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        searchType={searchType as 'bus-route' | 'bus-stop' | 'minibus-route' | 'minibus-stop'}
                        onSearchTypeChange={(type) => setSearchType(type)}
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
                        searchType={searchType as 'bus-route' | 'bus-stop' | 'minibus-route' | 'minibus-stop'}
                        routes={routes}
                        stops={stops}
                        minibusRoutes={minibusRoutes}
                        minibusStops={minibusStops}
                        searchTerm={searchTerm}
                        totalBusRoutes={totalBusRoutes}
                        totalMinibusRoutes={totalMinibusRoutes}
                        onStopClick={handleStopClick}
                        onMinibusStopClick={handleMinibusStopClick}
                      />
                    </>
                  )}
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