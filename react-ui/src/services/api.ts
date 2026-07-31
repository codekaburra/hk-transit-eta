// API service for communicating with the Go backend

import { BusRoute, BusStop, RouteStop } from '../types';
import { isDebugMode } from './utils';

// Utility function to sleep for a given duration
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

// ETA data interface
export interface ETAData {
  co: string;
  route: string;
  dir: string;
  service_type: number;
  seq: number;
  dest_tc: string;
  dest_en: string;
  eta_seq: number;
  eta: string;
  rmk_tc: string;
  rmk_en: string;
  data_timestamp: string;
}

// Search routes
export const searchRoutes = async (query: string): Promise<BusRoute[]> => {
  console.log('API searchRoutes called with query:', query);
  try {
    const response = await fetch(`${API_BASE_URL}/bus/search/routes?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error searching routes:', error);
    await sleep(5000); // Sleep for 5 seconds on error
    return [];
  }
};

// Search stops
export const searchStops = async (query: string): Promise<BusStop[]> => {
  console.log('API searchStops called with query:', query);
  try {
    const response = await fetch(`${API_BASE_URL}/bus/search/stops?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error searching stops:', error);
    await sleep(5000); // Sleep for 5 seconds on error
    return [];
  }
};

export const getBusRoutes = async (): Promise<BusRoute[]> => {
  console.log('API getBusRoutes called');
  try {
    const response = await fetch(`${API_BASE_URL}/bus/routes`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching KMB routes:', error);
    return [];
  }
};

export const getBusStops = async (): Promise<BusStop[]> => {
  console.log('API getBusStops called');
  try {
    const response = await fetch(`${API_BASE_URL}/bus/stops`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching KMB stops:', error);
    return [];
  }
};

export const getBusStopsByRoute = async (route: string): Promise<BusStop[]> => {
  console.log('API getBusStopsByRoute called with route:', route);
  try {
    const response = await fetch(`${API_BASE_URL}/bus/stops-by-route?routeId=${route}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching stops by route:', error);
    return [];
  }
};

// Returns the variants of an exact route number: one entry per travelling
// direction, plus extra entries for routes that run special service types.
// Uses an exact-match endpoint — the fuzzy search endpoint cannot be used to
// resolve a route, since it matches substrings and caps at 50 rows.
//
// Throws on failure rather than returning an empty list: an empty list means
// "this route does not exist", and callers must be able to tell that apart
// from the backend being unreachable — otherwise an outage is reported to the
// user as a missing route.
export const getBusRouteVariants = async (
  route: string,
  company?: string
): Promise<BusRoute[]> => {
  const params = new URLSearchParams({ routeId: route });
  if (company) params.set('company', company);
  const response = await fetch(`${API_BASE_URL}/bus/route-variants?${params}`);
  if (!response.ok) {
    throw new Error(`Route variants request failed with status ${response.status}`);
  }
  return await response.json();
};

export interface RouteStopFilter {
  company?: string;
  direction?: string;
  serviceType?: string;
}

// Throws on failure for the same reason as getBusRouteVariants: an empty list
// must only ever mean the route has no stops.
export const getBusRouteStops = async (
  route: string,
  filter: RouteStopFilter = {}
): Promise<RouteStop[]> => {
  if (!route) {
    throw new Error(`Missing required parameter: route=${route}`);
  }

  // Without these filters a shared route number returns both operators'
  // stops for every direction at once, which is not a usable sequence.
  const params = new URLSearchParams({ routeId: route });
  if (filter.company) params.set('company', filter.company);
  if (filter.direction) params.set('direction', filter.direction);
  if (filter.serviceType) params.set('serviceType', filter.serviceType);

  const url = `${API_BASE_URL}/bus/stops-by-route?${params}`;

  const response = await fetch(url);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Route stops request failed with status ${response.status}: ${errorText}`
    );
  }
  const data = await response.json();

  // Transform the data to match RouteStop interface
  return data.map((item: any) => ({
    company: item.company,
    route: item.route,
    direction: item.direction,
    service_type: item.service_type,
    seq: item.seq,
    stop: item.stop,
    name_en: item.name_en,
    name_tc: item.name_tc,
    lat: item.lat,
    long: item.long,
  }));
};

export const getBusRoutesByStop = async (stopId: string): Promise<BusRoute[]> => {
  console.log('API getBusRoutesByStop called with stopId:', stopId);
  try {
    const response = await fetch(`${API_BASE_URL}/bus/routes-by-stop?stopId=${stopId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching routes by stop:', error);
    return [];
  }
};

export const getBusStopsNearby = async (stopId: string): Promise<BusStop[]> => {
  console.log('API getBusStopsNearby called with stopId:', stopId);
  try {
    const response = await fetch(`${API_BASE_URL}/bus/stops-nearby?stopId=${stopId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching nearby stops:', error);
    return [];
  }
};

export const getBusStopById = async (stopId: string): Promise<BusStop | null> => {
  console.log('API getBusStopById called with stopId:', stopId);
  try {
    const response = await fetch(`${API_BASE_URL}/bus/stop-by-id?stopId=${stopId}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching stop by id:', error);
    return null;
  }
};

export const getBusETA = async (company: string, stopId: string, route: string, service_type: string, direction: string): Promise<string[]> => {
  try {
    let url = '';
    if (company === 'KMB') {
      // Fetch from KMB public API directly
      url = `https://data.etabus.gov.hk/v1/transport/kmb/eta/${stopId}/${route}/${service_type}`;
    } else if (company === 'CTB') {
      // Fetch from Citybus public API directly
      url = `https://rt.data.gov.hk/v2/transport/citybus/eta/ctb/${stopId}/${route}`;
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch Bus ETA');
    const data = await response.json();
    if (isDebugMode()) { console.log('API getBusETA called with:', { company, stopId, route, service_type, direction }, url, data); }
    const etaList = (data.data || []).filter((item: any) => direction === item.dir).map((item: any) => item.eta);
    return etaList;
  } catch (error) {
    console.error('Error fetching bus ETA:', error);
    await sleep(5000); // Sleep for 5 seconds on error
    return [];
  }
};

// Minibus API functions
export const getMinibusRoutes = async (): Promise<any[]> => {
  console.log('API getMinibusRoutes called');
  try {
    const response = await fetch(`${API_BASE_URL}/minibus/routes`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching minibus routes:', error);
    return [];
  }
};

export const getMinibusStops = async (): Promise<any[]> => {
  console.log('API getMinibusStops called');
  try {
    const response = await fetch(`${API_BASE_URL}/minibus/stops`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching minibus stops:', error);
    return [];
  }
};

export const searchMinibusRoutes = async (query: string): Promise<any[]> => {
  console.log('API searchMinibusRoutes called with query:', query);
  try {
    const response = await fetch(`${API_BASE_URL}/minibus/search/routes?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error searching minibus routes:', error);
    await sleep(5000); // Sleep for 5 seconds on error
    return [];
  }
};

export const searchMinibusStops = async (query: string): Promise<any[]> => {
  console.log('API searchMinibusStops called with query:', query);
  try {
    const response = await fetch(`${API_BASE_URL}/minibus/search/stops?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error searching minibus stops:', error);
    await sleep(5000); // Sleep for 5 seconds on error
    return [];
  }
};

export const getMinibusStopById = async (stopId: string): Promise<any | null> => {
  console.log('API getMinibusStopById called with stopId:', stopId);
  try {
    const response = await fetch(`${API_BASE_URL}/minibus/stop-by-id?stopId=${stopId}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching minibus stop by id:', error);
    return null;
  }
};

export const getMinibusRoutesByStop = async (stopId: string): Promise<any[]> => {
  console.log('API getMinibusRoutesByStop called with stopId:', stopId);
  try {
    const response = await fetch(`${API_BASE_URL}/minibus/routes-by-stop?stopId=${stopId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching minibus routes by stop:', error);
    return [];
  }
};

export const getMinibusRouteStops = async (routeId: string, routeSeq: string): Promise<any[]> => {
  console.log('API getMinibusRouteStops called with:', { routeId, routeSeq });
  try {
    const response = await fetch(`${API_BASE_URL}/minibus/route-stops?routeId=${routeId}&routeSeq=${routeSeq}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching minibus route stops:', error);
    return [];
  }
};

export const getMinibusRouteDetails = async (routeId: string, routeSeq: string): Promise<any> => {
  console.log('API getMinibusRouteDetails called with:', { routeId, routeSeq });
  try {
    const response = await fetch(`${API_BASE_URL}/minibus/route-details?routeId=${routeId}&routeSeq=${routeSeq}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching minibus route details:', error);
    await sleep(5000); // Sleep for 5 seconds on error
    return null;
  }
};

// Get route count for a specific type
export const getRouteCount = async (type: 'bus' | 'minibus'): Promise<{ type: string; count: number }> => {
  console.log('API getRouteCount called with type:', type);
  try {
    const response = await fetch(`${API_BASE_URL}/num-routes?type=${type}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${type} route count:`, error);
    return { type, count: 0 };
  }
};

// Legacy api object for backward compatibility (can be removed after updating all imports)
export const api = {
  searchRoutes,
  searchStops,
  getBusRoutes,
  getBusStops,
  getBusStopsByRoute,
  getBusRouteStops,
  getBusRouteVariants,
  getBusRoutesByStop,
  getBusStopsNearby,
  getBusStopById,
  getBusETA,
  getMinibusRoutes,
  getMinibusStops,
  searchMinibusRoutes,
  searchMinibusStops,
  getMinibusStopById,
  getMinibusRoutesByStop,
  getMinibusRouteStops,
  getMinibusRouteDetails,
  getRouteCount,
}; 