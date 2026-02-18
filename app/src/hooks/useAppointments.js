import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { addDays } from "date-fns";
import {
  fetchAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from "@/airtable/appointments";
import { toISODate } from "@/utils/time";

// Query key factory
const apptKey = (weekStart) => ["appointments", toISODate(weekStart)];

export function useAppointments(weekStart) {
  const weekEnd = addDays(weekStart, 7);
  return useQuery({
    queryKey: apptKey(weekStart),
    queryFn: () => fetchAppointments(toISODate(weekStart), toISODate(weekEnd)),
    staleTime: 2 * 60 * 1000,
    enabled: !!weekStart,
  });
}

export function useCreateAppointment(weekStart) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fields) => createAppointment(fields),
    onSuccess: () => qc.invalidateQueries({ queryKey: apptKey(weekStart) }),
  });
}

export function useUpdateAppointment(weekStart) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ recordId, fields }) => updateAppointment(recordId, fields),
    onSuccess: () => qc.invalidateQueries({ queryKey: apptKey(weekStart) }),
  });
}

export function useDeleteAppointment(weekStart) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (recordId) => deleteAppointment(recordId),
    onSuccess: () => qc.invalidateQueries({ queryKey: apptKey(weekStart) }),
  });
}
