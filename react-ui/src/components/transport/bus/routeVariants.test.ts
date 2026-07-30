import { groupStopsIntoVariants } from './routeVariants';
import { BusRoute, RouteStop } from '../../../types';

const stop = (
  direction: string,
  serviceType: string,
  seq: string,
  overrides: Partial<RouteStop> = {}
): RouteStop => ({
  company: 'KMB',
  route: '1',
  direction,
  service_type: serviceType,
  seq,
  stop: `stop-${direction}-${serviceType}-${seq}`,
  name_en: `Stop ${seq} EN`,
  name_tc: `車站 ${seq}`,
  ...overrides,
});

const routeRow = (
  direction: string,
  serviceType: string,
  overrides: Partial<BusRoute> = {}
): BusRoute => ({
  company: 'KMB',
  route: '1',
  direction,
  service_type: serviceType,
  orig_en: 'Origin EN',
  orig_tc: '起點',
  dest_en: 'Destination EN',
  dest_tc: '終點',
  ...overrides,
});

describe('groupStopsIntoVariants', () => {
  it('splits the two directions into separate sequences', () => {
    // What /bus/route/1 used to render as one interleaved list.
    const stops = [
      stop('O', '1', '1'),
      stop('I', '1', '1'),
      stop('O', '1', '2'),
      stop('I', '1', '2'),
    ];

    const variants = groupStopsIntoVariants(stops);

    expect(variants).toHaveLength(2);
    expect(variants.map((v) => v.direction)).toEqual(['O', 'I']);
    variants.forEach((v) => expect(v.stops).toHaveLength(2));
    expect(variants[0].stops.every((s) => s.direction === 'O')).toBe(true);
    expect(variants[1].stops.every((s) => s.direction === 'I')).toBe(true);
  });

  it('keeps service types of the same direction apart', () => {
    // KMB 3D outbound runs three service types; they are distinct sequences.
    const stops = [
      stop('O', '1', '1'),
      stop('O', '2', '1'),
      stop('O', '3', '1'),
      stop('O', '1', '2'),
    ];

    const variants = groupStopsIntoVariants(stops);

    expect(variants).toHaveLength(3);
    expect(variants.map((v) => v.serviceType)).toEqual(['1', '2', '3']);
    expect(variants[0].stops).toHaveLength(2);
  });

  it('orders stops numerically, not lexicographically', () => {
    // seq arrives as text, so "10" must not sort before "2".
    const stops = [stop('O', '1', '10'), stop('O', '1', '2'), stop('O', '1', '1')];

    const variants = groupStopsIntoVariants(stops);

    expect(variants[0].stops.map((s) => s.seq)).toEqual(['1', '2', '10']);
  });

  it('lists outbound before inbound', () => {
    const variants = groupStopsIntoVariants([stop('I', '1', '1'), stop('O', '1', '1')]);

    expect(variants.map((v) => v.direction)).toEqual(['O', 'I']);
  });

  it("uses the operator's origin and destination when a route row matches", () => {
    const stops = [stop('O', '1', '1'), stop('O', '1', '2')];
    const meta = [
      routeRow('O', '1', {
        orig_en: 'CHUK YUEN ESTATE',
        dest_en: 'STAR FERRY',
        orig_tc: '竹園邨',
        dest_tc: '尖沙咀碼頭',
      }),
    ];

    const [variant] = groupStopsIntoVariants(stops, meta);

    expect(variant.origEn).toBe('CHUK YUEN ESTATE');
    expect(variant.destEn).toBe('STAR FERRY');
    expect(variant.destTc).toBe('尖沙咀碼頭');
  });

  it('falls back to the first and last stop when no route row matches', () => {
    // Citybus route rows carry an empty direction, so they never match a
    // direction-keyed group.
    const stops = [
      stop('O', '', '1', { company: 'CTB', name_tc: '中環 (港澳碼頭)' }),
      stop('O', '', '2', { company: 'CTB', name_tc: '跑馬地 (上)' }),
    ];
    const meta = [routeRow('', '', { company: 'CTB' })];

    const [variant] = groupStopsIntoVariants(stops, meta);

    expect(variant.origTc).toBe('中環 (港澳碼頭)');
    expect(variant.destTc).toBe('跑馬地 (上)');
  });

  it('returns no variants for an empty stop list', () => {
    expect(groupStopsIntoVariants([])).toEqual([]);
  });

  it('gives each variant a distinct key', () => {
    const variants = groupStopsIntoVariants([
      stop('O', '1', '1'),
      stop('O', '2', '1'),
      stop('I', '1', '1'),
    ]);

    expect(new Set(variants.map((v) => v.key)).size).toBe(variants.length);
  });
});
