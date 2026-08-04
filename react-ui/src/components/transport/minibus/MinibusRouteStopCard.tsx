import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemeStyles } from '../../../hooks/useThemeStyles';
import { formatMinibusETA, MinibusETA } from '../../../services/utils';

export interface MinibusRouteStopCardProps {
  routeStop: any;
  etaData?: MinibusETA[];
  index?: number;
  onClick?: (routeStop: any) => void;
}

export const MinibusRouteStopCard: React.FC<MinibusRouteStopCardProps> = ({ routeStop, etaData = [], index, onClick }) => {
  const { getGrayTextClass, getHoverClass, getSecondaryTextClass, getCardClass, getAccentClass } = useThemeStyles();
  const navigate = useNavigate();

  // ETAs are supplied by the parent. This card used to carry its own fetch as
  // well, but nothing ever called it, so the loading and error branches it fed
  // were unreachable and every stop fell through to the no-data placeholder.
  // See MinibusRouteDetails, which prepares route_id/stop_id for a fetch that
  // never happened. That fetch also called itself from its own catch block
  // with no backoff or attempt limit, so wiring it up as it stood would have
  // spun on the first failure.
  const renderETADisplay = () => {
    if (etaData.length === 0) {
      return (
        <div className={`text-xs ${getSecondaryTextClass()}`}>
          暫無資料
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {etaData.slice(0, 3).map((eta, idx) => (
          <div key={idx} className={`text-sm font-medium transition-colors duration-300 ${getSecondaryTextClass()}`}>
            {formatMinibusETA(eta)}
          </div>
        ))}
      </div>
    );
  };

  const handleClick = () => {
    if (onClick) {
      onClick(routeStop);
    } else {
      navigate(`/minibus/stop/${routeStop.stop_id}`);
    }
  };

  return (
    <div
      className={`flex items-center space-x-3 p-4 rounded-lg shadow-sm transition-all duration-300 cursor-pointer ${getCardClass()} ${getHoverClass()}`}
      onClick={handleClick}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${getAccentClass()}`}>
        {index || routeStop.stop_seq}
      </div>
      
      <div className="flex items-center space-x-2">
        {/* <span className="text-lg">🚐🚏</span> */}
      </div>
      
      <div className="flex-1">
        <p className={`text-sm font-medium ${getGrayTextClass()}`}>{routeStop.name_tc}</p>
        <p className={`text-sm ${getGrayTextClass()}`}>{routeStop.name_en}</p>
      </div>

      {/* ETA Display */}
      <div className="flex flex-col items-end min-w-[100px]">
        {renderETADisplay()}
      </div>
      
      {/* <div className="flex items-center">
        <div className={`text-xs px-2 py-1 bg-gray-100 rounded ${getSecondaryTextClass()}`}>
          Seq {routeStop.stop_seq}
        </div>
      </div> */}
    </div>
  );
}; 