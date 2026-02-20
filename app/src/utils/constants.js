export const BASE_ID = "appfmh7j77kCe8hy2";

export const TABLES = {
  appointments: "tblo5X0nETYrtQ6bI",
  students:     "tblpG4IVPaS8tq4bp",
  instructors:  "tblwm92MbaoRT2dSa",
  vehicles:     "tblog7VBOinu5eVqp",
  courses:      "tblthPfZN6r0FCD9P",
  availability: "tbl5db09IrQR5rmgU",
};

// Availability field names (stored by name, not ID, for this table)
export const AVAIL_FIELDS = {
  instructor:   "Instructor",    // multipleRecordLinks → Instructors
  vehicle:      "Vehicle",       // multipleRecordLinks → Cars
  location:     "Location",      // singleSelect: "CH" | "GA"
  status:       "Status",        // singleSelect: "Scheduled" | "Blocked Off"
  start:        "Start",         // dateTime (ISO string)
  shiftLength:  "Shift Length",  // number (seconds)
  end:          "End",           // dateTime formula (read-only)
  cadence:      "Cadence",       // singleSelect: "Weekly" | "Bi-Weekly"
  repeateUntil: "Repeate Until", // date (typo baked into Airtable)
};

// Appointments field IDs
// Formula/lookup fields are read-only — never write to them
export const APPT_FIELDS = {
  // System / formula — read only
  abbreviation:           "fldSsrlgL0Fhx6Ci4",
  recordId:               "fldlXk1OUtz0S8ghl",
  created:                "fldanniRebdEOza0d",
  lastModified:           "fldCKn1xYAQ8BBnve",
  end:                    "fldA4Cct6GbdTJf9v",
  pickupAt:               "fldOFlvxOnqvJAYEz",
  dropoffAt:              "fldsPG5OdcFDuleX1",

  // Lookup fields — read only (pulled from linked Course)
  courseNameLookup:       "fldUeLt9UGlCM2L46",
  courseLengthLookup:     "fldv3IBKE2TiYhAhX",
  courseTypeLookup:       "fldGxc1NcZ2YaII67",   // "In Car" | "Classroom"
  ageOptionsLookup:       "fld9fUgLPziU5WiUb",   // multiselect values: "T", "A"
  tierOptionsLookup:      "fldVFu0EN6v19tSPZ",   // multiselect values: "EL", "RL"
  locationsOptionsLookup: "fldxfTefJ4xSiSU4O",   // multiselect values: "CH", "GA"
  spanishOfferedLookup:   "fldj52kkWsaDd1pyy",   // boolean lookup
  pudoOfferedLookup:      "fldKi9AiTLgUj9cYL",   // boolean lookup

  // Writable fields
  student:      "fldSGS6xsegcdEklh",  // multipleRecordLinks → Students
  instructor:   "fldtQT4tfTJ5FCm9T",  // multipleRecordLinks → Instructors
  car:          "fldPRZoDW0yAe2YwQ",  // multipleRecordLinks → Cars (field name is "Car" in Airtable)
  course:       "fldy84c9JSS2ris1w",  // multipleRecordLinks → Courses
  start:        "fldSEIbrQiwpMhwB4",  // dateTime (ISO string)
  classNumber:  "fldw5sIWilBYqwQdl",  // number
  notes:        "fldwDBhLucKlzEiMu",  // singleLineText
  // Conditional writable fields (shown/hidden based on Course type)
  classroom:    "flduE85AAa1DBFLtv",  // singleSelect: "Class Room 1", "Class Room 2"
  age:          "fldhdQS61vRqqbVJc",  // singleSelect: "T", "A"
  tier:         "fldWMcjKhn1y7INxi",  // singleSelect: "EL", "RL"
  location:     "fldkQZ5XXOZTqXPlm",  // singleSelect: "CH", "GA"
  spanish:      "fld17lzRvlLbFdUa4",  // checkbox
  pudo:         "fld6nShioyE8NGlKH",  // duration (seconds): null, 1800 (30 min), 3600 (60 min)
};

// Students field IDs
export const STUDENT_FIELDS = {
  firstName:         "fldAyjsGGXkg72xfC",  // singleLineText
  lastName:          "fldAb8QMpEQI7INWU",  // singleLineText
  phone:             "fldC7mwK6qHNlJojs",  // phoneNumber
  email:             "fldGLUgpK7OhK09hf",  // email
  address:           "fldf1aK38wvLlWi0o",  // singleLineText
  teen:              "fldMZsgc6M6tjSM4N",  // checkbox
  guardianFirstName: "fld1MkpVvhEpNM5Yx",  // singleLineText
  guardianLastName:  "fldil8hf91KCEJiw4",  // singleLineText
  guardianRelation:  "fldbWdPSN5Nev2blX",  // singleLineText
  guardianPhone:     "fld6WORo9bVhoV0Js",  // phoneNumber
  guardianEmail:     "fldVn5HpMzAIi1a13",  // email
  // Read-only
  fullName:          "fldWUXq0QsdYjc1Jt",  // formula: First & " " & Last
  appointments:      "fldcMrrWus0qxba8i",  // multipleRecordLinks → Schedule
  recordId:          "fld4T1EeyMJhy5PdE",  // formula
  created:           "fldXMa8koP1LCwQZj",  // createdTime
  lastModified:      "fldYo3mtE2C4ElMyO",  // lastModifiedTime
};

export const CLASSROOMS = ["Class Room 1", "Class Room 2"];
export const PUDO_OPTIONS = ["0:30", "1:00"];
export const LOCATION_LABELS = { CH: "Colonial Heights", GA: "Glen Allen" };

// Instructor record IDs in stable order for consistent color assignment
export const INSTRUCTOR_ORDER = [
  "rec1LPY4vdt0KbXM5",  // Mari
  "recb83SbUu3WPLByN",  // Mason
  "recLwHIybyrSonO8a",  // Michelle
  "recBOvYj1BaL2aEbX",  // Lorrie
  "recQeVFA25KjyCHpM",  // Charles
  "recxnBQMHW8mF3Xlb",  // Mr. O
  "recXoBl9vis7kgWdO",  // Margarita
  "recBkce2X4A1rKIpZ",  // Jennifer
  "recZJ4Wcmv2EF5nTN",  // Chad
  "recbuwiXWUjkckgid",  // Brent
  "recrn3q7j3YKWT871",  // Heather
  "recjMS1TEsLoxrjgP",  // Erica
  "rec3bANj210wjddFO",  // Tobias
  "recNONNjnnxaj9EmM",  // Lorena
];
