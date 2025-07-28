import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemeStyles } from '../../hooks/useThemeStyles';

interface MinibusRouteCardProps {
  route: any;
  onClick?: (route: any) => void;
}

export const MinibusRouteCard: React.FC<MinibusRouteCardProps> = ({ route, onClick }) => {
  const { getCardClass, getTextClass, getSecondaryTextClass, getHoverClass } = useThemeStyles();
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
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className={`text-lg font-bold transition-colors duration-300 ${getTextClass()}`}>
              {route.route_code}
            </span>
            <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full font-medium">
              {route.region}
            </span>
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
              Dir {route.route_seq}
            </span>
          </div>
          
          <div className="space-y-1">
            <p className={`text-sm font-medium transition-colors duration-300 ${getTextClass()}`}>
              {route.description_tc || route.description_en}
            </p>
            
            {/* Show origin and destination */}
            <div className={`text-xs transition-colors duration-300 ${getSecondaryTextClass()}`}>
              <div className="font-medium">{route.orig_tc} → {route.dest_tc}</div>
              {route.orig_en && route.dest_en && (
                <div className="mt-1">{route.orig_en} → {route.dest_en}</div>
              )}
            </div>
            
            {/* Show remarks if available */}
            {route.remarks_tc && (
              <div className={`text-xs italic transition-colors duration-300 ${getSecondaryTextClass()}`}>
                {route.remarks_tc}
              </div>
            )}
          </div>
        </div>
        
        {/* Minibus Icon */}
        <div className="ml-4 flex-shrink-0">
          <div className="w-10 h-8 bg-yellow-400 rounded-md flex items-center justify-center">
            <span className="text-xs font-bold text-black">🚐</span>
          </div>
        </div>
      </div>
    </div>
  );
}; 