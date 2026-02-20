import { useState } from "react";
import { addDays, parseISO, getDay, format } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LinkedSelect from "@/components/form/LinkedSelect";
import { createAvailability } from "@/airtable/availability";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Dialog for bulk-creating Blocked Off records.
 * Two modes: "instructor" (block an instructor's schedule) and "car" (block a car).
 */
export default function BlockShortcutDialog({
  open,
  onOpenChange,
  type,
  refData,
  availabilityRecords,
}) {
  const qc = useQueryClient();
  const [resourceId, setResourceId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [creating, setCreating] = useState(false);

  const isInstructor = type === "instructor";
  const title = isInstructor ? "Block Instructor" : "Block Car";
  const options = isInstructor
    ? (refData?.instructorOptions ?? [])
    : (refData?.vehicleOptions ?? []);

  function reset() {
    setResourceId("");
    setStartDate("");
    setEndDate("");
  }

  /**
   * For Block Instructor: find which days in the range the instructor has Scheduled
   * availability, then create a Blocked Off record for each.
   */
  function computeInstructorBlocks() {
    if (!resourceId || !startDate || !endDate) return [];
    const start = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T00:00:00");

    // Get all Scheduled records for this instructor
    const scheduled = (availabilityRecords ?? []).filter((r) => {
      const f = r.fields;
      return f.Status === "Scheduled" && f.Instructor?.[0] === resourceId;
    });

    const blocks = [];
    let day = start;
    while (day <= end) {
      const targetDow = getDay(day);
      for (const rec of scheduled) {
        const f = rec.fields;
        if (!f.Start || !f["Shift Length"]) continue;
        const anchor = parseISO(f.Start);
        if (getDay(anchor) !== targetDow) continue;

        // Check cadence/repeat bounds
        const repeateUntil = f["Repeate Until"] ? parseISO(f["Repeate Until"]) : null;
        if (repeateUntil && day > repeateUntil) continue;
        if (day < anchor && day.toDateString() !== anchor.toDateString()) continue;

        if ((f.Cadence ?? "Weekly") === "Bi-Weekly") {
          const anchorMs = new Date(anchor).setHours(0, 0, 0, 0);
          const targetMs = new Date(day).setHours(0, 0, 0, 0);
          const weeksDiff = Math.round((targetMs - anchorMs) / (7 * 86_400_000));
          if (weeksDiff % 2 !== 0) continue;
        }

        const blockStart = new Date(day);
        blockStart.setHours(anchor.getHours(), anchor.getMinutes(), 0, 0);

        blocks.push({
          Status: "Blocked Off",
          Instructor: [resourceId],
          ...(f.Vehicle?.[0] ? { Vehicle: [f.Vehicle[0]] } : {}),
          Start: blockStart.toISOString(),
          "Shift Length": f["Shift Length"],
          Cadence: "Weekly",
          "Repeate Until": format(day, "yyyy-MM-dd"),
        });
      }
      day = addDays(day, 1);
    }
    return blocks;
  }

  /**
   * For Block Car: create one full-day block per day in the range.
   */
  function computeCarBlocks() {
    if (!resourceId || !startDate || !endDate) return [];
    const start = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T00:00:00");

    const blocks = [];
    let day = start;
    while (day <= end) {
      const blockStart = new Date(day);
      blockStart.setHours(8, 0, 0, 0); // 8 AM
      blocks.push({
        Status: "Blocked Off",
        Vehicle: [resourceId],
        Start: blockStart.toISOString(),
        "Shift Length": 46800, // 8am-9pm = 13 hours
        Cadence: "Weekly",
        "Repeate Until": format(day, "yyyy-MM-dd"),
      });
      day = addDays(day, 1);
    }
    return blocks;
  }

  const pendingBlocks = isInstructor ? computeInstructorBlocks() : computeCarBlocks();

  async function handleCreate() {
    if (pendingBlocks.length === 0) return;
    setCreating(true);
    try {
      const results = await Promise.allSettled(
        pendingBlocks.map((fields) => createAvailability(fields))
      );
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;
      qc.invalidateQueries({ queryKey: ["availability"] });
      if (failed === 0) {
        toast.success(`Created ${succeeded} block record${succeeded > 1 ? "s" : ""}`);
      } else {
        toast.warning(`${succeeded} created, ${failed} failed`);
      }
      reset();
      onOpenChange(false);
    } catch (e) {
      toast.error(`Failed: ${e.message}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-1">
            <Label className="text-xs font-medium uppercase text-muted-foreground">
              {isInstructor ? "Instructor" : "Car"}
            </Label>
            <LinkedSelect
              value={resourceId}
              onChange={setResourceId}
              options={options}
              placeholder={`Select ${isInstructor ? "instructor" : "car"}…`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-medium uppercase text-muted-foreground">
                Start Date
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-medium uppercase text-muted-foreground">
                End Date
              </Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {pendingBlocks.length > 0 && (
            <p className="text-sm text-muted-foreground">
              This will create <strong>{pendingBlocks.length}</strong> block record
              {pendingBlocks.length > 1 ? "s" : ""}.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCreate}
              disabled={creating || pendingBlocks.length === 0}
            >
              {creating ? "Creating…" : `Block ${isInstructor ? "Instructor" : "Car"}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
