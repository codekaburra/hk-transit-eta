// API service for communicating with the Go backend

import { BusRoute, BusStop, RouteStop } from '../types';
import { isDebugMode } from './utils';
import { fetchJSON, fetchJSONOr } from './http';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

// url builds an endpoint URL, encoding the parameters. Undefined values are
// dropped so optional filters can be passed straight through.
const url = (path: string, params: Record<string, string | undefined> = {}): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, value);
  }
  const query = search.toString();
  return `${API_BASE_URL}${path}${query ? `?${query}` : ''}`;
};

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
export const searchRoutes = async (query: string): Promise<BusRoute[]> =>
  fetchJSONOr<BusRoute[]>(url('/bus/search/routes', { q: query }), [], 'bus route search', {
    delayOnError: true,
  });

// Search stops
export const searchStops = async (query: string): Promise<BusStop[]> =>
  fetchJSONOr<BusStop[]>(url('/bus/search/stops', { q: query }), [], 'bus stop search', {
    delayOnError: true,
  });

export const getBusRoutes = async (): Promise<BusRoute[]> =>
  fetchJSONOr<BusRoute[]>(url('/bus/routes'), [], 'bus routes');

export const getBusStops = async (): Promise<BusStop[]> =>
  fetchJSONOr<BusStop[]>(url('/bus/stops'), [], 'bus stops');

export const getBusStopsByRoute = async (route: string): Promise<BusStop[]> =>
  fetchJSONOr<BusStop[]>(url('/bus/stops-by-route', { routeId: route }), [], 'stops by route');

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
): Promise<BusRoute[]> =>
  fetchJSON<BusRoute[]>(url('/bus/route-variants', { routeId: route, company }));

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
  const data = await fetchJSON<any[]>(
    url('/bus/stops-by-route', {
      routeId: route,
      company: filter.company,
      direction: filter.direction,
      serviceType: filter.serviceType,
    })
  );

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

export const getBusRoutesByStop = async (stopId: string): Promise<BusRoute[]> =>
  fetchJSONOr<BusRoute[]>(url('/bus/routes-by-stop', { stopId }), [], 'routes by stop');

export const getBusStopsNearby = async (stopId: string): Promise<BusStop[]> =>
  fetchJSONOr<BusStop[]>(url('/bus/stops-nearby', { stopId }), [], 'nearby stops');

// A 404 is the expected answer for an unknown stop, so it is not logged.
export const getBusStopById = async (stopId: string): Promise<BusStop | null> =>
  fetchJSONOr<BusStop | null>(url('/bus/stop-by-id', { stopId }), null, 'bus stop by id', {
    quietOn404: true,
  });

// ETAs come from the operators' public APIs directly rather than through the
// backend, which only serves reference data.
export const getBusETA = async (
  company: string,
  stopId: string,
  route: string,
  service_type: string,
  direction: string
): Promise<string[]> => {
  let etaUrl = '';
  if (company === 'KMB') {
    etaUrl = `https://data.etabus.gov.hk/v1/transport/kmb/eta/${encodeURIComponent(stopId)}/${encodeURIComponent(route)}/${encodeURIComponent(service_type)}`;
  } else if (company === 'CTB') {
    etaUrl = `https://rt.data.gov.hk/v2/transport/citybus/eta/ctb/${encodeURIComponent(stopId)}/${encodeURIComponent(route)}`;
  } else {
    // An unknown operator has no ETA endpoint; fetching '' would request the
    // page itself and parse the HTML as JSON.
    console.error(`No ETA endpoint for company ${company}`);
    return [];
  }

  const data = await fetchJSONOr<any>(etaUrl, null, 'bus ETA', { delayOnError: true });
  if (isDebugMode()) {
    console.log('API getBusETA called with:', { company, stopId, route, service_type, direction }, etaUrl, data);
  }
  // The operators have returned an object here in place of the list before, so
  // check the shape rather than assuming it.
  if (!Array.isArray(data?.data)) return [];
  return data.data
    .filter((item: any) => direction === item.dir)
    .map((item: any) => item.eta);
};

// Minibus API functions
export const getMinibusRoutes = async (): Promise<any[]> =>
  fetchJSONOr<any[]>(url('/minibus/routes'), [], 'minibus routes');

export const getMinibusStops = async (): Promise<any[]> =>
  fetchJSONOr<any[]>(url('/minibus/stops'), [], 'minibus stops');

export const searchMinibusRoutes = async (query: string): Promise<any[]> =>
  fetchJSONOr<any[]>(url('/minibus/search/routes', { q: query }), [], 'minibus route search', {
    delayOnError: true,
  });

export const searchMinibusStops = async (query: string): Promise<any[]> =>
  fetchJSONOr<any[]>(url('/minibus/search/stops', { q: query }), [], 'minibus stop search', {
    delayOnError: true,
  });

export const getMinibusStopById = async (stopId: string): Promise<any | null> =>
  fetchJSONOr<any | null>(url('/minibus/stop-by-id', { stopId }), null, 'minibus stop by id', {
    quietOn404: true,
  });

export const getMinibusRoutesByStop = async (stopId: string): Promise<any[]> =>
  fetchJSONOr<any[]>(url('/minibus/routes-by-stop', { stopId }), [], 'minibus routes by stop');

export const getMinibusRouteStops = async (routeId: string, routeSeq: string): Promise<any[]> =>
  fetchJSONOr<any[]>(url('/minibus/route-stops', { routeId, routeSeq }), [], 'minibus route stops');

export const getMinibusRouteDetails = async (routeId: string, routeSeq: string): Promise<any> =>
  fetchJSONOr<any>(url('/minibus/route-details', { routeId, routeSeq }), null, 'minibus route details', {
    delayOnError: true,
  });

// Get route count for a specific type
export const getRouteCount = async (
  type: 'bus' | 'minibus'
): Promise<{ type: string; count: number }> =>
  fetchJSONOr(url('/num-routes', { type }), { type, count: 0 }, `${type} route count`);

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
