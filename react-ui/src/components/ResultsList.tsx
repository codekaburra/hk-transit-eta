import React, { useState } from 'react';
import { RouteCard } from './RouteCard';
import { StopCard } from './StopCard';
import { RouteDetails } from './RouteDetails';
import { BusRoute, BusStop } from '../types';
import { useThemeStyles } from '../hooks/useThemeStyles';

interface ResultsListProps {
  searchType: 'route' | 'stop';
  routes: BusRoute[];
  stops: BusStop[];
  searchTerm: string;
  onStopClick?: (stop: BusStop) => void;
}

export const ResultsList: React.FC<ResultsListProps> = ({ searchType, routes, stops, searchTerm, onStopClick }) => {
  const [selectedRoute, setSelectedRoute] = useState<BusRoute | null>(null);
  const { getTextClass, getSecondaryTextClass } = useThemeStyles();

  const handleRouteClick = (route: BusRoute) => {
    setSelectedRoute(route);
  };

  const handleCloseRouteDetails = () => {
    setSelectedRoute(null);
  };

  const getResultsText = () => {
    if (searchType === 'route') {
      const count = routes.length;
      if (searchTerm.trim()) {
        return `${count} route${count !== 1 ? 's' : ''} found`;
      } else {
        return `Showing ${count} routes`;
      }
    } else {
      const count = stops.length;
      if (searchTerm.trim()) {
        return `${count} stop${count !== 1 ? 's' : ''} found`;
      } else {
        return `Showing ${count} stops`;
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        {/* <h2 className={`text-2xl font-bold mb-2 transition-colors duration-300 ${getTextClass()}`}>
        </h2> */}
        <p className={`text-lg transition-colors duration-300 ${getSecondaryTextClass()}`}>
          {getResultsText()}
        </p>
      </div>

      {/* Results */}
      {searchType === 'route' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {routes.map((route, index) => (
            <RouteCard 
              key={`${route.route}-${route.direction}-${route.service_type}-${index}`} 
              route={route} 
              onClick={handleRouteClick}
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stops.map((stop, index) => (
            <StopCard key={`${stop.stop}-${index}`} stop={stop} onClick={onStopClick} />
          ))}
        </div>
      )}

      {/* No results message */}
      {searchType === 'route' && routes.length === 0  && (
        <div className="text-center py-8">
          <p className={`text-lg transition-colors duration-300 ${getSecondaryTextClass()}`}>
          沒有找到相關巴士路線。請嘗試刷新頁面。 No routes available. Please try refreshing the page.
          </p>
        </div>
      )}

      {searchType === 'stop' && stops.length === 0  && (
        <div className="text-center py-8">
          <p className={`text-lg transition-colors duration-300 ${getSecondaryTextClass()}`}>
          沒有找到相關巴士站。請嘗試刷新頁面。 No stops available. Please try refreshing the page.
          </p>
        </div>
      )}

      {/* Route Details Modal */}
      {selectedRoute && (
        <RouteDetails 
          route={selectedRoute} 
          onClose={handleCloseRouteDetails}
        />
      )}
    </div>
  );
}; 