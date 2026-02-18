import { fetchAll, createRecord, updateRecord, deleteRecord } from "./client";
import { TABLES } from "@/utils/constants";

const TABLE = TABLES.appointments;

// Fetch appointments whose Start falls within [weekStart, weekEnd)
// weekStart and weekEnd should be ISO date strings (e.g. "2026-01-05")
export async function fetchAppointments(weekStart, weekEnd) {
  const formula = `AND(
    IS_SAME_OR_AFTER({Start}, "${weekStart}"),
    IS_BEFORE({Start}, "${weekEnd}")
  )`;
  return fetchAll(TABLE, { filterByFormula: formula });
}

// fields object should only include writable fields (not formulas/lookups)
export async function createAppointment(fields) {
  return createRecord(TABLE, fields);
}

export async function updateAppointment(recordId, fields) {
  return updateRecord(TABLE, recordId, fields);
}

export async function deleteAppointment(recordId) {
  return deleteRecord(TABLE, recordId);
}
