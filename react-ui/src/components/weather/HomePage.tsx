import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemeStyles } from '../../hooks/useThemeStyles';
import { Header } from '../header/Header';
import { NineDaysForecastCard } from './NineDaysForecastCard';
import { RainfallNowcastImage } from './RainfallNowcastImage';

export const WeatherHomePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    getBackgroundClass,
    getCardClass,
    getTextClass,
    getSecondaryTextClass,
    getTitleClass,
    getHoverClass,
    getBorderClass
  } = useThemeStyles();

  return (
    <div className={`min-h-screen transition-colors duration-300 ${getBackgroundClass()}`}>
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Title */}
        <div className="text-center mb-12">
          <h1 className={`text-4xl font-bold mb-4 transition-colors duration-300 ${getTitleClass()}`}>
            🌤️ 香港天氣 Weather
          </h1>
          <p className={`text-lg transition-colors duration-300 ${getSecondaryTextClass()}`}>
            香港氣象資訊 Hong Kong Weather Information
          </p>
        </div>

        {/* Nine Days Forecast Card */}
        <div className="mb-8">
          <NineDaysForecastCard />
        </div>

        {/* Rainfall Nowcast Image */}
        <div className="mb-8">
          <RainfallNowcastImage />
        </div>

        {/* Other Weather Tools */}
        <div className="mb-8">
        </div>

        {/* Back to Home */}
        <div className="text-center mt-12">
          <button
            onClick={() => navigate('/')}
            className={`
              px-6 py-3 rounded-lg font-medium transition-all duration-300
              ${getCardClass()} ${getHoverClass()} ${getBorderClass()}
              hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300
            `}
          >
            <span className={`transition-colors duration-300 ${getTextClass()}`}>
              ← 返回主頁 Back to Home
            </span>
          </button>
        </div>

        {/* Footer Info */}
        <div className="text-center mt-8">
          <p className={`text-sm transition-colors duration-300 ${getSecondaryTextClass()}`}>
            資料來源：香港天文台 Data Source: Hong Kong Observatory
          </p>
        </div>
      </main>
    </div>
  );
}; 