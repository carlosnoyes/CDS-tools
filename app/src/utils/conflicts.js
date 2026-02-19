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
  const instructorName = refData.instructorMap[c.fields.Instructor?.[0]]?.["Full Name"] ?? "?";
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
  const studentName = refData.studentMap[c.fields.Student?.[0]]?.["Full Name"] ?? "?";
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
    (a) => a.fields.Cars?.[0] === carId
  );
  if (!conflicts.length) return null;
  const c = conflicts[0];
  const instructorName = refData.instructorMap[c.fields.Instructor?.[0]]?.["Full Name"] ?? "?";
  const studentName    = refData.studentMap[c.fields.Student?.[0]]?.["Full Name"] ?? "?";
  const start = c.fields.Start ? new Date(c.fields.Start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "?";
  const end   = c.fields.End   ? new Date(c.fields.End).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "?";
  return {
    type: "E3",
    fields: ["Cars", "startDate", "startTime"],
    message: `Car already in use ${start}–${end} (${instructorName} / ${studentName})`,
  };
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
