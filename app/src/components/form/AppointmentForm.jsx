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
import { detectConflicts, checkAvailabilityWarnings, getAvailabilityCar } from "@/utils/conflicts";
import { expandAvailability } from "@/utils/availability";

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

function defaultValues(record, prefill) {
  if (!record) {
    return {
      pudo: "", classNumber: "", Notes: "",
      Classroom: "", Tier: "", Location: "", Spanish: false,
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
  Object.keys(fields).forEach((k) => { if (fields[k] === undefined) delete fields[k]; });
  return fields;
}

// ─── Shared form fields panel ─────────────────────────────────────────────────
// Renders all the form controls. Used for both single and bulk draft panels.

function AppointmentFields({ form, refData, courseFlags, courseLengthSec, conflictByField = {}, warningByField = {} }) {
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

  useEffect(() => {
    if (!studentId || !courseId || isEdit) return;
    const matching = allAppts.filter(
      (a) => a.fields.Student?.[0] === studentId && a.fields.Course?.[0] === courseId
    );
    const maxClass = matching.reduce((max, a) => {
      const n = a.fields["Class Number"];
      return n > max ? n : max;
    }, 0);
    setBaseValue("classNumber", maxClass + 1);
  }, [studentId, courseId, allAppts, isEdit]);

  // 9 — Conflict detection (eager, runs off watched values)
  const instructorId = watchBase("Instructor");
  const carId        = watchBase("Cars");
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
    if (!baseStartISO || !baseEndMs || !isInCar) return [];
    return checkAvailabilityWarnings(
      availIntervalsForDate,
      { startISO: baseStartISO, endMs: baseEndMs, instructorId, carId },
      refData
    );
  }, [availIntervalsForDate, baseStartISO, baseEndMs, instructorId, carId, isInCar, refData]);

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

  // Bulk draft conflict tracking
  const [draftConflicts, setDraftConflicts] = useState({});  // index → conflict[]

  // Draft override forms (one per extra slot in bulk mode)
  // We use a simple approach: store just the overridden field values per draft index
  // and merge with base values at submit time.

  function getDraftForm(idx) {
    // Draft 0 = base form. Others use draftOverrides[idx] merged over base.
    return draftOverrides[idx] ?? {};
  }

  function setDraftField(idx, field, value) {
    setDraftOverrides((prev) => ({
      ...prev,
      [idx]: { ...(prev[idx] ?? {}), [field]: value },
    }));
  }

  function getMergedDraftValues(idx) {
    const base = baseForm.getValues();
    const override = draftOverrides[idx] ?? {};
    // Shift date by idx weeks for drafts beyond base
    const shifted = {
      ...base,
      startDate: shiftDateByWeeks(base.startDate, idx),
      classNumber: base.classNumber ? Number(base.classNumber) + idx : idx + 1,
    };
    return { ...shifted, ...override };
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
    try {
      if (isEdit) {
        await update.mutateAsync({ recordId: record.id, fields });
        toast.success("Appointment updated");
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
    // Check all drafts for conflicts before submitting
    const draftCheckResults = Array.from({ length: bulkCount }, (_, i) => {
      const vals = getMergedDraftValues(i);
      const draftStartISO = vals.startDate && vals.startTime
        ? new Date(vals.startDate + "T" + vals.startTime).toISOString()
        : null;
      return detectConflicts(
        allAppts,
        { startISO: draftStartISO, studentId: vals.Student, instructorId: vals.Instructor, carId: vals.Cars },
        { isInCar, courseLengthSec, pudoOption: vals.pudo },
        null,
        refData
      );
    });

    const conflictedDrafts = draftCheckResults
      .map((c, i) => ({ i, c }))
      .filter(({ c }) => c.length > 0);

    if (conflictedDrafts.length > 0) {
      const newDraftConflicts = {};
      conflictedDrafts.forEach(({ i, c }) => { newDraftConflicts[i] = c; });
      setDraftConflicts(newDraftConflicts);
      toast.error("Draft" + (conflictedDrafts.length > 1 ? "s" : "") + " " +
        conflictedDrafts.map(({ i }) => i + 1).join(", ") + " have conflicts — review before submitting");
      return;
    }

    setDraftConflicts({});
    setSubmitting(true);
    try {
      const drafts = Array.from({ length: bulkCount }, (_, i) => getMergedDraftValues(i));
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
          {Array.from({ length: bulkCount }, (_, i) => {
            const vals = getMergedDraftValues(i);
            const hasOverride = !!draftOverrides[i] && Object.keys(draftOverrides[i]).length > 0;
            const hasDraftConflict = !!(draftConflicts[i]?.length);
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
                    : hasOverride
                    ? "bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100"
                    : "bg-background border-border text-muted-foreground hover:bg-muted")
                }
              >
                {i + 1}
                {hasDraftConflict && <span className="ml-0.5">!</span>}
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
          <AppointmentFields form={baseForm} refData={refData} courseFlags={courseFlags} courseLengthSec={courseLengthSec} conflictByField={conflictByFieldWithCar} warningByField={warningByField} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isBusy}>Cancel</Button>
            {!isEdit && (
              <Button type="button" variant="outline" onClick={() => setBulkMode(true)} disabled={isBusy}>
                Bulk Schedule
              </Button>
            )}
            <Button type="submit" disabled={isBusy || hasConflicts}>
              {isBusy ? "Saving..." : isEdit ? "Save Changes" : "Create Appointment"}
            </Button>
          </div>
        </form>
      ) : (
        // Bulk mode — show active draft as a controlled mini-form
        <BulkDraftPanel
          key={activeDraft}
          draftIndex={activeDraft}
          values={getMergedDraftValues(activeDraft)}
          overrides={draftOverrides[activeDraft] ?? {}}
          refData={refData}
          courseFlags={courseFlags}
          courseLengthSec={courseLengthSec}
          onFieldChange={(field, value) => {
            if (activeDraft === 0) {
              setBaseValue(field, value);
            } else {
              setDraftField(activeDraft, field, value);
            }
          }}
        />
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
    </div>
  );
}

// ─── BulkDraftPanel ───────────────────────────────────────────────────────────
// Renders a draft's fields as controlled inputs (no react-hook-form for simplicity).

function BulkDraftPanel({ draftIndex, values, refData, courseFlags, courseLengthSec, onFieldChange }) {
  const { isInCar, isClassroom, tierOptions, locOptions, spanishOffered, pudoOffered } = courseFlags;
  const v = values;

  const startISO = useMemo(() => combineDateTime(v.startDate, v.startTime), [v.startDate, v.startTime]);
  const computedEndDisplay = useMemo(() => computeEndTime(startISO, courseLengthSec, v.pudo), [startISO, courseLengthSec, v.pudo]);

  function field(name) { return { value: v[name] ?? "", onChange: (e) => onFieldChange(name, e.target.value) }; }
  function linked(name) { return { value: v[name] ?? "", onChange: (val) => onFieldChange(name, val) }; }
  function checked(name) { return { checked: !!(v[name]), onChange: (e) => onFieldChange(name, e.target.checked) }; }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Draft {draftIndex + 1} — date shifts +{draftIndex} week{draftIndex !== 1 ? "s" : ""} from base.
        Changes here only affect this draft.
      </p>
      <div className="grid grid-cols-2 gap-4">

        <div className="space-y-1">
          <Label>Student</Label>
          <LinkedSelect {...linked("Student")} options={refData.studentOptions} placeholder="Select student..." />
        </div>

        <div className="space-y-1">
          <Label>Course</Label>
          <LinkedSelect {...linked("Course")} options={refData.courseOptions} placeholder="Select course..." />
        </div>

        <div className="space-y-1">
          <Label>Instructor</Label>
          <LinkedSelect {...linked("Instructor")} options={refData.instructorOptions} placeholder="Select instructor..." />
        </div>

        <div className="space-y-1">
          <Label>Date</Label>
          <Input type="date" {...field("startDate")} />
        </div>

        <div className="space-y-1">
          <Label>Start Time</Label>
          <Input type="time" {...field("startTime")} />
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
            <LinkedSelect {...linked("Cars")} options={refData.vehicleOptions} placeholder="Select car..." />
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
