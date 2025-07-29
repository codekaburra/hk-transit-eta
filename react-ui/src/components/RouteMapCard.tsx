import React from 'react';
import { useThemeStyles } from '../hooks/useThemeStyles';

// Standardized interface for RouteMapCard
interface MapStop {
  name_tc: string;
  name_en?: string;
  lat: string | number;
  long: string | number;
}

interface RouteMapCardProps {
  routeStops: MapStop[];
}

// Converter function for bus route stops
export const convertBusRouteStopsToMapStops = (busRouteStops: Array<{
  name_tc: string;
  name_en?: string;
  lat?: string;
  long?: string;
}>): MapStop[] => {
  return busRouteStops
    .filter(stop => stop.lat && stop.long &&
      !isNaN(parseFloat(String(stop.lat))) &&
      !isNaN(parseFloat(String(stop.long))))
    .map(stop => ({
      name_tc: stop.name_tc,
      name_en: stop.name_en,
      lat: stop.lat!,
      long: stop.long!,
    }));
};

// Converter function for minibus route stops
export const convertMinibusRouteStopsToMapStops = (minibusRouteStops: Array<{
  name_tc: string;
  name_en?: string;
  latitude?: string | number;
  longitude?: string | number;
}>): MapStop[] => {
  return minibusRouteStops
    .filter(stop => stop.latitude && stop.longitude &&
      !isNaN(parseFloat(String(stop.latitude))) &&
      !isNaN(parseFloat(String(stop.longitude))))
    .map(stop => ({
      name_tc: stop.name_tc,
      name_en: stop.name_en,
      lat: stop.latitude!,
      long: stop.longitude!,
    }));
};

export const RouteMapCard: React.FC<RouteMapCardProps> = ({ routeStops }) => {
  const { getCardClass, getTextClass, getSecondaryTextClass } = useThemeStyles();
  const [mapError, setMapError] = React.useState(false);

  // All stops are already validated and normalized
  const stopsWithCoords = routeStops;

  if (stopsWithCoords.length === 0) {
    return (
      <div className={`rounded-lg shadow-md p-6 mt-6 transition-colors duration-300 ${getCardClass()}`}>
        <h3 className={`text-xl font-bold mb-4 transition-colors duration-300 ${getTextClass()}`}>
          路線地圖 Route Map
        </h3>
        <div className={`text-center py-8 transition-colors duration-300 ${getSecondaryTextClass()}`}>
          <div className="text-4xl mb-4">🗺️</div>
          <p>No coordinate data available for stops</p>
        </div>
      </div>
    );
  }

  // Calculate center point and bounds
  const latitudes = stopsWithCoords.map(stop => parseFloat(String(stop.lat)));
  const longitudes = stopsWithCoords.map(stop => parseFloat(String(stop.long)));

  const centerLat = latitudes.reduce((sum, lat) => sum + lat, 0) / latitudes.length;
  const centerLng = longitudes.reduce((sum, lng) => sum + lng, 0) / longitudes.length;

  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  // Create Google Maps embed URL - use view mode instead of directions for better reliability
  const firstStop = stopsWithCoords[0];
  const lastStop = stopsWithCoords[stopsWithCoords.length - 1];

  // Limit waypoints to prevent URL length issues (Google Maps has a 25 waypoint limit)
  const maxWaypoints = 20;
  const intermediateStops = stopsWithCoords.slice(1, -1);
  const limitedWaypoints = intermediateStops.length > maxWaypoints
    ? intermediateStops.filter((_, index) => index % Math.ceil(intermediateStops.length / maxWaypoints) === 0).slice(0, maxWaypoints)
    : intermediateStops;

  const waypoints = limitedWaypoints.map(stop =>
    `${stop.lat},${stop.long}`
  ).join('%7C');

  // Use view mode with center and zoom for better reliability
  const mapUrl = waypoints.length > 0
    ? `https://www.google.com/maps/embed/v1/directions?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&origin=${firstStop.lat},${firstStop.long}&destination=${lastStop.lat},${lastStop.long}&waypoints=${waypoints}&mode=transit&avoid=tolls&zoom=14`
    : `https://www.google.com/maps/embed/v1/view?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&center=${centerLat},${centerLng}&zoom=13&maptype=roadmap`;
/**
   1-3:   World view
   4-6:   Country view  
   7-9:   State/province view
   10-12: City view
   13-15: Town/neighborhood view  ✅
   16-18: Street view
   19-21: Building view
 */
    
  // Debug logging
  console.log('Map URL:', mapUrl);
  console.log('Stops with coordinates:', stopsWithCoords.length);
  console.log('Waypoints count:', limitedWaypoints.length);
  console.log('First stop:', firstStop);
  console.log('Last stop:', lastStop);

  return (
    <div className={`rounded-lg shadow-md p-6 mt-6 transition-colors duration-300 ${getCardClass()}`}>
      <h3 className={`text-xl font-bold mb-4 transition-colors duration-300 ${getTextClass()}`}>
        路線地圖 Route Map
      </h3>
      
      <div className="space-y-4">
        {/* Map */}
        <div className="w-full h-96 rounded-lg overflow-hidden">
          {!mapError ? (
            <iframe
              width="100%"
              height="100%"
              style={{ border: 0 }}
              src={mapUrl}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Route Map"
              onError={() => setMapError(true)}
              onLoad={(e) => {
                // Check if iframe loaded successfully
                const iframe = e.target as HTMLIFrameElement;
                try {
                  if (iframe.contentDocument?.title === 'Error') {
                    setMapError(true);
                  }
                } catch (err) {
                  // Cross-origin restriction, but iframe loaded
                  console.log('Map loaded successfully');
                }
              }}
            />
          ) : (
            <div className={`w-full h-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-700 transition-colors duration-300`}>
              <div className="text-4xl mb-4">🗺️</div>
              <p className={`text-center mb-4 transition-colors duration-300 ${getTextClass()}`}>
                Map failed to load
              </p>
              <a
                href={`https://www.google.com/maps/dir/${firstStop.lat},${firstStop.long}/${lastStop.lat},${lastStop.long}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Open in Google Maps
              </a>
            </div>
          )}
        </div>

        {/* Map Legend */}
        <div className={`rounded-lg p-4 bg-gray-50 dark:bg-gray-800 transition-colors duration-300`}>
          <h4 className={`text-sm font-semibold mb-2 transition-colors duration-300 ${getTextClass()}`}>
            地圖說明 Map Legend
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <div className={`transition-colors duration-300 ${getSecondaryTextClass()}`}>
              🚌 <span className="font-medium">Stops:</span> {stopsWithCoords.length} stops with coordinates
            </div>
            <div className={`transition-colors duration-300 ${getSecondaryTextClass()}`}>
              🗺️ <span className="font-medium">Center:</span> {centerLat.toFixed(4)}, {centerLng.toFixed(4)}
            </div>
            <div className={`transition-colors duration-300 ${getSecondaryTextClass()}`}>
              📏 <span className="font-medium">Area:</span> {((maxLat - minLat) * 111).toFixed(1)}km × {((maxLng - minLng) * 111).toFixed(1)}km
            </div>
          </div>
        </div>


      </div>
    </div>
  );
}; 