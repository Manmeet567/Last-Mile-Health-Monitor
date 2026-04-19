import {
  getNextLocalDayStart,
  getStartOfLocalDay,
  toDateKey,
} from '@/utils/date';

describe('date utilities', () => {
  it('derives local day keys and boundaries using a provided timezone offset', () => {
    const timezoneOffsetMinutes = -330;
    const timestamp = Date.UTC(2026, 3, 7, 18, 40, 0, 0);

    expect(toDateKey(timestamp, { timezoneOffsetMinutes })).toBe('2026-04-08');
    expect(getStartOfLocalDay(timestamp, { timezoneOffsetMinutes })).toBe(
      Date.UTC(2026, 3, 7, 18, 30, 0, 0),
    );
    expect(getNextLocalDayStart(timestamp, { timezoneOffsetMinutes })).toBe(
      Date.UTC(2026, 3, 8, 18, 30, 0, 0),
    );
  });

  it('uses the local calendar day by default', () => {
    const timestamp = new Date(2026, 3, 8, 9, 15, 0, 0).getTime();

    expect(toDateKey(timestamp)).toBe('2026-04-08');
    expect(getStartOfLocalDay(timestamp)).toBe(
      new Date(2026, 3, 8, 0, 0, 0, 0).getTime(),
    );
    expect(getNextLocalDayStart(timestamp)).toBe(
      new Date(2026, 3, 9, 0, 0, 0, 0).getTime(),
    );
  });
});
