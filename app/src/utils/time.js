import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  format,
  addDays,
  parseISO,
} from "date-fns";

export const DAY_START_HOUR = 8;   // 8:00 AM
export const DAY_END_HOUR = 21;    // 9:00 PM
export const DEFAULT_PX_PER_HOUR = 64;  // default pixels per hour (user-adjustable via zoom)
// Legacy alias so existing imports still work during transition
export const PX_PER_HOUR = DEFAULT_PX_PER_HOUR;

// Get Monday of the week containing a given date
export function getMondayOf(date) {
  return startOfWeek(date, { weekStartsOn: 1 });
}

// Get Sunday of the week containing a given date
export function getSundayOf(date) {
  return endOfWeek(date, { weekStartsOn: 1 });
}

export function nextWeek(monday) {
  return addWeeks(monday, 1);
}

export function prevWeek(monday) {
  return subWeeks(monday, 1);
}

// Array of 7 Date objects for Mon–Sun of a week
export function weekDays(monday) {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

// ISO date string for filtering (e.g. "2026-01-05")
export function toISODate(date) {
  return format(date, "yyyy-MM-dd");
}

// Format for display (e.g. "Mon Jan 5")
export function formatDayHeader(date) {
  return format(date, "EEE MMM d");
}

// Format time for display (e.g. "10:30 AM")
export function formatTime(isoString) {
  return format(parseISO(isoString), "h:mm a");
}

// Format date range for week nav display (e.g. "Jan 5 – 11, 2026")
export function formatWeekRange(monday) {
  const sunday = getSundayOf(monday);
  if (format(monday, "MMM") === format(sunday, "MMM")) {
    return `${format(monday, "MMM d")} – ${format(sunday, "d, yyyy")}`;
  }
  return `${format(monday, "MMM d")} – ${format(sunday, "MMM d, yyyy")}`;
}

// Convert a dateTime ISO string to a pixel offset from the top of the calendar
export function apptTopPx(startISO) {
  const d = parseISO(startISO);
  const hours = d.getHours() + d.getMinutes() / 60;
  return Math.max(0, (hours - DAY_START_HOUR) * PX_PER_HOUR);
}

// Convert start + end ISO strings to a pixel height
export function apptHeightPx(startISO, endISO) {
  const start = parseISO(startISO);
  const end = parseISO(endISO);
  const durationHours = (end - start) / 3_600_000;
  return Math.max(20, durationHours * PX_PER_HOUR); // min 20px so it's always visible
}

// Total height of the calendar time area in pixels
export const CALENDAR_HEIGHT_PX = (DAY_END_HOUR - DAY_START_HOUR) * PX_PER_HOUR;

// Hour labels for the time gutter (6 AM through 9 PM)
export const HOUR_LABELS = Array.from(
  { length: DAY_END_HOUR - DAY_START_HOUR },
  (_, i) => {
    const h = DAY_START_HOUR + i;
    return { hour: h, label: format(new Date(2000, 0, 1, h), "h a") };
  }
);

// Format seconds into "Xh Ym" string (for PUDO display)
export function formatDuration(seconds) {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

// Convert minutes (UI input) to seconds (Airtable storage)
export function minutesToSeconds(minutes) {
  return (minutes ?? 0) * 60;
}

// Convert seconds (Airtable) to minutes (UI display)
export function secondsToMinutes(seconds) {
  return Math.round((seconds ?? 0) / 60);
}
