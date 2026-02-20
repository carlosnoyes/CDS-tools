import { parseISO, getDay, addDays } from "date-fns";
import { expandAvailability } from "./availability";
import { CLASSROOMS } from "./constants";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Build blocks for the Recurring Schedule view.
 * Filters to Status=Scheduled records whose anchor day-of-week matches `dayOfWeek`.
 * Groups by resource lane (vehicle → classroom → unassigned).
 *
 * @param {object[]} records - raw Airtable availability records
 * @param {number} dayOfWeek - 0=Sun..6=Sat
 * @param {object} refData - { vehicleMap, instructorMap }
 * @returns {Map<string, object[]>} laneKey → array of block objects
 */
export function buildRecurringBlocks(records, dayOfWeek, refData) {
  const lanes = new Map();

  for (const rec of records) {
    const f = rec.fields;
    if (f.Status !== "Scheduled") continue;
    if (!f.Start || !f["Shift Length"]) continue;

    const anchor = parseISO(f.Start);
    if (getDay(anchor) !== dayOfWeek) continue;

    const instructorId = f.Instructor?.[0] ?? null;
    const vehicleId = f.Vehicle?.[0] ?? null;
    const location = f.Location ?? null;
    const startHour = anchor.getHours() + anchor.getMinutes() / 60;
    const durationHours = f["Shift Length"] / 3600;
    const cadence = f.Cadence ?? "Weekly";

    // Determine lane key
    let laneKey;
    if (vehicleId) {
      const carName = refData?.vehicleMap?.[vehicleId]?.["Car Name"] ?? "Unknown Car";
      laneKey = `car:${carName}`;
    } else {
      laneKey = "__unassigned__";
    }

    const block = {
      record: rec,
      instructorId,
      vehicleId,
      location,
      startHour,
      durationHours,
      cadence,
      dayOfWeek,
      dayName: DAY_NAMES[dayOfWeek],
    };

    if (!lanes.has(laneKey)) lanes.set(laneKey, []);
    lanes.get(laneKey).push(block);
  }

  return lanes;
}

/**
 * Build blocks for the Week View.
 * Expands recurrences for each of the 7 days in the week, groups by resource lane.
 * Also collects Blocked Off occurrences for visual overlay.
 *
 * @param {object[]} records - raw Airtable availability records
 * @param {Date} monday - start of the week
 * @param {object} refData - { vehicleMap, instructorMap }
 * @returns {{ scheduled: Map<string, object[]>, blocked: Map<string, object[]> }}
 */
export function buildWeekBlocks(records, monday, refData) {
  const scheduled = new Map(); // laneKey → blocks with dayIndex
  const blocked = new Map();   // laneKey → blocked overlay intervals

  for (let d = 0; d < 7; d++) {
    const day = addDays(monday, d);

    // Get net available intervals (after block subtraction)
    const netIntervals = expandAvailability(records, day);
    for (const iv of netIntervals) {
      const laneKey = getLaneKey(iv.vehicleId, refData);
      const block = intervalToBlock(iv, d, day);
      if (!scheduled.has(laneKey)) scheduled.set(laneKey, []);
      scheduled.get(laneKey).push(block);
    }

    // Collect raw Blocked Off occurrences for visual overlay
    const blockedOccurrences = collectBlockedOccurrences(records, day);
    for (const iv of blockedOccurrences) {
      const laneKey = getLaneKey(iv.vehicleId, refData);
      const block = intervalToBlock(iv, d, day);
      block.isBlocked = true;
      if (!blocked.has(laneKey)) blocked.set(laneKey, []);
      blocked.get(laneKey).push(block);
    }
  }

  return { scheduled, blocked };
}

/**
 * Collect Blocked Off interval occurrences for a given date.
 * Does NOT subtract — just returns the raw blocked windows that land on this date.
 */
function collectBlockedOccurrences(records, targetDate) {
  const result = [];
  for (const rec of records) {
    const f = rec.fields;
    if (f.Status !== "Blocked Off") continue;
    if (!f.Start || !f["Shift Length"]) continue;

    const anchor = parseISO(f.Start);
    if (getDay(anchor) !== getDay(targetDate)) continue;

    // Check date is on/after anchor
    if (targetDate < anchor && targetDate.toDateString() !== anchor.toDateString()) continue;

    // Check repeateUntil
    const repeateUntil = f["Repeate Until"] ? parseISO(f["Repeate Until"]) : null;
    if (repeateUntil && targetDate > repeateUntil) continue;

    // Bi-weekly check
    const cadence = f.Cadence ?? "Weekly";
    if (cadence === "Bi-Weekly") {
      const anchorMs = new Date(anchor).setHours(0, 0, 0, 0);
      const targetMs = new Date(targetDate).setHours(0, 0, 0, 0);
      const weeksDiff = Math.round((targetMs - anchorMs) / (7 * 86_400_000));
      if (weeksDiff % 2 !== 0) continue;
    }

    const targetStart = new Date(targetDate);
    targetStart.setHours(anchor.getHours(), anchor.getMinutes(), 0, 0);
    const startMs = targetStart.getTime();
    const endMs = startMs + f["Shift Length"] * 1000;

    result.push({
      record: rec,
      instructorId: f.Instructor?.[0] ?? null,
      vehicleId: f.Vehicle?.[0] ?? null,
      location: f.Location ?? null,
      startMs,
      endMs,
    });
  }
  return result;
}

function getLaneKey(vehicleId, refData) {
  if (vehicleId) {
    const carName = refData?.vehicleMap?.[vehicleId]?.["Car Name"] ?? "Unknown Car";
    return `car:${carName}`;
  }
  return "__unassigned__";
}

function intervalToBlock(iv, dayIndex, day) {
  const startDate = new Date(iv.startMs);
  const startHour = startDate.getHours() + startDate.getMinutes() / 60;
  const durationHours = (iv.endMs - iv.startMs) / 3_600_000;
  return {
    ...iv,
    dayIndex,
    day,
    startHour,
    durationHours,
  };
}

/**
 * Sort lane keys in the standard order: Car 1..N, Classrooms, Unassigned.
 */
export function sortLaneKeys(keys) {
  const carKeys = keys.filter((k) => k.startsWith("car:")).sort((a, b) => {
    const aNum = parseInt(a.replace("car:Car ", ""), 10) || 999;
    const bNum = parseInt(b.replace("car:Car ", ""), 10) || 999;
    return aNum - bNum;
  });
  const classroomKeys = keys
    .filter((k) => k.startsWith("classroom:"))
    .sort();
  const unassigned = keys.filter((k) => k === "__unassigned__");
  return [...carKeys, ...classroomKeys, ...unassigned];
}

/**
 * Get display label for a lane key.
 */
export function laneLabel(key) {
  if (key === "__unassigned__") return "Unassigned";
  if (key.startsWith("car:")) return key.slice(4);
  if (key.startsWith("classroom:")) return key.slice(10);
  return key;
}
