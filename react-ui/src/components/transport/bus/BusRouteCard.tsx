import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BusRoute, BusStop } from '../../../types';
import { useThemeStyles } from '../../../hooks/useThemeStyles';
import { usePollingFetch } from '../../../hooks/usePollingFetch';
import { getBusETA } from '../../../services/api';
import { formatETA } from '../../../services/utils';
import { BusCompanyIcon } from './BusCompanyIcon';
import { RouteCodeIcon } from '../RouteCodeIcon';

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

  const { getHoverClass, getCardClass, getSecondaryTextClass, getGrayTextClass } = useThemeStyles();
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
      <div className="flex items-center justify-between">
        <div className="flex-1 flex items-center space-x-4">
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
        <div className="flex flex-col">
          {etaData.map((eta, idx) => {
            return (
              <div key={idx} className={`text-sm transition-colors duration-300 ${getSecondaryTextClass()}`}>
                {formatETA(eta)}
              </div>
            )
          })}
        </div>
        <div className="w-1/5 flex items-center">
          {shouldBusCompanyIcon && <BusCompanyIcon company={route.company} className="ml-auto" />}
        </div>
      </div>
    </div>
  );
}; 