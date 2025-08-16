import React, { useState, useEffect } from 'react';
import { useThemeStyles } from '../../hooks/useThemeStyles';

interface WeatherWarning {
  name: string;
  code: string;
  actionCode: string;
  issueTime?: string;
  updateTime?: string;
  expireTime?: string;
  type?: string;
}

interface SpecialWeatherTip {
  desc: string;
  updateTime: string;
}

interface WeatherWarningsResponse {
  [key: string]: WeatherWarning;
}

interface SpecialWeatherTipsResponse {
  swt: SpecialWeatherTip[];
}

export const WeatherWarnings: React.FC = () => {
  const [warnings, setWarnings] = useState<WeatherWarning[]>([]);
  const [specialTips, setSpecialTips] = useState<SpecialWeatherTip[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const {
    getCardClass,
    getTextClass,
    getSecondaryTextClass,
    getBorderClass,
    getHoverClass
  } = useThemeStyles();

  const fetchWeatherWarnings = async () => {
    try {
      setLoading(true);

      // Fetch both warnings and special weather tips
      const [warningsResponse, tipsResponse] = await Promise.all([
        fetch('https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=warnsum&lang=tc'),
        fetch('https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=swt&lang=tc')
      ]);

      if (warningsResponse.ok) {
        const warningsData: WeatherWarningsResponse = await warningsResponse.json();
        const activeWarnings = Object.values(warningsData).filter(warning => 
          warning.actionCode === 'ISSUE' || warning.actionCode === 'EXTEND'
        );
        setWarnings(activeWarnings);
      }

      if (tipsResponse.ok) {
        const tipsData: SpecialWeatherTipsResponse = await tipsResponse.json();
        setSpecialTips(tipsData.swt || []);
      }
    } catch (err) {
      console.error('Error fetching weather warnings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeatherWarnings();
    
    // Refresh every 10 minutes
    const interval = setInterval(fetchWeatherWarnings, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getWarningIcon = (code: string, type?: string) => {
    if (code.startsWith('TC')) return '🌀'; // Typhoon
    if (code.startsWith('WRAIN')) {
      if (type?.includes('紅色') || code.includes('R')) return '🔴';
      if (type?.includes('黃色') || code.includes('Y')) return '🟡';
      if (type?.includes('綠色') || code.includes('G')) return '🟢';
      return '🌧️';
    }
    if (code === 'WTS') return '⚡'; // Thunderstorm
    if (code === 'WHOT') return '🔥'; // Hot weather
    if (code === 'WCOLD') return '🧊'; // Cold weather
    if (code === 'WFIRE') return '🔥'; // Fire danger
    if (code === 'WL') return '⛰️'; // Landslip
    if (code === 'WFNTSA') return '💧'; // Flooding
    if (code === 'WMSGNL') return '💨'; // Strong monsoon
    if (code === 'WTMW') return '🌊'; // Tsunami
    if (code === 'WFROST') return '❄️'; // Frost
    return '⚠️';
  };

  const getWarningColor = (code: string, type?: string) => {
    if (code.startsWith('TC')) {
      if (code === 'TC1') return 'bg-green-500';
      if (code === 'TC3') return 'bg-yellow-500';
      if (code === 'TC8') return 'bg-red-500';
      if (code === 'TC9' || code === 'TC10') return 'bg-black';
      return 'bg-blue-500';
    }
    if (code.startsWith('WRAIN')) {
      if (type?.includes('紅色') || code.includes('R')) return 'bg-red-500';
      if (type?.includes('黃色') || code.includes('Y')) return 'bg-yellow-500';
      if (type?.includes('綠色') || code.includes('G')) return 'bg-green-500';
      return 'bg-blue-500';
    }
    if (code === 'WHOT' || code === 'WFIRE') return 'bg-orange-500';
    if (code === 'WCOLD' || code === 'WFROST') return 'bg-blue-500';
    return 'bg-gray-500';
  };

  const formatTime = (timeStr: string) => {
    const time = new Date(timeStr);
    return time.toLocaleTimeString('zh-HK', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const totalWarnings = warnings.length + specialTips.length;

  if (totalWarnings === 0) {
    return null; // Don't show anything if no warnings
  }

  return (
    <div className="relative">
      {/* Warning Indicator */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`
          flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-300
          ${getCardClass()} ${getHoverClass()} ${getBorderClass()}
          hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-300
        `}
      >
        <div className="flex items-center space-x-1">
          <div className="text-lg">⚠️</div>
          <span className={`text-sm font-medium ${getTextClass()}`}>
            {totalWarnings}
          </span>
        </div>
        {loading && (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
        )}
      </button>

      {/* Warnings Dropdown */}
      {showDetails && (
        <div className={`
          absolute top-full right-0 mt-2 w-96 max-h-96 overflow-y-auto z-50
          rounded-lg shadow-xl border ${getCardClass()} ${getBorderClass()}
        `}>
          <div className={`p-4 border-b ${getBorderClass()}`}>
            <h3 className={`text-lg font-bold ${getTextClass()}`}>
              🚨 天氣警告 Weather Warnings
            </h3>
            <button
              onClick={fetchWeatherWarnings}
              disabled={loading}
              className={`mt-2 text-sm ${getSecondaryTextClass()} hover:underline`}
            >
              {loading ? '更新中...' : '🔄 刷新'}
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {/* Active Warnings */}
            {warnings.map((warning, index) => (
              <div key={index} className={`p-3 border-b ${getBorderClass()}`}>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-white text-sm
                      ${getWarningColor(warning.code, warning.type)}
                    `}>
                      {getWarningIcon(warning.code, warning.type)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium ${getTextClass()}`}>
                      {warning.name}
                      {warning.type && (
                        <span className={`ml-2 text-sm ${getSecondaryTextClass()}`}>
                          ({warning.type})
                        </span>
                      )}
                    </div>
                    <div className={`text-xs mt-1 ${getSecondaryTextClass()}`}>
                      發出時間: {warning.issueTime && formatTime(warning.issueTime)}
                      {warning.expireTime && (
                        <span className="ml-2">
                          到期: {formatTime(warning.expireTime)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Special Weather Tips */}
            {specialTips.map((tip, index) => (
              <div key={index} className={`p-3 border-b ${getBorderClass()}`}>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm">
                      💡
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium mb-2 ${getTextClass()}`}>
                      特別天氣提示
                    </div>
                    <div className={`text-sm leading-relaxed ${getTextClass()}`}>
                      {tip.desc}
                    </div>
                    <div className={`text-xs mt-2 ${getSecondaryTextClass()}`}>
                      更新時間: {formatTime(tip.updateTime)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Data Source */}
          <div className={`p-3 text-xs text-center ${getSecondaryTextClass()}`}>
            資料來源：香港天文台
          </div>
        </div>
      )}
    </div>
  );
}; 