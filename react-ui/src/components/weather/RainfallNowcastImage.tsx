import React, { useState, useEffect, useRef } from 'react';
import { useThemeStyles } from '../../hooks/useThemeStyles';

interface RainfallData {
  latitude: number;
  longitude: number;
  rainfall: number;
}

export const RainfallNowcastImage: React.FC = () => {
  const [rainfallData, setRainfallData] = useState<RainfallData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    getCardClass,
    getTextClass,
    getSecondaryTextClass,
    getTitleClass,
    getBorderClass,
    getAccentClass
  } = useThemeStyles();

  const fetchRainfallData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        'https://data.weather.gov.hk/weatherAPI/hko_data/F3/Gridded_rainfall_nowcast_tc.csv'
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const csvText = await response.text();
      const lines = csvText.trim().split('\n');
      
      // Skip header line
      const dataLines = lines.slice(1);
      
      const data: RainfallData[] = dataLines.map(line => {
        const [lat, lng, rainfall] = line.split(',').map(str => parseFloat(str.trim()));
        return {
          latitude: lat,
          longitude: lng,
          rainfall: rainfall || 0
        };
      });

      setRainfallData(data);
      setLastUpdated(new Date().toLocaleString('zh-HK'));
      
      // Draw the rainfall map
      drawRainfallMap(data);
    } catch (err) {
      setError('無法獲取降雨資料 Failed to fetch rainfall data');
      console.error('Error fetching rainfall data:', err);
    } finally {
      setLoading(false);
    }
  };

  const drawRainfallMap = (data: RainfallData[]) => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 600;
    canvas.height = 400;

    // Clear canvas
    ctx.fillStyle = '#f0f8ff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Find bounds
    const lats = data.map(d => d.latitude);
    const lngs = data.map(d => d.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Color scale for rainfall intensity
    const getColor = (rainfall: number) => {
      if (rainfall === 0) return 'rgba(255, 255, 255, 0.1)';
      if (rainfall < 1) return 'rgba(173, 216, 230, 0.6)'; // Light blue
      if (rainfall < 5) return 'rgba(135, 206, 250, 0.7)'; // Sky blue
      if (rainfall < 10) return 'rgba(0, 191, 255, 0.8)'; // Deep sky blue
      if (rainfall < 20) return 'rgba(30, 144, 255, 0.8)'; // Dodger blue
      if (rainfall < 50) return 'rgba(255, 255, 0, 0.8)'; // Yellow
      if (rainfall < 100) return 'rgba(255, 165, 0, 0.8)'; // Orange
      return 'rgba(255, 0, 0, 0.9)'; // Red
    };

    // Draw rainfall points
    data.forEach(point => {
      const x = ((point.longitude - minLng) / (maxLng - minLng)) * canvas.width;
      const y = canvas.height - ((point.latitude - minLat) / (maxLat - minLat)) * canvas.height;
      
      ctx.fillStyle = getColor(point.rainfall);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Add title
    ctx.fillStyle = '#333';
    ctx.font = '16px Arial';
    ctx.fillText('香港降雨預報 HK Rainfall Nowcast', 10, 25);

    // Add legend
    const legendItems = [
      { color: 'rgba(173, 216, 230, 0.6)', text: '< 1mm' },
      { color: 'rgba(135, 206, 250, 0.7)', text: '1-5mm' },
      { color: 'rgba(0, 191, 255, 0.8)', text: '5-10mm' },
      { color: 'rgba(30, 144, 255, 0.8)', text: '10-20mm' },
      { color: 'rgba(255, 255, 0, 0.8)', text: '20-50mm' },
      { color: 'rgba(255, 165, 0, 0.8)', text: '50-100mm' },
      { color: 'rgba(255, 0, 0, 0.9)', text: '> 100mm' }
    ];

    legendItems.forEach((item, index) => {
      const y = 50 + index * 20;
      ctx.fillStyle = item.color;
      ctx.fillRect(10, y, 15, 15);
      ctx.fillStyle = '#333';
      ctx.font = '12px Arial';
      ctx.fillText(item.text, 30, y + 12);
    });
  };

  useEffect(() => {
    fetchRainfallData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchRainfallData, 5 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className={`p-6 rounded-lg ${getCardClass()} ${getBorderClass()}`}>
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className={`mt-2 transition-colors duration-300 ${getTextClass()}`}>
            載入降雨資料中... Loading rainfall data...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 rounded-lg ${getCardClass()} ${getBorderClass()}`}>
        <div className={`text-center py-8 ${getTextClass()}`}>
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchRainfallData}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${getAccentClass()}`}
          >
            重試 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 rounded-lg ${getCardClass()} ${getBorderClass()}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className={`text-xl font-bold transition-colors duration-300 ${getTitleClass()}`}>
          🌧️ 降雨預報圖 Rainfall Nowcast
        </h2>
        <button
          onClick={fetchRainfallData}
          disabled={loading}
          className={`px-4 py-2 rounded-lg font-medium transition-colors duration-300 ${getAccentClass()}`}
        >
          {loading ? '載入中...' : '🔄 刷新'}
        </button>
      </div>

      {/* Last Updated */}
      {lastUpdated && (
        <p className={`text-sm mb-4 transition-colors duration-300 ${getSecondaryTextClass()}`}>
          最後更新 Last Updated: {lastUpdated}
        </p>
      )}

      {/* Rainfall Map Canvas */}
      <div className="flex justify-center mb-4">
        <canvas
          ref={canvasRef}
          className="border border-gray-300 rounded-lg shadow-md max-w-full h-auto"
        />
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
        <div className={`p-3 rounded-lg bg-opacity-50 ${getCardClass()}`}>
          <div className={`text-lg font-bold transition-colors duration-300 ${getTitleClass()}`}>
            {rainfallData.length}
          </div>
          <div className={`text-sm transition-colors duration-300 ${getSecondaryTextClass()}`}>
            資料點 Data Points
          </div>
        </div>
        <div className={`p-3 rounded-lg bg-opacity-50 ${getCardClass()}`}>
          <div className={`text-lg font-bold transition-colors duration-300 ${getTitleClass()}`}>
            {rainfallData.filter(d => d.rainfall > 0).length}
          </div>
          <div className={`text-sm transition-colors duration-300 ${getSecondaryTextClass()}`}>
            有雨地區 Rainy Areas
          </div>
        </div>
        <div className={`p-3 rounded-lg bg-opacity-50 ${getCardClass()}`}>
          <div className={`text-lg font-bold transition-colors duration-300 ${getTitleClass()}`}>
            {Math.max(...rainfallData.map(d => d.rainfall)).toFixed(1)}mm
          </div>
          <div className={`text-sm transition-colors duration-300 ${getSecondaryTextClass()}`}>
            最大降雨量 Max Rainfall
          </div>
        </div>
      </div>

      {/* Data Source */}
      <div className="text-center mt-4">
        <p className={`text-sm transition-colors duration-300 ${getSecondaryTextClass()}`}>
          資料來源：香港天文台 Data Source:{' '}
          <a
            href="https://data.weather.gov.hk/weatherAPI/hko_data/F3/Gridded_rainfall_nowcast_tc.csv"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            HKO Gridded Rainfall Nowcast
          </a>
        </p>
      </div>
    </div>
  );
}; 