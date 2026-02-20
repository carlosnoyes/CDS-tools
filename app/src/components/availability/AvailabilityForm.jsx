import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { parseISO, getDay, format, nextDay, previousDay, isBefore } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LinkedSelect from "@/components/form/LinkedSelect";
import {
  useCreateAvailability,
  useUpdateAvailability,
} from "@/hooks/useAvailabilityMutations";

const DAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

const STATUS_OPTIONS = [
  { value: "Scheduled", label: "Scheduled" },
  { value: "Blocked Off", label: "Blocked Off" },
];

const CADENCE_OPTIONS = [
  { value: "Weekly", label: "Weekly" },
  { value: "Bi-Weekly", label: "Bi-Weekly" },
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
 * Compute an anchor ISO datetime for a given day-of-week + time string.
 * Picks a recent date that falls on the specified day so the recurrence starts immediately.
 */
function buildAnchorISO(dayOfWeek, timeStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Find the most recent past or today occurrence of this day-of-week
  let anchor;
  if (getDay(today) === dayOfWeek) {
    anchor = today;
  } else {
    anchor = previousDay(today, dayOfWeek);
  }
  const [h, m] = timeStr.split(":").map(Number);
  anchor.setHours(h, m, 0, 0);
  return anchor.toISOString();
}

/**
 * Build anchor ISO from a specific date + time (Week View create).
 */
function buildDateAnchorISO(dateStr, timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date(dateStr + "T00:00:00");
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

export default function AvailabilityForm({ record, prefill, refData, mode, onClose }) {
  const isEdit = !!record;
  const createMut = useCreateAvailability();
  const updateMut = useUpdateAvailability();

  // Build default values
  let defaults;
  if (isEdit) {
    const f = record.fields;
    const anchor = f.Start ? parseISO(f.Start) : new Date();
    defaults = {
      status: f.Status ?? "Scheduled",
      instructorId: f.Instructor?.[0] ?? "",
      vehicleId: f.Vehicle?.[0] ?? "",
      location: f.Location ?? "",
      dayOfWeek: getDay(anchor),
      date: f.Start ? format(anchor, "yyyy-MM-dd") : "",
      startTime: f.Start ? format(anchor, "HH:mm") : "08:00",
      shiftHours: f["Shift Length"] ? Math.floor(f["Shift Length"] / 3600) : 8,
      shiftMinutes: f["Shift Length"] ? Math.floor((f["Shift Length"] % 3600) / 60) : 0,
      cadence: f.Cadence ?? "Weekly",
      repeateUntil: f["Repeate Until"] ?? "",
    };
  } else {
    defaults = {
      status: prefill?.status ?? (mode === "week" ? "Blocked Off" : "Scheduled"),
      instructorId: prefill?.instructorId ?? "",
      vehicleId: prefill?.vehicleId ?? "",
      location: prefill?.location ?? "",
      dayOfWeek: prefill?.dayOfWeek ?? 1,
      date: prefill?.date ?? "",
      startTime: prefill?.startTime ?? "08:00",
      shiftHours: 8,
      shiftMinutes: 0,
      cadence: "Weekly",
      repeateUntil: "",
    };
  }

  const { register, handleSubmit, watch, setValue, formState: { isSubmitting } } = useForm({
    defaultValues: defaults,
  });

  const status = watch("status");
  const busy = isSubmitting || createMut.isPending || updateMut.isPending;

  function onSubmit(data) {
    const shiftLengthSec = (data.shiftHours || 0) * 3600 + (data.shiftMinutes || 0) * 60;

    // Build Start ISO
    let startISO;
    if (mode === "week" && data.date) {
      startISO = buildDateAnchorISO(data.date, data.startTime);
    } else {
      startISO = buildAnchorISO(Number(data.dayOfWeek), data.startTime);
    }

    const fields = {
      Status: data.status,
      Start: startISO,
      "Shift Length": shiftLengthSec,
      Cadence: data.cadence,
    };

    if (data.instructorId) fields.Instructor = [data.instructorId];
    if (data.vehicleId) fields.Vehicle = [data.vehicleId];
    if (data.location) fields.Location = data.location;
    if (data.repeateUntil) fields["Repeate Until"] = data.repeateUntil;

    if (isEdit) {
      updateMut.mutate(
        { id: record.id, fields },
        {
          onSuccess: () => { toast.success("Availability updated"); onClose(); },
          onError: (e) => toast.error(`Update failed: ${e.message}`),
        }
      );
    } else {
      createMut.mutate(fields, {
        onSuccess: () => { toast.success("Availability created"); onClose(); },
        onError: (e) => toast.error(`Create failed: ${e.message}`),
      });
    }
  }

  return (
    <form id="avail-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      {/* Status */}
      <Field label="Status">
        <div className="flex gap-1">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setValue("status", opt.value)}
              className={`flex-1 px-3 py-1.5 text-sm rounded border transition-colors ${
                status === opt.value
                  ? opt.value === "Blocked Off"
                    ? "bg-destructive text-destructive-foreground border-destructive"
                    : "bg-primary text-primary-foreground border-primary"
                  : "text-muted-foreground border-border hover:bg-accent"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
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

      {/* Vehicle */}
      <Field label="Vehicle">
        <LinkedSelect
          value={watch("vehicleId")}
          onChange={(v) => setValue("vehicleId", v)}
          options={[{ value: "", label: "— None —" }, ...(refData?.vehicleOptions ?? [])]}
          placeholder="Select vehicle…"
        />
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

      {/* Day of week (Recurring mode) or Date (Week View) */}
      {mode === "week" ? (
        <Field label="Date">
          <Input type="date" {...register("date")} />
        </Field>
      ) : (
        <Field label="Day of Week">
          <select
            {...register("dayOfWeek", { valueAsNumber: true })}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            {DAYS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </Field>
      )}

      {/* Start time */}
      <Field label="Start Time">
        <Input type="time" {...register("startTime")} />
      </Field>

      {/* Shift length */}
      <Field label="Shift Length">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            max={24}
            {...register("shiftHours", { valueAsNumber: true })}
            className="w-16"
          />
          <span className="text-sm text-muted-foreground">h</span>
          <Input
            type="number"
            min={0}
            max={59}
            step={15}
            {...register("shiftMinutes", { valueAsNumber: true })}
            className="w-16"
          />
          <span className="text-sm text-muted-foreground">m</span>
        </div>
      </Field>

      {/* Cadence */}
      <Field label="Cadence">
        <select
          {...register("cadence")}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
        >
          {CADENCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </Field>

      {/* Repeate Until */}
      <Field label="Repeat Until">
        <Input type="date" {...register("repeateUntil")} />
      </Field>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 pt-3 border-t mt-2">
        <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button size="sm" type="submit" form="avail-form" disabled={busy}>
          {isEdit ? "Save Changes" : "Create"}
        </Button>
      </div>
    </form>
  );
}
