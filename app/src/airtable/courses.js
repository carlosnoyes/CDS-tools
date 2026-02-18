import { fetchAll } from "./client";
import { TABLES } from "@/utils/constants";

// Fetch all in-car courses (relevant for appointment scheduling)
export async function fetchAllCourses() {
  return fetchAll(TABLES.courses, {
    "fields[]": ["Abreviation", "Name", "Length", "In Car"],
    filterByFormula: "{In Car}=1",
    "sort[0][field]": "Abreviation",
    "sort[0][direction]": "asc",
  });
}
