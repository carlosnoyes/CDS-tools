import { fetchAll } from "./client";
import { TABLES, AVAIL_FIELDS } from "@/utils/constants";

// Fetch all availability records — we pull all of them and expand client-side.
// No date filter here: recurrence expansion needs the full set to determine which
// records are active on a given date within the view window.
export async function fetchAllAvailability() {
  return fetchAll(TABLES.availability, {
    "fields[]": Object.values(AVAIL_FIELDS),
  });
}
