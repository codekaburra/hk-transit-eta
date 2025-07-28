// Bus data interfaces
export interface BusRoute {
  company: string;
  route: string;
  direction: string;
  service_type: string;
  orig_en: string;
  orig_tc: string;
  dest_en: string;
  dest_tc: string;
}

export interface BusStop {
  company: string;
  stop: string;
  name_en: string;
  name_tc: string;
  lat: string;
  long: string;
}

export interface RouteStop {
  company: string;
  route: string;
  direction: string;
  service_type: string;
  seq: string;
  stop: string;
  name_en: string;
  name_tc: string;
}

// Minibus data interfaces
export interface MinibusRoute {
  route_id: string;
  route_namee: string;
  route_namec: string;
  company_code: string;
  min_fare: string;
  max_fare: string;
  full_fare: string;
  service_mode: string;
}

export interface MinibusStop {
  stop_id: string;
  stop_namee: string;
  stop_namec: string;
  district_code: string;
  lat: string;
  long: string;
}

export interface MinibusRouteStop {
  route_id: string;
  route_seq: string;
  stop_id: string;
  stop_namee: string;
  stop_namec: string;
  fare: string;
}

// Theme types
export type ThemeMode = 'light' | 'dark' | 'custom-light';

// Component props interfaces
export interface SearchBoxProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchType: 'bus-route' | 'bus-stop';
  onSearchTypeChange: (type: 'bus-route' | 'bus-stop') => void;
}

export interface StopCardProps {
  stop: BusStop;
  onClick?: (stop: BusStop) => void;
}

export interface ResultsListProps {
  searchType: 'bus-route' | 'bus-stop';
  routes: BusRoute[];
  stops: BusStop[];
  searchTerm: string;
  onStopClick?: (stop: BusStop) => void;
} 