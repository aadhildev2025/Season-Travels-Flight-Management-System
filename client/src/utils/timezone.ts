export function localTimeToUTC(dateStr: string, timeStr: string, timezone: string): string {
  if (!dateStr || !timeStr) return '';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);

    const targetDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'longOffset',
    });

    const parts = formatter.formatToParts(targetDate);
    const tzName = parts.find(p => p.type === 'timeZoneName');
    const offsetStr = tzName ? tzName.value : 'UTC';

    const match = offsetStr.match(/[UC]?GMT?([+-])(\d+):?(\d+)?/);
    if (!match) return '';

    const sign = match[1] === '+' ? -1 : 1;
    const h = parseInt(match[2], 10);
    const m = parseInt(match[3] || '0', 10);
    const offsetMs = sign * (h * 60 + m) * 60 * 1000;

    const utcDate = new Date(targetDate.getTime() + offsetMs);
    return utcDate.toISOString();
  } catch {
    return '';
  }
}

export function utcToLocalTime(utcIsoStr: string, targetTimezone: string) {
  if (!utcIsoStr) return { date: '', time: '', formatted: '', offset: '', isDst: false };
  try {
    const utcDate = new Date(utcIsoStr);

    const dateParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: targetTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(utcDate).split('-');

    const timeParts = new Intl.DateTimeFormat('en-GB', {
      timeZone: targetTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(utcDate).split(':');

    const date = dateParts.join('-');
    const time = timeParts.join(':');

    const formatted = new Intl.DateTimeFormat('en-GB', {
      timeZone: targetTimezone,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(utcDate);

    const offset = getTimezoneOffsetString(utcDate, targetTimezone);
    const isDst = checkIfDst(utcDate, targetTimezone);

    return { date, time, formatted, offset, isDst };
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
      const match = val.match(/GMT?([+-])(\d+):?(\d+)?/);
      if (!match) return 0;
      const sign = match[1] === '+' ? 1 : -1;
      const hours = parseInt(match[2], 10);
      const minutes = parseInt(match[3] || '0', 10);
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

export function formatCETDate(utcIsoStr: string): string {
  if (!utcIsoStr) return '';
  try {
    const utcDate = new Date(utcIsoStr);
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Stockholm',
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    }).formatToParts(utcDate);

    const day = parts.find(p => p.type === 'day')?.value || '';
    const month = parts.find(p => p.type === 'month')?.value || '';
    const year = parts.find(p => p.type === 'year')?.value || '';

    return `${day}-${month.toUpperCase()}-${year}`;
  } catch {
    return '';
  }
}

export function formatDateInZone(utcIsoStr: string, timezone: string): string {
  if (!utcIsoStr || !timezone) return '';
  try {
    const utcDate = new Date(utcIsoStr);
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    }).formatToParts(utcDate);

    const day = parts.find(p => p.type === 'day')?.value || '';
    const month = parts.find(p => p.type === 'month')?.value || '';
    const year = parts.find(p => p.type === 'year')?.value || '';

    return `${day}-${month.toUpperCase()}-${year}`;
  } catch {
    return '';
  }
}

export function getTodayISOInZone(timezone: string): string {
  if (!timezone) return '';
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return '';
  }
}
