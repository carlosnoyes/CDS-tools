import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { format, parseISO, addDays, addWeeks } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LinkedSelect from "./LinkedSelect";
import { CLASSROOMS, PUDO_OPTIONS, LOCATION_LABELS } from "@/utils/constants";
import { useCreateAppointment, useUpdateAppointment, useAppointments } from "@/hooks/useAppointments";
import { useAvailability } from "@/hooks/useAvailability";
import { detectConflicts, checkAvailabilityWarnings, getAvailabilityCar, getAvailabilityLocation, checkLocationTravelWarning, checkInstructorCapabilityWarnings } from "@/utils/conflicts";
import { expandAvailability } from "@/utils/availability";
import { fullName, courseLabel } from "@/hooks/useReferenceData";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateInput(isoString) {
  if (!isoString) return "";
  try { return format(parseISO(isoString), "yyyy-MM-dd"); } catch { return ""; }
}

function toTimeInput(isoString) {
  if (!isoString) return "";
  try { return format(parseISO(isoString), "HH:mm"); } catch { return ""; }
}

function combineDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  return new Date(dateStr + "T" + timeStr).toISOString();
}

function computeEndTime(startISO, courseLengthSec, pudoOption) {
  if (!startISO) return null;
  const pudoMinutes = pudoOption === "0:30" ? 30 : pudoOption === "1:00" ? 60 : 0;
  const totalMinutes = (courseLengthSec ?? 0) / 60 + pudoMinutes * 2;
  const end = new Date(new Date(startISO).getTime() + totalMinutes * 60_000);
  return isNaN(end.getTime()) ? null : format(end, "h:mm a");
}

// PUDO is stored in Airtable as a duration (integer seconds). Convert to/from display string.
function pudoToSeconds(pudoOption) {
  if (pudoOption === "0:30") return 1800;
  if (pudoOption === "1:00") return 3600;
  return null;
}

function pudoFromSeconds(seconds) {
  if (seconds === 1800) return "0:30";
  if (seconds === 3600) return "1:00";
  return "";
}

// Shift a startDate string forward by N weeks
function shiftDateByWeeks(dateStr, weeks) {
  if (!dateStr) return dateStr;
  try {
    return format(addWeeks(parseISO(dateStr), weeks), "yyyy-MM-dd");
  } catch { return dateStr; }
}

function todayStr() {
  return format(new Date(), "yyyy-MM-dd");
}

function toMs(iso) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
}

function isActiveForClassSeq(appt) {
  if (!appt?.fields) return false;
  if (appt.fields.Canceled || appt.fields["No Show"]) return false;
  return true;
}

function normalizeClassNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

function mostRecentPriorClassNumber(allAppts, studentId, courseId, startISO, skipRecordId = null) {
  if (!studentId || !courseId || !startISO) return null;
  const startMs = toMs(startISO);
  if (startMs == null) return null;

  let best = null;
  for (const a of allAppts) {
    if (skipRecordId && a.id === skipRecordId) continue;
    if (!isActiveForClassSeq(a)) continue;
    const f = a.fields;
    if (f.Student?.[0] !== studentId || f.Course?.[0] !== courseId) continue;
    if (!f.Start) continue;
    const aStartMs = toMs(f.Start);
    if (aStartMs == null || aStartMs >= startMs) continue;
    const classNum = normalizeClassNumber(f["Class Number"]);
    if (!classNum) continue;
    if (!best || aStartMs > best.startMs) best = { startMs: aStartMs, classNum };
  }
  return best?.classNum ?? null;
}

function buildChronologicalReindexPlan(allAppts, sequenceKeys, pivotByKey, overrideById = {}) {
  const updates = [];

  for (const key of sequenceKeys) {
    const [studentId, courseId] = key.split("|");
    const pivotMs = toMs(pivotByKey[key]);
    if (!studentId || !courseId || pivotMs == null) continue;

    const sequence = allAppts
      .filter((a) => {
        const f = a.fields;
        if (!isActiveForClassSeq(a)) return false;
        return f.Student?.[0] === studentId && f.Course?.[0] === courseId && f.Start;
      })
      .map((a) => {
        const override = overrideById[a.id];
        const startISO = override?.Start ?? a.fields.Start;
        const startMs = toMs(startISO);
        const classNum = normalizeClassNumber(override?.["Class Number"] ?? a.fields["Class Number"]);
        return { appt: a, startMs, classNum };
      })
      .filter((x) => x.startMs != null)
      .sort((a, b) => a.startMs - b.startMs);

    let expected = 1;
    for (const row of sequence) {
      const oldClass = normalizeClassNumber(row.appt.fields["Class Number"]);
      const newClass = expected++;
      if (row.startMs >= pivotMs && oldClass !== newClass) {
        updates.push({
          recordId: row.appt.id,
          startMs: row.startMs,
          oldClass,
          newClass,
          studentId,
          courseId,
        });
      }
    }
  }

  return updates;
}

function previewReindexMessage(updates, limit = 12) {
  if (!updates.length) return "";
  const lines = updates
    .sort((a, b) => a.startMs - b.startMs)
    .slice(0, limit)
    .map((u) => {
      const date = format(new Date(u.startMs), "yyyy-MM-dd HH:mm");
      return `${date}: ${u.oldClass ?? "—"} -> ${u.newClass}`;
    });
  const extra = updates.length > limit ? `\n...and ${updates.length - limit} more` : "";
  return (
    "Saving this edit will reindex future class numbers for chronological consistency.\n\n" +
    lines.join("\n") +
    extra +
    "\n\nContinue?"
  );
}

function defaultValues(record, prefill) {
  if (!record) {
    return {
      pudo: "", classNumber: "", Notes: "",
      Classroom: "", Tier: "", Location: prefill?.locationId ?? "", Spanish: false,
      startDate:  prefill?.startDate  ?? todayStr(),
      startTime:  prefill?.startTime  ?? "08:00",
      Instructor: prefill?.instructorId ?? "",
      Cars:       prefill?.carId        ?? "",
      Student: "", Course: "",
    };
  }
  const f = record.fields;
  return {
    Student:     f.Student?.[0]    ?? "",
    Course:      f.Course?.[0]     ?? "",
    Instructor:  f.Instructor?.[0] ?? "",
    startDate:   toDateInput(f.Start),
    startTime:   toTimeInput(f.Start),
    classNumber: f["Class Number"] ?? "",
    Notes:       f.Notes           ?? "",
    Cars:        f.Car?.[0]        ?? "",
    Classroom:   f.Classroom       ?? "",
    Tier:        f.Tier            ?? "",
    Location:    f.Location        ?? "",
    Spanish:     f.Spanish         ?? false,
    pudo:        pudoFromSeconds(f.PUDO),
    Canceled:    f.Canceled        ?? false,
    "No Show":   f["No Show"]      ?? false,
  };
}

// Build Airtable fields object from form data + course flags
function buildFields(data, { isInCar, isClassroom, tierOptions, locOptions, spanishOffered, pudoOffered }) {
  const fields = {
    Student:        data.Student    ? [data.Student]    : undefined,
    Course:         data.Course     ? [data.Course]     : undefined,
    Instructor:     data.Instructor ? [data.Instructor] : undefined,
    Start:          combineDateTime(data.startDate, data.startTime) ?? undefined,
    "Class Number": data.classNumber ? Number(data.classNumber) : undefined,
    Notes:          data.Notes || undefined,
  };
  if (isInCar)          fields.Car       = data.Cars      ? [data.Cars] : undefined;
  if (isClassroom)      fields.Classroom = data.Classroom || undefined;
  if (tierOptions.length)  fields.Tier   = data.Tier      || undefined;
  if (locOptions.length)   fields.Location = data.Location || undefined;
  if (spanishOffered)   fields.Spanish   = !!data.Spanish;
  if (pudoOffered)      fields.PUDO      = pudoToSeconds(data.pudo) ?? undefined;
  fields.Canceled   = !!data.Canceled;
  fields["No Show"] = !!data["No Show"];
  Object.keys(fields).forEach((k) => { if (fields[k] === undefined) delete fields[k]; });
  return fields;
}

// ─── Shared form fields panel ─────────────────────────────────────────────────
// Renders all the form controls. Used for both single and bulk draft panels.

function AppointmentFields({ form, refData, courseFlags, courseLengthSec, conflictByField = {}, warningByField = {}, isEdit = false }) {
  const { register, setValue, watch, formState: { errors } } = form;
  const { isInCar, isClassroom, isNumbered, tierOptions, locOptions, spanishOffered, pudoOffered } = courseFlags;

  // Returns extra className for a field — red for errors, orange for warnings
  function conflictClass(fieldName) {
    if (conflictByField[fieldName]) return " ring-2 ring-destructive ring-offset-0";
    if (warningByField[fieldName])  return " ring-2 ring-amber-400 ring-offset-0";
    return "";
  }

  const startDate_ = watch("startDate");
  const startTime_ = watch("startTime");
  const pudo       = watch("pudo");

  const startISO = useMemo(
    () => combineDateTime(startDate_, startTime_),
    [startDate_, startTime_]
  );

  const computedEndDisplay = useMemo(
    () => computeEndTime(startISO, courseLengthSec, pudo),
    [startISO, courseLengthSec, pudo]
  );

  return (
    <div className="grid grid-cols-2 gap-4">

      <div className="space-y-1">
        <Label>Student <span className="text-destructive">*</span></Label>
        <div className={"rounded-md" + conflictClass("Student")}>
          <LinkedSelect value={watch("Student")} onChange={(v) => setValue("Student", v)}
            options={refData.studentOptions} placeholder="Select student..." />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Course <span className="text-destructive">*</span></Label>
        <LinkedSelect value={watch("Course")} onChange={(v) => setValue("Course", v)}
          options={refData.courseOptions} placeholder="Select course..." />
      </div>

      <div className="space-y-1">
        <Label>Instructor <span className="text-destructive">*</span></Label>
        <div className={"rounded-md" + conflictClass("Instructor")}>
          <LinkedSelect value={watch("Instructor")} onChange={(v) => setValue("Instructor", v)}
            options={refData.instructorOptions} placeholder="Select instructor..." />
        </div>
        {warningByField["Instructor"] && (
          <p className="text-xs text-amber-600">{warningByField["Instructor"].message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="startDate">Date <span className="text-destructive">*</span></Label>
        <Input id="startDate" type="date"
          className={"w-full" + conflictClass("startDate")}
          {...register("startDate", { required: "Date is required" })} />
        {errors.startDate && <p className="text-xs text-destructive">{errors.startDate.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="startTime">Start Time <span className="text-destructive">*</span></Label>
        <Input id="startTime" type="time"
          className={"w-full" + conflictClass("startTime")}
          {...register("startTime", { required: "Start time is required" })} />
        {errors.startTime && <p className="text-xs text-destructive">{errors.startTime.message}</p>}
      </div>

      <div className="space-y-1">
        <Label>End Time</Label>
        <div className="w-full border rounded-md px-3 py-2 text-sm bg-muted text-muted-foreground min-h-[38px] flex items-center">
          {computedEndDisplay ?? <span className="opacity-50">-</span>}
        </div>
      </div>

      {isInCar && (
        <div className="space-y-1">
          <Label>Car <span className="text-destructive">*</span></Label>
          <div className={"rounded-md" + conflictClass("Cars")}>
            <LinkedSelect value={watch("Cars")} onChange={(v) => setValue("Cars", v)}
              options={refData.vehicleOptions} placeholder="Select car..." />
          </div>
          {!watch("Cars") && conflictByField["Cars"] && (
            <p className="text-xs text-destructive">Car is required for In Car courses.</p>
          )}
        </div>
      )}

      {isClassroom && (
        <div className="space-y-1">
          <Label>Classroom</Label>
          <select value={watch("Classroom")} onChange={(e) => setValue("Classroom", e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">Select...</option>
            {CLASSROOMS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}

      {tierOptions.length > 0 && (
        <div className="space-y-1">
          <Label>Higher Tier</Label>
          <select value={watch("Tier")} onChange={(e) => setValue("Tier", e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">None</option>
            {tierOptions.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      )}

      {locOptions.length > 0 && (
        <div className="space-y-1">
          <Label>Location</Label>
          <select value={watch("Location")} onChange={(e) => setValue("Location", e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">Select...</option>
            {locOptions.map((l) => <option key={l} value={l}>{LOCATION_LABELS[l] ?? l}</option>)}
          </select>
        </div>
      )}

      {pudoOffered && (
        <div className="space-y-1">
          <Label>PUDO</Label>
          <select value={watch("pudo")} onChange={(e) => setValue("pudo", e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">None</option>
            {PUDO_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <p className="text-xs text-muted-foreground">Pick-up / drop-off each way</p>
        </div>
      )}

      {spanishOffered && (
        <div className="flex items-center gap-2 pt-6">
          <input id="Spanish" type="checkbox" className="w-4 h-4 accent-primary" {...register("Spanish")} />
          <Label htmlFor="Spanish">Spanish session</Label>
        </div>
      )}

      {isNumbered && (
        <div className="space-y-1">
          <Label htmlFor="classNumber">Class #</Label>
          <Input id="classNumber" type="number" min={1} placeholder="Auto" {...register("classNumber")} />
          <p className="text-xs text-muted-foreground">Auto-calculated; override if needed</p>
        </div>
      )}

      {isEdit && (
        <div className="flex items-center gap-2 pt-1">
          <input id="Canceled" type="checkbox" className="w-4 h-4 accent-destructive" {...register("Canceled")} />
          <Label htmlFor="Canceled" className="text-destructive">Canceled</Label>
        </div>
      )}

      {isEdit && (
        <div className="flex items-center gap-2 pt-1">
          <input id="NoShow" type="checkbox" className="w-4 h-4 accent-primary" {...register("No Show")} />
          <Label htmlFor="NoShow">No Show</Label>
        </div>
      )}

      <div className="col-span-2 space-y-1">
        <Label htmlFor="Notes">Notes</Label>
        <Input id="Notes" placeholder="Optional notes..." {...register("Notes")} />
      </div>

    </div>
  );
}

// ─── AppointmentForm ──────────────────────────────────────────────────────────

export default function AppointmentForm({ record, prefill, refData, onClose, startDate, endDate, onDateChange }) {
  const isEdit = !!record;
  const create = useCreateAppointment(startDate, endDate);
  const update = useUpdateAppointment(startDate, endDate);

  // Bulk mode state
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkCount, setBulkCount] = useState(4);
  const [activeDraft, setActiveDraft] = useState(0);  // 0 = base form; 1..N = override forms
  const [draftOverrides, setDraftOverrides] = useState({});  // index → partial overrides
  const [submitting, setSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Additional Classes mode state (edit mode only)
  const [additionalClassesMode, setAdditionalClassesMode] = useState(false);
  const [acCount, setAcCount] = useState(4);
  const [acActiveDraft, setAcActiveDraft] = useState(0);
  const [acDraftOverrides, setAcDraftOverrides] = useState({});
  const [acDraftConflicts, setAcDraftConflicts] = useState({});
  const [acDraftWarnings, setAcDraftWarnings] = useState({});
  const [acSubmitting, setAcSubmitting] = useState(false);

  // Base form (always present — used for single AND as template for bulk)
  const baseForm = useForm({ defaultValues: defaultValues(record, prefill) });
  const { watch: watchBase, setValue: setBaseValue, reset: resetBase, handleSubmit: handleBaseSubmit } = baseForm;

  // Reset form whenever record or prefill changes (new click or new edit)
  useEffect(() => { resetBase(defaultValues(record, prefill)); }, [record?.id, prefill]);

  // Course-derived flags from base form's Course selection
  const courseId  = watchBase("Course");
  const studentId = watchBase("Student");

  const courseFields = useMemo(
    () => (courseId ? refData.courseMap[courseId] ?? null : null),
    [courseId, refData.courseMap]
  );

  const isInCar        = !!(courseFields && courseFields["Type"] === "In Car");
  const isClassroom    = !!(courseFields?.["Type"] === "Classroom");
  const isNumbered     = !!(courseFields?.["Numbered"]);
  const tierOptions    = useMemo(() => courseFields?.["Tier Options"]     ?? [], [courseFields]);
  const locOptions     = useMemo(() => courseFields?.["Location Options"] ?? [], [courseFields]);
  const spanishOffered = !!(courseFields?.["Spanish Offered"]);
  const pudoOffered    = !!(courseFields?.["PUDO Offered"]);
  const courseFlags = { isInCar, isClassroom, isNumbered, tierOptions, locOptions, spanishOffered, pudoOffered };
  const courseLengthSec = Number(courseFields?.["Length"]) || 0;

  // Reset conditional fields on course change
  useEffect(() => {
    if (!courseId) return;
    if (!isInCar)            setBaseValue("Cars", "");
    if (isClassroom && !baseForm.getValues("Classroom")) setBaseValue("Classroom", "Class Room 1");
    if (!isClassroom)        setBaseValue("Classroom", "");
    if (!isNumbered)         setBaseValue("classNumber", "");
    if (!spanishOffered)     setBaseValue("Spanish", false);
    if (!pudoOffered)        setBaseValue("pudo", "");
    if (!tierOptions.length) setBaseValue("Tier", "");
    if (locOptions.length && !baseForm.getValues("Location")) setBaseValue("Location", "CH");
    if (!locOptions.length)  setBaseValue("Location", "");
  }, [courseId]);

  // 8c — Class Number auto-calculation for new appointments
  const farPast   = useMemo(() => new Date(2020, 0, 1), []);
  const farFuture = useMemo(() => addDays(new Date(), 365), []);
  const { data: allAppts = [] } = useAppointments(farPast, farFuture);

  // 9 — Conflict detection (eager, runs off watched values)
  const instructorId = watchBase("Instructor");
  const carId        = watchBase("Cars");
  const locationVal  = watchBase("Location");
  const tierVal      = watchBase("Tier");
  const spanishVal   = watchBase("Spanish");
  const startDate_   = watchBase("startDate");
  const startTime_   = watchBase("startTime");
  const pudoVal      = watchBase("pudo");

  // Notify parent when date changes (used by sidebar to navigate the calendar)
  useEffect(() => {
    if (startDate_ && onDateChange) onDateChange(startDate_);
  }, [startDate_]);

  const baseStartISO = useMemo(
    () => {
      if (!startDate_ || !startTime_) return null;
      return new Date(startDate_ + "T" + startTime_).toISOString();
    },
    [startDate_, startTime_]
  );

  useEffect(() => {
    if (!studentId || !courseId || !baseStartISO || isEdit) return;
    const priorClass = mostRecentPriorClassNumber(
      allAppts,
      studentId,
      courseId,
      baseStartISO,
      null
    );
    setBaseValue("classNumber", (priorClass ?? 0) + 1);
  }, [studentId, courseId, baseStartISO, allAppts, isEdit, setBaseValue]);

  const conflicts = useMemo(() => {
    if (!baseStartISO) return [];
    return detectConflicts(
      allAppts,
      { startISO: baseStartISO, studentId, instructorId, carId },
      { isInCar, courseLengthSec, pudoOption: pudoVal },
      record?.id ?? null,
      refData
    );
  }, [allAppts, baseStartISO, studentId, instructorId, carId, isInCar, courseLengthSec, pudoVal, record?.id, refData]);

  // Index conflicts by field name for fast lookup in render
  const conflictByField = useMemo(() => {
    const map = {};
    for (const c of conflicts) {
      for (const f of c.fields) {
        if (!map[f]) map[f] = c;
      }
    }
    return map;
  }, [conflicts]);

  // Also flag missing Car as a hard error for In Car courses — only after a submit attempt
  const carMissing = submitAttempted && isInCar && !carId;
  const conflictByFieldWithCar = useMemo(() => {
    if (!carMissing) return conflictByField;
    return { ...conflictByField, Cars: { type: "E4", fields: ["Cars"], message: "Car is required for In Car courses." } };
  }, [conflictByField, carMissing]);

  // 9b — Availability warnings (W1/W2) — use cached availability data
  const { data: availRecords = [] } = useAvailability();

  // Expand availability for the selected date
  const availIntervalsForDate = useMemo(() => {
    if (!startDate_) return [];
    try {
      return expandAvailability(availRecords, new Date(startDate_ + "T00:00:00"));
    } catch { return []; }
  }, [availRecords, startDate_]);

  // Compute end ms for warning checks (same as conflicts but extracted)
  const baseEndMs = useMemo(() => {
    if (!baseStartISO) return null;
    const pudoMinutes = pudoVal === "0:30" ? 30 : pudoVal === "1:00" ? 60 : 0;
    return new Date(baseStartISO).getTime() + ((courseLengthSec ?? 0) + pudoMinutes * 2 * 60) * 1000;
  }, [baseStartISO, courseLengthSec, pudoVal]);

  const warnings = useMemo(() => {
    const w = [];
    if (baseStartISO && baseEndMs && isInCar) {
      w.push(...checkAvailabilityWarnings(
        availIntervalsForDate,
        { startISO: baseStartISO, endMs: baseEndMs, instructorId, carId, location: locationVal },
        refData
      ));
    } else if (baseStartISO && baseEndMs && instructorId) {
      // W3 can fire even for non-In Car courses (location mismatch still relevant)
      w.push(...checkAvailabilityWarnings(
        availIntervalsForDate,
        { startISO: baseStartISO, endMs: baseEndMs, instructorId, carId: null, location: locationVal },
        refData
      ));
    }
    // W4 — cross-location travel buffer
    const w4 = checkLocationTravelWarning(
      allAppts,
      { startISO: baseStartISO, endMs: baseEndMs, instructorId, location: locationVal, skipId: record?.id ?? null },
      refData
    );
    if (w4) w.push(w4);
    // W5/W6 — instructor capability mismatch (Spanish/Tier)
    w.push(
      ...checkInstructorCapabilityWarnings(
        { instructorId, spanish: !!spanishVal, tier: tierVal || null },
        refData
      )
    );
    return w;
  }, [availIntervalsForDate, baseStartISO, baseEndMs, instructorId, carId, locationVal, isInCar, allAppts, record?.id, refData, spanishVal, tierVal]);

  const warningByField = useMemo(() => {
    const map = {};
    for (const w of warnings) {
      for (const f of w.fields) {
        if (!map[f]) map[f] = w;
      }
    }
    return map;
  }, [warnings]);

  // Auto-populate Car from instructor's availability window when Car is empty
  useEffect(() => {
    if (!isInCar || !instructorId || !baseStartISO || !baseEndMs || carId) return;
    const vehicleId = getAvailabilityCar(availIntervalsForDate, baseStartISO, baseEndMs, instructorId);
    if (vehicleId) setBaseValue("Cars", vehicleId);
  }, [instructorId, baseStartISO, baseEndMs, availIntervalsForDate, isInCar]);

  // Auto-populate Location from instructor's availability window when Location is empty
  useEffect(() => {
    if (!locOptions.length || !instructorId || !baseStartISO || !baseEndMs || locationVal) return;
    const loc = getAvailabilityLocation(availIntervalsForDate, baseStartISO, baseEndMs, instructorId);
    if (loc) setBaseValue("Location", loc);
  }, [instructorId, baseStartISO, baseEndMs, availIntervalsForDate, locOptions, locationVal]);

  // Bulk draft conflict tracking
  const [draftConflicts, setDraftConflicts] = useState({});  // index → conflict[]
  const [draftWarnings, setDraftWarnings] = useState({});    // index → warning[]
  const baseFormSnapshot = baseForm.watch();

  // Draft override forms (one per extra slot in bulk mode)
  // We use a simple approach: store just the overridden field values per draft index
  // and merge with base values at submit time.

  function setDraftField(idx, field, value) {
    setDraftOverrides((prev) => ({
      ...prev,
      [idx]: { ...(prev[idx] ?? {}), [field]: value },
    }));
  }

  function getRawDraftValues(idx) {
    const base = baseForm.getValues();
    const override = draftOverrides[idx] ?? {};
    // Base generation uses +idx week offset; later display/order is chronological.
    const shifted = {
      ...base,
      startDate: shiftDateByWeeks(base.startDate, idx),
    };
    return { ...shifted, ...override };
  }

  const draftEntries = useMemo(() => {
    if (!bulkMode) return [];
    return Array.from({ length: bulkCount }, (_, idx) => {
      const values = getRawDraftValues(idx);
      const startISO = values.startDate && values.startTime
        ? new Date(values.startDate + "T" + values.startTime).toISOString()
        : null;
      return { idx, values, startISO, startMs: toMs(startISO) };
    });
  }, [bulkMode, bulkCount, draftOverrides, baseFormSnapshot]);

  const orderedDraftEntries = useMemo(() => {
    if (!bulkMode) return [];
    return [...draftEntries].sort((a, b) => {
      if (a.startMs == null && b.startMs == null) return a.idx - b.idx;
      if (a.startMs == null) return 1;
      if (b.startMs == null) return -1;
      if (a.startMs !== b.startMs) return a.startMs - b.startMs;
      return a.idx - b.idx;
    });
  }, [bulkMode, draftEntries]);

  const draftOrderByIdx = useMemo(() => {
    const out = {};
    orderedDraftEntries.forEach((entry, order) => {
      out[entry.idx] = order + 1;
    });
    return out;
  }, [orderedDraftEntries]);

  const draftClassByIdx = useMemo(() => {
    if (!bulkMode || !isNumbered) return {};
    const prior = [];
    for (const a of allAppts) {
      if (!isActiveForClassSeq(a)) continue;
      const f = a.fields;
      const startMs = toMs(f.Start);
      const classNum = normalizeClassNumber(f["Class Number"]);
      if (!f.Student?.[0] || !f.Course?.[0] || startMs == null || !classNum) continue;
      prior.push({
        studentId: f.Student[0],
        courseId: f.Course[0],
        startMs,
        classNum,
      });
    }

    const assigned = {};
    const synthetic = [];
    for (const entry of orderedDraftEntries) {
      const { idx, values, startMs } = entry;
      if (!values.Student || !values.Course || startMs == null) continue;
      const candidates = [...prior, ...synthetic]
        .filter((r) => r.studentId === values.Student && r.courseId === values.Course && r.startMs < startMs)
        .sort((a, b) => b.startMs - a.startMs);
      const classNum = (candidates[0]?.classNum ?? 0) + 1;
      assigned[idx] = classNum;
      synthetic.push({ studentId: values.Student, courseId: values.Course, startMs, classNum });
    }
    return assigned;
  }, [bulkMode, isNumbered, allAppts, orderedDraftEntries]);

  function getMergedDraftValues(idx) {
    const base = getRawDraftValues(idx);
    if (!isNumbered) return base;
    const computedClass = draftClassByIdx[idx];
    return { ...base, classNumber: computedClass ?? base.classNumber };
  }

  const activeDraftValues = useMemo(() => {
    if (!bulkMode) return null;
    return getMergedDraftValues(activeDraft);
  }, [bulkMode, activeDraft, draftOverrides, baseFormSnapshot, draftClassByIdx, isNumbered]);

  const activeDraftStartISO = useMemo(() => {
    if (!activeDraftValues?.startDate || !activeDraftValues?.startTime) return null;
    return new Date(activeDraftValues.startDate + "T" + activeDraftValues.startTime).toISOString();
  }, [activeDraftValues?.startDate, activeDraftValues?.startTime]);

  const activeDraftEndMs = useMemo(() => {
    if (!activeDraftStartISO) return null;
    const pudoMinutes = activeDraftValues.pudo === "0:30" ? 30 : activeDraftValues.pudo === "1:00" ? 60 : 0;
    return new Date(activeDraftStartISO).getTime() + ((courseLengthSec ?? 0) + pudoMinutes * 2 * 60) * 1000;
  }, [activeDraftStartISO, courseLengthSec, activeDraftValues?.pudo]);

  const activeDraftAvailIntervals = useMemo(() => {
    if (!bulkMode || !activeDraftValues?.startDate) return [];
    try {
      return expandAvailability(availRecords, new Date(activeDraftValues.startDate + "T00:00:00"));
    } catch { return []; }
  }, [bulkMode, activeDraftValues?.startDate, availRecords]);

  const activeDraftConflicts = useMemo(() => {
    if (!bulkMode || !activeDraftStartISO) return [];
    return detectConflicts(
      allAppts,
      { startISO: activeDraftStartISO, studentId: activeDraftValues.Student, instructorId: activeDraftValues.Instructor, carId: activeDraftValues.Cars },
      { isInCar, courseLengthSec, pudoOption: activeDraftValues.pudo },
      null,
      refData
    );
  }, [bulkMode, allAppts, activeDraftStartISO, activeDraftValues?.Student, activeDraftValues?.Instructor, activeDraftValues?.Cars, isInCar, courseLengthSec, activeDraftValues?.pudo, refData]);

  const activeDraftWarnings = useMemo(() => {
    if (!bulkMode || !activeDraftValues) return [];
    const w = [];
    if (activeDraftStartISO && activeDraftEndMs && isInCar) {
      w.push(
        ...checkAvailabilityWarnings(
          activeDraftAvailIntervals,
          {
            startISO: activeDraftStartISO,
            endMs: activeDraftEndMs,
            instructorId: activeDraftValues.Instructor,
            carId: activeDraftValues.Cars,
          },
          refData
        )
      );
    }
    w.push(
      ...checkInstructorCapabilityWarnings(
        {
          instructorId: activeDraftValues.Instructor,
          spanish: !!activeDraftValues.Spanish,
          tier: activeDraftValues.Tier || null,
        },
        refData
      )
    );
    return w;
  }, [bulkMode, activeDraftValues, activeDraftAvailIntervals, activeDraftStartISO, activeDraftEndMs, isInCar, refData]);

  // Keep draftConflicts + draftWarnings in sync with live values for the active draft
  useEffect(() => {
    if (!bulkMode) return;
    setDraftConflicts((prev) => {
      if (activeDraftConflicts.length === 0) {
        const next = { ...prev };
        delete next[activeDraft];
        return next;
      }
      return { ...prev, [activeDraft]: activeDraftConflicts };
    });
    setDraftWarnings((prev) => {
      if (activeDraftWarnings.length === 0) {
        const next = { ...prev };
        delete next[activeDraft];
        return next;
      }
      return { ...prev, [activeDraft]: activeDraftWarnings };
    });
  }, [bulkMode, activeDraft, activeDraftConflicts, activeDraftWarnings]);

  // Build field-level maps for the active draft (used by BulkDraftPanel for highlights)
  const activeDraftConflictByField = useMemo(() => {
    const map = {};
    for (const c of activeDraftConflicts) {
      for (const f of c.fields) { if (!map[f]) map[f] = c; }
    }
    return map;
  }, [activeDraftConflicts]);

  const activeDraftWarningByField = useMemo(() => {
    const map = {};
    for (const w of activeDraftWarnings) {
      for (const f of w.fields) { if (!map[f]) map[f] = w; }
    }
    return map;
  }, [activeDraftWarnings]);

  // ── Additional Classes draft machinery ────────────────────────────────────

  // Existing appointments for same student+course (for the read-only context list)
  const acExistingAppts = useMemo(() => {
    if (!isEdit || !studentId || !courseId) return [];
    return allAppts
      .filter((a) => {
        if (!isActiveForClassSeq(a)) return false;
        const f = a.fields;
        return f.Student?.[0] === studentId && f.Course?.[0] === courseId;
      })
      .sort((a, b) => {
        const ta = toMs(a.fields.Start) ?? 0;
        const tb = toMs(b.fields.Start) ?? 0;
        return ta - tb;
      });
  }, [isEdit, studentId, courseId, allAppts]);

  // Base date for AC drafts = current record's date (or today)
  const acBaseDate = useMemo(() => {
    if (!record) return todayStr();
    return toDateInput(record.fields.Start) || todayStr();
  }, [record]);

  function getAcRawDraftValues(idx) {
    const base = baseForm.getValues();
    const override = acDraftOverrides[idx] ?? {};
    const shifted = {
      ...base,
      startDate: shiftDateByWeeks(acBaseDate, idx + 1),
    };
    return { ...shifted, ...override };
  }

  const acDraftEntries = useMemo(() => {
    if (!additionalClassesMode) return [];
    return Array.from({ length: acCount }, (_, idx) => {
      const values = getAcRawDraftValues(idx);
      const startISO = values.startDate && values.startTime
        ? new Date(values.startDate + "T" + values.startTime).toISOString()
        : null;
      return { idx, values, startISO, startMs: toMs(startISO) };
    });
  }, [additionalClassesMode, acCount, acDraftOverrides, baseFormSnapshot, acBaseDate]);

  const acOrderedDrafts = useMemo(() => {
    if (!additionalClassesMode) return [];
    return [...acDraftEntries].sort((a, b) => {
      if (a.startMs == null && b.startMs == null) return a.idx - b.idx;
      if (a.startMs == null) return 1;
      if (b.startMs == null) return -1;
      if (a.startMs !== b.startMs) return a.startMs - b.startMs;
      return a.idx - b.idx;
    });
  }, [additionalClassesMode, acDraftEntries]);

  const acDraftOrderByIdx = useMemo(() => {
    const out = {};
    acOrderedDrafts.forEach((entry, order) => { out[entry.idx] = order + 1; });
    return out;
  }, [acOrderedDrafts]);

  const acDraftClassByIdx = useMemo(() => {
    if (!additionalClassesMode || !isNumbered) return {};
    const prior = [];
    for (const a of allAppts) {
      if (!isActiveForClassSeq(a)) continue;
      const f = a.fields;
      const startMs = toMs(f.Start);
      const classNum = normalizeClassNumber(f["Class Number"]);
      if (!f.Student?.[0] || !f.Course?.[0] || startMs == null || !classNum) continue;
      prior.push({ studentId: f.Student[0], courseId: f.Course[0], startMs, classNum });
    }
    const assigned = {};
    const synthetic = [];
    for (const entry of acOrderedDrafts) {
      const { idx, values, startMs } = entry;
      if (!values.Student || !values.Course || startMs == null) continue;
      const candidates = [...prior, ...synthetic]
        .filter((r) => r.studentId === values.Student && r.courseId === values.Course && r.startMs < startMs)
        .sort((a, b) => b.startMs - a.startMs);
      const classNum = (candidates[0]?.classNum ?? 0) + 1;
      assigned[idx] = classNum;
      synthetic.push({ studentId: values.Student, courseId: values.Course, startMs, classNum });
    }
    return assigned;
  }, [additionalClassesMode, isNumbered, allAppts, acOrderedDrafts]);

  function getAcMergedDraftValues(idx) {
    const base = getAcRawDraftValues(idx);
    if (!isNumbered) return base;
    const computedClass = acDraftClassByIdx[idx];
    return { ...base, classNumber: computedClass ?? base.classNumber };
  }

  const acActiveDraftValues = useMemo(() => {
    if (!additionalClassesMode) return null;
    return getAcMergedDraftValues(acActiveDraft);
  }, [additionalClassesMode, acActiveDraft, acDraftOverrides, baseFormSnapshot, acDraftClassByIdx, isNumbered]);

  const acActiveDraftStartISO = useMemo(() => {
    if (!acActiveDraftValues?.startDate || !acActiveDraftValues?.startTime) return null;
    return new Date(acActiveDraftValues.startDate + "T" + acActiveDraftValues.startTime).toISOString();
  }, [acActiveDraftValues?.startDate, acActiveDraftValues?.startTime]);

  const acActiveDraftEndMs = useMemo(() => {
    if (!acActiveDraftStartISO) return null;
    const pudoMinutes = acActiveDraftValues.pudo === "0:30" ? 30 : acActiveDraftValues.pudo === "1:00" ? 60 : 0;
    return new Date(acActiveDraftStartISO).getTime() + ((courseLengthSec ?? 0) + pudoMinutes * 2 * 60) * 1000;
  }, [acActiveDraftStartISO, courseLengthSec, acActiveDraftValues?.pudo]);

  const acActiveDraftAvailIntervals = useMemo(() => {
    if (!additionalClassesMode || !acActiveDraftValues?.startDate) return [];
    try { return expandAvailability(availRecords, new Date(acActiveDraftValues.startDate + "T00:00:00")); }
    catch { return []; }
  }, [additionalClassesMode, acActiveDraftValues?.startDate, availRecords]);

  const acActiveDraftConflicts = useMemo(() => {
    if (!additionalClassesMode || !acActiveDraftStartISO) return [];
    return detectConflicts(
      allAppts,
      { startISO: acActiveDraftStartISO, studentId: acActiveDraftValues.Student, instructorId: acActiveDraftValues.Instructor, carId: acActiveDraftValues.Cars },
      { isInCar, courseLengthSec, pudoOption: acActiveDraftValues.pudo },
      null,
      refData
    );
  }, [additionalClassesMode, allAppts, acActiveDraftStartISO, acActiveDraftValues?.Student, acActiveDraftValues?.Instructor, acActiveDraftValues?.Cars, isInCar, courseLengthSec, acActiveDraftValues?.pudo, refData]);

  const acActiveDraftWarnings = useMemo(() => {
    if (!additionalClassesMode || !acActiveDraftValues) return [];
    const w = [];
    if (acActiveDraftStartISO && acActiveDraftEndMs && isInCar) {
      w.push(...checkAvailabilityWarnings(
        acActiveDraftAvailIntervals,
        { startISO: acActiveDraftStartISO, endMs: acActiveDraftEndMs, instructorId: acActiveDraftValues.Instructor, carId: acActiveDraftValues.Cars },
        refData
      ));
    }
    w.push(...checkInstructorCapabilityWarnings(
      { instructorId: acActiveDraftValues.Instructor, spanish: !!acActiveDraftValues.Spanish, tier: acActiveDraftValues.Tier || null },
      refData
    ));
    return w;
  }, [additionalClassesMode, acActiveDraftValues, acActiveDraftAvailIntervals, acActiveDraftStartISO, acActiveDraftEndMs, isInCar, refData]);

  useEffect(() => {
    if (!additionalClassesMode) return;
    setAcDraftConflicts((prev) => {
      if (acActiveDraftConflicts.length === 0) { const next = { ...prev }; delete next[acActiveDraft]; return next; }
      return { ...prev, [acActiveDraft]: acActiveDraftConflicts };
    });
    setAcDraftWarnings((prev) => {
      if (acActiveDraftWarnings.length === 0) { const next = { ...prev }; delete next[acActiveDraft]; return next; }
      return { ...prev, [acActiveDraft]: acActiveDraftWarnings };
    });
  }, [additionalClassesMode, acActiveDraft, acActiveDraftConflicts, acActiveDraftWarnings]);

  const acActiveDraftConflictByField = useMemo(() => {
    const map = {};
    for (const c of acActiveDraftConflicts) { for (const f of c.fields) { if (!map[f]) map[f] = c; } }
    return map;
  }, [acActiveDraftConflicts]);

  const acActiveDraftWarningByField = useMemo(() => {
    const map = {};
    for (const w of acActiveDraftWarnings) { for (const f of w.fields) { if (!map[f]) map[f] = w; } }
    return map;
  }, [acActiveDraftWarnings]);

  // ── Additional Classes submit ──────────────────────────────────────────────
  async function onAdditionalClassesSubmit() {
    // Re-check all drafts before submitting
    const allResults = acOrderedDrafts.map((entry) => {
      const i = entry.idx;
      const vals = getAcMergedDraftValues(i);
      const draftStartISO = vals.startDate && vals.startTime
        ? new Date(vals.startDate + "T" + vals.startTime).toISOString()
        : null;
      const draftEndMs = draftStartISO
        ? (() => {
            const pudoMinutes = vals.pudo === "0:30" ? 30 : vals.pudo === "1:00" ? 60 : 0;
            return new Date(draftStartISO).getTime() + ((courseLengthSec ?? 0) + pudoMinutes * 2 * 60) * 1000;
          })()
        : null;
      const conflicts = detectConflicts(
        allAppts,
        { startISO: draftStartISO, studentId: vals.Student, instructorId: vals.Instructor, carId: vals.Cars },
        { isInCar, courseLengthSec, pudoOption: vals.pudo },
        null,
        refData
      );
      const availForDate = draftStartISO && isInCar
        ? (() => { try { return expandAvailability(availRecords, new Date(vals.startDate + "T00:00:00")); } catch { return []; } })()
        : [];
      const warnings = draftStartISO && draftEndMs && isInCar
        ? checkAvailabilityWarnings(availForDate, { startISO: draftStartISO, endMs: draftEndMs, instructorId: vals.Instructor, carId: vals.Cars }, refData)
        : [];
      warnings.push(...checkInstructorCapabilityWarnings(
        { instructorId: vals.Instructor, spanish: !!vals.Spanish, tier: vals.Tier || null }, refData
      ));
      return { idx: i, conflicts, warnings };
    });

    const newConflicts = {};
    const newWarnings = {};
    allResults.forEach(({ idx, conflicts, warnings }) => {
      if (conflicts.length) newConflicts[idx] = conflicts;
      if (warnings.length)  newWarnings[idx]  = warnings;
    });
    setAcDraftConflicts(newConflicts);
    setAcDraftWarnings(newWarnings);

    const conflictedDrafts = Object.keys(newConflicts).map(Number);
    if (conflictedDrafts.length > 0) {
      toast.error("Draft" + (conflictedDrafts.length > 1 ? "s" : "") + " " +
        conflictedDrafts.map((i) => acDraftOrderByIdx[i] ?? (i + 1)).join(", ") + " have conflicts — review before submitting");
      return;
    }

    setAcSubmitting(true);
    try {
      const drafts = acOrderedDrafts.map((entry) => getAcMergedDraftValues(entry.idx));
      const results = await Promise.allSettled(
        drafts.map((data) => create.mutateAsync(buildFields(data, courseFlags)))
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed === 0) {
        toast.success("Created " + acCount + " additional appointment" + (acCount !== 1 ? "s" : ""));
        setAdditionalClassesMode(false);
        setAcDraftOverrides({});
        setAcActiveDraft(0);
      } else {
        toast.error(failed + " of " + acCount + " appointments failed — check and retry");
      }
    } finally {
      setAcSubmitting(false);
    }
  }

  // ── Single submit ─────────────────────────────────────────────────────────
  async function onSingleSubmit(data) {
    setSubmitAttempted(true);
    // Final gate: block if any hard errors remain
    if (conflicts.length > 0 || (isInCar && !data.Cars)) {
      toast.error("Resolve scheduling conflicts before saving");
      return;
    }
    const fields = buildFields(data, courseFlags);
    let postSaveReindexUpdates = [];

    const shouldReindexEdit =
      isEdit &&
      (isNumbered || normalizeClassNumber(record?.fields?.["Class Number"])) &&
      data.Student &&
      data.Course &&
      data.startDate &&
      data.startTime;

    if (shouldReindexEdit) {
      const newStartISO = combineDateTime(data.startDate, data.startTime);
      const oldStudentId = record?.fields?.Student?.[0] ?? null;
      const oldCourseId = record?.fields?.Course?.[0] ?? null;
      const oldStartISO = record?.fields?.Start ?? newStartISO;
      const newStudentId = data.Student;
      const newCourseId = data.Course;

      const keyFor = (student, course) => (student && course ? `${student}|${course}` : null);
      const oldKey = keyFor(oldStudentId, oldCourseId);
      const newKey = keyFor(newStudentId, newCourseId);
      const sequenceKeys = [...new Set([oldKey, newKey].filter(Boolean))];
      const pivotByKey = {};
      if (oldKey) pivotByKey[oldKey] = oldStartISO;
      if (newKey) pivotByKey[newKey] = newStartISO;

      const overrideById = {
        [record.id]: {
          Student: newStudentId ? [newStudentId] : [],
          Course: newCourseId ? [newCourseId] : [],
          Start: newStartISO,
          Canceled: !!data.Canceled,
          "No Show": !!data["No Show"],
          "Class Number": normalizeClassNumber(data.classNumber),
        },
      };

      const reindexUpdates = buildChronologicalReindexPlan(
        allAppts,
        sequenceKeys,
        pivotByKey,
        overrideById
      );

      if (reindexUpdates.length > 0) {
        const confirmed = window.confirm(previewReindexMessage(reindexUpdates));
        if (!confirmed) return;

        const selfUpdate = reindexUpdates.find((u) => u.recordId === record.id);
        if (selfUpdate) fields["Class Number"] = selfUpdate.newClass;
        postSaveReindexUpdates = reindexUpdates.filter((u) => u.recordId !== record.id);
      }
    }

    try {
      if (isEdit) {
        await update.mutateAsync({ recordId: record.id, fields });
        if (postSaveReindexUpdates.length > 0) {
          await Promise.all(
            postSaveReindexUpdates.map((u) =>
              update.mutateAsync({ recordId: u.recordId, fields: { "Class Number": u.newClass } })
            )
          );
          toast.success("Appointment updated and class numbers reindexed");
        } else {
          toast.success("Appointment updated");
        }
      } else {
        await create.mutateAsync(fields);
        toast.success("Appointment created");
      }
      onClose();
    } catch (err) {
      toast.error("Failed to save: " + err.message);
    }
  }

  // ── Bulk submit ───────────────────────────────────────────────────────────
  async function onBulkSubmit() {
    setSubmitAttempted(true);
    // Check all drafts for conflicts + warnings before submitting
    const allDraftResults = orderedDraftEntries.map((entry) => {
      const i = entry.idx;
      const vals = getMergedDraftValues(i);
      const draftStartISO = vals.startDate && vals.startTime
        ? new Date(vals.startDate + "T" + vals.startTime).toISOString()
        : null;
      const draftEndMs = draftStartISO
        ? (() => {
            const pudoMinutes = vals.pudo === "0:30" ? 30 : vals.pudo === "1:00" ? 60 : 0;
            return new Date(draftStartISO).getTime() + ((courseLengthSec ?? 0) + pudoMinutes * 2 * 60) * 1000;
          })()
        : null;
      const conflicts = detectConflicts(
        allAppts,
        { startISO: draftStartISO, studentId: vals.Student, instructorId: vals.Instructor, carId: vals.Cars },
        { isInCar, courseLengthSec, pudoOption: vals.pudo },
        null,
        refData
      );
      const availForDate = draftStartISO && isInCar
        ? (() => { try { return expandAvailability(availRecords, new Date(vals.startDate + "T00:00:00")); } catch { return []; } })()
        : [];
      const warnings = draftStartISO && draftEndMs && isInCar
        ? checkAvailabilityWarnings(availForDate, { startISO: draftStartISO, endMs: draftEndMs, instructorId: vals.Instructor, carId: vals.Cars }, refData)
        : [];
      warnings.push(
        ...checkInstructorCapabilityWarnings(
          { instructorId: vals.Instructor, spanish: !!vals.Spanish, tier: vals.Tier || null },
          refData
        )
      );
      return { idx: i, conflicts, warnings };
    });

    const newDraftConflicts = {};
    const newDraftWarnings = {};
    allDraftResults.forEach(({ idx, conflicts, warnings }) => {
      if (conflicts.length) newDraftConflicts[idx] = conflicts;
      if (warnings.length)  newDraftWarnings[idx]  = warnings;
    });
    setDraftConflicts(newDraftConflicts);
    setDraftWarnings(newDraftWarnings);

    const conflictedDrafts = Object.keys(newDraftConflicts).map(Number);
    if (conflictedDrafts.length > 0) {
      toast.error("Draft" + (conflictedDrafts.length > 1 ? "s" : "") + " " +
        conflictedDrafts.map((i) => draftOrderByIdx[i] ?? (i + 1)).join(", ") + " have conflicts — review before submitting");
      return;
    }
    setSubmitting(true);
    try {
      const drafts = orderedDraftEntries.map((entry) => getMergedDraftValues(entry.idx));
      const results = await Promise.allSettled(
        drafts.map((data) => create.mutateAsync(buildFields(data, courseFlags)))
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed === 0) {
        toast.success("All " + bulkCount + " appointments created");
        onClose();
      } else {
        toast.error(failed + " of " + bulkCount + " appointments failed — check form and retry");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const isBusy = submitting || create.isPending || update.isPending;
  const hasConflicts = conflicts.length > 0 || carMissing;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Bulk count input (shown when bulk mode is active) ── */}
      {!isEdit && bulkMode && (
        <div className="flex items-center gap-2 pb-1 border-b">
          <span className="text-xs text-muted-foreground">Count:</span>
          <Input
            type="number"
            min={2}
            max={20}
            value={bulkCount}
            onChange={(e) => {
              const n = Math.max(2, Math.min(20, Number(e.target.value)));
              setBulkCount(n);
              if (activeDraft >= n) setActiveDraft(n - 1);
            }}
            className="w-16 h-7 text-xs"
          />
          <span className="text-xs text-muted-foreground">appointments, +1 week each</span>
          <button
            type="button"
            onClick={() => { setBulkMode(false); setActiveDraft(0); }}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground underline"
          >
            Cancel bulk
          </button>
        </div>
      )}

      {/* ── Bulk draft tabs ── */}
      {bulkMode && !isEdit && (
        <div className="flex gap-1 flex-wrap">
          {orderedDraftEntries.map((entry, orderIdx) => {
            const i = entry.idx;
            const vals = getMergedDraftValues(i);
            const hasOverride = !!draftOverrides[i] && Object.keys(draftOverrides[i]).length > 0;
            const hasDraftConflict = !!(draftConflicts[i]?.length);
            const hasDraftWarning  = !hasDraftConflict && !!(draftWarnings[i]?.length);
            return (
              <button
                key={i}
                type="button"
                onClick={() => setActiveDraft(i)}
                className={
                  "px-2.5 py-0.5 rounded text-xs font-medium border transition-colors " +
                  (activeDraft === i
                    ? "bg-primary text-primary-foreground border-primary"
                    : hasDraftConflict
                    ? "bg-destructive/10 border-destructive text-destructive hover:bg-destructive/20"
                    : hasDraftWarning
                    ? "bg-amber-50 border-amber-400 text-amber-800 hover:bg-amber-100"
                    : hasOverride
                    ? "bg-blue-50 border-blue-300 text-blue-800 hover:bg-blue-100"
                    : "bg-background border-border text-muted-foreground hover:bg-muted")
                }
              >
                {orderIdx + 1}
                {hasDraftConflict && <span className="ml-0.5">!</span>}
                {hasDraftWarning  && <span className="ml-0.5">~</span>}
                {vals.startDate && <span className="ml-1 opacity-70">{vals.startDate.slice(5)}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Form fields ── */}
      {!bulkMode ? (
        // Single mode — base form directly
        <form onSubmit={handleBaseSubmit(onSingleSubmit)} className="space-y-4">
          {conflicts.length > 0 && (
            <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 space-y-1">
              {conflicts.map((c) => (
                <p key={c.type} className="text-xs text-destructive font-medium">{c.message}</p>
              ))}
            </div>
          )}
          {warnings.length > 0 && (
            <div className="rounded-md bg-amber-50 border border-amber-300 px-3 py-2 space-y-1">
              {warnings.map((w) =>
                w.message.split("\n").map((line, i) => (
                  <p key={w.type + i} className="text-xs text-amber-700 font-medium">{line}</p>
                ))
              )}
            </div>
          )}
          <AppointmentFields form={baseForm} refData={refData} courseFlags={courseFlags} courseLengthSec={courseLengthSec} conflictByField={conflictByFieldWithCar} warningByField={warningByField} isEdit={isEdit} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isBusy}>Cancel</Button>
            {!isEdit && (
              <Button type="button" variant="outline" onClick={() => setBulkMode(true)} disabled={isBusy}>
                Bulk Schedule
              </Button>
            )}
            {isEdit && (
              <Button
                type="button"
                variant="outline"
                onClick={() => { setAdditionalClassesMode((v) => !v); setAcActiveDraft(0); setAcDraftOverrides({}); }}
                disabled={isBusy}
              >
                {additionalClassesMode ? "Hide Additional Classes" : "Additional Classes"}
              </Button>
            )}
            <Button type="submit" disabled={isBusy || hasConflicts}>
              {isBusy ? "Saving..." : isEdit ? "Save Changes" : "Create Appointment"}
            </Button>
          </div>
        </form>
      ) : (
        // Bulk mode — show active draft as a controlled mini-form
        <div className="space-y-3">
          {activeDraftConflicts.length > 0 && (
            <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 space-y-1">
              {activeDraftConflicts.map((c) => (
                <p key={c.type} className="text-xs text-destructive font-medium">{c.message}</p>
              ))}
            </div>
          )}
          {activeDraftWarnings.length > 0 && (
            <div className="rounded-md bg-amber-50 border border-amber-300 px-3 py-2 space-y-1">
              {activeDraftWarnings.map((w) =>
                w.message.split("\n").map((line, i) => (
                  <p key={w.type + i} className="text-xs text-amber-700 font-medium">{line}</p>
                ))
              )}
            </div>
          )}
          <BulkDraftPanel
            key={activeDraft}
            draftIndex={activeDraft}
            draftOrder={draftOrderByIdx[activeDraft] ?? (activeDraft + 1)}
            values={getMergedDraftValues(activeDraft)}
            overrides={draftOverrides[activeDraft] ?? {}}
            refData={refData}
            courseFlags={courseFlags}
            courseLengthSec={courseLengthSec}
            conflictByField={activeDraftConflictByField}
            warningByField={activeDraftWarningByField}
            onFieldChange={(field, value) => {
              if (activeDraft === 0) {
                setBaseValue(field, value);
              } else {
                setDraftField(activeDraft, field, value);
              }
            }}
          />
        </div>
      )}

      {/* ── Bulk submit ── */}
      {bulkMode && !isEdit && (
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={isBusy}>Cancel</Button>
          <Button type="button" onClick={onBulkSubmit} disabled={isBusy}>
            {isBusy ? "Creating..." : "Create All " + bulkCount + " Appointments"}
          </Button>
        </div>
      )}

      {/* ── Additional Classes panel ── */}
      {isEdit && additionalClassesMode && (
        <AdditionalClassesPanel
          existingAppts={acExistingAppts}
          currentRecordId={record?.id}
          acCount={acCount}
          setAcCount={(n) => { setAcCount(n); if (acActiveDraft >= n) setAcActiveDraft(n - 1); }}
          acActiveDraft={acActiveDraft}
          setAcActiveDraft={setAcActiveDraft}
          acOrderedDrafts={acOrderedDrafts}
          acDraftOrderByIdx={acDraftOrderByIdx}
          acDraftConflicts={acDraftConflicts}
          acDraftWarnings={acDraftWarnings}
          acActiveDraftConflicts={acActiveDraftConflicts}
          acActiveDraftWarnings={acActiveDraftWarnings}
          acActiveDraftConflictByField={acActiveDraftConflictByField}
          acActiveDraftWarningByField={acActiveDraftWarningByField}
          getAcMergedDraftValues={getAcMergedDraftValues}
          refData={refData}
          courseFlags={courseFlags}
          courseLengthSec={courseLengthSec}
          onFieldChange={(field, value) => {
            setAcDraftOverrides((prev) => ({
              ...prev,
              [acActiveDraft]: { ...(prev[acActiveDraft] ?? {}), [field]: value },
            }));
          }}
          onSubmit={onAdditionalClassesSubmit}
          isSubmitting={acSubmitting}
        />
      )}
    </div>
  );
}

// ─── BulkDraftPanel ───────────────────────────────────────────────────────────
// Renders a draft's fields as controlled inputs (no react-hook-form for simplicity).

function BulkDraftPanel({ draftIndex, draftOrder, values, refData, courseFlags, courseLengthSec, conflictByField = {}, warningByField = {}, onFieldChange }) {
  const { isInCar, isClassroom, tierOptions, locOptions, spanishOffered, pudoOffered } = courseFlags;
  const v = values;

  const startISO = useMemo(() => combineDateTime(v.startDate, v.startTime), [v.startDate, v.startTime]);
  const computedEndDisplay = useMemo(() => computeEndTime(startISO, courseLengthSec, v.pudo), [startISO, courseLengthSec, v.pudo]);

  function field(name) { return { value: v[name] ?? "", onChange: (e) => onFieldChange(name, e.target.value) }; }
  function linked(name) { return { value: v[name] ?? "", onChange: (val) => onFieldChange(name, val) }; }
  function checked(name) { return { checked: !!(v[name]), onChange: (e) => onFieldChange(name, e.target.checked) }; }

  function conflictClass(fieldName) {
    if (conflictByField[fieldName]) return " ring-2 ring-destructive ring-offset-0";
    if (warningByField[fieldName])  return " ring-2 ring-amber-400 ring-offset-0";
    return "";
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Draft {draftOrder} (source {draftIndex + 1}).
        Drafts are auto-ordered chronologically as dates/times change.
      </p>
      <div className="grid grid-cols-2 gap-4">

        <div className="space-y-1">
          <Label>Student</Label>
          <div className={"rounded-md" + conflictClass("Student")}>
            <LinkedSelect {...linked("Student")} options={refData.studentOptions} placeholder="Select student..." />
          </div>
        </div>

        <div className="space-y-1">
          <Label>Course</Label>
          <LinkedSelect {...linked("Course")} options={refData.courseOptions} placeholder="Select course..." />
        </div>

        <div className="space-y-1">
          <Label>Instructor</Label>
          <div className={"rounded-md" + conflictClass("Instructor")}>
            <LinkedSelect {...linked("Instructor")} options={refData.instructorOptions} placeholder="Select instructor..." />
          </div>
          {warningByField["Instructor"] && (
            <p className="text-xs text-amber-600">{warningByField["Instructor"].message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label>Date</Label>
          <Input type="date" className={"w-full" + conflictClass("startDate")} {...field("startDate")} />
        </div>

        <div className="space-y-1">
          <Label>Start Time</Label>
          <Input type="time" className={"w-full" + conflictClass("startTime")} {...field("startTime")} />
        </div>

        <div className="space-y-1">
          <Label>End Time</Label>
          <div className="w-full border rounded-md px-3 py-2 text-sm bg-muted text-muted-foreground min-h-[38px] flex items-center">
            {computedEndDisplay ?? <span className="opacity-50">-</span>}
          </div>
        </div>

        {isInCar && (
          <div className="space-y-1">
            <Label>Car</Label>
            <div className={"rounded-md" + conflictClass("Cars")}>
              <LinkedSelect {...linked("Cars")} options={refData.vehicleOptions} placeholder="Select car..." />
            </div>
          </div>
        )}

        {isClassroom && (
          <div className="space-y-1">
            <Label>Classroom</Label>
            <select {...field("Classroom")} className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Select...</option>
              {CLASSROOMS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}

        {tierOptions.length > 0 && (
          <div className="space-y-1">
            <Label>Higher Tier</Label>
            <select {...field("Tier")} className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">None</option>
              {tierOptions.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}

        {locOptions.length > 0 && (
          <div className="space-y-1">
            <Label>Location</Label>
            <select {...field("Location")} className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Select...</option>
              {locOptions.map((l) => <option key={l} value={l}>{LOCATION_LABELS[l] ?? l}</option>)}
            </select>
          </div>
        )}

        {pudoOffered && (
          <div className="space-y-1">
            <Label>PUDO</Label>
            <select {...field("pudo")} className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">None</option>
              {PUDO_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        )}

        {spanishOffered && (
          <div className="flex items-center gap-2 pt-6">
            <input id={"spanish-" + draftIndex} type="checkbox" className="w-4 h-4 accent-primary" {...checked("Spanish")} />
            <Label htmlFor={"spanish-" + draftIndex}>Spanish session</Label>
          </div>
        )}

        <div className="space-y-1">
          <Label>Class #</Label>
          <Input type="number" min={1} placeholder="Auto" {...field("classNumber")} />
        </div>

        <div className="col-span-2 space-y-1">
          <Label>Notes</Label>
          <Input placeholder="Optional notes..." {...field("Notes")} />
        </div>

      </div>
    </div>
  );
}

// ─── AdditionalClassesPanel ───────────────────────────────────────────────────
// Shown below the edit form when "Additional Classes" is active.
// Displays existing appointments for the student+course as read-only context,
// then lets the user add and configure new draft appointments.

function AdditionalClassesPanel({
  existingAppts,
  currentRecordId,
  acCount,
  setAcCount,
  acActiveDraft,
  setAcActiveDraft,
  acOrderedDrafts,
  acDraftOrderByIdx,
  acDraftConflicts,
  acDraftWarnings,
  acActiveDraftConflicts,
  acActiveDraftWarnings,
  acActiveDraftConflictByField,
  acActiveDraftWarningByField,
  getAcMergedDraftValues,
  refData,
  courseFlags,
  courseLengthSec,
  onFieldChange,
  onSubmit,
  isSubmitting,
}) {
  return (
    <div className="mt-4 border-t pt-4 space-y-4">
      <p className="text-sm font-semibold">Additional Classes</p>

      {/* Existing appointments list */}
      {existingAppts.length > 0 ? (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Existing appointments</p>
          <div className="rounded-md border divide-y text-xs">
            {existingAppts.map((a) => {
              const f = a.fields;
              const isCurrent = a.id === currentRecordId;
              const dateStr = f.Start ? format(parseISO(f.Start), "MMM d, yyyy h:mm a") : "—";
              const instructor = fullName(refData.instructorMap[f.Instructor?.[0]]);
              const classNum = f["Class Number"] ? `#${f["Class Number"]}` : "";
              return (
                <div
                  key={a.id}
                  className={"flex items-center gap-2 px-3 py-1.5 " + (isCurrent ? "bg-muted/60" : "")}
                >
                  {classNum && <span className="font-medium text-muted-foreground w-6 shrink-0">{classNum}</span>}
                  <span className="flex-1 truncate">{dateStr}</span>
                  <span className="text-muted-foreground truncate">{instructor}</span>
                  {isCurrent && <span className="text-xs text-primary font-medium ml-1">← this</span>}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">No existing appointments for this student + course.</p>
      )}

      {/* New drafts */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Add:</span>
          <Input
            type="number"
            min={1}
            max={20}
            value={acCount}
            onChange={(e) => setAcCount(Math.max(1, Math.min(20, Number(e.target.value))))}
            className="w-16 h-7 text-xs"
          />
          <span className="text-xs text-muted-foreground">new appointments, +1 week each</span>
        </div>

        {/* Draft tabs */}
        <div className="flex gap-1 flex-wrap">
          {acOrderedDrafts.map((entry, orderIdx) => {
            const i = entry.idx;
            const vals = getAcMergedDraftValues(i);
            const hasDraftConflict = !!(acDraftConflicts[i]?.length);
            const hasDraftWarning  = !hasDraftConflict && !!(acDraftWarnings[i]?.length);
            const hasOverride = true; // all AC drafts are new
            return (
              <button
                key={i}
                type="button"
                onClick={() => setAcActiveDraft(i)}
                className={
                  "px-2.5 py-0.5 rounded text-xs font-medium border transition-colors " +
                  (acActiveDraft === i
                    ? "bg-primary text-primary-foreground border-primary"
                    : hasDraftConflict
                    ? "bg-destructive/10 border-destructive text-destructive hover:bg-destructive/20"
                    : hasDraftWarning
                    ? "bg-amber-50 border-amber-400 text-amber-800 hover:bg-amber-100"
                    : "bg-background border-border text-muted-foreground hover:bg-muted")
                }
              >
                {orderIdx + 1}
                {hasDraftConflict && <span className="ml-0.5">!</span>}
                {hasDraftWarning  && <span className="ml-0.5">~</span>}
                {vals.startDate && <span className="ml-1 opacity-70">{vals.startDate.slice(5)}</span>}
              </button>
            );
          })}
        </div>

        {/* Active draft conflict/warning banners */}
        {acActiveDraftConflicts.length > 0 && (
          <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 space-y-1">
            {acActiveDraftConflicts.map((c) => (
              <p key={c.type} className="text-xs text-destructive font-medium">{c.message}</p>
            ))}
          </div>
        )}
        {acActiveDraftWarnings.length > 0 && (
          <div className="rounded-md bg-amber-50 border border-amber-300 px-3 py-2 space-y-1">
            {acActiveDraftWarnings.map((w) =>
              w.message.split("\n").map((line, i) => (
                <p key={w.type + i} className="text-xs text-amber-700 font-medium">{line}</p>
              ))
            )}
          </div>
        )}

        {/* Active draft fields */}
        <BulkDraftPanel
          key={acActiveDraft}
          draftIndex={acActiveDraft}
          draftOrder={acDraftOrderByIdx[acActiveDraft] ?? (acActiveDraft + 1)}
          values={getAcMergedDraftValues(acActiveDraft)}
          overrides={{}}
          refData={refData}
          courseFlags={courseFlags}
          courseLengthSec={courseLengthSec}
          conflictByField={acActiveDraftConflictByField}
          warningByField={acActiveDraftWarningByField}
          onFieldChange={onFieldChange}
        />
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button type="button" onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create " + acCount + " Additional Appointment" + (acCount !== 1 ? "s" : "")}
        </Button>
      </div>
    </div>
  );
}
