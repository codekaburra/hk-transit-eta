import React, { useState } from 'react';
import { GoogleMap, MarkerF, CircleF, InfoWindowF, useJsApiLoader } from '@react-google-maps/api';
import { useThemeStyles } from '../../hooks/useThemeStyles';
import { useTheme } from '../../contexts/ThemeContext';
import { NearbyStop, NearbyStops } from '../../services/api';

interface NearbyStopsMapProps {
  result: NearbyStops;
  onStopClick: (stop: NearbyStop) => void;
}

// One loader id for the whole app: the Maps script is global, and a second id
// makes the library reload it and warn.
const LOADER_ID = 'hk-transit-eta-google-maps';

// Bus and minibus are told apart by colour rather than by label, so the map
// stays readable when stops overlap. The centre keeps the default red pin.
const PIN_COLOUR: Record<NearbyStop['kind'], string> = {
  bus: '#2563eb',
  minibus: '#16a34a',
};

// Zoom chosen so the searched radius roughly fills the frame. Fitting bounds
// instead would zoom past the radius when a single stop is returned.
const ZOOM_FOR_RADIUS: Array<{ maxRadius: number; zoom: number }> = [
  { maxRadius: 100, zoom: 17 },
  { maxRadius: 250, zoom: 16 },
  { maxRadius: 500, zoom: 15 },
  { maxRadius: Infinity, zoom: 14 },
];

const zoomFor = (radiusM: number) =>
  ZOOM_FOR_RADIUS.find(step => radiusM <= step.maxRadius)!.zoom;

const pin = (colour: string) => ({
  path: 'M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z',
  fillColor: colour,
  fillOpacity: 1,
  strokeColor: '#ffffff',
  strokeWeight: 1.5,
  scale: 0.7,
});

export const NearbyStopsMap: React.FC<NearbyStopsMapProps> = ({ result, onStopClick }) => {
  const [selected, setSelected] = useState<NearbyStop | null>(null);
  const { getCardClass, getTextClass, getGrayTextClass } = useThemeStyles();
  const { isDarkMode } = useTheme();

  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useJsApiLoader({
    id: LOADER_ID,
    googleMapsApiKey: apiKey || '',
  });

  const centre = { lat: result.centre.lat, lng: result.centre.long };

  // Without a key the script loads but every tile comes back as an error
  // watermark, so say what is missing instead of showing a broken map.
  if (!apiKey) {
    return (
      <div className={`p-6 rounded-lg mb-6 text-center ${getCardClass()}`}>
        <div className="text-4xl mb-2">🗺️</div>
        <p className={getTextClass()}>
          未設定地圖金鑰 Map key not configured
        </p>
        <p className={`text-sm mt-1 ${getGrayTextClass()}`}>
          REACT_APP_GOOGLE_MAPS_API_KEY
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={`p-6 rounded-lg mb-6 text-center ${getCardClass()}`}>
        <p className={getTextClass()}>地圖載入失敗 Map failed to load</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={`p-6 rounded-lg mb-6 text-center ${getCardClass()}`}>
        <p className={getGrayTextClass()}>地圖載入中… Loading map…</p>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-lg mb-6 ${getCardClass()}`}>
      <div className="w-full h-96 rounded-lg overflow-hidden">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={centre}
          zoom={zoomFor(result.radius_m)}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
            // Points of interest carry their own pins, which are hard to tell
            // from the stop pins at this zoom.
            styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }],
          }}
        >
          <CircleF
            center={centre}
            radius={result.radius_m}
            options={{
              strokeColor: isDarkMode ? '#93c5fd' : '#2563eb',
              strokeOpacity: 0.6,
              strokeWeight: 1,
              fillColor: isDarkMode ? '#93c5fd' : '#2563eb',
              fillOpacity: 0.08,
              clickable: false,
            }}
          />

          <MarkerF position={centre} title="搜尋位置 Search centre" zIndex={2} />

          {result.stops.map(stop => (
            <MarkerF
              key={`${stop.kind}-${stop.stop}`}
              position={{ lat: stop.lat, lng: stop.long }}
              icon={pin(PIN_COLOUR[stop.kind])}
              title={stop.name_tc || stop.name_en || stop.stop}
              onClick={() => setSelected(stop)}
            />
          ))}

          {selected && (
            <InfoWindowF
              position={{ lat: selected.lat, lng: selected.long }}
              onCloseClick={() => setSelected(null)}
            >
              {/* Google renders this on its own white background, so the theme
                  classes are deliberately not applied here. */}
              <div className="text-gray-900">
                <div className="font-medium">{selected.name_tc || selected.name_en}</div>
                <div className="text-sm">{selected.name_en}</div>
                <div className="text-xs mt-1">
                  {selected.company} · {selected.distance_m} m
                </div>
                {selected.routes.length > 0 && (
                  <div className="text-sm mt-1">{selected.routes.join('、')}</div>
                )}
                <button
                  onClick={() => onStopClick(selected)}
                  className="mt-2 px-3 py-1 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                >
                  查看抵站時間 View ETA
                </button>
              </div>
            </InfoWindowF>
          )}
        </GoogleMap>
      </div>

      <div className={`flex flex-wrap gap-4 mt-3 text-xs ${getGrayTextClass()}`}>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: PIN_COLOUR.bus }} />
          巴士 Bus
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: PIN_COLOUR.minibus }} />
          小巴 Minibus
        </span>
        <span>🔴 搜尋位置 Search centre · ◯ {result.radius_m} m</span>
      </div>
    </div>
  );
};
