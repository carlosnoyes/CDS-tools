import { fetchAll } from "./client";
import { TABLES } from "@/utils/constants";

export async function fetchAllVehicles() {
  return fetchAll(TABLES.vehicles, {
    "fields[]": ["Car Name"],
    "sort[0][field]": "Car Name",
    "sort[0][direction]": "asc",
  });
}
