import React, { useState, useEffect, useMemo } from 'react';
import { useThemeStyles } from '../../hooks/useThemeStyles';
import { UmbrellaIcon } from './UmbrellaIcon';

// The day cards are one of nine columns, so the forecast prose is clipped and
// the full text — both languages — is carried in the title attribute.
const truncate = (text: string, max: number) =>
  text.length > max ? text.substring(0, max) + '…' : text;

// Types for the Hong Kong Observatory API response
interface WeatherForecast {
  forecastDate: string;
  week: string;
  forecastWind: string;
  forecastWeather: string;
  forecastMaxtemp: {
    value: number;
    unit: string;
  };
  forecastMintemp: {
    value: number;
    unit: string;
  };
  forecastMaxrh: {
    value: number;
    unit: string;
  };
  forecastMinrh: {
    value: number;
    unit: string;
  };
  ForecastIcon: number;
  PSR: string;
}

interface WeatherData {
  generalSituation: string;
  weatherForecast: WeatherForecast[];
  updateTime: string;
  seaTemp: {
    place: string;
    value: number;
    unit: string;
    recordTime: string;
  };
  soilTemp: Array<{
    place: string;
    value: number;
    unit: string;
    recordTime: string;
    depth: {
      unit: string;
      value: number;
    };
  }>;
}

export const NineDaysForecastCard = () => {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  // The Observatory publishes the same forecast per language, so the English
  // text comes from a second request rather than being translated here.
  const [englishData, setEnglishData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setLastUpdated] = useState<string>('');

  const {
    getCardClass,
    getTextClass,
    getSecondaryTextClass,
    getTitleClass,
    getForthTextClass,
    getBorderClass,
    getAccentClass
  } = useThemeStyles();

  const fetchWeatherData = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = (lang: 'tc' | 'en') =>
        `https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=fnd&lang=${lang}`;

      // Both languages in parallel. Only the Chinese one is required: if the
      // English request fails the card still renders, just without it.
      const [tcResponse, enResult] = await Promise.all([
        fetch(url('tc')),
        fetch(url('en')).then(r => (r.ok ? r.json() : null)).catch(() => null),
      ]);

      if (!tcResponse.ok) {
        throw new Error(`HTTP error! status: ${tcResponse.status}`);
      }

      const data: WeatherData = await tcResponse.json();
      setWeatherData(data);
      setEnglishData(enResult as WeatherData | null);
      setLastUpdated(new Date().toLocaleString('zh-HK'));
    } catch (err) {
      setError('無法獲取天氣資料 Failed to fetch weather data');
      console.error('Error fetching weather data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeatherData();
  }, []);

  // Paired by forecast date rather than by position, so a difference in the
  // number of days between the two responses cannot mismatch the text.
  const englishByDate = useMemo(() => {
    const byDate = new Map<string, WeatherForecast>();
    englishData?.weatherForecast.forEach(day => byDate.set(day.forecastDate, day));
    return byDate;
  }, [englishData]);

  const formatDate = (dateStr: string) => {
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${month}/${day}`;
  };

  const getWeatherIcon = (iconCode: number) => {
    // Simple icon mapping based on common weather patterns
    // reference : https://www.svgrepo.com/collection/iconhub-tritone-icons/5
    if (iconCode >= 50 && iconCode <= 59) return '<svg fill="#000000" viewBox="0 0 24 24" id="sun" xmlns="http://www.w3.org/2000/svg" class="icon multi-color"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><title style="stroke-width: 2;">sun</title><circle id="primary-fill" cx="12" cy="12" r="4" style="fill: #fd9d30; stroke-width: 2;"></circle><path id="secondary-stroke" d="M12,3V4M5.64,5.64l.7.7M3,12H4m1.64,6.36.7-.7M12,21V20m6.36-1.64-.7-.7M21,12H20M18.36,5.64l-.7.7" style="fill: none; stroke: #f8dd2a; stroke-linecap: round; stroke-linejoin: round; stroke-width: 2;"></path></g></svg>'; // Sunny
    if (iconCode >= 60 && iconCode <= 69) return '<svg viewBox="0 0 24 24" id="sun-cloudy" xmlns="http://www.w3.org/2000/svg" class="icon multi-color" fill="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><title style="stroke-width: 2;">sun cloudy</title><path id="secondary-fill" d="M13,10A4.32,4.32,0,0,0,9.4,13.79a2.27,2.27,0,0,0-.9-.19,2.73,2.73,0,0,0-.5.05H8A3.25,3.25,0,0,1,7,13,3.45,3.45,0,0,1,6,10.5a3.5,3.5,0,0,1,6.69-1.43A3.6,3.6,0,0,1,13,10Z" style="fill: #fd9d30; stroke-width: 2;"></path><path id="secondary-stroke" d="M9,4V3M4.05,6.05l-.71-.71M14,6.05l.71-.71" style="fill: none; stroke: #fd9d30; stroke-linecap: round; stroke-linejoin: round; stroke-width: 2;"></path><path id="tertiary-fill" d="M20.7,16.9a3.32,3.32,0,0,1-3,2.1H8.5a2.46,2.46,0,0,1-2.08-1.2A2.46,2.46,0,0,1,8.5,16.6a2.27,2.27,0,0,1,.9.19A4.27,4.27,0,0,1,13.5,13a4.1,4.1,0,0,1,3.4,1.91,2.76,2.76,0,0,1,.77-.11A3.32,3.32,0,0,1,20.7,16.9Z" style="fill: #b7b7b7; stroke-width: 2;"></path><path id="primary-stroke" d="M21,15.4a3.9,3.9,0,0,1-.3,1.5,3.32,3.32,0,0,1-3,2.1H8.5a2.46,2.46,0,0,1-2.08-1.2A2.91,2.91,0,0,1,6,16.3a2.67,2.67,0,0,1,2-2.65H8a2.73,2.73,0,0,1,.5-.05,2.27,2.27,0,0,1,.9.19A4.32,4.32,0,0,1,13,10a3.08,3.08,0,0,1,.53,0,4.1,4.1,0,0,1,3.4,1.91,2.76,2.76,0,0,1,.77-.11A3.47,3.47,0,0,1,21,15.4Z" style="fill: none; stroke: #000000; stroke-linecap: round; stroke-linejoin: round; stroke-width: 2;"></path></g></svg>'; // Partly cloudy with rain
    if (iconCode >= 70 && iconCode <= 79) return '<svg viewBox="0 0 24 24" id="cloud" xmlns="http://www.w3.org/2000/svg" class="icon multi-color" fill="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><title style="stroke-width: 2;">cloud</title><path id="tertiary-fill" d="M20.7,14.5A4,4,0,0,1,17,17H6a3,3,0,0,1-2.6-1.5,3,3,0,0,1,3.68-1.29,5,5,0,0,1,9-2.09A4.08,4.08,0,0,1,17,12,4,4,0,0,1,20.7,14.5Z" style="fill: #b7b7b7; stroke-width: 2;"></path><path id="primary-stroke" d="M21,13a3.76,3.76,0,0,1-.3,1.5A4,4,0,0,1,17,17H6a3,3,0,1,1,1.08-5.79,5,5,0,0,1,9-2.09A4.08,4.08,0,0,1,17,9,4,4,0,0,1,21,13Z" style="fill: none; stroke: #000000; stroke-linecap: round; stroke-linejoin: round; stroke-width: 2;"></path></g></svg>'; // Cloudy
    if (iconCode >= 80 && iconCode <= 89) return '<svg viewBox="0 0 24 24" id="rain-alt" xmlns="http://www.w3.org/2000/svg" class="icon multi-color" fill="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><title style="stroke-width: 2;">rain alt</title><path id="tertiary-fill" d="M20.7,10.5A4,4,0,0,1,17,13H6a3,3,0,0,1-2.6-1.5,3,3,0,0,1,3.68-1.29,5,5,0,0,1,9-2.09A4.08,4.08,0,0,1,17,8,4,4,0,0,1,20.7,10.5Z" style="fill: #b7b7b7; stroke-width: 2;"></path><path id="primary-stroke" d="M21,9a3.76,3.76,0,0,1-.3,1.5A4,4,0,0,1,17,13H6A3,3,0,1,1,7.08,7.21a5,5,0,0,1,9-2.09A4.08,4.08,0,0,1,17,5,4,4,0,0,1,21,9Z" style="fill: none; stroke: #000000; stroke-linecap: round; stroke-linejoin: round; stroke-width: 2;"></path><path id="secondary-stroke" d="M6,17,5,19m5-2L8,21m6-4-1,2m5-2-2,4" style="fill: none; stroke: #2ca9bc; stroke-linecap: round; stroke-linejoin: round; stroke-width: 2;"></path></g></svg>'; // Rainy
    return '🌤️'; // Default
  };

  const getRainChanceColor = (psr: string) => {
    switch (psr) {
      case '低': return 'text-green-600';
      case '中低': return 'text-yellow-600';
      case '中': return 'text-orange-600';
      case '中高': return 'text-red-600';
      case '高': return 'text-red-800';
      default: return getTextClass();
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <p className={`mt-2 transition-colors duration-300 ${getTextClass()}`}>
          載入天氣資料中... Loading weather data...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-8 ${getTextClass()}`}>
        <div className="text-4xl mb-4">⚠️</div>
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchWeatherData}
          className={`mt-4 px-4 py-2 rounded-lg font-medium transition-all duration-300 ${getAccentClass()}`}
        >
          重試 Retry
        </button>
      </div>
    );
  }

  const content = (
    <>
        {weatherData && (
          <>
            {/* Weather Forecast Grid Layout */}
            <div className={`mb-8 ${getCardClass()}`}>
              {/* General Situation Header */}
              <div className={`p-4 rounded-t-lg ${getCardClass()} ${getBorderClass()}`}>
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1">
                    <h2 className={`text-lg font-bold mb-2 transition-colors duration-300 ${getTitleClass()}`}>
                      天氣概況 General Situation
                    </h2>
                    <p className={`text-sm leading-relaxed transition-colors duration-300 ${getTextClass()}`}>
                      {weatherData.generalSituation}
                    </p>
                    {englishData && (
                      <p className={`text-sm leading-relaxed mt-2 transition-colors duration-300 ${getSecondaryTextClass()}`}>
                        {englishData.generalSituation}
                      </p>
                    )}
                  </div>
                  
                  {/* Sea and Soil Temperature */}
                  <div className="lg:w-80 space-y-2">
                    <div className={`text-sm transition-colors duration-300 ${getSecondaryTextClass()}`}>
                      🌊 海水溫度 Sea: {weatherData.seaTemp.value}°{weatherData.seaTemp.unit}{' '}
                      ({weatherData.seaTemp.place}{englishData ? ` ${englishData.seaTemp.place}` : ''})
                    </div>
                    {weatherData.soilTemp.map((soil, index) => (
                      <div key={index} className={`text-sm transition-colors duration-300 ${getSecondaryTextClass()}`}>
                        🌱 土壤溫度 Soil ({soil.depth.value}{soil.depth.unit}): {soil.value}°{soil.unit}{' '}
                        ({soil.place}{englishData?.soilTemp[index] ? ` ${englishData.soilTemp[index].place}` : ''})
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Nine Days Forecast Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-9 gap-2 p-3">
                {weatherData.weatherForecast.map((day, index) => {
                  const en = englishByDate.get(day.forecastDate);
                  return (
                  <div
                    key={day.forecastDate}
                    className={`border-2 rounded-md p-2 text-center transition-all duration-300 ${getCardClass()}`}
                  >
                    {/* Date Header */}
                    <div className="mb-2">
                      <div className={`text-xs font-bold transition-colors duration-300 ${getTitleClass()}`}>
                        {formatDate(day.forecastDate)}
                      </div>
                      <div className={`text-xs transition-colors duration-300 ${getSecondaryTextClass()}`}>
                        ({day.week.replace('星期', '')}{en ? ` ${en.week.slice(0, 3)}` : ''})
                      </div>
                    </div>

                    {/* Weather Icon */}
                    <div className="mb-2">
                      <div 
                        className="w-8 h-8 mx-auto"
                        dangerouslySetInnerHTML={{ __html: getWeatherIcon(day.ForecastIcon) }}
                      />
                    </div>

                    {/* Temperature */}
                    <div className="mb-2">
                      <div className={`text-sm font-bold transition-colors duration-300 ${getForthTextClass()}`}>
                        {day.forecastMintemp.value} | {day.forecastMaxtemp.value} °C
                      </div>
                      <div className={`text-xs transition-colors duration-300 ${getSecondaryTextClass()}`}>
                        {day.forecastMinrh.value}-{day.forecastMaxrh.value}%
                      </div>
                    </div>

                    {/* Rain Chance with Icon */}
                    <div className="mb-2 flex items-center justify-center">
                      <UmbrellaIcon className="w-3 h-3 mr-1" size={12} color="blue" />
                      <span className={`text-xs font-medium ${getRainChanceColor(day.PSR)}`}>
                        {day.PSR}{en ? ` ${en.PSR}` : ''}
                      </span>
                    </div>

                    {/* Wind */}
                    <div
                      className={`text-xs mb-2 transition-colors duration-300 ${getSecondaryTextClass()}`}
                      title={en ? `${day.forecastWind}\n${en.forecastWind}` : day.forecastWind}
                    >
                      <div>{truncate(day.forecastWind, 15)}</div>
                      {en && <div className="opacity-75">{truncate(en.forecastWind, 22)}</div>}
                    </div>

                    {/* Weather Description */}
                    <div
                      className={`text-xs leading-tight transition-colors duration-300 ${getTextClass()}`}
                      title={en ? `${day.forecastWeather}\n${en.forecastWeather}` : day.forecastWeather}
                    >
                      <div>{truncate(day.forecastWeather, 30)}</div>
                      {en && (
                        <div className={`mt-1 ${getSecondaryTextClass()}`}>
                          {truncate(en.forecastWeather, 45)}
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

    </>
  );

  return content;
}; 