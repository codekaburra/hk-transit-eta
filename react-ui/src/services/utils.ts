
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
      // An unparseable string yields an Invalid Date rather than throwing, so
      // the catch below never fires and the caller would render
      // "Invalid Date - NaN 分鐘 mins".
      if (Number.isNaN(etaDate.getTime())) return '';
      const etaDateString = etaDate.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' });
      const now = new Date();
      const diffMs = etaDate.getTime() - now.getTime();
      const diffMins = Math.round(diffMs / 60000);
      
      if (diffMins <= 0) return '即將到達 Arriving';
      if (diffMins < 60) return `${etaDateString} - ${diffMins} 分鐘 mins`;
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

      if (!Number.isFinite(diff)) return '';
      if (diff <= 0) return '即將到達 Arriving';
      if (diff < 60) return `${diff}分鐘 mins`;
      
      // Also show the actual time
      const etaDate = new Date(timestamp);
      if (Number.isNaN(etaDate.getTime())) return '';
      const timeString = etaDate.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' });
      
      if (remarksTC && remarksTC !== '') {
        return `${timeString} - ${diff}m (${remarksTC})`;
      }
      
      return `${timeString} - ${diff}m`;
    } catch {
      return '';
    }
  };

// Debug utility functions
export const isDebugMode = (): boolean => {
  // Must carry the REACT_APP_ prefix: Create React App injects no other
  // variables into the bundle, so an unprefixed name is always undefined and
  // debug output could never be switched on.
  return process.env.REACT_APP_DEBUG_MODE === 'true';
};

export const debugLog = (message: string, ...args: any[]): void => {
  if (isDebugMode()) {
    console.log(`[DEBUG] ${message}`, ...args);
  }
};

export const debugRender = (condition: boolean, content: React.ReactNode): React.ReactNode | null => {
  return isDebugMode() && condition ? content : null;
};