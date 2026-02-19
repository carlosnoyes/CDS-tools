import { fetchAll } from "./client";
import { TABLES } from "@/utils/constants";

// Fetch all schedulable courses with fields needed for the appointment form
export async function fetchAllCourses() {
  return fetchAll(TABLES.courses, {
    "fields[]": [
      "Abreviation", "Name", "Length", "Type",
      "Age Options", "Tier Options", "Locations Options",
      "Spanish Offered", "PUDO Offered",
    ],
    "sort[0][field]": "Abreviation",
    "sort[0][direction]": "asc",
  });
}
