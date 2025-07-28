// API service for communicating with the Go backend

import { BusRoute, BusStop, RouteStop } from '../types';

const API_BASE_URL = 'http://localhost:8080/api';
const CITYBUS_ETA_BASE_URL = 'https://rt.data.gov.hk/v2/transport/citybus/eta';

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

export const api = {
  // Search routes
  searchRoutes: async (query: string): Promise<BusRoute[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/bus/search/routes?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error searching routes:', error);
      return [];
    }
  },

  // Search stops
  searchStops: async (query: string): Promise<BusStop[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/bus/search/stops?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error searching stops:', error);
      return [];
    }
  },

  getBusRoutes: async (): Promise<BusRoute[]> => {
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
  },

  getBusStops: async (): Promise<BusStop[]> => {
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
  },

  getBusStopsByRoute: async (route: string): Promise<BusStop[]> => {
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
  },

  getBusRouteStops: async (route: string, direction: string): Promise<RouteStop[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/bus/stops-by-route?routeId=${route}&direction=${direction}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
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
      }));
    } catch (error) {
      console.error('Error fetching route stops:', error);
      return [];
    }
  },

  getBusRoutesByStop: async (stopId: string): Promise<BusRoute[]> => {
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
  },

  getBusStopsNearby: async (stopId: string): Promise<BusStop[]> => {
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
  },

  getBusStopById: async (stopId: string): Promise<BusStop | null> => {
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
  },

  getBusETA: async (stopId: string, route: BusRoute): Promise<string[]> => {
    if (route.company === 'CTB') {
      return await api.getBusCitybusETA(stopId, route);
    } else if (route.company === 'KMB') {
      return await api.getBusKmbETA(stopId, route);
    }
    return [];
  },

  getBusKmbETA: async (stopId: string, route: BusRoute): Promise<string[]> => {
    try {
      const response = await fetch(`https://data.etabus.gov.hk/v1/transport/kmb/eta/${stopId}/${route.route}/${route.service_type}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.data.map((item: any) => item.eta) || [];
    } catch (error) {
      console.error('Error fetching KMB ETA:', error);
      return [];
    }
  },

  // GetBus real-time ETA data from Citybus API
  getBusCitybusETA: async (stopId: string, route: BusRoute): Promise<string[]> => {
    try {
      const response = await fetch(`${CITYBUS_ETA_BASE_URL}/ctb/${stopId}/${route.route}`);
      if (!response.ok) {
        return [];
      }
      const data = await response.json();
      return data.data.map((item: any) => item.eta) || [];
    } catch (error) {
      console.error('Error fetching Citybus ETA:', error);
      return [];
    }
  },

  // Minibus API functions
  getMinibusRoutes: async (): Promise<any[]> => {
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
  },

  getMinibusStops: async (): Promise<any[]> => {
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
  },

  searchMinibusRoutes: async (query: string): Promise<any[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/minibus/search/routes?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error searching minibus routes:', error);
      return [];
    }
  },

  searchMinibusStops: async (query: string): Promise<any[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/minibus/search/stops?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error searching minibus stops:', error);
      return [];
    }
  },

  getMinibusStopById: async (stopId: string): Promise<any | null> => {
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
  },

  getMinibusRoutesByStop: async (stopId: string): Promise<any[]> => {
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
  },

  getMinibusRouteStops: async (routeId: string, routeSeq: string): Promise<any[]> => {
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
  },

}; 