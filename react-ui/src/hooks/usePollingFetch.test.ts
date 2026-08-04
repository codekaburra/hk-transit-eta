import { renderHook, act, waitFor } from '@testing-library/react';
import { usePollingFetch } from './usePollingFetch';

describe('usePollingFetch', () => {
  afterEach(() => { jest.useRealTimers(); });

  it('fetches immediately and exposes the result', async () => {
    const fetcher = jest.fn().mockResolvedValue(['12:00']);
    const { result } = renderHook(() => usePollingFetch<string[]>(fetcher, []));

    await waitFor(() => expect(result.current.data).toEqual(['12:00']));
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
  });

  it('does not fetch when the fetcher is null', () => {
    const { result } = renderHook(() => usePollingFetch<string[]>(null, []));
    expect(result.current.data).toEqual([]);
  });

  it('reports an error without discarding the previous data', async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error('offline'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => usePollingFetch<string[]>(fetcher, []));

    await waitFor(() => expect(result.current.error).toBe('Failed to load ETA data'));
    expect(result.current.data).toEqual([]);
  });

  it('re-fetches on the interval', async () => {
    jest.useFakeTimers();
    const fetcher = jest.fn().mockResolvedValue([]);

    renderHook(() => usePollingFetch<string[]>(fetcher, [], { intervalMs: 1000 }));
    expect(fetcher).toHaveBeenCalledTimes(1);

    await act(async () => { jest.advanceTimersByTime(3000); });
    expect(fetcher).toHaveBeenCalledTimes(4);
  });

  it('stops polling once unmounted', async () => {
    jest.useFakeTimers();
    const fetcher = jest.fn().mockResolvedValue([]);

    const { unmount } = renderHook(() => usePollingFetch<string[]>(fetcher, [], { intervalMs: 1000 }));
    expect(fetcher).toHaveBeenCalledTimes(1);

    unmount();
    await act(async () => { jest.advanceTimersByTime(5000); });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  // A slow response for a stop the user has navigated away from must not
  // overwrite the newer one. Each component wrote its own fetch-and-set before,
  // and none of them guarded against this.
  it('ignores a stale response that resolves after a newer one', async () => {
    let resolveSlow: (v: string[]) => void = () => {};
    const slow = jest.fn(() => new Promise<string[]>(resolve => { resolveSlow = resolve; }));
    const fast = jest.fn().mockResolvedValue(['new']);

    const { result, rerender } = renderHook(
      ({ fetcher }) => usePollingFetch<string[]>(fetcher, []),
      { initialProps: { fetcher: slow as () => Promise<string[]> } }
    );

    // Swap in a second fetcher that resolves first.
    rerender({ fetcher: fast as () => Promise<string[]> });
    await waitFor(() => expect(result.current.data).toEqual(['new']));

    // The first request now comes back late.
    await act(async () => { resolveSlow(['stale']); });

    expect(result.current.data).toEqual(['new']);
  });
});
