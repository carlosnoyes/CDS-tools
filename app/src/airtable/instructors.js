import { fetchAll } from "./client";
import { TABLES } from "@/utils/constants";

export async function fetchAllInstructors() {
  return fetchAll(TABLES.instructors, {
    "fields[]": ["First Name", "Last Name", "Role", "Spanish", "Tiers"],
    "sort[0][field]": "Last Name",
    "sort[0][direction]": "asc",
  });
}
