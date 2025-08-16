import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemeStyles } from '../../../hooks/useThemeStyles';
import { formatETA, formatMinibusETA, MinibusETA } from '../../../services/utils';

export interface MinibusRouteStopCardProps {
  routeStop: any;
  etaData?: MinibusETA[];
  index?: number;
  onClick?: (routeStop: any) => void;
}

export const MinibusRouteStopCard: React.FC<MinibusRouteStopCardProps> = ({ routeStop, etaData = [], index, onClick }) => {
  const { getGrayTextClass, getHoverClass, getSecondaryTextClass, getCardClass, getAccentClass } = useThemeStyles();
  const navigate = useNavigate();
  const [localEtaData, setLocalEtaData] = useState<MinibusETA[]>([]);
  const [loadingETA, setLoadingETA] = useState(false);
  const [etaError, setEtaError] = useState<string | null>(null);

  const renderETADisplay = () => {
    const displayETA = (etaData && etaData.length > 0) ? etaData : localEtaData;
    
    // Loading state - only show if no prop data available
    if (loadingETA && (!etaData || etaData.length === 0)) {
      return (
        <div className={`flex items-center space-x-1 text-xs ${getSecondaryTextClass()}`}>
          <div className="animate-spin rounded-full h-3 w-3 border-b border-current"></div>
          <span>載入中...</span>
        </div>
      );
    }
    
    // Error state - only show if no prop data available  
    if (etaError && (!etaData || etaData.length === 0)) {
      return (
        <div className="text-xs text-red-500">
          暫無到站時間
        </div>
      );
    }
    
    // ETA data available
    if (displayETA && displayETA.length > 0) {
      return (
        <div className="space-y-1">
          {displayETA.slice(0, 3).map((eta, idx) => (
            <div key={idx} className={`text-sm font-medium transition-colors duration-300 ${getSecondaryTextClass()}`}>
              {formatMinibusETA(eta)}
            </div>
          ))}
        </div>
      );
    }
    
    // No data state
    return (
      <div className={`text-xs ${getSecondaryTextClass()}`}>
        暫無資料
      </div>
    );
  };

  const fetchETA = useCallback(async () => {
    // Check if we have the required data for ETA fetching
    if (!routeStop.route_id || !routeStop.stop_id) return;
    
    setLoadingETA(true);
    setEtaError(null);
    
    try {
      const url = `https://data.etagmb.gov.hk/eta/route-stop/${routeStop.route_id}/${routeStop.stop_id}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseData = await response.json();
      
      // Handle the GMB API response structure
      if (responseData.data && responseData.data.enabled && Array.isArray(responseData.data.eta)) {
        const etaList: MinibusETA[] = responseData.data.eta
          .filter((item: MinibusETA) => item.timestamp && item.timestamp !== '')
          .slice(0, 3); // Limit to first 3 ETAs
        setLocalEtaData(etaList);
      } else {
        setLocalEtaData([]);
      }
    } catch (error) {
      setEtaError('Failed to load ETA');
      console.error('Error fetching minibus ETA:', error);
      setLocalEtaData([]);
      fetchETA();
      // Sleep for 5 seconds before allowing next request
    } finally {
      setLoadingETA(false);
    }
  }, [routeStop.route_id, routeStop.stop_id]);

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