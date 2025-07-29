import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemeStyles } from '../../hooks/useThemeStyles';
import { RouteCodeIcon } from '../RouteCodeIcon';
import { formatMinibusETA, MinibusETA } from '../../services/utils';

interface MinibusRouteCardProps {
  route: any;
  onClick?: (route: any) => void;
  etaData?: MinibusETA[];
}

export const MinibusRouteCard: React.FC<MinibusRouteCardProps> = ({ route, onClick, etaData }) => {
  const { getCardClass, getGrayTextClass, getSecondaryTextClass, getHoverClass } = useThemeStyles();
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick(route);
    } else {
      navigate(`/minibus/route/${route.route_id}/${route.route_seq}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`block rounded-lg shadow-md p-4 transition-all duration-300 hover:shadow-lg cursor-pointer ${getCardClass()} ${getHoverClass()}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 flex items-center space-x-4">
          <div className="flex-shrink-0">
            <RouteCodeIcon
              routeCode={route.route_code}
              type="minibus"
              size="md"
            />
          </div>
          <div>
            <div className={`text-sm transition-colors duration-300 ${getGrayTextClass()}`}>
              {route.orig_en && route.dest_en ? `${route.orig_en} → ${route.dest_en}` : (route.description_en || '')}
            </div>
            <div className={`text-sm transition-colors duration-300 ${getGrayTextClass()}`}>
              {route.orig_tc} → {route.dest_tc}
            </div>
            <div className={` ${getSecondaryTextClass()}`}>
              <span className="text-xs px-2 py-1 rounded-full font-medium text-center">
                {route.description_tc} {route.description_en}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col">
          {etaData && etaData.map((eta, idx) => {
            return (
              <div key={idx} className={`text-sm transition-colors duration-300 ${getSecondaryTextClass()}`}>
                {formatMinibusETA(eta)}
              </div>
            )
          })}
        </div>
        {/* Region and Direction badges */}
        {/* <div className={`ml-4 flex-shrink-0 flex flex-col space-y-1 max-w-[25%] ${getSecondaryTextClass()}`}>

        </div> */}
      </div>
    </div>
  );
}; 