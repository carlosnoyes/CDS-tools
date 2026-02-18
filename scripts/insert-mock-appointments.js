// insert-mock-appointments.js
// Inserts 50 mock appointment records into the Appointments table.
// Appointments are scheduled within instructor availability windows.
// Run: node scripts/insert-mock-appointments.js

import "dotenv/config";

const BASE_ID = "appfmh7j77kCe8hy2";
const APPT_TABLE = "tblo5X0nETYrtQ6bI";
const API_KEY = process.env.AIRTABLE_API_KEY;
const H = { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" };

// ── In-car courses (id, name, abbreviation, length in seconds) ───────────────
const IN_CAR_COURSES = [
  { id: "recObtiNIdNF1Dj4W", name: "Teen Behind the Wheel",          abbr: "TBTW",    secs: 3600  }, // 1h
  { id: "recSLpZ23NvkRyPIN", name: "Adult Behind the Wheel - 60",    abbr: "ABTW60",  secs: 3600  }, // 1h
  { id: "recscoFboq7QZFXF2", name: "Adult Behind the Wheel - 120",   abbr: "ABTW120", secs: 7200  }, // 2h
  { id: "recWDVgDUhH8DTNgZ", name: "Private Lesson",                 abbr: "PL",      secs: 3600  }, // 1h
  { id: "recAbnrT6tN62c2dr", name: "Driving Assessment",             abbr: "DA",      secs: 3600  }, // 1h
  { id: "recSBGC6aVPylcuNR", name: "Road Test",                      abbr: "RT",      secs: 3600  }, // 1h
];

// PUDO options in seconds: 0, 1800 (0:30), 3600 (1:00)
const PUDO_OPTIONS = [0, 1800, 3600];

// ── Instructor availability (reconstructed from the schedule we inserted) ─────
// Each entry: instructor record ID, vehicle record ID (null = classroom), day offset from Mon (0=Mon..5=Sat), shift start hour, shift end hour
const AVAILABILITY = [
  // Monday
  { instructor: "recb83SbUu3WPLByN", vehicle: "recSdoikMlaHyPkXJ", day: 0, startH: 8,  endH: 18 }, // Mason Car1
  { instructor: "recLwHIybyrSonO8a", vehicle: "receODwUMoXKBHekC", day: 0, startH: 8,  endH: 17.5 }, // Michelle Car2
  { instructor: "recBOvYj1BaL2aEbX", vehicle: "recVetzxyrQHNfw9L", day: 0, startH: 8,  endH: 14 }, // Lorrie Car4
  { instructor: "recQeVFA25KjyCHpM", vehicle: "recPiQubC1DOFgMu0", day: 0, startH: 11, endH: 17 }, // Charles Car3
  { instructor: "recxnBQMHW8mF3Xlb", vehicle: "receODwUMoXKBHekC", day: 0, startH: 17, endH: 19.5 }, // Mr.O Car2
  // Tuesday
  { instructor: "recBOvYj1BaL2aEbX", vehicle: "recPiQubC1DOFgMu0", day: 1, startH: 9,  endH: 14 }, // Lorrie Car3
  { instructor: "recb83SbUu3WPLByN", vehicle: "recSdoikMlaHyPkXJ", day: 1, startH: 10, endH: 18 }, // Mason Car1
  { instructor: "recLwHIybyrSonO8a", vehicle: "receODwUMoXKBHekC", day: 1, startH: 10, endH: 19.5 }, // Michelle Car2
  { instructor: "recQeVFA25KjyCHpM", vehicle: "recVetzxyrQHNfw9L", day: 1, startH: 13, endH: 18.5 }, // Charles Car4
  { instructor: "recxnBQMHW8mF3Xlb", vehicle: "recPiQubC1DOFgMu0", day: 1, startH: 17, endH: 19.5 }, // Mr.O Car3
  // Wednesday
  { instructor: "recxnBQMHW8mF3Xlb", vehicle: "recVetzxyrQHNfw9L", day: 2, startH: 8,  endH: 14 }, // Mr.O Car4
  { instructor: "recLwHIybyrSonO8a", vehicle: "recPiQubC1DOFgMu0", day: 2, startH: 9,  endH: 17 }, // Michelle Car3
  { instructor: "recb83SbUu3WPLByN", vehicle: "recSdoikMlaHyPkXJ", day: 2, startH: 13, endH: 20.5 }, // Mason Car1
  { instructor: "rec1LPY4vdt0KbXM5", vehicle: "receODwUMoXKBHekC", day: 2, startH: 13, endH: 20.5 }, // Mari Car2
  { instructor: "recQeVFA25KjyCHpM", vehicle: "recVetzxyrQHNfw9L", day: 2, startH: 14, endH: 20.5 }, // Charles Car4
  // Thursday
  { instructor: "recxnBQMHW8mF3Xlb", vehicle: "recPiQubC1DOFgMu0", day: 3, startH: 8,  endH: 14 }, // Mr.O Car3
  { instructor: "recb83SbUu3WPLByN", vehicle: "recSdoikMlaHyPkXJ", day: 3, startH: 9,  endH: 17 }, // Mason Car1
  { instructor: "rec1LPY4vdt0KbXM5", vehicle: "receODwUMoXKBHekC", day: 3, startH: 13, endH: 20.5 }, // Mari Car2
  { instructor: "recQeVFA25KjyCHpM", vehicle: "recVetzxyrQHNfw9L", day: 3, startH: 14, endH: 20.5 }, // Charles Car4
  // Friday
  { instructor: "recXoBl9vis7kgWdO", vehicle: "recSdoikMlaHyPkXJ", day: 4, startH: 8,  endH: 20.5 }, // Margarita Car1
  { instructor: "recxnBQMHW8mF3Xlb", vehicle: "receODwUMoXKBHekC", day: 4, startH: 8,  endH: 14 }, // Mr.O Car2
  { instructor: "recQeVFA25KjyCHpM", vehicle: "receODwUMoXKBHekC", day: 4, startH: 14, endH: 20.5 }, // Charles Car2
  // Saturday
  { instructor: "recXoBl9vis7kgWdO", vehicle: "recSdoikMlaHyPkXJ", day: 5, startH: 8,  endH: 20.5 }, // Margarita Car1
  { instructor: "recxnBQMHW8mF3Xlb", vehicle: "recVetzxyrQHNfw9L", day: 5, startH: 8,  endH: 14 }, // Mr.O Car4
  { instructor: "recLwHIybyrSonO8a", vehicle: "recPiQubC1DOFgMu0", day: 5, startH: 10, endH: 18 }, // Michelle Car3
  { instructor: "recQeVFA25KjyCHpM", vehicle: "recVetzxyrQHNfw9L", day: 5, startH: 14, endH: 20.5 }, // Charles Car4
];

// ── 50 student record IDs (first 50 from the list we retrieved) ───────────────
const STUDENT_IDS = [
  "rec08ezabwabLAfRA","rec0LINozd9os2JR7","rec0Pgf7cWBW9Hnii","rec0YKCDwMaBfVnFc","rec0coYGZ7J6Xkt6A",
  "rec0pO4gOpa5uygc6","rec128WVBOQPyxgIE","rec1AoGHWIiYvSl6u","rec1Bbe2NtlcJoyjr","rec1KizpivMuRMYWt",
  "rec1YpD3sRvpfvLrz","rec1cVh9I1tyVkDlI","rec1eGVon8D9KErOO","rec1mju3WUwFfNMCg","rec22s8zw2rZg8A7J",
  "rec23uLEDlKzj4Oux","rec27ezV9l7bUdqV0","rec2LxV37LSFt1KO4","rec2M4VeO2iLRRBDl","rec2MFozcgl3P8OYQ",
  "rec2Nr5O0kVWZA8MA","rec2QUxjrjGJ8RZMI","rec2kGSZqDKEB7HwC","rec2lPNti8Qoyfmng","rec2nYtV4nZODyt7z",
  "rec2odgh2TbDmsWQD","rec2olsejPqQvwHIr","rec2x6MsAsG85i4xl","rec31fZOCshjWUXVJ","rec32DlESU2kfuYc5",
  "rec3HwxoK12pkwKm3","rec3PcMHh1VAmbQwY","rec3SvdG1Zc3h5MLT","rec3ag3DvIrYiO1Kr","rec3m4YnSO2UJIC0O",
  "rec3nuNzfZ6cdzLvV","rec3thSRMpuTAltJi","rec3wzShJxplkOAUT","rec46l5AvR86ztojW","rec4CUTa3MzqmPb9D",
  "rec4GSaALS4Nk8tOc","rec4JqTmEJfWD1yas","rec4ccC1cCqL57HUp","rec4g1kCE2JU9empt","rec4rJRY7br4vjKmJ",
  "rec4vFiI7T4sy9f9Q","rec50VSJloTviXwLz","rec57VWbkdpVeJKdb","rec57qVhdnKxXs7EU","rec59j0IMbVoNebZH",
];

const LOCATIONS = ["Colonial Heights", "Glen Allen"];

// Dates for weeks starting Jan 5, 2026 (week 1) and Jan 12 (week 2)
// dayOffset 0=Mon Jan5, 1=Tue Jan6 ... 5=Sat Jan10 for week1
// week2: add 7 days
function getDate(weekNum, dayOffset) {
  // week 1 anchor: Jan 5 2026 (Monday)
  const anchor = new Date("2026-01-05T00:00:00");
  const d = new Date(anchor);
  d.setDate(d.getDate() + (weekNum - 1) * 7 + dayOffset);
  return d;
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// Build ISO dateTime string for a given date + decimal hour, Eastern time (UTC-5 in Jan/Feb)
function toISO(date, decimalHour) {
  const h = Math.floor(decimalHour);
  const m = decimalHour % 1 === 0.5 ? 30 : 0;
  const pad = n => String(n).padStart(2, "0");
  const dateStr = date.toISOString().slice(0, 10);
  return `${dateStr}T${pad(h)}:${pad(m)}:00.000-05:00`;
}

// Generate 50 appointments
function generateAppointments() {
  const appts = [];
  const usedSlots = new Set(); // "instructorId|dateStr|startHour" to avoid exact duplicates

  let studentIdx = 0;
  let attempts = 0;

  while (appts.length < 50 && attempts < 500) {
    attempts++;

    const avail = pick(AVAILABILITY);
    const course = pick(IN_CAR_COURSES);
    const weekNum = pick([1, 2]); // spread across both weeks
    const date = getDate(weekNum, avail.day);
    const dateStr = date.toISOString().slice(0, 10);

    // Course duration in hours
    const courseDurH = course.secs / 3600;
    // PUDO in hours
    const pudoSecs = pick(PUDO_OPTIONS);
    const pudoH = pudoSecs / 3600;

    // Total block needed
    const totalH = courseDurH + pudoH;

    // Classes start on the hour only — ceil shift start to next whole hour
    const firstSlot = Math.ceil(avail.startH);

    // Pick a start time within the availability window leaving room for the full block
    const latestStart = Math.floor(avail.endH - totalH); // latest whole-hour start that fits
    if (latestStart < firstSlot) continue; // course doesn't fit in this slot

    // Quantise to 1-hour slots only
    const slotsAvail = latestStart - firstSlot + 1;
    const slotIdx = randInt(0, slotsAvail - 1);
    const startH = firstSlot + slotIdx;

    const slotKey = `${avail.instructor}|${dateStr}|${startH}`;
    if (usedSlots.has(slotKey)) continue;
    usedSlots.add(slotKey);

    const startISO = toISO(date, startH);
    const student = STUDENT_IDS[studentIdx % STUDENT_IDS.length];
    studentIdx++;

    appts.push({
      fields: {
        Student:      [student],
        Instructor:   [avail.instructor],
        Vehicle:      [avail.vehicle],
        Course:       [course.id],
        Start:        startISO,
        PUDU:         pudoSecs,
        Location:     pick(LOCATIONS),
        "Class Number": randInt(1, 6),
      },
    });
  }

  return appts;
}

async function insertBatch(records) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${APPT_TABLE}`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ records }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Airtable error ${res.status}: ${err}`);
  }
  return res.json();
}

async function main() {
  const records = generateAppointments();
  console.log(`Generated ${records.length} appointment records. Inserting...`);

  const BATCH = 10;
  let inserted = 0;
  for (let i = 0; i < records.length; i += BATCH) {
    const chunk = records.slice(i, i + BATCH);
    const result = await insertBatch(chunk);
    inserted += result.records.length;
    console.log(`  ✓ Inserted ${inserted}/${records.length}`);
    if (i + BATCH < records.length) {
      await new Promise(r => setTimeout(r, 250));
    }
  }
  console.log("Done.");
}

main().catch(err => { console.error(err); process.exit(1); });
