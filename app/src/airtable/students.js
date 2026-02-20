import { fetchAll, createRecord, updateRecord, deleteRecord } from "./client";
import { TABLES } from "@/utils/constants";

export async function fetchAllStudents() {
  return fetchAll(TABLES.students, {
    "fields[]": [
      "First Name",
      "Last Name",
      "Phone",
      "Email",
      "Address",
      "Teen",
      "Guardian First Name",
      "Guardian Last Name",
      "Guardian Relation",
      "Guardian Phone",
      "Guardian Email",
    ],
    "sort[0][field]": "Last Name",
    "sort[0][direction]": "asc",
  });
}

export async function createStudent(fields) {
  return createRecord(TABLES.students, fields);
}

export async function updateStudent(recordId, fields) {
  return updateRecord(TABLES.students, recordId, fields);
}

export async function deleteStudent(recordId) {
  return deleteRecord(TABLES.students, recordId);
}
