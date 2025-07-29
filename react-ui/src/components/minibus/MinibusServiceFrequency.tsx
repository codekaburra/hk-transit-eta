import React from 'react';
import { useThemeStyles } from '../../hooks/useThemeStyles';

export interface MinibusServiceFrequencyProps {
  routeDetails: any;
}

export const MinibusServiceFrequency: React.FC<MinibusServiceFrequencyProps> = ({
  routeDetails
}) => {
  const { getCardClass, getTextClass, getSecondaryTextClass, getSecondaryBorderClass , getAccentClass} = useThemeStyles();

  const formatWeekdays = (headway: any) => {
    if (headway.weekdays && Array.isArray(headway.weekdays)) {
      const allDays = headway.weekdays.every((day: boolean) => day);
      if (allDays && headway.public_holiday) return '每日 Daily';

      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const activeDays = headway.weekdays
        .map((active: boolean, i: number) => active ? dayNames[i] : null)
        .filter(Boolean);
      return activeDays.join(', ');
    }
    return '每日 Daily';
  };

  return (
    <div className={`rounded-lg shadow-md p-6 transition-colors duration-300 ${getCardClass()}`}>
      <div className="flex items-center mb-4">
        <span className="text-lg mr-2">🕐</span>
        <h3 className={`text-xl font-bold transition-colors duration-300 ${getTextClass()}`}>班次頻率 Service Frequency</h3>
      </div>

      {routeDetails && routeDetails.headways && routeDetails.headways.length > 0 ? (
        <div className="grid gap-2">
          {routeDetails.headways.map((headway: any, index: number) => (
            <div key={index} className={`flex items-center space-x-2 p-3 rounded-lg ${getSecondaryBorderClass()} transition-colors duration-300 ${getSecondaryTextClass()}`}>
              <span className="text-sm font-medium">
                {headway.start_time?.substring(0, 5)} - {headway.end_time?.substring(0, 5)}
              </span>
              <span className={`text-sm px-2 py-1 ${getAccentClass()} rounded-full`}>
                {formatWeekdays(headway)}
              </span>
              <span className={`text-sm font-semibold ${getSecondaryTextClass()}`}>
                {headway.frequency}
                {headway.frequency_upper && headway.frequency_upper !== headway.frequency
                  ? `-${headway.frequency_upper}`
                  : ''} 分鐘 mins
              </span>
            </div>
          ))}
        </div>
      ) : routeDetails ? (
        <div className="text-center py-4">
          <div className="text-4xl mb-2">📅</div>
          <div className={`text-sm ${getSecondaryTextClass()}`}>
            暫無班次資料 <br />
            <span className="text-xs">No frequency data available from API</span>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-3 text-left">
              <summary className="text-xs text-gray-400 cursor-pointer">Debug Info</summary>
              <pre className="text-xs text-gray-400 mt-1 p-2 bg-gray-100 rounded overflow-auto max-h-1000">
                {JSON.stringify(routeDetails, null, 2)}
              </pre>
            </details>
          )}
        </div>
      ) : (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mb-2"></div>
          <div className={`text-sm ${getSecondaryTextClass()}`}>
            載入班次資料中... <br />
            <span className="text-xs">Loading frequency data...</span>
          </div>
        </div>
      )}
    </div>
  );
}; 