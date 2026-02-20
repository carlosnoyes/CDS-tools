import { parseISO, isBefore, isAfter, isSameDay, getDay } from "date-fns";

/**
 * Given all availability records from Airtable, return the set of active
 * (unblocked) time intervals for a specific target date.
 *
 * Returns: Array of { instructorId, vehicleId, startMs, endMs }
 *
 * Algorithm:
 * 1. Collect all "Scheduled" records whose recurrence includes targetDate
 * 2. Collect all "Blocked Off" records whose recurrence includes targetDate
 * 3. Subtract blocked windows from scheduled windows using scoped matching:
 *    - instructor+vehicle block: exact pair
 *    - instructor-only block: that instructor across all vehicles
 *    - vehicle-only block: that vehicle across all instructors
 *    - blank+blank block: ignored (no-op)
 */
export function expandAvailability(records, targetDate) {
  const scheduled = [];
  const blocked   = [];

  for (const rec of records) {
    const f = rec.fields;
    if (!f.Start || !f["Shift Length"]) continue;

    const instructorId = f.Instructor?.[0] ?? null;
    const vehicleId    = f.Vehicle?.[0]    ?? null;
    const location     = f.Location        ?? null;
    const status       = f.Status          ?? "";
    const cadence      = f.Cadence         ?? "Weekly";
    const repeateUntil = f["Repeate Until"] ? parseISO(f["Repeate Until"]) : null;

    // Build start/end for this occurrence on targetDate
    const occurrence = getOccurrenceOnDate(f.Start, f["Shift Length"], cadence, repeateUntil, targetDate);
    if (!occurrence) continue;

    const entry = { instructorId, vehicleId, location, startMs: occurrence.startMs, endMs: occurrence.endMs };

    if (status === "Scheduled")    scheduled.push(entry);
    if (status === "Blocked Off")  blocked.push(entry);
  }

  // Subtract blocked intervals from scheduled intervals using block scope rules.
  const result = [];
  for (const s of scheduled) {
    const applicableBlocks = blocked.filter(
      (b) => blockAppliesToScheduled(b, s)
    );
    const slices = subtractBlocks([s], applicableBlocks);
    result.push(...slices);
  }

  return result;
}

/**
 * Returns true when a blocked interval applies to a scheduled interval.
 *
 * Scope rules:
 * - instructor+vehicle set: exact pair match
 * - instructor-only: match instructor, any vehicle
 * - vehicle-only: match vehicle, any instructor
 * - both missing: invalid/no-op (never matches)
 */
function blockAppliesToScheduled(block, scheduled) {
  const hasInstructor = Boolean(block.instructorId);
  const hasVehicle = Boolean(block.vehicleId);

  if (!hasInstructor && !hasVehicle) return false;
  if (hasInstructor && hasVehicle) {
    return (
      block.instructorId === scheduled.instructorId &&
      block.vehicleId === scheduled.vehicleId
    );
  }
  if (hasInstructor) return block.instructorId === scheduled.instructorId;
  return block.vehicleId === scheduled.vehicleId;
}

/**
 * Determine if a recurring availability record has an occurrence on targetDate.
 * If it does, return { startMs, endMs } for that occurrence.
 * Returns null if no occurrence lands on targetDate.
 *
 * @param {string} startISO - The original start datetime ISO string
 * @param {number} shiftLengthSec - Duration in seconds
 * @param {"Weekly"|"Bi-Weekly"} cadence
 * @param {Date|null} repeateUntil - Last date of recurrence (inclusive), or null = no end
 * @param {Date} targetDate - The calendar date we're rendering
 */
function getOccurrenceOnDate(startISO, shiftLengthSec, cadence, repeateUntil, targetDate) {
  const anchor = parseISO(startISO);
  const anchorDay = getDay(anchor);   // 0 (Sun) – 6 (Sat)
  const targetDay = getDay(targetDate);

  // The recurrence is weekly or bi-weekly on the same day-of-week as the anchor.
  // If the target's day-of-week doesn't match, no occurrence.
  if (anchorDay !== targetDay) return null;

  // Check targetDate is on or after the anchor date
  if (isBefore(targetDate, anchor) && !isSameDay(targetDate, anchor)) return null;

  // Check targetDate is within the repeateUntil window (if set)
  if (repeateUntil && isAfter(targetDate, repeateUntil)) return null;

  // For Bi-Weekly: check that the number of weeks from anchor is even
  if (cadence === "Bi-Weekly") {
    const anchorMonday = startOfDayMs(anchor);
    const targetMonday = startOfDayMs(targetDate);
    const weeksDiff = Math.round((targetMonday - anchorMonday) / (7 * 86_400_000));
    if (weeksDiff % 2 !== 0) return null;
  }

  // Build the start/end for this occurrence — same time-of-day as anchor, on targetDate
  const targetStart = new Date(targetDate);
  targetStart.setHours(anchor.getHours(), anchor.getMinutes(), 0, 0);
  const startMs = targetStart.getTime();
  const endMs   = startMs + shiftLengthSec * 1000;

  return { startMs, endMs };
}

function startOfDayMs(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Subtract an array of block intervals from an array of scheduled intervals.
 * Handles partial overlaps by splitting the scheduled interval into before/after slices.
 * Returns a flat array of non-blocked { instructorId, vehicleId, startMs, endMs }.
 */
function subtractBlocks(intervals, blocks) {
  let result = [...intervals];
  for (const block of blocks) {
    const next = [];
    for (const seg of result) {
      // No overlap — keep as-is
      if (block.endMs <= seg.startMs || block.startMs >= seg.endMs) {
        next.push(seg);
        continue;
      }
      // Before the block
      if (seg.startMs < block.startMs) {
        next.push({ ...seg, endMs: block.startMs });
      }
      // After the block
      if (seg.endMs > block.endMs) {
        next.push({ ...seg, startMs: block.endMs });
      }
      // The segment fully inside the block is dropped
    }
    result = next;
  }
  return result;
}
