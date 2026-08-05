import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useThemeStyles } from '../../hooks/useThemeStyles';
import { usePollingFetch } from '../../hooks/usePollingFetch';
import { getRainfallNowcast, RainfallNowcast, RainfallWindow } from '../../services/api';
import { COASTLINE } from './coastline';

// The Observatory republishes roughly every 12 minutes and the backend caches
// for 5, so polling faster than this only costs requests.
const REFRESH_MS = 5 * 60 * 1000;

// The four windows are played as a loop so the band's movement is visible;
// stepping through them by hand makes a two-hour trend hard to read.
const FRAME_MS = 1000;

// Bands for a half-hourly accumulation, in millimetres.
const BANDS: { limit: number; colour: string; label: string }[] = [
  { limit: 0.5, colour: '#c6e6f5', label: '< 0.5' },
  { limit: 2, colour: '#7fc9ec', label: '0.5 – 2' },
  { limit: 5, colour: '#3fa9df', label: '2 – 5' },
  { limit: 10, colour: '#1f78c1', label: '5 – 10' },
  { limit: 20, colour: '#f2d024', label: '10 – 20' },
  { limit: 30, colour: '#f08c22', label: '20 – 30' },
  { limit: Infinity, colour: '#e03131', label: '> 30' },
];

const colourFor = (mm: number): string | null => {
  if (mm <= 0) return null;
  return (BANDS.find(b => mm < b.limit) ?? BANDS[BANDS.length - 1]).colour;
};

const formatTime = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit', hour12: false });
};

// draw paints one forecast window. The grid is regular, so each point is drawn
// as a cell sized from the spacing rather than as a dot, which would leave the
// map stippled.
const draw = (canvas: HTMLCanvasElement, nowcast: RainfallNowcast, window: RainfallWindow) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { min_lat, max_lat, min_lon, max_lon } = nowcast.bounds;
  const spanLat = max_lat - min_lat;
  const spanLon = max_lon - min_lon;
  if (spanLat <= 0 || spanLon <= 0) return;

  const width = 640;
  // A degree of longitude is shorter than a degree of latitude, by cos(lat).
  // Sizing the canvas from the raw degree spans squashes the map vertically —
  // about 7% at this latitude — and shifts every cell away from where it is.
  const midLat = ((min_lat + max_lat) / 2) * (Math.PI / 180);
  const height = Math.round((width * spanLat) / (spanLon * Math.cos(midLat)));
  canvas.width = width;
  canvas.height = height;

  const projectX = (lon: number) => ((lon - min_lon) / spanLon) * width;
  // Latitude increases northwards; canvas y increases downwards.
  const projectY = (lat: number) => height - ((lat - min_lat) / spanLat) * height;

  // Without a backdrop the canvas is transparent wherever it is not raining,
  // which on a dry day is almost all of it — the panel then reads as an empty
  // box rather than as a map with no rain on it.
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(127, 156, 184, 0.14)';
  ctx.fillRect(0, 0, width, height);

  // Cell size from the number of distinct coordinates actually present, so the
  // cells tile without gaps whatever grid resolution the Observatory publishes.
  const lats = new Set<number>();
  const lons = new Set<number>();
  for (const [lat, lon] of window.points) {
    lats.add(lat);
    lons.add(lon);
  }
  const cellW = Math.ceil(width / Math.max(lons.size, 1)) + 1;
  const cellH = Math.ceil(height / Math.max(lats.size, 1)) + 1;

  // Rainfall first, so the coastline stays legible on top of it.
  for (const [lat, lon, mm] of window.points) {
    const colour = colourFor(mm);
    if (!colour) continue;
    const x = projectX(lon);
    const y = projectY(lat);
    ctx.fillStyle = colour;
    ctx.fillRect(x - cellW / 2, y - cellH / 2, cellW, cellH);
  }

  // A mid slate reads against both the light and the dark card backgrounds,
  // which the canvas cannot inherit.
  ctx.strokeStyle = 'rgba(122, 148, 174, 0.95)';
  ctx.lineWidth = 1.1;
  for (const run of COASTLINE) {
    ctx.beginPath();
    run.forEach(([lon, lat], i) => {
      const x = projectX(lon);
      const y = projectY(lat);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
};

export const RainfallNowcastImage: React.FC = () => {
  const [windowIndex, setWindowIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    getCardClass,
    getTextClass,
    getSecondaryTextClass,
    getTitleClass,
    getBorderClass,
    getAccentClass,
  } = useThemeStyles();

  const fetcher = useCallback(() => getRainfallNowcast(), []);
  const { data: nowcast, loading, error, refresh } = usePollingFetch<RainfallNowcast | null>(
    fetcher,
    null,
    { intervalMs: REFRESH_MS, errorMessage: '無法獲取降雨資料 Failed to fetch rainfall data' }
  );

  const active = nowcast?.windows[windowIndex];

  useEffect(() => {
    if (canvasRef.current && nowcast && active) {
      draw(canvasRef.current, nowcast, active);
    }
  }, [nowcast, active]);

  // A new issue can carry fewer windows than the one being viewed.
  useEffect(() => {
    if (nowcast && windowIndex >= nowcast.windows.length) setWindowIndex(0);
  }, [nowcast, windowIndex]);

  // Advance through the windows on a loop. Depends only on the window count,
  // so the timer is not torn down and restarted on every frame.
  const windowCount = nowcast?.windows.length ?? 0;
  useEffect(() => {
    if (!playing || windowCount < 2) return;
    const timer = setInterval(() => {
      setWindowIndex(i => (i + 1) % windowCount);
    }, FRAME_MS);
    return () => clearInterval(timer);
  }, [playing, windowCount]);

  if (loading && !nowcast) {
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

  if (error && !nowcast) {
    return (
      <div className={`p-6 rounded-lg ${getCardClass()} ${getBorderClass()}`}>
        <div className={`text-center py-8 ${getTextClass()}`}>
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={refresh}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${getAccentClass()}`}
          >
            重試 Retry
          </button>
        </div>
      </div>
    );
  }

  if (!nowcast || !active) return null;

  const wet = active.points.filter(p => p[2] > 0).length;

  return (
    <div className={`p-6 rounded-lg ${getCardClass()} ${getBorderClass()}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className={`text-xl font-bold transition-colors duration-300 ${getTitleClass()}`}>
          🌧️ 降雨臨近預報 Rainfall Nowcast
        </h2>
        <button
          onClick={refresh}
          disabled={loading}
          className={`px-4 py-2 rounded-lg font-medium transition-colors duration-300 ${getAccentClass()}`}
        >
          {loading ? '載入中...' : '🔄 刷新'}
        </button>
      </div>

      <p className={`text-sm mb-4 transition-colors duration-300 ${getSecondaryTextClass()}`}>
        發佈時間 Issued: {formatTime(nowcast.updated)}
      </p>

      {/* One tab per half-hourly period, out to two hours ahead. */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={() => setPlaying(p => !p)}
          aria-label={playing ? '暫停動畫 Pause' : '播放動畫 Play'}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-300 ${getAccentClass()}`}
        >
          {playing ? '⏸' : '▶'}
        </button>
        {nowcast.windows.map((w, i) => (
          <button
            key={w.ends}
            // Picking a period is a request to look at it, so stop the loop.
            onClick={() => { setPlaying(false); setWindowIndex(i); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-300
              ${i === windowIndex ? getAccentClass() : `${getCardClass()} ${getBorderClass()}`}`}
          >
            <span className={i === windowIndex ? '' : getTextClass()}>至 {formatTime(w.ends)}</span>
          </button>
        ))}
      </div>

      {active.max_mm <= 0 && (
        <p className={`text-sm text-center mb-2 ${getSecondaryTextClass()}`}>
          此時段預測香港境內無雨 No rain forecast over Hong Kong in this period
        </p>
      )}

      <div className="flex justify-center mb-4">
        <canvas
          ref={canvasRef}
          className={`rounded-lg shadow-md max-w-full h-auto ${getBorderClass()} border`}
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mb-4">
        {BANDS.map(b => (
          <span key={b.label} className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: b.colour }} />
            <span className={`text-xs ${getSecondaryTextClass()}`}>{b.label} mm</span>
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
        <div className={`p-3 rounded-lg bg-opacity-50 ${getCardClass()}`}>
          <div className={`text-lg font-bold transition-colors duration-300 ${getTitleClass()}`}>
            {active.points.length}
          </div>
          <div className={`text-sm transition-colors duration-300 ${getSecondaryTextClass()}`}>
            資料點 Data Points
          </div>
        </div>
        <div className={`p-3 rounded-lg bg-opacity-50 ${getCardClass()}`}>
          <div className={`text-lg font-bold transition-colors duration-300 ${getTitleClass()}`}>
            {wet}
          </div>
          <div className={`text-sm transition-colors duration-300 ${getSecondaryTextClass()}`}>
            有雨地區 Rainy Areas
          </div>
        </div>
        <div className={`p-3 rounded-lg bg-opacity-50 ${getCardClass()}`}>
          <div className={`text-lg font-bold transition-colors duration-300 ${getTitleClass()}`}>
            {active.max_mm.toFixed(2)}mm
          </div>
          <div className={`text-sm transition-colors duration-300 ${getSecondaryTextClass()}`}>
            最大降雨量 Max Rainfall
          </div>
        </div>
      </div>

      <div className="text-center mt-4">
        <p className={`text-sm transition-colors duration-300 ${getSecondaryTextClass()}`}>
          資料來源：香港天文台 Data Source:{' '}
          <a
            href="https://portal.csdi.gov.hk/geoportal/?datasetId=hko_rcd_1634958531320_87755&lang=zh-hk"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Gridded rainfall nowcast in Hong Kong
          </a>
          {' '}· 數據為臨時性質 Provisional data
        </p>
      </div>
    </div>
  );
};
