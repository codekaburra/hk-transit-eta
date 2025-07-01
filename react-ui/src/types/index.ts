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
}

// Theme types
export type ThemeMode = 'light' | 'dark' | 'custom-light';

// Component props interfaces
export interface SearchBoxProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchType: 'route' | 'stop';
  onSearchTypeChange: (type: 'route' | 'stop') => void;
}

export interface RouteCardProps {
  route: BusRoute;
}

export interface StopCardProps {
  stop: BusStop;
  onClick?: (stop: BusStop) => void;
}

export interface ResultsListProps {
  searchType: 'route' | 'stop';
  routes: BusRoute[];
  stops: BusStop[];
  searchTerm: string;
  onStopClick?: (stop: BusStop) => void;
} 