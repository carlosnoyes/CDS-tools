export const BASE_ID = "appfmh7j77kCe8hy2";

export const TABLES = {
  appointments: "tblo5X0nETYrtQ6bI",
  students:     "tblpG4IVPaS8tq4bp",
  instructors:  "tblwm92MbaoRT2dSa",
  vehicles:     "tblog7VBOinu5eVqp",
  courses:      "tblthPfZN6r0FCD9P",
};

// Appointments field IDs
// Formula/lookup fields are read-only — never write to them
export const APPT_FIELDS = {
  abbreviation:       "fldSsrlgL0Fhx6Ci4",  // formula — read only
  recordId:           "fldlXk1OUtz0S8ghl",  // formula — read only
  created:            "fldanniRebdEOza0d",  // formula — read only
  lastModified:       "fldCKn1xYAQ8BBnve",  // formula — read only
  student:            "fldSGS6xsegcdEklh",  // multipleRecordLinks → Students
  instructor:         "fldtQT4tfTJ5FCm9T",  // multipleRecordLinks → Instructors
  vehicle:            "fldPRZoDW0yAe2YwQ",  // multipleRecordLinks → Vehicles
  course:             "fldy84c9JSS2ris1w",  // multipleRecordLinks → Courses
  courseNameLookup:   "fldUeLt9UGlCM2L46",  // lookup — read only
  courseLengthLookup: "fldv3IBKE2TiYhAhX",  // lookup (seconds) — read only
  pudu:               "fld6nShioyE8NGlKH",  // duration (seconds)
  start:              "fldSEIbrQiwpMhwB4",  // dateTime (ISO string)
  end:                "fldA4Cct6GbdTJf9v",  // formula — read only
  classNumber:        "fldw5sIWilBYqwQdl",  // number
  location:           "fldkQZ5XXOZTqXPlm",  // singleSelect
  notes:              "fldwDBhLucKlzEiMu",  // singleLineText
};

export const LOCATIONS = ["Colonial Heights", "Glen Allen"];

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
