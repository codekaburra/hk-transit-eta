import { fetchJSON, fetchJSONOr, HttpError } from './http';

describe('fetchJSON', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; });

  it('returns the parsed body on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [1, 2] }) as any;
    await expect(fetchJSON('/x')).resolves.toEqual([1, 2]);
  });

  it('throws an HttpError carrying the status', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false, status: 503, text: async () => 'unavailable',
    }) as any;

    await expect(fetchJSON('/x')).rejects.toBeInstanceOf(HttpError);
    await expect(fetchJSON('/x')).rejects.toThrow(/503.*unavailable/);
  });

  // A response may carry no readable body; the status alone must still surface.
  it('still reports the status when the body cannot be read', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as any;
    await expect(fetchJSON('/x')).rejects.toThrow(/500/);
  });

  it('propagates a network failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch')) as any;
    await expect(fetchJSON('/x')).rejects.toThrow(/Failed to fetch/);
  });
});

describe('fetchJSONOr', () => {
  const realFetch = global.fetch;
  let errorLog: jest.SpyInstance;

  beforeEach(() => { errorLog = jest.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => { global.fetch = realFetch; errorLog.mockRestore(); });

  it('returns the fallback and logs when the request fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('boom')) as any;

    await expect(fetchJSONOr('/x', [], 'thing')).resolves.toEqual([]);
    expect(errorLog).toHaveBeenCalled();
  });

  // A 404 from a "get by id" endpoint means the record does not exist, which is
  // an answer rather than a fault — logging it would be noise on every miss.
  it('returns the fallback for a quiet 404 without logging', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false, status: 404, text: async () => 'not found',
    }) as any;

    await expect(fetchJSONOr('/x', null, 'thing', { quietOn404: true })).resolves.toBeNull();
    expect(errorLog).not.toHaveBeenCalled();
  });

  it('still logs a non-404 failure when quietOn404 is set', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false, status: 500, text: async () => 'boom',
    }) as any;

    await expect(fetchJSONOr('/x', null, 'thing', { quietOn404: true })).resolves.toBeNull();
    expect(errorLog).toHaveBeenCalled();
  });
});
