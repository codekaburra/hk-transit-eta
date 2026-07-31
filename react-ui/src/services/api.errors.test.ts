import { getBusRouteVariants, getBusRouteStops } from './api';

// The route page must be able to tell "this route does not exist" apart from
// "the backend is unreachable"; returning [] for both made an outage look like
// a missing route.
describe('bus route API error propagation', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; });

  it('propagates a network failure from getBusRouteVariants', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as any;
    await expect(getBusRouteVariants('1', 'KMB')).rejects.toThrow();
  });

  it('propagates a network failure from getBusRouteStops', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as any;
    await expect(getBusRouteStops('1', { company: 'KMB' })).rejects.toThrow();
  });

  it('propagates a 500 from getBusRouteVariants', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as any;
    await expect(getBusRouteVariants('1')).rejects.toThrow(/500/);
  });

  it('propagates a 500 from getBusRouteStops', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false, status: 500, text: async () => 'boom',
    }) as any;
    await expect(getBusRouteStops('1')).rejects.toThrow(/500/);
  });

  it('still returns an empty list when the route genuinely has no data', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [] }) as any;
    await expect(getBusRouteVariants('NOPE')).resolves.toEqual([]);
  });
});
