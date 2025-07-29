import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useThemeStyles } from '../../hooks/useThemeStyles';
import { Header } from '../Header';
import { MainNavigation } from '../MainNavigation';
import {
  MTRLine,
  MTRStation,
  MTRScheduleResponse,
  MTRTrainInfo,
  getLineName,
  getStationName,
  getLineNameTC,
  getStationNameTC,
  getLineColor,
  isValidLineStation
} from '../../types/mtr';

interface TrainDisplayProps {
  direction: 'UP' | 'DOWN';
  trains: MTRTrainInfo[];
  stationCode: string;
}

const TrainDisplay: React.FC<TrainDisplayProps> = ({ direction, trains, stationCode }) => {
  const { getCardClass, getTextClass, getSecondaryTextClass, getAccentClass, getTitleClass, getForthTextClass } = useThemeStyles();

  const formatTime = (timeStr: string) => {
    const time = new Date(timeStr);
    return time.toLocaleTimeString('en-HK', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const getDestinationName = (destCode: string) => {
    const stationTC = getStationNameTC(destCode as MTRStation);
    const stationEN = getStationName(destCode as MTRStation);
    return stationTC !== destCode ? `${stationTC} ${stationEN}` : destCode;
  };

  if (!trains || trains.length === 0) {
    return (
      <div className={`p-4 rounded-lg ${getCardClass()}`}>
        <h4 className={`font-semibold mb-2 ${getTextClass()}`}>
          {direction === 'UP' ? '上行 Upbound' : '下行 Downbound'}
        </h4>
        <div className={`text-center py-4 ${getSecondaryTextClass()}`}>
          暫無列車資料 No train data available
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-lg ${getCardClass()}`}>
      <h4 className={`font-semibold mb-4 ${getTextClass()}`}>
        {direction === 'UP' ? '上行 Upbound' : '下行 Downbound'}
      </h4>
      <div className="space-y-3">
        {trains.map((train, index) => (
          <div key={index} className={`flex items-center justify-between p-3 rounded-lg border ${getSecondaryTextClass()}`}>
            <div className="flex items-center space-x-4">
              <div className={`px-2 py-1 rounded-full text-xs font-bold ${getAccentClass()}`}>
                月台 Platform {train.plat}
              </div>
              <div>
                <div className={`font-medium ${getTextClass()}`}>
                  往 To {getDestinationName(train.dest)}
                </div>
                <div className={`text-sm ${getSecondaryTextClass()}`}>
                  到站時間 Arrival: {formatTime(train.time)}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-lg font-bold ${getTitleClass()}`}>
                {train.ttnt === '0' ? '即將到站' : `${train.ttnt} 分鐘`}
              </div>
              <div className={`text-xs ${getSecondaryTextClass()}`}>
                {train.ttnt === '0' ? 'Arriving' : `${train.ttnt} min`}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const MTRStationDetails: React.FC = () => {
  const { stationCode } = useParams<{ stationCode: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const lineCode = searchParams.get('line');

  const [scheduleData, setScheduleData] = useState<MTRScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const { getBackgroundClass, getCardClass, getTextClass, getSecondaryTextClass, getTitleClass, getAccentClass, getForthTextClass } = useThemeStyles();

  // Validate parameters
  const station = stationCode as MTRStation;
  const line = lineCode as MTRLine;

  const stationName = getStationName(station);
  const stationNameTC = getStationNameTC(station);
  const lineName = getLineName(line);
  const lineNameTC = getLineNameTC(line);
  const lineColor = getLineColor(line);

  const fetchSchedule = async () => {
    if (!line || !station) {
      setError('Missing line or station parameter');
      setLoading(false);
      return;
    }

    if (!isValidLineStation(line, station)) {
      setError(`Station ${station} is not on line ${line}`);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php?line=${line}&sta=${station}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: MTRScheduleResponse = await response.json();

      if (data.status === 0) {
        setError(data.message || 'Service temporarily unavailable');
      } else {
        setScheduleData(data);
        setLastUpdated(new Date().toLocaleTimeString('en-HK'));
      }
    } catch (err) {
      setError('Failed to fetch train schedule');
      console.error('Error fetching MTR schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchSchedule, 30000);
    return () => clearInterval(interval);
  }, [line, station]);

  if (!line || !station) {
    return (
      <div className={`min-h-screen transition-colors duration-300 ${getBackgroundClass()}`}>
        <Header />
        <main className="container mx-auto px-4 py-8">
          <MainNavigation currentType="mtr" />
          <div className={`text-center py-8 ${getTextClass()}`}>
            <div className="text-4xl mb-4">❌</div>
            <p>Invalid station or line parameter</p>
          </div>
        </main>
      </div>
    );
  }

  const stationKey = `${line}-${station}`;
  const stationData = scheduleData?.data?.[stationKey];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${getBackgroundClass()}`}>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <MainNavigation currentType="mtr" />

        {/* Station Header */}
        <div
          className={`rounded-lg shadow-md p-6 mb-6 transition-colors duration-300 ${getCardClass()}`}
          style={{ borderLeftWidth: '6px', borderLeftColor: lineColor }}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-4">
                <div className="text-4xl"><div
                  className="px-3 py-1 rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: lineColor }}
                >
                  <h2 className={`text-xl transition-colors duration-300 ${getForthTextClass()}`}>
                    {lineNameTC} {lineName}
                  </h2>
                </div></div>
                <div>
                  <div className="flex items-center space-x-3 mb-2">

                  </div>
                  <h1 className={`text-2xl font-bold transition-colors duration-300 ${getTitleClass()}`}>
                    {stationNameTC} {stationName} 
                  </h1>
                </div>
              </div>
            </div>
            <button
              onClick={fetchSchedule}
              disabled={loading}
              className={`px-4 py-2 rounded-lg font-medium transition-colors duration-300 ${getAccentClass()}`}
            >
              {loading ? '載入中...' : '🔄 刷新 Refresh'}
            </button>
          </div>
          {lastUpdated && (
            <div className={`text-sm ${getSecondaryTextClass()}`}>
              最後更新 Last Updated: {lastUpdated}
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className={`mt-2 transition-colors duration-300 ${getTextClass()}`}>
              載入列車資訊中... Loading train information...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className={`text-center py-8 ${getTextClass()}`}>
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchSchedule}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300"
            >
              重試 Retry
            </button>
          </div>
        )}

        {/* Train Schedule */}
        {scheduleData && stationData && !loading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TrainDisplay
              direction="UP"
              trains={stationData.UP || []}
              stationCode={station}
            />
            <TrainDisplay
              direction="DOWN"
              trains={stationData.DOWN || []}
              stationCode={station}
            />
          </div>
        )}

        {/* Service Messages */}
        {scheduleData?.message && scheduleData.status === 0 && (
          <div className={`mt-6 p-4 rounded-lg border-l-4 border-yellow-500 bg-yellow-50 ${getCardClass()}`}>
            <div className="flex items-center">
              <div className="text-yellow-600 mr-3">⚠️</div>
              <div>
                <p className={`font-medium ${getTextClass()}`}>服務通告 Service Notice</p>
                <p className={`text-sm ${getSecondaryTextClass()}`}>{scheduleData.message}</p>
                {scheduleData.url && (
                  <a
                    href={scheduleData.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm underline"
                  >
                    更多資訊 More Information
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}; 