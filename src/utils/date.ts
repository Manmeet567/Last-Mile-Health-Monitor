export type LocalDateOptions = {
  timezoneOffsetMinutes?: number;
};

export function toDateKey(timestamp: number, options?: LocalDateOptions) {
  if (typeof options?.timezoneOffsetMinutes === 'number') {
    const shiftedDate = new Date(
      timestamp - options.timezoneOffsetMinutes * 60 * 1000,
    );

    return formatDateKey(
      shiftedDate.getUTCFullYear(),
      shiftedDate.getUTCMonth(),
      shiftedDate.getUTCDate(),
    );
  }

  const date = new Date(timestamp);
  return formatDateKey(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getStartOfLocalDay(
  timestamp: number,
  options?: LocalDateOptions,
) {
  if (typeof options?.timezoneOffsetMinutes === 'number') {
    const shiftedDate = new Date(
      timestamp - options.timezoneOffsetMinutes * 60 * 1000,
    );
    return (
      Date.UTC(
        shiftedDate.getUTCFullYear(),
        shiftedDate.getUTCMonth(),
        shiftedDate.getUTCDate(),
      ) +
      options.timezoneOffsetMinutes * 60 * 1000
    );
  }

  const date = new Date(timestamp);
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
}

export function getNextLocalDayStart(
  timestamp: number,
  options?: LocalDateOptions,
) {
  if (typeof options?.timezoneOffsetMinutes === 'number') {
    const shiftedDate = new Date(
      timestamp - options.timezoneOffsetMinutes * 60 * 1000,
    );
    return (
      Date.UTC(
        shiftedDate.getUTCFullYear(),
        shiftedDate.getUTCMonth(),
        shiftedDate.getUTCDate() + 1,
      ) +
      options.timezoneOffsetMinutes * 60 * 1000
    );
  }

  const date = new Date(timestamp);
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + 1,
  ).getTime();
}

function formatDateKey(year: number, monthIndex: number, day: number) {
  const month = String(monthIndex + 1).padStart(2, '0');
  const dayOfMonth = String(day).padStart(2, '0');
  return `${year}-${month}-${dayOfMonth}`;
}
