import { fetchAll } from "./client";
import { TABLES } from "@/utils/constants";

export async function fetchAllInstructors() {
  return fetchAll(TABLES.instructors, {
    "fields[]": ["Full Name", "First Name", "Last Name", "Role", "Capabilities"],
    "sort[0][field]": "Full Name",
    "sort[0][direction]": "asc",
  });
}
