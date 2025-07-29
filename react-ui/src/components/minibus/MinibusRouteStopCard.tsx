import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemeStyles } from '../../hooks/useThemeStyles';
import { formatETA } from '../../services/utils';

export interface MinibusRouteStopCardProps {
  routeStop: any;
  index?: number;
  onClick?: (routeStop: any) => void;
}

export const MinibusRouteStopCard: React.FC<MinibusRouteStopCardProps> = ({ routeStop, index, onClick }) => {
  const { getGrayTextClass, getHoverClass, getSecondaryTextClass, getCardClass, getAccentClass } = useThemeStyles();
  const navigate = useNavigate();
  const [etaData, setEtaData] = useState<any[]>([]);
  const [loadingETA, setLoadingETA] = useState(false);
  const [etaError, setEtaError] = useState<string | null>(null);

  const fetchETA = useCallback(async () => {
    // Check if we have the required data for ETA fetching
    if (!routeStop.route_id || !routeStop.route_seq || !routeStop.stop_seq) return;
    
    setLoadingETA(true);
    setEtaError(null);
    
    try {
      const url = `https://data.etagmb.gov.hk/eta/route-stop/${routeStop.route_id}/${routeStop.route_seq}/${routeStop.stop_seq}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseData = await response.json();
      
      // Handle the GMB API response structure
      if (responseData.data && responseData.data.enabled && Array.isArray(responseData.data.eta)) {
        const etaList = responseData.data.eta
          .filter((item: any) => item.timestamp && item.timestamp !== '')
          .slice(0, 3); // Limit to first 3 ETAs
        setEtaData(etaList);
      } else {
        setEtaData([]);
      }
    } catch (error) {
      setEtaError('Failed to load ETA');
      console.error('Error fetching minibus ETA:', error);
      setEtaData([]);
    } finally {
      setLoadingETA(false);
    }
  }, [routeStop.route_id, routeStop.route_seq, routeStop.stop_seq]);

  // Auto-refresh ETA data every 30 seconds
  useEffect(() => {
    fetchETA();
    const interval = setInterval(fetchETA, 30000);
    return () => clearInterval(interval);
  }, [fetchETA]);

  // Format minibus ETA with additional info
  const formatMinibusETA = (etaItem: any) => {
    try {
      const timestamp = etaItem.timestamp;
      const diff = etaItem.diff;
      const remarksTC = etaItem.remarks_tc;
      
      if (diff <= 0) return '即將到達 Arriving';
      if (diff < 60) return `${diff}分鐘 ${diff}m`;
      
      // Also show the actual time
      const etaDate = new Date(timestamp);
      const timeString = etaDate.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' });
      
      if (remarksTC && remarksTC !== '') {
        return `${timeString} - ${diff}m (${remarksTC})`;
      }
      
      return `${timeString} - ${diff}m`;
    } catch {
      return '';
    }
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
        <span className="text-lg">🚐🚏</span>
      </div>
      
      <div className="flex-1">
        <p className={`text-sm font-medium ${getGrayTextClass()}`}>{routeStop.name_tc}</p>
        <p className={`text-sm ${getGrayTextClass()}`}>{routeStop.name_en}</p>
      </div>

      {/* ETA Display */}
      <div className="flex flex-col items-end min-w-[100px]">
        {loadingETA && (
          <div className={`text-xs ${getSecondaryTextClass()}`}>
            Loading...
          </div>
        )}
        
        {!loadingETA && etaError && (
          <div className={`text-xs text-red-500`}>
            No ETA
          </div>
        )}
        
        {!loadingETA && !etaError && etaData.length > 0 && (
          <>
            {etaData.map((eta, etaIndex) => (
              <div key={`eta-${etaIndex}`} className={`text-sm transition-colors duration-300 ${getSecondaryTextClass()}`}>
                {formatMinibusETA(eta)}
              </div>
            ))}
          </>
        )}
        
        {!loadingETA && !etaError && etaData.length === 0 && (
          <div className={`text-xs ${getSecondaryTextClass()}`}>
            No ETA data
          </div>
        )}
      </div>
      
      {/* <div className="flex items-center">
        <div className={`text-xs px-2 py-1 bg-gray-100 rounded ${getSecondaryTextClass()}`}>
          Seq {routeStop.stop_seq}
        </div>
      </div> */}
    </div>
  );
}; 