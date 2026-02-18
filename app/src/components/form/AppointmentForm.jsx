import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LinkedSelect from "./LinkedSelect";
import { LOCATIONS } from "@/utils/constants";
import { minutesToSeconds, secondsToMinutes } from "@/utils/time";
import { useCreateAppointment, useUpdateAppointment } from "@/hooks/useAppointments";
import { format, parseISO } from "date-fns";

// Convert ISO string to datetime-local input value
function toDatetimeLocal(isoString) {
  if (!isoString) return "";
  try {
    return format(parseISO(isoString), "yyyy-MM-dd'T'HH:mm");
  } catch {
    return "";
  }
}

// Convert datetime-local input value to ISO string with Eastern time offset
function fromDatetimeLocal(localString) {
  if (!localString) return null;
  // Build a Date from the local string and output as ISO
  // Note: this uses the browser's local timezone. Acceptable for an internal tool.
  return new Date(localString).toISOString();
}

function defaultValues(record) {
  if (!record) return {};
  const f = record.fields;
  return {
    Student:        f.Student?.[0] ?? "",
    Instructor:     f.Instructor?.[0] ?? "",
    Vehicle:        f.Vehicle?.[0] ?? "",
    Course:         f.Course?.[0] ?? "",
    Start:          toDatetimeLocal(f.Start),
    puduMinutes:    secondsToMinutes(f.PUDU ?? 0),
    classNumber:    f["Class Number"] ?? "",
    Location:       f.Location ?? "",
    Notes:          f.Notes ?? "",
  };
}

export default function AppointmentForm({ record, refData, onClose, weekStart }) {
  const isEdit = !!record;
  const create = useCreateAppointment(weekStart);
  const update = useUpdateAppointment(weekStart);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: defaultValues(record) });

  // Re-populate form when record changes (switching between edit targets)
  useEffect(() => {
    reset(defaultValues(record));
  }, [record?.id]);

  async function onSubmit(data) {
    const fields = {
      Student:          data.Student ? [data.Student] : undefined,
      Instructor:       data.Instructor ? [data.Instructor] : undefined,
      Vehicle:          data.Vehicle ? [data.Vehicle] : undefined,
      Course:           data.Course ? [data.Course] : undefined,
      Start:            fromDatetimeLocal(data.Start),
      PUDU:             minutesToSeconds(Number(data.puduMinutes) || 0),
      "Class Number":   data.classNumber ? Number(data.classNumber) : undefined,
      Location:         data.Location || undefined,
      Notes:            data.Notes || undefined,
    };

    // Remove undefined keys
    Object.keys(fields).forEach((k) => {
      if (fields[k] === undefined) delete fields[k];
    });

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
      toast.error(`Failed to save: ${err.message}`);
    }
  }

  const isBusy = isSubmitting || create.isPending || update.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Student */}
        <div className="space-y-1">
          <Label>Student</Label>
          <LinkedSelect
            value={watch("Student")}
            onChange={(v) => setValue("Student", v)}
            options={refData.studentOptions}
            placeholder="Select student…"
          />
        </div>

        {/* Instructor */}
        <div className="space-y-1">
          <Label>Instructor</Label>
          <LinkedSelect
            value={watch("Instructor")}
            onChange={(v) => setValue("Instructor", v)}
            options={refData.instructorOptions}
            placeholder="Select instructor…"
          />
        </div>

        {/* Vehicle */}
        <div className="space-y-1">
          <Label>Vehicle</Label>
          <LinkedSelect
            value={watch("Vehicle")}
            onChange={(v) => setValue("Vehicle", v)}
            options={refData.vehicleOptions}
            placeholder="Select vehicle…"
          />
        </div>

        {/* Course */}
        <div className="space-y-1">
          <Label>Course</Label>
          <LinkedSelect
            value={watch("Course")}
            onChange={(v) => setValue("Course", v)}
            options={refData.courseOptions}
            placeholder="Select course…"
          />
        </div>

        {/* Start date/time */}
        <div className="space-y-1">
          <Label htmlFor="Start">Start</Label>
          <Input
            id="Start"
            type="datetime-local"
            {...register("Start", { required: "Start time is required" })}
          />
          {errors.Start && (
            <p className="text-xs text-destructive">{errors.Start.message}</p>
          )}
        </div>

        {/* PUDU */}
        <div className="space-y-1">
          <Label htmlFor="puduMinutes">PUDU (minutes)</Label>
          <Input
            id="puduMinutes"
            type="number"
            min={0}
            step={5}
            placeholder="0"
            {...register("puduMinutes")}
          />
          <p className="text-xs text-muted-foreground">Pick-up / drop-off time each way</p>
        </div>

        {/* Class Number */}
        <div className="space-y-1">
          <Label htmlFor="classNumber">Class #</Label>
          <Input
            id="classNumber"
            type="number"
            min={1}
            placeholder="1"
            {...register("classNumber")}
          />
        </div>

        {/* Location */}
        <div className="space-y-1">
          <Label>Location</Label>
          <select
            value={watch("Location")}
            onChange={(e) => setValue("Location", e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Select location…</option>
            {LOCATIONS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Notes — full width */}
      <div className="space-y-1">
        <Label htmlFor="Notes">Notes</Label>
        <Input id="Notes" placeholder="Optional notes…" {...register("Notes")} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={isBusy}>
          Cancel
        </Button>
        <Button type="submit" disabled={isBusy}>
          {isBusy ? "Saving…" : isEdit ? "Save Changes" : "Create Appointment"}
        </Button>
      </div>
    </form>
  );
}
