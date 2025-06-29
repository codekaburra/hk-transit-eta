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

  // Get KMB routes
  getKmbRoutes: async (): Promise<BusRoute[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/kmb/routes`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching KMB routes:', error);
      return [];
    }
  },

  // Get KMB stops
  getKmbStops: async (): Promise<BusStop[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/kmb/stops`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching KMB stops:', error);
      return [];
    }
  },

  // Get Citybus routes
  getCitybusRoutes: async (): Promise<BusRoute[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/citybus/routes`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching Citybus routes:', error);
      return [];
    }
  },

  // Get Citybus stops
  getCitybusStops: async (): Promise<BusStop[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/citybus/stops`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching Citybus stops:', error);
      return [];
    }
  },

  // Get KMB route stops
  getKmbRouteStops: async (): Promise<RouteStop[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/kmb/route-stops`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching KMB route stops:', error);
      return [];
    }
  },

  // Get Citybus route stops
  getCitybusRouteStops: async (): Promise<RouteStop[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/citybus/route-stops`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching Citybus route stops:', error);
      return [];
    }
  }
}; 