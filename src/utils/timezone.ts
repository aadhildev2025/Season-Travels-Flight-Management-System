import { toZonedTime, fromZonedTime, format } from 'date-fns-tz';

export const TIMEZONES = {
  COLOMBO: 'Asia/Colombo', // Sri Lanka (UTC+5:30)
  STOCKHOLM: 'Europe/Stockholm', // Sweden (UTC+1 / UTC+2 DST)
  UTC: 'UTC'
};

export const TIMEZONE_LABELS: Record<string, string> = {
  'Asia/Colombo': 'Sri Lanka (Asia/Colombo)',
  'Europe/Stockholm': 'Sweden (Europe/Stockholm)',
  'UTC': 'UTC'
};

/**
 * Converts a local date and time string (e.g., "2026-06-28" and "15:00")
 * in a source timezone into a UTC ISO string.
 */
export function localTimeToUTC(dateStr: string, timeStr: string, timezone: string): string {
  if (!dateStr || !timeStr) return '';
  try {
    // Format: YYYY-MM-DDTHH:mm:00
    const localDateTimeStr = `${dateStr}T${timeStr}:00`;
    const utcDate = fromZonedTime(localDateTimeStr, timezone);
    return utcDate.toISOString();
  } catch (error) {
    console.error('Error converting local time to UTC:', error);
    return '';
  }
}

/**
 * Converts a UTC ISO string into a local date and time in the target timezone.
 * Returns { date: 'YYYY-MM-DD', time: 'HH:mm', formatted: 'dd MMM yyyy HH:mm' }
 */
export function utcToLocalTime(utcIsoStr: string, targetTimezone: string) {
  if (!utcIsoStr) return { date: '', time: '', formatted: '', offset: '', isDst: false };
  try {
    const utcDate = new Date(utcIsoStr);
    const zonedDate = toZonedTime(utcDate, targetTimezone);
    
    const datePart = format(zonedDate, 'yyyy-MM-dd', { timeZone: targetTimezone });
    const timePart = format(zonedDate, 'HH:mm', { timeZone: targetTimezone });
    const formatted = format(zonedDate, 'dd MMM yyyy, HH:mm', { timeZone: targetTimezone });
    
    // Get offset & DST details
    const offset = getTimezoneOffsetString(utcDate, targetTimezone);
    const isDst = checkIfDst(utcDate, targetTimezone);
    
    return {
      date: datePart,
      time: timePart,
      formatted,
      offset,
      isDst
    };
  } catch (error) {
    console.error('Error converting UTC to local time:', error);
    return { date: '', time: '', formatted: 'Invalid Date', offset: '', isDst: false };
  }
}

/**
 * Checks if a specific Date is in Daylight Saving Time (DST) for a given timezone.
 */
export function checkIfDst(date: Date, timezone: string): boolean {
  if (timezone === 'UTC' || timezone === 'Asia/Colombo') return false; // Sri Lanka doesn't observe DST
  
  try {
    // Standard approach to detect DST: Compare offsets in January and July
    const d1 = new Date(date.getFullYear(), 0, 1); // January (Winter)
    const d2 = new Date(date.getFullYear(), 6, 1); // July (Summer)
    
    const tempFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset'
    });
    
    const getOffsetMinutes = (d: Date) => {
      const parts = tempFormatter.formatToParts(d);
      const offsetPart = parts.find(p => p.type === 'timeZoneName')?.value || '';
      return offsetPart;
    };
    
    const janOffset = getOffsetMinutes(d1);
    const julOffset = getOffsetMinutes(d2);
    const currentOffset = getOffsetMinutes(date);
    
    // If the timezone has DST, the summer offset differs from the winter offset
    if (janOffset !== julOffset) {
      // In Sweden (Northern Hemisphere), DST is observed in summer (July).
      // If the current offset is equal to the summer (July) offset, it's DST.
      return currentOffset === julOffset;
    }
    
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Returns a human-readable timezone offset string, e.g. "GMT+2" or "GMT+5:30".
 */
export function getTimezoneOffsetString(date: Date, timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'longOffset'
    });
    const parts = formatter.formatToParts(date);
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    return tzPart ? tzPart.value.replace('GMT', 'UTC') : '';
  } catch (e) {
    return '';
  }
}

/**
 * Calculates the exact timezone difference between two timezones at a specific UTC date.
 * Returns a message like "Sweden is 3h 30m behind Sri Lanka"
 */
export function getTimezoneDiffMessage(date: Date, tzA: string, tzB: string): string {
  try {
    // Get the offsets in milliseconds
    const formatterA = new Intl.DateTimeFormat('en-US', {
      timeZone: tzA,
      timeZoneName: 'longOffset'
    });
    const formatterB = new Intl.DateTimeFormat('en-US', {
      timeZone: tzB,
      timeZoneName: 'longOffset'
    });
    
    const getOffsetMs = (date: Date, formatter: Intl.DateTimeFormat) => {
      const parts = formatter.formatToParts(date);
      const tzVal = parts.find(p => p.type === 'timeZoneName')?.value || '';
      // tzVal is like "GMT+5:30", "GMT+2", "GMT-5"
      const match = tzVal.match(/GMT([+-])(\d+):?(\d+)?/);
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
    
    const nameA = tzB === 'Asia/Colombo' ? 'Sri Lanka' : 'Sweden';
    const nameB = tzA === 'Europe/Stockholm' ? 'Sweden' : 'Sri Lanka';
    
    const diffStr = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    
    if (offsetA > offsetB) {
      return `${nameB} is ${diffStr} ahead of ${nameA}`;
    } else if (offsetB > offsetA) {
      return `${nameA} is ${diffStr} ahead of ${nameB}`;
    } else {
      return 'Both regions are in the same timezone';
    }
  } catch (e) {
    return '';
  }
}
