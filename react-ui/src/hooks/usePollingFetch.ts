import { useCallback, useEffect, useRef, useState } from 'react';

// ETAs go stale quickly, so every card that shows one re-fetches on this
// interval. It was written out separately in each component before.
export const ETA_REFRESH_INTERVAL_MS = 30000;

export interface PollingOptions {
  intervalMs?: number;
  errorMessage?: string;
}

export interface PollingResult<T> {
  data: T;
  loading: boolean;
  error: string | null;
  // Fetch now, without waiting for the next tick.
  refresh: () => void;
}

// usePollingFetch runs `fetcher` immediately and then on an interval.
//
// Pass null to hold off — a card with nothing to look up yet should not poll.
// `fetcher` must be stable (useCallback), since a new identity restarts the
// interval.
export function usePollingFetch<T>(
  fetcher: (() => Promise<T>) | null,
  initial: T,
  options: PollingOptions = {}
): PollingResult<T> {
  const { intervalMs = ETA_REFRESH_INTERVAL_MS, errorMessage = 'Failed to load ETA data' } = options;

  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only the newest run may publish its result. Without this, a slow response
  // for a stop the user has already navigated away from can land after a newer
  // one and overwrite it, and a response arriving after unmount sets state on a
  // component that no longer exists.
  const runId = useRef(0);

  const run = useCallback(async () => {
    if (!fetcher) return;
    const id = ++runId.current;

    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      if (id === runId.current) setData(result);
    } catch (err) {
      console.error(`${errorMessage}:`, err);
      if (id === runId.current) setError(errorMessage);
    } finally {
      if (id === runId.current) setLoading(false);
    }
  }, [fetcher, errorMessage]);

  useEffect(() => {
    if (!fetcher) return;

    run();
    const interval = setInterval(run, intervalMs);
    return () => {
      clearInterval(interval);
      // Invalidate whatever is still in flight.
      runId.current++;
    };
  }, [fetcher, run, intervalMs]);

  return { data, loading, error, refresh: run };
}
