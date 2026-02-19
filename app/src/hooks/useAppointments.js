import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from "@/airtable/appointments";
import { toISODate } from "@/utils/time";

// Query key factory — keyed by start+end ISO date strings
const apptKey = (start, end) => ["appointments", start, end];

export function useAppointments(startDate, endDate) {
  const startISO = toISODate(startDate);
  const endISO = toISODate(endDate);
  return useQuery({
    queryKey: apptKey(startISO, endISO),
    queryFn: () => fetchAppointments(startISO, endISO),
    staleTime: 2 * 60 * 1000,
    enabled: !!startDate && !!endDate,
  });
}

export function useCreateAppointment(startDate, endDate) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fields) => createAppointment(fields),
    onSuccess: () => qc.invalidateQueries({ queryKey: apptKey(toISODate(startDate), toISODate(endDate)) }),
  });
}

export function useUpdateAppointment(startDate, endDate) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ recordId, fields }) => updateAppointment(recordId, fields),
    onSuccess: () => qc.invalidateQueries({ queryKey: apptKey(toISODate(startDate), toISODate(endDate)) }),
  });
}

export function useDeleteAppointment(startDate, endDate) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (recordId) => deleteAppointment(recordId),
    onSuccess: () => qc.invalidateQueries({ queryKey: apptKey(toISODate(startDate), toISODate(endDate)) }),
  });
}
