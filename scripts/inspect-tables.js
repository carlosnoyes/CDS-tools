// inspect-tables.js — fetches schema + records for Appointments, Availability, Courses, Students
import "dotenv/config";

const BASE_ID = "appfmh7j77kCe8hy2";
const API_KEY = process.env.AIRTABLE_API_KEY;
const H = { Authorization: `Bearer ${API_KEY}` };

async function getSchema() {
  const r = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, { headers: H });
  return (await r.json()).tables;
}

async function getRecords(tableId, fields = []) {
  let records = [], offset;
  do {
    const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${tableId}`);
    url.searchParams.set("pageSize", "100");
    fields.forEach(f => url.searchParams.append("fields[]", f));
    if (offset) url.searchParams.set("offset", offset);
    const r = await fetch(url, { headers: H });
    const d = await r.json();
    records = records.concat(d.records);
    offset = d.offset;
  } while (offset);
  return records;
}

const tables = await getSchema();

// Appointments schema
const apptTable = tables.find(t => t.id === "tblo5X0nETYrtQ6bI");
console.log("=== APPOINTMENTS FIELDS ===");
apptTable.fields.forEach(f => {
  const opts = f.options?.choices?.map(c => c.name).join(", ") || "";
  console.log(`  ${f.name} | ${f.id} | ${f.type}${opts ? " | " + opts : ""}`);
});

// Courses — in-car ones
console.log("\n=== COURSES (In Car) ===");
const courses = await getRecords("tblthPfZN6r0FCD9P");
courses.filter(r => r.fields["In Car"]).forEach(r => {
  console.log(`  ${r.id} | ${r.fields["Name"]} | ${r.fields["Abreviation"]}`);
});

// Availability records
console.log("\n=== AVAILABILITY RECORDS ===");
const avail = await getRecords("tbl5db09IrQR5rmgU");
avail.forEach(r => {
  const f = r.fields;
  console.log(`  ${r.id} | Instructor:${JSON.stringify(f["Instructor"])} | Vehicle:${JSON.stringify(f["Vehicle"])} | Start:${f["Shift Start"]} | LengthSecs:${f["Shift Length"]} | Notes:${f["Notes"] || ""}`);
});

// Students
console.log("\n=== STUDENTS (first 60) ===");
const students = await getRecords("tblpG4IVPaS8tq4bp", ["First Name","Last Name"]);
students.slice(0, 60).forEach(r => {
  console.log(`  ${r.id} | ${r.fields["First Name"] || ""} ${r.fields["Last Name"] || ""}`);
});
console.log(`  Total students: ${students.length}`);
