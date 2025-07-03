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
      const response = await fetch(`${API_BASE_URL}/search/routes?q=${encodeURIComponent(query)}`);
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
      const response = await fetch(`${API_BASE_URL}/search/stops?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error searching stops:', error);
      return [];
    }
  },

  getRoutes: async (): Promise<BusRoute[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/routes`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching KMB routes:', error);
      return [];
    }
  },

  getStops: async (): Promise<BusStop[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/stops`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching KMB stops:', error);
      return [];
    }
  },

  getStopsByRoute: async (route: string): Promise<BusStop[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/stops-by-route?routeId=${route}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching stops by route:', error);
      return [];
    }
  },

  getRouteStops: async (route: string, direction: string): Promise<RouteStop[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/stops-by-route?routeId=${route}&direction=${direction}`);
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

  getRoutesByStop: async (stopId: string): Promise<BusRoute[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/routes-by-stop?stopId=${stopId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching routes by stop:', error);
      return [];
    }
  },

  getStopsNearby: async (stopId: string): Promise<BusStop[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/stops-nearby?stopId=${stopId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching nearby stops:', error);
      return [];
    }
  },

  getKmbETA: async (stopId: string, route: BusRoute): Promise<string[]> => {
    try {
      const response = await fetch(`https://data.etabus.gov.hk/v1/transport/kmb/eta/${stopId}/${route.route}/${route.service_type}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.data.map((item: any) => item.eta) || [];
    } catch (error) {
      console.error('Error fetching Citybus ETA:', error);
      return [];
    }
  },

  // Get real-time ETA data from Citybus API
  getCitybusETA: async (stopId: string, route: BusRoute): Promise<string[]> => {
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

}; 