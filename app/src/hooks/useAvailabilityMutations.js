import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createAvailability,
  updateAvailability,
  deleteAvailability,
} from "@/airtable/availability";

export function useCreateAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fields) => createAvailability(fields),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["availability"] }),
  });
}

export function useUpdateAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, fields }) => updateAvailability(id, fields),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["availability"] }),
  });
}

export function useDeleteAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteAvailability(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["availability"] }),
  });
}

/**
 * Create multiple availability records (recurrence expansion).
 * Accepts an array of field objects, creates them with throttled parallel requests.
 */
export function useBulkCreateAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (fieldsList) => {
      const results = [];
      for (let i = 0; i < fieldsList.length; i += 4) {
        const batch = fieldsList.slice(i, i + 4);
        const batchResults = await Promise.all(
          batch.map((fields) => createAvailability(fields))
        );
        results.push(...batchResults);
        if (i + 4 < fieldsList.length) {
          await new Promise((r) => setTimeout(r, 250));
        }
      }
      return results;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["availability"] }),
  });
}

/**
 * Update multiple availability records in bulk (All Future Shifts).
 * Accepts an array of { id, fields } objects.
 */
export function useBulkUpdateAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates) => {
      const results = [];
      for (let i = 0; i < updates.length; i += 4) {
        const batch = updates.slice(i, i + 4);
        const batchResults = await Promise.all(
          batch.map(({ id, fields }) => updateAvailability(id, fields))
        );
        results.push(...batchResults);
        if (i + 4 < updates.length) {
          await new Promise((r) => setTimeout(r, 250));
        }
      }
      return results;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["availability"] }),
  });
}

/**
 * Delete multiple availability records in bulk (All Future Shifts).
 * Accepts an array of record IDs.
 */
export function useBulkDeleteAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids) => {
      const results = [];
      for (let i = 0; i < ids.length; i += 4) {
        const batch = ids.slice(i, i + 4);
        const batchResults = await Promise.all(
          batch.map((id) => deleteAvailability(id))
        );
        results.push(...batchResults);
        if (i + 4 < ids.length) {
          await new Promise((r) => setTimeout(r, 250));
        }
      }
      return results;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["availability"] }),
  });
}

/**
 * Split a single availability record into two at a given time.
 * Shortens the original record and creates a new record for the second half.
 */
export function useSplitAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ record, splitTimeISO }) => {
      const f = record.fields;
      const originalStartMs = new Date(f.Start).getTime();
      const splitMs = new Date(splitTimeISO).getTime();
      const originalEndMs = originalStartMs + f["Shift Length"] * 1000;

      // Shorten the original: new Shift Length = splitTime - originalStart
      const firstHalfLengthSec = Math.round((splitMs - originalStartMs) / 1000);
      await updateAvailability(record.id, {
        "Shift Length": firstHalfLengthSec,
      });

      // Create the second half: Start = splitTime, Shift Length = originalEnd - splitTime
      const secondHalfLengthSec = Math.round((originalEndMs - splitMs) / 1000);
      const newFields = {
        Status: f.Status ?? "Scheduled",
        Start: splitTimeISO,
        "Shift Length": secondHalfLengthSec,
      };
      if (f.Instructor?.[0]) newFields.Instructor = [f.Instructor[0]];
      if (f.Vehicle?.[0]) newFields.Vehicle = [f.Vehicle[0]];
      if (f.Location) newFields.Location = f.Location;
      if (f.Classroom) newFields.Classroom = f.Classroom;
      if (f.Notes) newFields.Notes = f.Notes;

      return createAvailability(newFields);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["availability"] }),
  });
}
