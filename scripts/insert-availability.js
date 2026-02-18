// insert-availability.js
// Inserts weekly schedule records into the Availability table.
// Shift Start is set to the first occurrence in the week of 2026-01-05 (first full week of 2026).
// Cadence: Weekly. Repeat Until: left blank (open-ended).
//
// Run: node scripts/insert-availability.js

import "dotenv/config";

const BASE_ID = "appfmh7j77kCe8hy2";
const TABLE_ID = "tbl5db09IrQR5rmgU"; // Availability
const API_KEY = process.env.AIRTABLE_API_KEY;

const HEADERS = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

// Instructor name → record ID
const INSTRUCTORS = {
  Mason:      "recb83SbUu3WPLByN",
  Michelle:   "recLwHIybyrSonO8a",
  Lorrie:     "recBOvYj1BaL2aEbX",
  Charles:    "recQeVFA25KjyCHpM",
  "Mr. O":    "recxnBQMHW8mF3Xlb",
  Margarita:  "recXoBl9vis7kgWdO",
  Erica:      "recjMS1TEsLoxrjgP", // also "Erika" in source — same person
  Mari:       "rec1LPY4vdt0KbXM5",
  Tobias:     "rec3bANj210wjddFO",
};

// Vehicle name → record ID (A/B/C are classroom locations — no vehicle link)
const VEHICLES = {
  "Car 1": "recSdoikMlaHyPkXJ",
  "Car 2": "receODwUMoXKBHekC",
  "Car 3": "recPiQubC1DOFgMu0",
  "Car 4": "recVetzxyrQHNfw9L",
  "Car 5": "recXUC065S3gWyDqY",
};

// Day of week → date in the week of 2026-01-05 (Mon=Jan 5 ... Sun=Jan 11)
const DAY_TO_DATE = {
  Mon: "2026-01-05",
  Tue: "2026-01-06",
  Wed: "2026-01-07",
  Thu: "2026-01-08",
  Fri: "2026-01-09",
  Sat: "2026-01-10",
  Sun: "2026-01-11",
};

// Convert "8:00 AM" → "08:00" (24h)
function to24h(timeStr) {
  const [time, period] = timeStr.split(" ");
  let [h, m] = time.split(":").map(Number);
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Convert hours (decimal) → seconds (Airtable duration is stored in seconds)
function hoursToSeconds(hrs) {
  return Math.round(hrs * 3600);
}

// Raw schedule data
const SCHEDULE = [
  { instructor: "Mason",     vehicle: "Car 1", day: "Mon", start: "8:00 AM",  length: 10.0 },
  { instructor: "Michelle",  vehicle: "Car 2", day: "Mon", start: "8:00 AM",  length: 9.5  },
  { instructor: "Lorrie",    vehicle: "Car 4", day: "Mon", start: "8:00 AM",  length: 6.0  },
  { instructor: "Charles",   vehicle: "Car 3", day: "Mon", start: "11:00 AM", length: 6.0  },
  { instructor: "Mr. O",     vehicle: "Car 2", day: "Mon", start: "5:00 PM",  length: 2.5  },
  { instructor: "Lorrie",    vehicle: "Car 3", day: "Tue", start: "9:00 AM",  length: 5.0  },
  { instructor: "Mason",     vehicle: "Car 1", day: "Tue", start: "10:00 AM", length: 8.0  },
  { instructor: "Michelle",  vehicle: "Car 2", day: "Tue", start: "10:00 AM", length: 9.5  },
  { instructor: "Charles",   vehicle: "Car 4", day: "Tue", start: "1:00 PM",  length: 5.5  },
  { instructor: "Mr. O",     vehicle: "Car 3", day: "Tue", start: "5:00 PM",  length: 2.5  },
  { instructor: "Mr. O",     vehicle: "Car 4", day: "Wed", start: "8:00 AM",  length: 6.0  },
  { instructor: "Margarita", vehicle: "A",     day: "Wed", start: "9:00 AM",  length: 8.0  },
  { instructor: "Erica",     vehicle: "C",     day: "Wed", start: "9:00 AM",  length: 8.0  },
  { instructor: "Michelle",  vehicle: "Car 3", day: "Wed", start: "9:00 AM",  length: 8.0  },
  { instructor: "Mason",     vehicle: "Car 1", day: "Wed", start: "1:00 PM",  length: 7.5  },
  { instructor: "Mari",      vehicle: "Car 2", day: "Wed", start: "1:00 PM",  length: 7.5  },
  { instructor: "Charles",   vehicle: "Car 4", day: "Wed", start: "2:00 PM",  length: 6.5  },
  { instructor: "Mr. O",     vehicle: "Car 3", day: "Thu", start: "8:00 AM",  length: 6.0  },
  { instructor: "Mason",     vehicle: "Car 1", day: "Thu", start: "9:00 AM",  length: 8.0  },
  { instructor: "Michelle",  vehicle: "A",     day: "Thu", start: "9:00 AM",  length: 8.0  },
  { instructor: "Tobias",    vehicle: "B",     day: "Thu", start: "9:00 AM",  length: 8.0  },
  { instructor: "Erica",     vehicle: "C",     day: "Thu", start: "9:00 AM",  length: 8.0  },
  { instructor: "Mari",      vehicle: "Car 2", day: "Thu", start: "1:00 PM",  length: 7.5  },
  { instructor: "Charles",   vehicle: "Car 4", day: "Thu", start: "2:00 PM",  length: 6.5  },
  { instructor: "Margarita", vehicle: "Car 1", day: "Fri", start: "8:00 AM",  length: 12.5 },
  { instructor: "Mr. O",     vehicle: "Car 2", day: "Fri", start: "8:00 AM",  length: 6.0  },
  { instructor: "Michelle",  vehicle: "A",     day: "Fri", start: "9:00 AM",  length: 8.0  },
  { instructor: "Tobias",    vehicle: "B",     day: "Fri", start: "9:00 AM",  length: 8.0  },
  { instructor: "Erica",     vehicle: "C",     day: "Fri", start: "9:00 AM",  length: 8.0  },
  { instructor: "Charles",   vehicle: "Car 2", day: "Fri", start: "2:00 PM",  length: 6.5  },
  { instructor: "Margarita", vehicle: "Car 1", day: "Sat", start: "8:00 AM",  length: 12.5 },
  { instructor: "Mr. O",     vehicle: "Car 4", day: "Sat", start: "8:00 AM",  length: 6.0  },
  { instructor: "Michelle",  vehicle: "Car 3", day: "Sat", start: "10:00 AM", length: 8.0  },
  { instructor: "Charles",   vehicle: "Car 4", day: "Sat", start: "2:00 PM",  length: 6.5  },
];

function buildRecord(row) {
  const date = DAY_TO_DATE[row.day];
  const time24 = to24h(row.start);
  // Airtable dateTime format: ISO 8601 with timezone
  // Using Eastern time (UTC-5 in January)
  const shiftStart = `${date}T${time24}:00.000-05:00`;

  const fields = {
    // Instructor link
    Instructor: [INSTRUCTORS[row.instructor]],
    // Status
    Status: "Scheduled",
    // Shift Start (dateTime)
    "Shift Start": shiftStart,
    // Shift Length (duration in seconds)
    "Shift Length": hoursToSeconds(row.length),
    // Cadence
    Cadence: "Weekly",
  };

  // Vehicle link — only for named cars, not classroom locations (A/B/C)
  const vehicleId = VEHICLES[row.vehicle];
  if (vehicleId) {
    fields.Vehicle = [vehicleId];
  } else {
    // A/B/C are classroom locations — store in Notes
    fields.Notes = `Location: ${row.vehicle}`;
  }

  return { fields };
}

async function insertBatch(records) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ records }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Airtable error ${res.status}: ${err}`);
  }
  return res.json();
}

async function main() {
  const records = SCHEDULE.map(buildRecord);

  console.log(`Inserting ${records.length} records in batches of 10...`);

  const BATCH = 10;
  let inserted = 0;
  for (let i = 0; i < records.length; i += BATCH) {
    const chunk = records.slice(i, i + BATCH);
    const result = await insertBatch(chunk);
    inserted += result.records.length;
    console.log(`  ✓ Inserted ${inserted}/${records.length}`);
    if (i + BATCH < records.length) {
      await new Promise((r) => setTimeout(r, 250)); // rate limit
    }
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
