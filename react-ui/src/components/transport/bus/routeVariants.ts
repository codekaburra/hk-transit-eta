import { BusRoute, RouteStop } from '../../../types';

// One travelling direction of a route. KMB models these as (direction,
// service_type) pairs — outbound/inbound plus extra service types for special
// departures — and each has its own ordered stop sequence.
export interface RouteVariant {
  key: string;
  direction: string;
  serviceType: string;
  stops: RouteStop[];
  origEn: string;
  origTc: string;
  destEn: string;
  destTc: string;
}

// Outbound first, then inbound, then anything else.
export const directionRank = (direction: string): number => {
  if (direction === 'O') return 0;
  if (direction === 'I') return 1;
  return 2;
};

// Splits a route's stops into one sequence per (direction, service_type).
//
// The API can return several sequences at once — a route number served by two
// operators, both directions, and several service types. Rendering them as a
// single seq-sorted list interleaves unrelated sequences, so they must be
// separated before display.
//
// Grouping keys off the stop rows rather than the route rows because the stops
// are the only source that always carries a direction: Citybus route rows
// store an empty direction.
export function groupStopsIntoVariants(
  stops: RouteStop[],
  meta: BusRoute[] = []
): RouteVariant[] {
  const grouped = new Map<string, RouteStop[]>();
  for (const stop of stops) {
    const key = `${stop.direction}|${stop.service_type}`;
    const bucket = grouped.get(key);
    if (bucket) {
      bucket.push(stop);
    } else {
      grouped.set(key, [stop]);
    }
  }

  return Array.from(grouped.entries())
    .map(([key, group]) => {
      // seq arrives as text, so it must be compared numerically.
      const ordered = [...group].sort((a, b) => parseInt(a.seq) - parseInt(b.seq));
      const [direction, serviceType] = key.split('|');

      // Prefer the operator's own origin/destination naming, falling back to
      // the first and last stop of the sequence.
      const row = meta.find(
        (r) => r.direction === direction && r.service_type === serviceType
      );
      const first = ordered[0];
      const last = ordered[ordered.length - 1];

      return {
        key,
        direction,
        serviceType,
        stops: ordered,
        origEn: row?.orig_en || first?.name_en || '',
        origTc: row?.orig_tc || first?.name_tc || '',
        destEn: row?.dest_en || last?.name_en || '',
        destTc: row?.dest_tc || last?.name_tc || '',
      };
    })
    .sort(
      (a, b) =>
        directionRank(a.direction) - directionRank(b.direction) ||
        a.serviceType.localeCompare(b.serviceType)
    );
}
