/**
 * Studio calendar date utilities.
 * Ensures consistent YYYY-MM-DD studio-local calendar semantics without server UTC drift.
 */

export function getStudioLocalDate(
  timeZone: string,
  date: Date = new Date(),
): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const values = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
    );
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    // Fallback to UTC if timezone string is invalid
    return date.toISOString().slice(0, 10);
  }
}

export function parseCalendarDate(dateStr: string): {
  year: number;
  month: number;
  day: number;
} {
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  return {
    year: parseInt(yearStr, 10),
    month: parseInt(monthStr, 10),
    day: parseInt(dayStr, 10),
  };
}

export function formatCalendarDate(year: number, month: number, day: number): string {
  const y = String(year).padStart(4, '0');
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addCalendarDays(dateStr: string, days: number): string {
  const { year, month, day } = parseCalendarDate(dateStr);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return formatCalendarDate(
    utc.getUTCFullYear(),
    utc.getUTCMonth() + 1,
    utc.getUTCDate(),
  );
}

export function calendarDaysBetween(startDateStr: string, endDateStr: string): number {
  const start = parseCalendarDate(startDateStr);
  const end = parseCalendarDate(endDateStr);
  const startUtc = Date.UTC(start.year, start.month - 1, start.day);
  const endUtc = Date.UTC(end.year, end.month - 1, end.day);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((endUtc - startUtc) / msPerDay);
}

export function calendarDateToUtcDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

export function dateToCalendarDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
