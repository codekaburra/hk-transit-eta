import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemeStyles } from '../../hooks/useThemeStyles';

interface MinibusRouteCardProps {
  route: any;
  onClick?: (route: any) => void;
}

export const MinibusRouteCard: React.FC<MinibusRouteCardProps> = ({ route, onClick }) => {
  const { getCardClass, getGrayTextClass, getSecondaryTextClass, getHoverClass } = useThemeStyles();
  const navigate = useNavigate();

  // Function to get background color based on region
  const getCompanyBackgroundClass = (region: string) => {
    switch (region) {
      // case 'HKI': // Hong Kong Island - CTB territory
        // return 'bg-yellow-400';
      // case 'KLN': // Kowloon - KMB territory
      // case 'NT':  // New Territories - KMB territory
        // return 'bg-red-500';
      default:
        return 'bg-green-700/80'; // Default to yellow
    }
  };

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
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors duration-300 ${getCompanyBackgroundClass(route.region)}`}>
              <span className="font-bold text-lg text-white">{route.route_code}</span>
            </div>
          </div>
          <div>
            <div className={`text-sm transition-colors duration-300 ${getGrayTextClass()}`}>
              {route.orig_en && route.dest_en ? `${route.orig_en} → ${route.dest_en}` : (route.description_en || '')}
            </div>
            <div className={`text-sm transition-colors duration-300 ${getGrayTextClass()}`}>
              {route.orig_tc} → {route.dest_tc}
            </div>
          </div>
        </div>
        
        {/* Region and Direction badges */}
        <div className={`ml-4 flex-shrink-0 flex flex-col space-y-1 ${getSecondaryTextClass()}`}>
          <span className="text-xs px-2 py-1 rounded-full font-medium text-center">
            {route.description_tc}
          </span>
          <span className="text-xs px-2 py-1 rounded-full font-medium text-center">
            {route.description_en}
          </span>
          {/* <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full font-medium text-center">
            {route.region}
          </span>
          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-medium text-center">
            Dir {route.route_seq}
          </span> */}
        </div>
      </div>
    </div>
  );
}; 