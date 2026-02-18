// migrate-students.js
// Migrates records from Students - Old to Students (new table)
// Maps: First Name, Last Name, Phone, Email, Guardian name/phone/email, Address

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = "appfmh7j77kCe8hy2";
const OLD_TABLE = "tblzt3omoGVGSfWTj"; // Students - Old
const NEW_TABLE = "tblpG4IVPaS8tq4bp"; // Students (new)

const HEADERS = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

// Split "First Last" into { first, last }
function splitName(fullName) {
  if (!fullName || !fullName.trim()) return { first: "", last: "" };
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0] || "";
  const last = parts.slice(1).join(" ") || "";
  return { first, last };
}

// Split guardian name — old field is "First Last" style
function splitGuardianName(fullName) {
  if (!fullName || !fullName.trim()) return { first: "", last: "" };
  const parts = fullName.trim().split(/\s+/);
  // Guardian field sometimes has "First And Last Name" — take first word as first, rest as last
  const first = parts[0] || "";
  const last = parts.slice(1).join(" ") || "";
  return { first, last };
}

async function fetchAllOldRecords() {
  const records = [];
  let offset = null;

  do {
    const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${OLD_TABLE}`);
    url.searchParams.set("pageSize", "100");
    // Only fetch the fields we need
    const fields = [
      "👨‍🎓 Full Name",
      "👨‍🎓  Email",
      "👨‍🎓  Phone #",
      "👩‍👦 Alt Contact Full Name",
      "👩‍👦  Phone #",
      "👩‍👦  Email Address",
      "🚗 Address",
    ];
    fields.forEach((f) => url.searchParams.append("fields[]", f));
    if (offset) url.searchParams.set("offset", offset);

    const res = await fetch(url.toString(), { headers: HEADERS });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to fetch old records: ${err}`);
    }
    const data = await res.json();
    records.push(...data.records);
    offset = data.offset;
    process.stdout.write(`\rFetched ${records.length} records...`);
  } while (offset);

  console.log(`\nTotal fetched: ${records.length}`);
  return records;
}

function mapRecord(old) {
  const f = old.fields;

  const student = splitName(f["👨‍🎓 Full Name"]);
  const guardian = splitGuardianName(f["👩‍👦 Alt Contact Full Name"]);

  const newFields = {};

  if (student.first) newFields["First Name"] = student.first;
  if (student.last)  newFields["Last Name"]  = student.last;
  if (f["👨‍🎓  Email"])      newFields["Email"]              = f["👨‍🎓  Email"];
  if (f["👨‍🎓  Phone #"])    newFields["Phone"]              = f["👨‍🎓  Phone #"];
  if (guardian.first) newFields["Guardian First Name"]  = guardian.first;
  if (guardian.last)  newFields["Guardian Last Name"]   = guardian.last;
  if (f["👩‍👦  Phone #"])    newFields["Guardian Phone"]     = f["👩‍👦  Phone #"];
  if (f["👩‍👦  Email Address"]) newFields["Guardian Email"] = f["👩‍👦  Email Address"];
  if (f["🚗 Address"])    newFields["Address"]           = f["🚗 Address"];

  return { fields: newFields };
}

async function batchCreate(records) {
  // Airtable allows max 10 records per create request
  const BATCH = 10;
  let created = 0;

  for (let i = 0; i < records.length; i += BATCH) {
    const chunk = records.slice(i, i + BATCH);
    const res = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${NEW_TABLE}`,
      {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({ records: chunk }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Batch create failed at index ${i}: ${err}`);
    }

    created += chunk.length;
    process.stdout.write(`\rCreated ${created}/${records.length} records...`);

    // Airtable rate limit: 5 requests/sec — wait 250ms between batches
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log(`\nDone. ${created} records created in new Students table.`);
}

async function main() {
  if (!API_KEY) {
    console.error("AIRTABLE_API_KEY not set");
    process.exit(1);
  }

  console.log("Fetching records from Students - Old...");
  const oldRecords = await fetchAllOldRecords();

  console.log("Mapping fields...");
  const newRecords = oldRecords.map(mapRecord);

  console.log(`Creating ${newRecords.length} records in new Students table...`);
  await batchCreate(newRecords);
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
