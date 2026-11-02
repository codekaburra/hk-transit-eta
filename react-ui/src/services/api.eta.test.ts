import { getBusETA } from './api';

// The three ETAs are rendered as three positional columns, so what this
// function drops and how it orders decides what the reader sees in each slot.
describe('getBusETA', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; });

  const respondWith = (data: unknown) => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data }) }) as any;
  };

  const at = (hhmm: string) => `2026-07-31T${hhmm}:00+08:00`;

  it('keeps only the direction that was asked for', async () => {
    respondWith([
      { dir: 'O', eta: at('12:05') },
      { dir: 'I', eta: at('12:06') },
    ]);

    await expect(getBusETA('KMB', 'STOP', '1', '1', 'O')).resolves.toEqual([at('12:05')]);
  });

  // KMB lists a departure it cannot time yet with eta: null, interleaved with
  // real times. Passed on, it puts a hole in the columns and the reader takes
  // the second column for the second bus.
  it('drops a departure the operator could not time', async () => {
    respondWith([
      { dir: 'O', eta: null },
      { dir: 'O', eta: at('12:20') },
      { dir: 'O', eta: at('12:40') },
    ]);

    await expect(getBusETA('KMB', 'STOP', '1', '1', 'O')).resolves.toEqual([at('12:20'), at('12:40')]);
  });

  it('drops a time it cannot parse rather than rendering it as a blank slot', async () => {
    respondWith([
      { dir: 'O', eta: 'not a date' },
      { dir: 'O', eta: at('12:20') },
    ]);

    await expect(getBusETA('KMB', 'STOP', '1', '1', 'O')).resolves.toEqual([at('12:20')]);
  });

  // The columns are labelled by position alone, so the order has to be the
  // order rather than whatever eta_seq the payload happened to carry.
  it('returns the departures soonest first', async () => {
    respondWith([
      { dir: 'O', eta: at('12:40') },
      { dir: 'O', eta: at('12:05') },
      { dir: 'O', eta: at('12:20') },
    ]);

    await expect(getBusETA('KMB', 'STOP', '1', '1', 'O')).resolves.toEqual([
      at('12:05'), at('12:20'), at('12:40'),
    ]);
  });

  // The operators have returned an object in place of the list before.
  it('returns nothing when the payload is not a list', async () => {
    respondWith({ unexpected: true });

    await expect(getBusETA('KMB', 'STOP', '1', '1', 'O')).resolves.toEqual([]);
  });
});
