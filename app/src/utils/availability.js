import { parseISO, isSameDay } from "date-fns";

/**
 * Given all availability records from Airtable, return the set of active
 * (unblocked) time intervals for a specific target date.
 *
 * Each record is a standalone shift — no recurrence expansion needed.
 *
 * Returns: Array of { instructorId, vehicleId, location, startMs, endMs }
 *
 * Algorithm:
 * 1. Collect all "Scheduled" records whose Start date matches targetDate
 * 2. Collect all "Blocked Off" records whose Start date matches targetDate
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

    const anchor = parseISO(f.Start);
    if (!isSameDay(anchor, targetDate)) continue;

    const instructorId = f.Instructor?.[0] ?? null;
    const vehicleId    = f.Vehicle?.[0]    ?? null;
    const location     = f.Location        ?? null;
    const status       = f.Status          ?? "";

    const startMs = anchor.getTime();
    const endMs   = startMs + f["Shift Length"] * 1000;

    const entry = { record: rec, instructorId, vehicleId, location, startMs, endMs };

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
