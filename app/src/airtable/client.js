import { BASE_ID } from "@/utils/constants";

const API_KEY = import.meta.env.VITE_AIRTABLE_API_KEY;
const BASE_URL = `https://api.airtable.com/v0/${BASE_ID}`;

if (!API_KEY) {
  console.error("VITE_AIRTABLE_API_KEY is not set. Check app/.env");
}

const headers = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

async function handleResponse(res) {
  if (!res.ok) {
    const text = await res.text();
    const msg = `Airtable ${res.status}: ${text}`;
    console.error(msg);
    throw new Error(msg);
  }
  return res.json();
}

// Fetch all records from a table (handles Airtable pagination automatically)
export async function fetchAll(tableId, params = {}) {
  let records = [];
  let offset;

  do {
    const url = new URL(`${BASE_URL}/${tableId}`);
    Object.entries(params).forEach(([k, v]) => {
      if (Array.isArray(v)) {
        v.forEach((val) => url.searchParams.append(k, val));
      } else {
        url.searchParams.set(k, v);
      }
    });
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);

    const data = await fetch(url, { headers }).then(handleResponse);
    records = records.concat(data.records);
    offset = data.offset;
  } while (offset);

  return records;
}

// POST new records (up to 10 at a time — this helper sends 1)
export async function createRecord(tableId, fields) {
  const res = await fetch(`${BASE_URL}/${tableId}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ records: [{ fields }] }),
  });
  const data = await handleResponse(res);
  return data.records[0];
}

// PATCH update a single record
export async function updateRecord(tableId, recordId, fields) {
  const res = await fetch(`${BASE_URL}/${tableId}/${recordId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ fields }),
  });
  return handleResponse(res);
}

// DELETE a single record
export async function deleteRecord(tableId, recordId) {
  const res = await fetch(`${BASE_URL}/${tableId}/${recordId}`, {
    method: "DELETE",
    headers,
  });
  return handleResponse(res);
}
