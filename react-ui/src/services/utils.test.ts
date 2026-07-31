import { formatETA, formatMinibusETA, isDebugMode, MinibusETA } from './utils';

// ETA strings are relative to now, so build them from a fixed clock.
const NOW = new Date('2026-07-31T12:00:00+08:00');

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
});

afterEach(() => {
  jest.useRealTimers();
});

const inMinutes = (n: number) => new Date(NOW.getTime() + n * 60_000).toISOString();

describe('formatETA', () => {
  it('reports an imminent arrival rather than a countdown', () => {
    expect(formatETA(inMinutes(0))).toBe('即將到達 Arriving');
  });

  // A bus that has already left must not read as a negative wait.
  it('treats a time in the past as arriving', () => {
    expect(formatETA(inMinutes(-5))).toBe('即將到達 Arriving');
  });

  it('shows minutes for an arrival within the hour', () => {
    expect(formatETA(inMinutes(7))).toMatch(/7 分鐘 mins$/);
  });

  it('rounds to the nearest minute', () => {
    // 100 seconds is nearer to 2 minutes than 1.
    const soon = new Date(NOW.getTime() + 100_000).toISOString();
    expect(formatETA(soon)).toMatch(/2 分鐘 mins$/);
  });

  it('switches to hours and minutes beyond an hour', () => {
    expect(formatETA(inMinutes(95))).toMatch(/1h 35m$/);
  });

  it('returns an empty string for an unparseable time', () => {
    expect(formatETA('not a date')).toBe('');
  });
});

describe('formatMinibusETA', () => {
  const eta = (overrides: Partial<MinibusETA> = {}): MinibusETA => ({
    eta_seq: 1,
    diff: 5,
    timestamp: inMinutes(5),
    remarks_tc: null,
    remarks_sc: null,
    remarks_en: null,
    ...overrides,
  });

  it('reports an imminent arrival', () => {
    expect(formatMinibusETA(eta({ diff: 0 }))).toBe('即將到達 Arriving');
  });

  it('treats a negative difference as arriving', () => {
    expect(formatMinibusETA(eta({ diff: -3 }))).toBe('即將到達 Arriving');
  });

  it('shows minutes within the hour', () => {
    expect(formatMinibusETA(eta({ diff: 12 }))).toBe('12分鐘 mins');
  });

  it('includes the operator remark when there is one', () => {
    const formatted = formatMinibusETA(
      eta({ diff: 75, timestamp: inMinutes(75), remarks_tc: '未開出' })
    );
    expect(formatted).toContain('未開出');
    expect(formatted).toContain('75m');
  });

  // An empty remark is not a remark; it must not render empty parentheses.
  it('omits the remark when it is an empty string', () => {
    const formatted = formatMinibusETA(
      eta({ diff: 75, timestamp: inMinutes(75), remarks_tc: '' })
    );
    expect(formatted).not.toContain('()');
  });
});

describe('isDebugMode', () => {
  const original = process.env.REACT_APP_DEBUG_MODE;
  afterEach(() => {
    process.env.REACT_APP_DEBUG_MODE = original;
  });

  it('is off unless explicitly enabled', () => {
    delete process.env.REACT_APP_DEBUG_MODE;
    expect(isDebugMode()).toBe(false);
  });

  it('is on when set to true', () => {
    process.env.REACT_APP_DEBUG_MODE = 'true';
    expect(isDebugMode()).toBe(true);
  });

  it('is off for any other value', () => {
    process.env.REACT_APP_DEBUG_MODE = 'yes';
    expect(isDebugMode()).toBe(false);
  });
});
