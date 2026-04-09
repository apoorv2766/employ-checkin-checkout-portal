import { format, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

/** Format a UTC ISO string into the given timezone, e.g. "9:05 AM" */
export function formatTime(utcString: string, timezone = 'UTC'): string {
  try {
    return formatInTimeZone(parseISO(utcString), timezone, 'h:mm a');
  } catch {
    return '—';
  }
}

/** Format a YYYY-MM-DD local date string as "Mon Apr 7, 2026" */
export function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'EEE, MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

/** Format total hours like 8.25 → "8h 15m" */
export function formatHours(hours: number | undefined | null): string {
  if (hours == null) return '—';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Map attendance status to Tailwind badge class */
export function statusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    present: 'badge-present',
    late: 'badge-late',
    absent: 'badge-absent',
    'on-leave': 'badge-on-leave',
    'half-day': 'badge-half-day',
  };
  return map[status] ?? 'badge-present';
}

/** Capitalise first letter */
export function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ');
}
