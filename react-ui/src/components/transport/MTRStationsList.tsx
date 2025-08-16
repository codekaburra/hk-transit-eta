import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemeStyles } from '../../hooks/useThemeStyles';
import { 
  MTRLine, 
  MTRStation, 
  MTR_LINE_STATIONS, 
  MTR_LINE_NAMES, 
  MTR_STATION_NAMES, 
  getLineName, 
  getStationName,
  getLineNameTC,
  getStationNameTC,
  getLineColor
} from '../../types/mtr';

export const MTRStationsList: React.FC = () => {
  const { getCardClass, getTextClass, getSecondaryTextClass, getHoverClass, getAccentClass, getSecondaryBorderClass, getTitleClass } = useThemeStyles();
  const navigate = useNavigate();

  const handleStationClick = (line: MTRLine, station: MTRStation) => {
    // Navigate to MTR station details (to be implemented)
    navigate(`/mtr/station/${station}?line=${line}`);
  };

  const handleLineClick = (line: MTRLine) => {
    // Navigate to MTR line details (to be implemented)
    navigate(`/mtr/line/${line}`);
  };

  return (
    <div className="space-y-6">
      <div className={`text-center mb-6 ${getTitleClass()}`}>
        <p className="text-lg">🚇 港鐵所有路線及站點 All MTR Lines & Stations</p>
        <p className="text-sm mt-1">點擊路線名稱查看路線詳情，點擊站點查看到站時間 Click line name for details, station for arrival times</p>
      </div>

      {Object.values(MTRLine).map((line) => {
        const stations = MTR_LINE_STATIONS[line] || [];
        const lineName = getLineName(line);
        const lineNameTC = getLineNameTC(line);
        const lineColor = getLineColor(line);
        
        return (
          <div key={line} className={`rounded-lg shadow-md transition-colors duration-300 ${getCardClass()}`}>
                        {/* Line Header */}
            <div 
              className={`p-4 border-b cursor-pointer transition-colors duration-300 bg-white/20 ${getHoverClass()}`}
              onClick={() => handleLineClick(line)}
              style={{ borderLeftWidth: '6px', borderLeftColor: lineColor }}
            >
              <div className="flex items-center justify-between ">
                <div className="flex items-center space-x-3">
                  <div 
                    className="px-3 py-1 rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: lineColor }}
                  >
                    {line}
                  </div>
                  <h3 className={`text-xl font-bold transition-colors duration-300 ${getTextClass()}`}>
                    {lineNameTC} {lineName}
                  </h3>
                </div>
                <div className={`text-sm ${getSecondaryTextClass()}`}>
                  {stations.length} 個站 stations
                </div>
              </div>
            </div>

            {/* Stations Grid */}
            <div className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-3">
                {stations.map((station) => {
                  const stationName = getStationName(station);
                  const stationNameTC = getStationNameTC(station);
                  
                  return (
                    <div
                      key={station}
                      className={`p-3 rounded-lg ${getSecondaryBorderClass()} cursor-pointer transition-all duration-300 ${getHoverClass()} hover:shadow-md bg-white/10`}
                      onClick={() => handleStationClick(line, station)}
                    >
                                              <div className="flex items-center justify-between">
                          <div>
                            <div className={`text-sm font-bold ${getTitleClass()}`}>
                              {stationNameTC}
                            </div>
                            <div className={`text-xs ${getTitleClass()}`}>
                              {stationName}
                            </div>
                          {/* <div className={`text-xs ${getSecondaryTextClass()}`}>
                            {stationName}
                          </div> */}
                        </div>
                        {/* <div className="text-lg">🚉</div> */}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}

      {/* MTR System Map */}
      <div className={`rounded-lg shadow-md p-6 mb-6 transition-colors duration-300 ${getCardClass()}`}>
        <div className="text-center mb-4">
          <h3 className={`text-xl font-bold mb-2 transition-colors duration-300 ${getTextClass()}`}>
            🗺️ 港鐵路線圖 MTR System Map
          </h3>
          <p className={`text-sm ${getSecondaryTextClass()}`}>
            官方路線圖 Official Route Map
          </p>
        </div>
        
        <div className="text-center mt-4">
          <a 
            href="https://www.mtr.com.hk/archive/en/services/routemap.pdf" 
            target="_blank" 
            rel="noopener noreferrer"
            className={`inline-flex items-center px-4 py-2 rounded-lg  transition-colors duration-300 ${getAccentClass()}`}
          >
            在新視窗開啟完整路線圖 Open Full Map in New Window
          </a>
        </div>
        <div className="flex justify-center">
          <div className="w-full max-w-full overflow-auto">
            <iframe
              src="https://www.mtr.com.hk/archive/en/services/routemap.pdf"
              width="100%"
              height="600"
              className="w-full border rounded-lg shadow-sm"
              title="MTR System Map"
            >
              <p className={`text-center ${getSecondaryTextClass()}`}>
                您的瀏覽器不支援PDF顯示 Your browser does not support PDF display.{' '}
                <a 
                  href="https://www.mtr.com.hk/archive/en/services/routemap.pdf" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  點擊此處查看路線圖 Click here to view the route map
                </a>
              </p>
            </iframe>
          </div>
        </div>
        
      </div>

    </div>
  );
}; 