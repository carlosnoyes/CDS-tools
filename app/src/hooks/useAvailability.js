import { useQuery } from "@tanstack/react-query";
import { fetchAllAvailability } from "@/airtable/availability";

export function useAvailability() {
  return useQuery({
    queryKey: ["availability"],
    queryFn: fetchAllAvailability,
    staleTime: 2 * 60 * 1000,  // 2 min — same as appointments
  });
}
