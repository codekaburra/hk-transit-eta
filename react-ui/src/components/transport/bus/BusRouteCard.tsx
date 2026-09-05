import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BusRoute, BusStop } from '../../../types';
import { useThemeStyles } from '../../../hooks/useThemeStyles';
import { usePollingFetch } from '../../../hooks/usePollingFetch';
import { getBusETA } from '../../../services/api';
import { BusCompanyIcon } from './BusCompanyIcon';
import { RouteCodeIcon } from '../RouteCodeIcon';
import { ETAColumns } from './ETAColumns';

export interface RouteCardProps {
  route: BusRoute;
  shouldBusCompanyIcon?: boolean;
  busStop?: BusStop;
  onClick?: (route: BusRoute) => void;
}

export const BusRouteCard: React.FC<RouteCardProps> = ({  route, busStop, onClick, shouldBusCompanyIcon = true }) => {
  const navigate = useNavigate();

  // Only a card rendered against a stop has an ETA to show.
  const fetchETA = useCallback(
    () => getBusETA(route.company, busStop!.stop, route.route, route.service_type, route.direction),
    [busStop, route]
  );
  const { data: etaData } = usePollingFetch<string[]>(busStop ? fetchETA : null, []);

  const { getHoverClass, getCardClass, getGrayTextClass } = useThemeStyles();
  return (
    <div 
      className={`rounded-lg px-6 py-4 transition-colors duration-300 cursor-pointer ${getCardClass()} ${getHoverClass()}`}
      onClick={() => {
        if (onClick) {
          onClick(route);
        } else {
          // Route numbers can be shared between operators (e.g. KMB and
          // Citybus both run a "1"), so carry the company through.
          navigate(`/bus/route/${route.route}?company=${encodeURIComponent(route.company)}`);
        }
      }}
    >
      {/* Wraps rather than squeezes: on a phone the three columns take a line
          of their own beneath the destinations. */}
      <div className="flex flex-wrap items-center justify-between gap-y-2">
        <div className="w-full sm:w-auto sm:flex-1 min-w-0 flex items-center space-x-4">
          <div className="flex-shrink-0">
            <RouteCodeIcon routeCode={route.route} type={route.company as 'KMB' | 'CTB'} size="md" />
          </div>
          <div>
            {/* <div className={`text-sm font-medium transition-colors duration-300 ${getTextClass()}`}>
              Route {route.route} ({route.bound === '1' ? 'Inbound' : 'Outbound'})
            </div> */}
            <div className={`text-sm transition-colors duration-300 ${getGrayTextClass()}`}>
              {route.orig_en} → {route.dest_en}
            </div>
            <div className={`text-sm transition-colors duration-300 ${getGrayTextClass()}`}>
              {route.orig_tc} → {route.dest_tc}
            </div>
          </div>
        </div>
        {/* <div className={`text-sm transition-colors duration-300 ${getSecondaryTextClass()}`}>
          Service Type: {route.service_type}
        </div> */}
        {/* Empty columns would read as a stop with no service, so a card
            rendered without a stop shows none. */}
        {busStop && <ETAColumns etaData={etaData} />}
        <div className="w-auto sm:w-1/5 flex items-center">
          {shouldBusCompanyIcon && <BusCompanyIcon company={route.company} className="ml-auto" />}
        </div>
      </div>
    </div>
  );
}; 