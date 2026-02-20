import { fullName } from "@/hooks/useReferenceData";

/**
 * Conflict detection utilities for the appointment form.
 *
 * All functions are pure — they take existing appointments and proposed values
 * and return conflict objects (or null). No side effects, no API calls.
 */

/**
 * Check whether two time intervals [aStart, aEnd) and [bStart, bEnd) overlap.
 * @param {number} aStart - ms timestamp
 * @param {number} aEnd   - ms timestamp
 * @param {number} bStart - ms timestamp
 * @param {number} bEnd   - ms timestamp
 */
function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Compute the end time of a proposed appointment in ms.
 * Returns null if start is missing.
 */
function computeEndMs(startISO, courseLengthSec, pudoOption) {
  if (!startISO) return null;
  const pudoMinutes = pudoOption === "0:30" ? 30 : pudoOption === "1:00" ? 60 : 0;
  const totalMs = ((courseLengthSec ?? 0) + pudoMinutes * 2 * 60) * 1000;
  return new Date(startISO).getTime() + totalMs;
}

/**
 * Given the full list of cached appointments, filter to those that overlap the
 * proposed [startISO, endMs) window on the same day, excluding the record being
 * edited (skipId).
 */
function overlappingAppts(allAppts, startISO, endMs, skipId) {
  if (!startISO || !endMs) return [];
  const propStart = new Date(startISO).getTime();
  return allAppts.filter((a) => {
    if (a.id === skipId) return false;
    if (!a.fields.Start || !a.fields.End) return false;
    if (a.fields.Canceled || a.fields["No Show"]) return false;
    const aStart = new Date(a.fields.Start).getTime();
    const aEnd   = new Date(a.fields.End).getTime();
    return overlaps(propStart, endMs, aStart, aEnd);
  });
}

/**
 * E1 — Student double-booking.
 * Returns conflict object or null.
 */
export function checkStudentConflict(allAppts, { startISO, endMs, studentId, skipId, refData }) {
  if (!studentId || !startISO || !endMs) return null;
  const conflicts = overlappingAppts(allAppts, startISO, endMs, skipId).filter(
    (a) => a.fields.Student?.[0] === studentId
  );
  if (!conflicts.length) return null;
  const c = conflicts[0];
  const instructorName = fullName(refData.instructorMap[c.fields.Instructor?.[0]]);
  const start = c.fields.Start ? new Date(c.fields.Start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "?";
  const end   = c.fields.End   ? new Date(c.fields.End).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "?";
  return {
    type: "E1",
    fields: ["Student", "startDate", "startTime"],
    message: `Already booked ${start}–${end} with ${instructorName}`,
  };
}

/**
 * E2 — Instructor double-booking.
 * Returns conflict object or null.
 */
export function checkInstructorConflict(allAppts, { startISO, endMs, instructorId, skipId, refData }) {
  if (!instructorId || !startISO || !endMs) return null;
  const conflicts = overlappingAppts(allAppts, startISO, endMs, skipId).filter(
    (a) => a.fields.Instructor?.[0] === instructorId
  );
  if (!conflicts.length) return null;
  const c = conflicts[0];
  const studentName = fullName(refData.studentMap[c.fields.Student?.[0]]);
  const start = c.fields.Start ? new Date(c.fields.Start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "?";
  const end   = c.fields.End   ? new Date(c.fields.End).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "?";
  return {
    type: "E2",
    fields: ["Instructor", "startDate", "startTime"],
    message: `Already scheduled ${start}–${end} with ${studentName}`,
  };
}

/**
 * E3 — Car double-booking (In Car appointments only).
 * Returns conflict object or null.
 */
export function checkCarConflict(allAppts, { startISO, endMs, carId, skipId, refData }) {
  if (!carId || !startISO || !endMs) return null;
  const conflicts = overlappingAppts(allAppts, startISO, endMs, skipId).filter(
    (a) => a.fields.Car?.[0] === carId
  );
  if (!conflicts.length) return null;
  const c = conflicts[0];
  const instructorName = fullName(refData.instructorMap[c.fields.Instructor?.[0]]);
  const studentName    = fullName(refData.studentMap[c.fields.Student?.[0]]);
  const start = c.fields.Start ? new Date(c.fields.Start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "?";
  const end   = c.fields.End   ? new Date(c.fields.End).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "?";
  return {
    type: "E3",
    fields: ["Cars", "startDate", "startTime"],
    message: `Car already in use ${start}–${end} (${instructorName} / ${studentName})`,
  };
}

/**
 * W1 — Instructor not available at the proposed time.
 * W2 — Selected car not in instructor's availability window.
 * W3 — Instructor scheduled at a different location than the appointment.
 *
 * Returns an array of warning objects (severity: "warning").
 * Warnings do not block submission — they are surfaced in orange.
 *
 * @param {Array} availIntervals - Output of expandAvailability(records, targetDate)
 *   Each entry: { instructorId, vehicleId, location, startMs, endMs }
 * @param {object} formValues - { startISO, endMs, instructorId, carId, location }
 * @param {object} refData
 */
export function checkAvailabilityWarnings(availIntervals, { startISO, endMs, instructorId, carId, location }, refData) {
  if (!instructorId || !startISO || !endMs) return [];

  const propStart = new Date(startISO).getTime();

  // Find all availability windows for this instructor on this day
  const instructorWindows = availIntervals.filter((w) => w.instructorId === instructorId);

  // W1 — no window covers the full appointment time
  const coveringWindow = instructorWindows.find(
    (w) => w.startMs <= propStart && w.endMs >= endMs
  );

  if (!coveringWindow) {
    const instructorName = fullName(refData.instructorMap[instructorId]);
    return [{
      type: "W1",
      severity: "warning",
      fields: ["Instructor", "startDate", "startTime"],
      message: `${instructorName} has no availability window covering this time.`,
    }];
  }

  // W2 — car selected doesn't match the car in the covering window
  const warnings = [];
  if (carId && coveringWindow.vehicleId && carId !== coveringWindow.vehicleId) {
    const instructorName = fullName(refData.instructorMap[instructorId]) || null;
    const selectedCarName = refData.vehicleMap[carId]?.["Car Name"] ?? null;

    // Line 1: what car is the instructor actually scheduled with?
    const instructorCarName = refData.vehicleMap[coveringWindow.vehicleId]?.["Car Name"] ?? null;
    const line1 = instructorName && instructorCarName
      ? `${instructorName} should be scheduled for ${instructorCarName} at this time.`
      : null;

    // Line 2: which instructor is the selected car scheduled with?
    const carOwnerWindow = availIntervals.find(
      (w) => w.vehicleId === carId && w.instructorId !== instructorId
        && w.startMs <= propStart && w.endMs >= endMs
    );
    const carOwnerName = carOwnerWindow
      ? (fullName(refData.instructorMap[carOwnerWindow.instructorId]) || null)
      : null;
    const line2 = selectedCarName && carOwnerName
      ? `${selectedCarName} is scheduled for ${carOwnerName} at this time.`
      : null;

    const message = (line1 || line2)
      ? [line1, line2].filter(Boolean).join("\n")
      : `${selectedCarName ?? "This car"} is not the car scheduled for ${instructorName ?? "this instructor"} at this time.`;

    warnings.push({
      type: "W2",
      severity: "warning",
      fields: ["Cars"],
      message,
    });
  }

  // W3 — instructor's covering window is at a different location than selected
  if (location && coveringWindow.location && location !== coveringWindow.location) {
    const instructorName = fullName(refData.instructorMap[instructorId]);
    warnings.push({
      type: "W3",
      severity: "warning",
      fields: ["Location", "Instructor"],
      message: `${instructorName} is scheduled at ${coveringWindow.location} at this time, not ${location}.`,
    });
  }

  return warnings;
}

/**
 * Given availability records and a proposed start time, find the car linked to
 * the instructor's covering availability window (if any). Returns vehicleId or null.
 */
export function getAvailabilityCar(availIntervals, startISO, endMs, instructorId) {
  if (!instructorId || !startISO || !endMs) return null;
  const propStart = new Date(startISO).getTime();
  const window = availIntervals.find(
    (w) => w.instructorId === instructorId && w.startMs <= propStart && w.endMs >= endMs
  );
  return window?.vehicleId ?? null;
}

/**
 * Given availability records and a proposed start time, find the location linked to
 * the instructor's covering availability window (if any). Returns location string or null.
 */
export function getAvailabilityLocation(availIntervals, startISO, endMs, instructorId) {
  if (!instructorId || !startISO || !endMs) return null;
  const propStart = new Date(startISO).getTime();
  const window = availIntervals.find(
    (w) => w.instructorId === instructorId && w.startMs <= propStart && w.endMs >= endMs
  );
  return window?.location ?? null;
}

const TRAVEL_BUFFER_MS = 30 * 60 * 1000; // 30 minutes

/**
 * W4 — Instructor traveling between two different locations without a 30-minute buffer.
 *
 * Looks at all existing (non-canceled, non-no-show) appointments for the instructor
 * on the same day that are at a different location and are within TRAVEL_BUFFER_MS
 * of the proposed appointment's time window.
 *
 * Returns a warning object or null.
 *
 * @param {Array} allAppts - Full appointment cache
 * @param {object} params - { startISO, endMs, instructorId, location, skipId }
 * @param {object} refData
 */
export function checkLocationTravelWarning(allAppts, { startISO, endMs, instructorId, location, skipId }, refData) {
  if (!instructorId || !startISO || !endMs || !location) return null;

  const propStart = new Date(startISO).getTime();

  // Get all instructor appointments on the same day (not canceled/no-show, not self)
  const instructorAppts = allAppts.filter((a) => {
    if (a.id === skipId) return false;
    if (!a.fields.Start || !a.fields.End) return false;
    if (a.fields.Canceled || a.fields["No Show"]) return false;
    if (a.fields.Instructor?.[0] !== instructorId) return false;
    if (!a.fields.Location || a.fields.Location === location) return false;
    // Same calendar day
    const aDay = new Date(a.fields.Start).toDateString();
    const propDay = new Date(startISO).toDateString();
    return aDay === propDay;
  });

  for (const a of instructorAppts) {
    const aStart = new Date(a.fields.Start).getTime();
    const aEnd   = new Date(a.fields.End).getTime();
    const otherLocation = a.fields.Location;

    // Existing appointment ends too close before proposed start
    if (aEnd <= propStart && propStart - aEnd < TRAVEL_BUFFER_MS) {
      const time = new Date(aEnd).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      const instructorName = fullName(refData.instructorMap[instructorId]);
      return {
        type: "W4",
        severity: "warning",
        fields: ["Instructor", "startDate", "startTime"],
        message: `${instructorName} has an appointment at ${otherLocation} ending at ${time} — less than 30 min travel buffer.`,
      };
    }

    // Existing appointment starts too close after proposed end
    if (aStart >= endMs && aStart - endMs < TRAVEL_BUFFER_MS) {
      const time = new Date(aStart).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      const instructorName = fullName(refData.instructorMap[instructorId]);
      return {
        type: "W4",
        severity: "warning",
        fields: ["Instructor", "startDate", "startTime"],
        message: `${instructorName} has an appointment at ${otherLocation} starting at ${time} — less than 30 min travel buffer.`,
      };
    }
  }

  return null;
}

/**
 * W5/W6 — Instructor capability warnings from Instructors table fields.
 *
 * W5: Spanish requested but instructor is not marked Spanish-capable.
 * W6: Tier selected but instructor's Tiers does not include selected tier.
 *
 * Returns an array of warning objects.
 */
export function checkInstructorCapabilityWarnings({ instructorId, spanish, tier }, refData) {
  if (!instructorId) return [];

  const instructor = refData.instructorMap[instructorId] ?? {};
  const instructorName = fullName(instructor);
  const warnings = [];

  // W5 — Spanish capability
  const spanishCapable = instructor.Spanish === true;
  if (spanish && !spanishCapable) {
    warnings.push({
      type: "W5",
      severity: "warning",
      fields: ["Instructor"],
      message: `${instructorName} cannot teach Spanish sessions`,
    });
  }

  // W6 — Tier capability
  if (tier) {
    const instructorTiersRaw = instructor.Tiers;
    const instructorTiers = Array.isArray(instructorTiersRaw)
      ? instructorTiersRaw
      : instructorTiersRaw
      ? [instructorTiersRaw]
      : [];
    if (!instructorTiers.includes(tier)) {
      warnings.push({
        type: "W6",
        severity: "warning",
        fields: ["Instructor"],
        message: `${instructorName} cannot teach ${tier} sessions`,
      });
    }
  }

  return warnings;
}

/**
 * Run all applicable conflict checks and return an array of conflict objects.
 * Pass skipId = record.id when editing to exclude the current record.
 */
export function detectConflicts(allAppts, formValues, courseFlags, skipId, refData) {
  const { startISO, studentId, instructorId, carId } = formValues;
  const { isInCar, courseLengthSec, pudoOption } = courseFlags;

  const endMs = computeEndMs(startISO, courseLengthSec, pudoOption);

  const results = [];
  const ctx = { startISO, endMs, skipId, refData };

  const e1 = checkStudentConflict(allAppts,    { ...ctx, studentId });
  const e2 = checkInstructorConflict(allAppts, { ...ctx, instructorId });
  const e3 = isInCar ? checkCarConflict(allAppts, { ...ctx, carId }) : null;

  if (e1) results.push(e1);
  if (e2) results.push(e2);
  if (e3) results.push(e3);

  return results;
}
