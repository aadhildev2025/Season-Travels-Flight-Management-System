import { toZonedTime, fromZonedTime, format } from 'date-fns-tz';

export function localTimeToUTC(dateStr: string, timeStr: string, timezone: string): string {
  if (!dateStr || !timeStr) return '';
  try {
    const localDateTimeStr = `${dateStr}T${timeStr}:00`;
    const utcDate = fromZonedTime(localDateTimeStr, timezone);
    return utcDate.toISOString();
  } catch {
    return '';
  }
}

export function utcToLocalTime(utcIsoStr: string, targetTimezone: string) {
  if (!utcIsoStr) return { date: '', time: '', formatted: '', offset: '', isDst: false };
  try {
    const utcDate = new Date(utcIsoStr);
    const zonedDate = toZonedTime(utcDate, targetTimezone);

    const datePart = format(zonedDate, 'yyyy-MM-dd', { timeZone: targetTimezone });
    const timePart = format(zonedDate, 'HH:mm', { timeZone: targetTimezone });
    const formatted = format(zonedDate, 'dd MMM yyyy, HH:mm', { timeZone: targetTimezone });

    const offset = getTimezoneOffsetString(utcDate, targetTimezone);
    const isDst = checkIfDst(utcDate, targetTimezone);

    return { date: datePart, time: timePart, formatted, offset, isDst };
  } catch {
    return { date: '', time: '', formatted: 'Invalid Date', offset: '', isDst: false };
  }
}

export function checkIfDst(date: Date, timezone: string): boolean {
  if (timezone === 'UTC' || timezone === 'Asia/Colombo') return false;
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    });
    const getOffset = (d: Date) => {
      const parts = formatter.formatToParts(d);
      return parts.find(p => p.type === 'timeZoneName')?.value || '';
    };
    const janOffset = getOffset(new Date(date.getFullYear(), 0, 1));
    const julOffset = getOffset(new Date(date.getFullYear(), 6, 1));
    const currentOffset = getOffset(date);
    if (janOffset !== julOffset) {
      return currentOffset === julOffset;
    }
    return false;
  } catch {
    return false;
  }
}

export function getTimezoneOffsetString(date: Date, timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'longOffset',
    });
    const parts = formatter.formatToParts(date);
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    return tzPart ? tzPart.value.replace('GMT', 'UTC') : '';
  } catch {
    return '';
  }
}

export function getTimezoneDiff(date: Date, tzA: string, tzB: string): string {
  try {
    const formatterA = new Intl.DateTimeFormat('en-US', {
      timeZone: tzA,
      timeZoneName: 'longOffset',
    });
    const formatterB = new Intl.DateTimeFormat('en-US', {
      timeZone: tzB,
      timeZoneName: 'longOffset',
    });

    const getOffsetMs = (d: Date, fmt: Intl.DateTimeFormat) => {
      const parts = fmt.formatToParts(d);
      const val = parts.find(p => p.type === 'timeZoneName')?.value || '';
      const match = val.match(/GMT([+-])(\d+):?(\d+)?/);
      if (!match) return 0;
      const sign = match[1] === '+' ? 1 : -1;
      const hours = parseInt(match[2], 10);
      const minutes = match[3] ? parseInt(match[3], 10) : 0;
      return sign * (hours * 60 + minutes) * 60 * 1000;
    };

    const offsetA = getOffsetMs(date, formatterA);
    const offsetB = getOffsetMs(date, formatterB);
    const diffMs = Math.abs(offsetA - offsetB);
    const diffMinutes = diffMs / (60 * 1000);
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;

    return mins > 0 ? `${hours}h: ${mins}m` : `${hours}h`;
  } catch {
    return '';
  }
}

export function formatCETTime(utcIsoStr: string): string {
  if (!utcIsoStr) return '';
  try {
    const utcDate = new Date(utcIsoStr);
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Stockholm',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return formatter.format(utcDate);
  } catch {
    return '';
  }
}
