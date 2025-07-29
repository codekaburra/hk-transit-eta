
  // Minibus ETA interface
  export interface MinibusETA {
    eta_seq: number;
    diff: number;
    timestamp: string;
    remarks_tc: string | null;
    remarks_sc: string | null;
    remarks_en: string | null;
  }

  // Minibus ETA Stop Data interface
  export interface MinibusETAStopData {
    route_id: number;
    route_seq: number;
    stop_seq: number;
    enabled: boolean;
    eta: MinibusETA[];
  }

  // Minibus ETA Stop Response interface
  export interface MinibusETAStopResponse {
    type: string;
    version: string;
    generated_timestamp: string;
    data: MinibusETAStopData[];
  }

  // Format ETA time
  export const formatETA = (etaString: string) => {
    try {
      const etaDate = new Date(etaString);
      const etaDateString = etaDate.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' });
      const now = new Date();
      const diffMs = etaDate.getTime() - now.getTime();
      const diffMins = Math.round(diffMs / 60000);
      
      if (diffMins <= 0) return '即將到達 Arriving';
      if (diffMins < 60) return `${etaDateString} - ${diffMins}mins`;
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${etaDateString} ${hours}h ${mins}m`;
    } catch {
      return '';
    }
  };

  // Format minibus ETA with additional info
  export const formatMinibusETA = (etaItem: MinibusETA) => {
    try {
      const timestamp = etaItem.timestamp;
      const diff = etaItem.diff;
      const remarksTC = etaItem.remarks_tc;
      
      if (diff <= 0) return '即將到達 Arriving';
      if (diff < 60) return `${diff}分鐘 ${diff}mins`;
      
      // Also show the actual time
      const etaDate = new Date(timestamp);
      const timeString = etaDate.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' });
      
      if (remarksTC && remarksTC !== '') {
        return `${timeString} - ${diff}m (${remarksTC})`;
      }
      
      return `${timeString} - ${diff}m`;
    } catch {
      return '';
    }
  };