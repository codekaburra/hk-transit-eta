
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

  // Format ETA time. A wrapper over formatETAParts so the two cannot disagree
  // about when a bus counts as arriving.
  export const formatETA = (etaString: string) => {
    const parts = formatETAParts(etaString);
    if (!parts) return '';
    switch (parts.state) {
      // No clock time: a bus that is already here is not due at a time.
      case 'arriving':
        return parts.wait;
      case 'minutes':
        return `${parts.time} - ${parts.wait}`;
      default:
        return `${parts.time} ${parts.wait}`;
    }
  };

  // The columned display needs the clock time and the wait separately, and in a
  // short form as well: three columns and a stop name do not fit a phone at the
  // full "17 分鐘 mins".
  export interface ETAParts {
    time: string;
    wait: string;
    shortWait: string;
    // What the wait is measuring, so a caller can lay the two out without
    // reading the strings back.
    state: 'arriving' | 'minutes' | 'hours';
  }

  export const formatETAParts = (etaString: string): ETAParts | null => {
    const etaDate = new Date(etaString);
    if (Number.isNaN(etaDate.getTime())) return null;

    const time = etaDate.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' });
    const diffMins = Math.round((etaDate.getTime() - Date.now()) / 60000);

    // The time is kept for an arriving bus too: the column is a fixed slot, and
    // dropping a line makes the row jump as the departure comes due.
    if (diffMins <= 0) {
      return { time, wait: '即將到達 Arriving', shortWait: '即將', state: 'arriving' };
    }
    if (diffMins < 60) {
      return { time, wait: `${diffMins} 分鐘 mins`, shortWait: `${diffMins}分`, state: 'minutes' };
    }
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return { time, wait: `${hours}h ${mins}m`, shortWait: `${hours}h${mins}m`, state: 'hours' };
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