import { fetchAll } from "./client";
import { TABLES } from "@/utils/constants";

export async function fetchAllStudents() {
  return fetchAll(TABLES.students, {
    "fields[]": ["Full Name", "First Name", "Last Name", "Phone", "Email"],
    "sort[0][field]": "Full Name",
    "sort[0][direction]": "asc",
  });
}
