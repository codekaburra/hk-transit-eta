// API service for communicating with the Go backend

import { BusRoute, BusStop, RouteStop } from '../types';

const API_BASE_URL = 'http://localhost:8080/api';

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

  getRoutesByStop: async (stopId: string): Promise<BusRoute[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/routes-by-stop?stopId=${stopId}`);
      console.log(response);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching routes by stop:', error);
      return [];
    }
  },

}; 