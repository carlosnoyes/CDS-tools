import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { parseISO, format, addDays, addWeeks, isBefore, isAfter, isSameDay, getDay, differenceInCalendarDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LinkedSelect from "@/components/form/LinkedSelect";
import { CLASSROOMS } from "@/utils/constants";
import {
  useCreateAvailability,
  useUpdateAvailability,
  useDeleteAvailability,
  useBulkCreateAvailability,
  useBulkUpdateAvailability,
  useBulkDeleteAvailability,
  useSplitAvailability,
} from "@/hooks/useAvailabilityMutations";

const RECURRENCE_OPTIONS = [
  { value: "none", label: "None" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-Weekly" },
];

const LOCATION_OPTIONS = [
  { value: "", label: "— None —" },
  { value: "CH", label: "Colonial Heights" },
  { value: "GA", label: "Glen Allen" },
];

function Field({ label: lbl, children }) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {lbl}
      </Label>
      {children}
    </div>
  );
}

/**
 * Build an array of dates for recurrence expansion.
 */
function expandDates(startDate, recurrence, endDate) {
  const dates = [startDate];
  if (recurrence === "none" || !endDate) return dates;

  let current = new Date(startDate);
  const limit = new Date(endDate);

  while (true) {
    if (recurrence === "daily") {
      current = addDays(current, 1);
    } else if (recurrence === "weekly") {
      current = addWeeks(current, 1);
    } else if (recurrence === "biweekly") {
      current = addWeeks(current, 2);
    }
    if (isAfter(current, limit)) break;
    dates.push(new Date(current));
  }

  return dates;
}

/**
 * Find "same series" records for bulk edit/delete.
 * Match: same instructor + same vehicle/classroom + same time-of-day + same day-of-week + date >= selected
 */
function findSeriesRecords(record, allRecords) {
  const f = record.fields;
  const anchor = parseISO(f.Start);
  const anchorDay = getDay(anchor);
  const anchorHours = anchor.getHours();
  const anchorMinutes = anchor.getMinutes();
  const instructorId = f.Instructor?.[0] ?? null;
  const vehicleId = f.Vehicle?.[0] ?? null;
  const shiftLength = f["Shift Length"];

  return allRecords.filter((rec) => {
    if (rec.id === record.id) return true; // always include self
    const rf = rec.fields;
    if (rf.Status !== "Scheduled") return false;
    if (!rf.Start || !rf["Shift Length"]) return false;

    const rAnchor = parseISO(rf.Start);

    // Must be on or after the selected record's date
    if (isBefore(rAnchor, anchor) && !isSameDay(rAnchor, anchor)) return false;

    // Same day of week
    if (getDay(rAnchor) !== anchorDay) return false;

    // Same time of day
    if (rAnchor.getHours() !== anchorHours || rAnchor.getMinutes() !== anchorMinutes) return false;

    // Same shift length
    if (rf["Shift Length"] !== shiftLength) return false;

    // Same instructor
    if ((rf.Instructor?.[0] ?? null) !== instructorId) return false;

    // Same vehicle
    if ((rf.Vehicle?.[0] ?? null) !== vehicleId) return false;

    return true;
  });
}

export default function AvailabilityForm({ record, prefill, refData, availabilityRecords = [], onClose }) {
  const isEdit = !!record;
  const createMut = useCreateAvailability();
  const updateMut = useUpdateAvailability();
  const deleteMut = useDeleteAvailability();
  const bulkCreateMut = useBulkCreateAvailability();
  const bulkUpdateMut = useBulkUpdateAvailability();
  const bulkDeleteMut = useBulkDeleteAvailability();
  const splitMut = useSplitAvailability();

  // Scope toggle for edit mode
  const [scope, setScope] = useState("single"); // "single" | "future"
  const [showSplit, setShowSplit] = useState(false);
  const [splitTime, setSplitTime] = useState("");

  // Compute series count for "All Future Shifts"
  const seriesRecords = useMemo(() => {
    if (!isEdit) return [];
    return findSeriesRecords(record, availabilityRecords);
  }, [isEdit, record, availabilityRecords]);

  // Build default values
  let defaults;
  if (isEdit) {
    const f = record.fields;
    const startDt = f.Start ? parseISO(f.Start) : new Date();
    const endMs = startDt.getTime() + (f["Shift Length"] ?? 28800) * 1000;
    const endDt = new Date(endMs);
    defaults = {
      startDate: format(startDt, "yyyy-MM-dd"),
      startTime: format(startDt, "HH:mm"),
      endTime: format(endDt, "HH:mm"),
      instructorId: f.Instructor?.[0] ?? "",
      vehicleId: f.Vehicle?.[0] ?? "",
      classroom: f.Classroom ?? "",
      location: f.Location ?? "",
      notes: f.Notes ?? "",
      recurrence: "none",
      endDate: "",
    };
  } else {
    const startH = parseInt(prefill?.startTime ?? "08", 10);
    const endH = Math.min(startH + 8, 21);
    defaults = {
      startDate: prefill?.startDate ?? format(new Date(), "yyyy-MM-dd"),
      startTime: prefill?.startTime ?? "08:00",
      endTime: `${String(endH).padStart(2, "0")}:00`,
      instructorId: prefill?.instructorId ?? "",
      vehicleId: prefill?.carId ?? "",
      classroom: "",
      location: "",
      notes: "",
      recurrence: "none",
      endDate: "",
    };
  }

  const { register, handleSubmit, watch, setValue, formState: { isSubmitting } } = useForm({
    defaultValues: defaults,
  });

  const recurrence = watch("recurrence");
  const busy = isSubmitting || createMut.isPending || updateMut.isPending ||
    bulkCreateMut.isPending || bulkUpdateMut.isPending || bulkDeleteMut.isPending ||
    deleteMut.isPending || splitMut.isPending;

  function buildFields(data) {
    // Parse start/end into ISO + shift length
    const startDt = new Date(`${data.startDate}T${data.startTime}:00`);
    const endDt = new Date(`${data.startDate}T${data.endTime}:00`);
    const shiftLengthSec = Math.round((endDt.getTime() - startDt.getTime()) / 1000);

    if (shiftLengthSec <= 0) {
      toast.error("End time must be after start time");
      return null;
    }

    const fields = {
      Status: "Scheduled",
      Start: startDt.toISOString(),
      "Shift Length": shiftLengthSec,
    };

    if (data.instructorId) fields.Instructor = [data.instructorId];
    else fields.Instructor = [];
    if (data.vehicleId) fields.Vehicle = [data.vehicleId];
    else fields.Vehicle = [];
    if (data.location) fields.Location = data.location;
    else fields.Location = null;
    if (data.classroom) fields.Classroom = data.classroom;
    else fields.Classroom = null;
    if (data.notes) fields.Notes = data.notes;
    else fields.Notes = null;

    return { fields, startDt, shiftLengthSec };
  }

  function onSubmit(data) {
    if (isEdit) {
      handleEdit(data);
    } else {
      handleCreate(data);
    }
  }

  function handleCreate(data) {
    const result = buildFields(data);
    if (!result) return;
    const { fields, startDt, shiftLengthSec } = result;

    if (data.recurrence === "none") {
      // Single record
      createMut.mutate(fields, {
        onSuccess: () => { toast.success("Availability created"); onClose(); },
        onError: (e) => toast.error(`Create failed: ${e.message}`),
      });
    } else {
      // Validate end date
      if (!data.endDate) {
        toast.error("End date is required for recurring shifts");
        return;
      }
      const endLimit = addDays(startDt, 366);
      if (isAfter(new Date(data.endDate), endLimit)) {
        toast.error("End date cannot exceed 1 year from start date");
        return;
      }

      // Expand recurrence into individual records
      const dates = expandDates(startDt, data.recurrence, new Date(data.endDate));
      const fieldsList = dates.map((d) => {
        const newStart = new Date(d);
        newStart.setHours(startDt.getHours(), startDt.getMinutes(), 0, 0);
        return { ...fields, Start: newStart.toISOString() };
      });

      bulkCreateMut.mutate(fieldsList, {
        onSuccess: () => { toast.success(`Created ${fieldsList.length} shifts`); onClose(); },
        onError: (e) => toast.error(`Bulk create failed: ${e.message}`),
      });
    }
  }

  function handleEdit(data) {
    const result = buildFields(data);
    if (!result) return;
    const { fields } = result;

    if (scope === "single") {
      updateMut.mutate(
        { id: record.id, fields },
        {
          onSuccess: () => { toast.success("Availability updated"); onClose(); },
          onError: (e) => toast.error(`Update failed: ${e.message}`),
        }
      );
    } else {
      // All Future Shifts — apply changes to all matching series records
      // Only update time-of-day, instructor, car, classroom, location, notes — not date
      const startDt = new Date(`${data.startDate}T${data.startTime}:00`);
      const endDt = new Date(`${data.startDate}T${data.endTime}:00`);
      const shiftLengthSec = Math.round((endDt.getTime() - startDt.getTime()) / 1000);

      const updates = seriesRecords.map((rec) => {
        const recStart = parseISO(rec.fields.Start);
        // Keep the original date, apply new time-of-day
        const newStart = new Date(recStart);
        newStart.setHours(startDt.getHours(), startDt.getMinutes(), 0, 0);
        return {
          id: rec.id,
          fields: {
            ...fields,
            Start: newStart.toISOString(),
            "Shift Length": shiftLengthSec,
          },
        };
      });

      bulkUpdateMut.mutate(updates, {
        onSuccess: () => { toast.success(`Updated ${updates.length} shifts`); onClose(); },
        onError: (e) => toast.error(`Bulk update failed: ${e.message}`),
      });
    }
  }

  function handleDelete() {
    if (scope === "single") {
      if (!confirm("Delete this shift?")) return;
      deleteMut.mutate(record.id, {
        onSuccess: () => { toast.success("Deleted"); onClose(); },
        onError: (e) => toast.error(`Delete failed: ${e.message}`),
      });
    } else {
      if (!confirm(`Delete ${seriesRecords.length} shifts (this and all matching future)?`)) return;
      bulkDeleteMut.mutate(
        seriesRecords.map((r) => r.id),
        {
          onSuccess: () => { toast.success(`Deleted ${seriesRecords.length} shifts`); onClose(); },
          onError: (e) => toast.error(`Bulk delete failed: ${e.message}`),
        }
      );
    }
  }

  function handleSplit() {
    if (!splitTime) {
      toast.error("Select a split time");
      return;
    }
    const f = record.fields;
    const startDt = parseISO(f.Start);
    const endMs = startDt.getTime() + f["Shift Length"] * 1000;

    const splitDt = new Date(`${format(startDt, "yyyy-MM-dd")}T${splitTime}:00`);
    const splitMs = splitDt.getTime();

    if (splitMs <= startDt.getTime() || splitMs >= endMs) {
      toast.error("Split time must be between shift start and end");
      return;
    }

    splitMut.mutate(
      { record, splitTimeISO: splitDt.toISOString() },
      {
        onSuccess: () => { toast.success("Shift split"); onClose(); },
        onError: (e) => toast.error(`Split failed: ${e.message}`),
      }
    );
  }

  return (
    <form id="avail-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      {/* Scope toggle (edit mode only) */}
      {isEdit && (
        <Field label="Editing Scope">
          <div className="flex gap-1">
            {[
              { value: "single", label: "Single Shift" },
              { value: "future", label: `All Future Shifts (${seriesRecords.length})` },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setScope(opt.value)}
                className={`flex-1 px-3 py-1.5 text-sm rounded border transition-colors ${
                  scope === opt.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "text-muted-foreground border-border hover:bg-accent"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Field>
      )}

      {/* Start Date + Time */}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Start Date">
          <Input type="date" {...register("startDate")} />
        </Field>
        <Field label="Start Time">
          <Input type="time" {...register("startTime")} />
        </Field>
      </div>

      {/* End Time (same day) */}
      <Field label="End Time">
        <Input type="time" {...register("endTime")} />
      </Field>

      {/* Instructor */}
      <Field label="Instructor">
        <LinkedSelect
          value={watch("instructorId")}
          onChange={(v) => setValue("instructorId", v)}
          options={refData?.instructorOptions ?? []}
          placeholder="Select instructor…"
        />
      </Field>

      {/* Car */}
      <Field label="Car">
        <LinkedSelect
          value={watch("vehicleId")}
          onChange={(v) => setValue("vehicleId", v)}
          options={[{ value: "", label: "— None —" }, ...(refData?.vehicleOptions ?? [])]}
          placeholder="Select car…"
        />
      </Field>

      {/* Classroom */}
      <Field label="Classroom">
        <select
          {...register("classroom")}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
        >
          <option value="">— None —</option>
          {CLASSROOMS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </Field>

      {/* Location */}
      <Field label="Location">
        <select
          {...register("location")}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
        >
          {LOCATION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </Field>

      {/* Note */}
      <Field label="Note">
        <Input {...register("notes")} placeholder="Optional note…" />
      </Field>

      {/* Recurrence (create mode only) */}
      {!isEdit && (
        <>
          <Field label="Recurrence">
            <select
              {...register("recurrence")}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            >
              {RECURRENCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>

          {recurrence !== "none" && (
            <Field label="End Date">
              <Input type="date" {...register("endDate")} />
              <span className="text-[10px] text-muted-foreground">Max 1 year from start</span>
            </Field>
          )}
        </>
      )}

      {/* Footer */}
      <div className="flex flex-col gap-2 pt-3 border-t mt-2">
        {/* Split (edit mode only) */}
        {isEdit && (
          <div>
            {!showSplit ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowSplit(true)}
              >
                Split Shift
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Split at:</Label>
                <Input
                  type="time"
                  value={splitTime}
                  onChange={(e) => setSplitTime(e.target.value)}
                  className="flex-1"
                />
                <Button type="button" size="sm" onClick={handleSplit} disabled={busy}>
                  Split
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowSplit(false); setSplitTime(""); }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <div>
            {isEdit && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={busy}
              >
                {scope === "future" ? `Delete ${seriesRecords.length} Shifts` : "Delete"}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button size="sm" type="submit" form="avail-form" disabled={busy}>
              {isEdit ? "Save Changes" : "Create"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
