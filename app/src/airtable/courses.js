import { fetchAll } from "./client";
import { TABLES } from "@/utils/constants";

// Fetch all schedulable courses with fields needed for the appointment form
export async function fetchAllCourses() {
  return fetchAll(TABLES.courses, {
    "fields[]": [
      "Abreviation", "Name", "Lookup", "Length", "Type",
      "Tier Options", "Location Options",
      "Spanish Offered", "PUDO Offered", "Numbered",
    ],
    "sort[0][field]": "Abreviation",
    "sort[0][direction]": "asc",
  });
}
