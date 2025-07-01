
import { BusRoute, BusStop } from '../types';

// Mock data for 
// company: 'KMB',demonstrati
// company: 'KMB',on - in a real app, this would come from your Go backend
export const mockRoutes: BusRoute[] = [
  {
    company: 'KMB',
    route: '1',
    direction: '1',
    service_type: '1',
    orig_en: 'Tsim Sha Tsui Ferry',
    orig_tc: '尖沙咀碼頭',
    dest_en: 'Mong Kok',
    dest_tc: '旺角'
  },
  {
    company: 'KMB',
    route: '2',
    direction: '1',
    service_type: '1',
    orig_en: 'Star Ferry',
    orig_tc: '天星碼頭',
    dest_en: 'Mong Kok',
    dest_tc: '旺角'
  },
  {
    company: 'KMB',
    route: '6',
    direction: '1',
    service_type: '1',
    orig_en: 'Tsim Sha Tsui Ferry',
    orig_tc: '尖沙咀碼頭',
    dest_en: 'Mong Kok',
    dest_tc: '旺角'
  }
];

export const mockStops: BusStop[] = [
  {
    company: 'KMB',
    stop: '001234',
    name_en: 'Tsim Sha Tsui Ferry',
    name_tc: '尖沙咀碼頭',
    lat: '22.2944',
    long: '114.1741'
  },
  {
    company: 'KMB',
    stop: '001235',
    name_en: 'Mong Kok',
    name_tc: '旺角',
    lat: '22.3193',
    long: '114.1694'
  }
]; 