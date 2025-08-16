import React from 'react';
import { BusRouteCard } from './bus/BusRouteCard';
import { BusStopCard } from './bus/BusStopCard';
import { MinibusRouteCard } from './minibus/MinibusRouteCard';
import { MinibusStopCard } from './minibus/MinibusStopCard';
import { BusRoute, BusStop } from '../../types';
import { useThemeStyles } from '../../hooks/useThemeStyles';

interface ResultsListProps {
  searchType: 'bus-route' | 'bus-stop' | 'minibus-route' | 'minibus-stop';
  routes: BusRoute[];
  stops: BusStop[];
  minibusRoutes: any[];
  minibusStops: any[];
  searchTerm: string;
  totalBusRoutes: number;
  totalMinibusRoutes: number;
  onStopClick?: (stop: BusStop) => void;
  onMinibusStopClick?: (stop: any) => void;
  onMinibusRouteClick?: (route: any) => void;
}

export const ResultsList: React.FC<ResultsListProps> = ({ 
  searchType, 
  routes, 
  stops, 
  minibusRoutes, 
  minibusStops, 
  searchTerm, 
  totalBusRoutes,
  totalMinibusRoutes,
  onStopClick, 
  onMinibusStopClick,
  onMinibusRouteClick
}) => {
  const { getTitleClass, getSecondaryTextClass } = useThemeStyles();

  const getResultsText = () => {
    switch (searchType) {
      case 'bus-route': {
        const count = routes?.length || 0;
        if (searchTerm.trim()) {
          return `${count} bus route${count !== 1 ? 's' : ''} found`;
        } else {
          return `Showing ${count}/${totalBusRoutes} bus routes`;
        }
      }
      case 'bus-stop': {
        const count = stops?.length || 0;
        if (searchTerm.trim()) {
          return `${count} bus stop${count !== 1 ? 's' : ''} found`;
        } else {
          return `Showing ${count} bus stops`;
        }
      }
      case 'minibus-route': {
        const count = minibusRoutes?.length || 0;
        if (searchTerm.trim()) {
          return `${count} minibus route${count !== 1 ? 's' : ''} found`;
        } else {
          return `Showing ${count}/${totalMinibusRoutes} minibus routes`;
        }
      }
      case 'minibus-stop': {
        const count = minibusStops?.length || 0;
        if (searchTerm.trim()) {
          return `${count} minibus stop${count !== 1 ? 's' : ''} found`;
        } else {
          return `Showing ${count} minibus stops`;
        }
      }
      default:
        return '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <p className={`text-lg transition-colors duration-300 ${getTitleClass()}`}>
          {getResultsText()}
        </p>
      </div>

      {/* Results */}
      {searchType === 'bus-route' && routes && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {routes.map((route, index) => (
            <BusRouteCard 
              key={`${route.route}-${route.direction}-${route.service_type}-${index}`} 
              route={route} 
              shouldBusCompanyIcon={true}
            />
          ))}
        </div>
      )}

      {searchType === 'bus-stop' && stops && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stops.map((stop, index) => (
            <BusStopCard key={`${stop.stop}-${index}`} stop={stop} onClick={onStopClick} />
          ))}
        </div>
      )}

      {searchType === 'minibus-route' && minibusRoutes && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {minibusRoutes.map((route, index) => (
            <MinibusRouteCard 
              key={`${route.route_id}-${route.route_seq}-${index}`} 
              route={route} 
              onClick={onMinibusRouteClick} 
            />
          ))}
        </div>
      )}

      {searchType === 'minibus-stop' && minibusStops && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {minibusStops.map((stop, index) => (
            <MinibusStopCard 
              key={`${stop.stop_id}-${index}`} 
              stop={stop} 
              onClick={onMinibusStopClick} 
            />
          ))}
        </div>
      )}

      {/* No results messages */}
      {searchType === 'bus-route' && (!routes || routes.length === 0) && (
        <div className="text-center py-8">
          <p className={`text-lg transition-colors duration-300 ${getSecondaryTextClass()}`}>
            沒有找到相關巴士路線。請嘗試刷新頁面。 No bus routes available. Please try refreshing the page.
          </p>
        </div>
      )}

      {searchType === 'bus-stop' && (!stops || stops.length === 0) && (
        <div className="text-center py-8">
          <p className={`text-lg transition-colors duration-300 ${getSecondaryTextClass()}`}>
            沒有找到相關巴士站。請嘗試刷新頁面。 No bus stops available. Please try refreshing the page.
          </p>
        </div>
      )}

      {searchType === 'minibus-route' && (!minibusRoutes || minibusRoutes.length === 0) && (
        <div className="text-center py-8">
          <p className={`text-lg transition-colors duration-300 ${getSecondaryTextClass()}`}>
            沒有找到相關小巴路線。請嘗試刷新頁面。 No minibus routes available. Please try refreshing the page.
          </p>
        </div>
      )}

      {searchType === 'minibus-stop' && (!minibusStops || minibusStops.length === 0) && (
        <div className="text-center py-8">
          <p className={`text-lg transition-colors duration-300 ${getSecondaryTextClass()}`}>
            沒有找到相關小巴站。請嘗試刷新頁面。 No minibus stops available. Please try refreshing the page.
          </p>
        </div>
      )}
    </div>
  );
}; 