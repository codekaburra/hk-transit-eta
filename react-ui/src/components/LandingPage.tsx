import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { Header } from './header/Header';

interface AppCategory {
  id: string;
  title_tc: string;
  title_en: string;
  icon: string;
  path: string;
  description?: string;
}

const APP_CATEGORIES: AppCategory[] = [
  {
    id: 'transport',
    title_tc: '香港交通實時抵站時間',
    title_en: 'Hong Kong Transport Estimated Time of Arrival',
    icon: '🚌',
    path: '/transport'
  },
  {
    id: 'weather',
    title_tc: '香港天氣',
    title_en: 'Weather',
    icon: '🌤️',
    path: '/weather'
  },
  {
    id: 'currency',
    title_tc: '貨幣轉換器',
    title_en: 'Currency Converter',
    icon: '💱',
    path: '/currency'
  },
  {
    id: 'units',
    title_tc: '單位轉換器',
    title_en: 'Unit Converter',
    icon: '📏',
    path: '/units'
  },
  {
    id: 'decimals',
    title_tc: 'Decimals轉換器',
    title_en: 'Decimals Converter',
    icon: '🔢',
    path: '/decimals'
  },
  {
    id: 'worldclock',
    title_tc: '世界時鐘',
    title_en: 'World Clock',
    icon: '🌍',
    path: '/worldclock'
  }
];

export const LandingPage: React.FC = () => {
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

  const handleCategoryClick = (category: AppCategory) => {
    if (category.id === 'transport') {
      navigate('/transport');
    } else if (category.id === 'weather') {
      navigate('/weather');
    } else {
      // For other categories, show a coming soon message or navigate to placeholder
      alert(`${category.title_tc} ${category.title_en} - Coming Soon!`);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${getBackgroundClass()}`}>
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Title */}
        <div className="text-center mb-12">
          <h1 className={`text-4xl font-bold mb-4 transition-colors duration-300 ${getTitleClass()}`}>
          </h1>
          <p className={`text-lg transition-colors duration-300 ${getSecondaryTextClass()}`}>
          </p>
        </div>

        {/* App Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {APP_CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category)}
              className={`
                p-8 rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-105
                ${getCardClass()} ${getHoverClass()} ${getBorderClass()}
                focus:outline-none focus:ring-4 focus:ring-blue-300
              `}
            >
              <div className="text-center">
                <div className="text-6xl mb-6">{category.icon}</div>
                <h2 className={`text-xl font-bold mb-2 transition-colors duration-300 ${getTitleClass()}`}>
                  {category.title_tc}
                </h2>
                <p className={`text-base transition-colors duration-300 ${getTextClass()}`}>
                  {category.title_en}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Footer Info */}
        <div className="text-center mt-16">
          <p className={`text-sm transition-colors duration-300 ${getSecondaryTextClass()}`}>
            更多工具陸續推出 More tools coming soon
          </p>
        </div>
      </main>
    </div>
  );
}; 