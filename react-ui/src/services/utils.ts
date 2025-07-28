
  // Format ETA time
  export const formatETA = (etaString: string) => {
    try {
      const etaDate = new Date(etaString);
      const etaDateString = etaDate.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' });
      const now = new Date();
      const diffMs = etaDate.getTime() - now.getTime();
      const diffMins = Math.round(diffMs / 60000);
      
      if (diffMins <= 0) return 'Arriving';
      if (diffMins < 60) return `${etaDateString} - ${diffMins}m`;
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${etaDateString} ${hours}h ${mins}m`;
    } catch {
      return '';
    }
  };