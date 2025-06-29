import React from 'react';
import { RouteCard } from './RouteCard';
import { StopCard } from './StopCard';
import { BusRoute, BusStop } from '../types';
import { useThemeStyles } from '../hooks/useThemeStyles';

interface ResultsListProps {
  searchType: 'route' | 'stop';
  routes: BusRoute[];
  stops: BusStop[];
  searchTerm: string;
}

export const ResultsList: React.FC<ResultsListProps> = ({ searchType, routes, stops, searchTerm }) => {
  const { getTextClass, getSecondaryTextClass } = useThemeStyles();

  const getHeaderText = () => {
    if (searchTerm.trim()) {
      return `Search results for "${searchTerm}"`;
    } else {
      return searchType === 'route' 
        ? 'All Bus Routes (showing first 100)' 
        : 'All Bus Stops (showing first 100)';
    }
  };

  const getResultsText = () => {
    if (searchType === 'route') {
      const count = routes.length;
      if (searchTerm.trim()) {
        return `${count} route${count !== 1 ? 's' : ''} found`;
      } else {
        return `Showing ${count} routes from KMB and Citybus`;
      }
    } else {
      const count = stops.length;
      if (searchTerm.trim()) {
        return `${count} stop${count !== 1 ? 's' : ''} found`;
      } else {
        return `Showing ${count} stops from KMB and Citybus`;
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <h2 className={`text-2xl font-bold mb-2 transition-colors duration-300 ${getTextClass()}`}>
          {getHeaderText()}
        </h2>
        <p className={`text-lg transition-colors duration-300 ${getSecondaryTextClass()}`}>
          {getResultsText()}
        </p>
      </div>

      {/* Results */}
      {searchType === 'route' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {routes.map((route, index) => (
            <RouteCard key={`${route.route}-${route.bound}-${route.service_type}-${index}`} route={route} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stops.map((stop, index) => (
            <StopCard key={`${stop.stop}-${index}`} stop={stop} />
          ))}
        </div>
      )}

      {/* No results message */}
      {searchType === 'route' && routes.length === 0 && !searchTerm.trim() && (
        <div className="text-center py-8">
          <p className={`text-lg transition-colors duration-300 ${getSecondaryTextClass()}`}>
            No routes available. Please try refreshing the page.
          </p>
        </div>
      )}

      {searchType === 'stop' && stops.length === 0 && !searchTerm.trim() && (
        <div className="text-center py-8">
          <p className={`text-lg transition-colors duration-300 ${getSecondaryTextClass()}`}>
            No stops available. Please try refreshing the page.
          </p>
        </div>
      )}

      {searchType === 'route' && routes.length === 0 && searchTerm.trim() && (
        <div className="text-center py-8">
          <p className={`text-lg transition-colors duration-300 ${getSecondaryTextClass()}`}>
            No routes found for "{searchTerm}". Try a different search term.
          </p>
        </div>
      )}

      {searchType === 'stop' && stops.length === 0 && searchTerm.trim() && (
        <div className="text-center py-8">
          <p className={`text-lg transition-colors duration-300 ${getSecondaryTextClass()}`}>
            No stops found for "{searchTerm}". Try a different search term.
          </p>
        </div>
      )}
    </div>
  );
}; 