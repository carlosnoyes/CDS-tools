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
