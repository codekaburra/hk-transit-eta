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
  // Whether a response has come back for the current fetcher. Unlike loading,
  // which is true on every poll, this stays true across refetches and goes back
  // to false only when the fetcher changes. A view that needs to tell "not asked
  // yet" from "asked, and the answer was empty" should read this, not infer it
  // from the shape of data.
  loaded: boolean;
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
  // Starts true when there is something to fetch: the first paint happens before
  // the effect that starts the request, and a view reading loading=false there
  // would render "no data" for a frame.
  const [loading, setLoading] = useState(fetcher !== null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The value to fall back to when the fetcher changes. Held from the first
  // render, since callers pass a fresh literal ([] or null) each time.
  const initialValue = useRef(initial);
  const lastFetcher = useRef(fetcher);

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
      if (id === runId.current) {
        setLoading(false);
        setLoaded(true);
      }
    }
  }, [fetcher, errorMessage]);

  useEffect(() => {
    // A new fetcher asks a different question — another stop, another route — so
    // the previous answer must not stand in for it while the new one loads.
    if (fetcher !== lastFetcher.current) {
      lastFetcher.current = fetcher;
      setData(initialValue.current);
      setLoaded(false);
      setLoading(fetcher !== null);
    }
    if (!fetcher) return;

    run();
    const interval = setInterval(run, intervalMs);
    // Hold the ref itself rather than reading .current at teardown, which is
    // what exhaustive-deps warns about.
    const generation = runId;
    return () => {
      clearInterval(interval);
      // Invalidate whatever is still in flight.
      generation.current++;
    };
  }, [fetcher, run, intervalMs]);

  return { data, loading, loaded, error, refresh: run };
}
