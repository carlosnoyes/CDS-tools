// delete-appointments.js — deletes ALL records from the Appointments table
import "dotenv/config";

const BASE_ID = "appfmh7j77kCe8hy2";
const TABLE_ID = "tblo5X0nETYrtQ6bI";
const API_KEY = process.env.AIRTABLE_API_KEY;
const H = { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" };

async function getAllIds() {
  let ids = [], offset;
  do {
    const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`);
    url.searchParams.set("pageSize", "100");
    url.searchParams.set("fields[]", "Record ID"); // minimal payload
    if (offset) url.searchParams.set("offset", offset);
    const r = await fetch(url, { headers: H });
    const d = await r.json();
    ids = ids.concat(d.records.map(r => r.id));
    offset = d.offset;
  } while (offset);
  return ids;
}

async function deleteBatch(ids) {
  const params = ids.map(id => `records[]=${id}`).join("&");
  const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?${params}`, {
    method: "DELETE",
    headers: H,
  });
  if (!res.ok) throw new Error(`Delete failed ${res.status}: ${await res.text()}`);
  return res.json();
}

async function main() {
  const ids = await getAllIds();
  console.log(`Found ${ids.length} records to delete.`);
  const BATCH = 10;
  let deleted = 0;
  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH);
    await deleteBatch(chunk);
    deleted += chunk.length;
    console.log(`  ✓ Deleted ${deleted}/${ids.length}`);
    if (i + BATCH < ids.length) await new Promise(r => setTimeout(r, 250));
  }
  console.log("Done.");
}

main().catch(err => { console.error(err); process.exit(1); });
