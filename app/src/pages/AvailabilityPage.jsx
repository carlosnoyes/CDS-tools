import { useState, useMemo, useCallback } from "react";
import { parseISO, getDay, format } from "date-fns";
import { toast } from "sonner";
import { getMondayOf, nextWeek, prevWeek, DEFAULT_PX_PER_HOUR } from "@/utils/time";
import { useAvailability } from "@/hooks/useAvailability";
import { useReferenceData } from "@/hooks/useReferenceData";
import {
  useUpdateAvailability,
  useDeleteAvailability,
} from "@/hooks/useAvailabilityMutations";
import { buildRecurringBlocks, buildWeekBlocks } from "@/utils/availabilityView";
import AvailabilityToolbar from "@/components/availability/AvailabilityToolbar";
import AvailabilityGrid from "@/components/availability/AvailabilityGrid";
import AvailabilitySidebar from "@/components/availability/AvailabilitySidebar";
import BlockShortcutDialog from "@/components/availability/BlockShortcutDialog";

const THIS_MONDAY = getMondayOf(new Date());

export default function AvailabilityPage() {
  const [mode, setMode] = useState("recurring"); // "recurring" | "week"
  const [selectedDay, setSelectedDay] = useState(1); // 0-6 (Sun-Sat), null = all (week view)
  const [weekMonday, setWeekMonday] = useState(THIS_MONDAY);
  const [pxPerHour] = useState(DEFAULT_PX_PER_HOUR);

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [prefill, setPrefill] = useState(null);

  // Shortcut dialog state
  const [shortcutOpen, setShortcutOpen] = useState(false);
  const [shortcutType, setShortcutType] = useState("instructor");

  // Data
  const { data: availabilityRecords = [], isLoading, isError } = useAvailability();
  const refData = useReferenceData();
  const updateMut = useUpdateAvailability();
  const deleteMut = useDeleteAvailability();

  // Build blocks for the current mode
  const { scheduledByLane, blockedByLane } = useMemo(() => {
    if (mode === "recurring") {
      if (selectedDay === null) return { scheduledByLane: new Map(), blockedByLane: new Map() };
      const lanes = buildRecurringBlocks(availabilityRecords, selectedDay, refData);
      return { scheduledByLane: lanes, blockedByLane: new Map() };
    } else {
      const { scheduled, blocked } = buildWeekBlocks(availabilityRecords, weekMonday, refData);
      // If single-day filter is active, filter to only that day
      if (selectedDay !== null) {
        // Map dayOfWeek to dayIndex (Mon=0..Sun=6)
        const dayMapping = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 };
        const targetIdx = dayMapping[selectedDay];
        for (const [key, blocks] of scheduled) {
          scheduled.set(key, blocks.filter((b) => b.dayIndex === targetIdx));
        }
        for (const [key, blocks] of blocked) {
          blocked.set(key, blocks.filter((b) => b.dayIndex === targetIdx));
        }
      }
      return { scheduledByLane: scheduled, blockedByLane: blocked };
    }
  }, [mode, selectedDay, weekMonday, availabilityRecords, refData]);

  // Determine layout mode
  const showDayBadge = mode === "recurring";
  const daySubColumns = mode === "week" && selectedDay === null ? 7 : 1;

  // --- Handlers ---

  function handleClickBlock(block) {
    if (block.record) {
      setEditRecord(block.record);
      setPrefill(null);
      setSidebarOpen(true);
    }
  }

  function handleClickEmpty({ laneKey, hour }) {
    setEditRecord(null);
    // Extract vehicleId from laneKey if it's a car lane
    let vehicleId = null;
    if (laneKey.startsWith("car:")) {
      const carName = laneKey.slice(4);
      // Reverse-lookup vehicle ID
      if (refData?.vehicleMap) {
        for (const [id, fields] of Object.entries(refData.vehicleMap)) {
          if (fields["Car Name"] === carName) { vehicleId = id; break; }
        }
      }
    }

    const pf = {
      status: mode === "week" ? "Blocked Off" : "Scheduled",
      vehicleId,
      startTime: `${String(hour).padStart(2, "0")}:00`,
      dayOfWeek: selectedDay ?? 1,
    };

    if (mode === "week" && selectedDay !== null) {
      // Compute actual date from weekMonday + selectedDay
      const dayMapping = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 };
      const dayOffset = dayMapping[selectedDay];
      const d = new Date(weekMonday);
      d.setDate(d.getDate() + dayOffset);
      pf.date = format(d, "yyyy-MM-dd");
    }

    setPrefill(pf);
    setSidebarOpen(true);
  }

  function handleNew() {
    setEditRecord(null);
    setPrefill({
      status: mode === "week" ? "Blocked Off" : "Scheduled",
      dayOfWeek: selectedDay ?? 1,
    });
    setSidebarOpen(true);
  }

  function handleCloseSidebar() {
    setSidebarOpen(false);
    setEditRecord(null);
    setPrefill(null);
  }

  function handleDelete() {
    if (!editRecord) return;
    if (!confirm("Delete this availability record? This cannot be undone.")) return;
    deleteMut.mutate(editRecord.id, {
      onSuccess: () => { toast.success("Deleted"); handleCloseSidebar(); },
      onError: (e) => toast.error(`Delete failed: ${e.message}`),
    });
  }

  const handleResize = useCallback(
    (block, newStartHour, newDurationHours) => {
      if (!block.record) return;
      const f = block.record.fields;
      const anchor = f.Start ? parseISO(f.Start) : new Date();

      // Build new Start (same date as anchor, new time)
      const newAnchor = new Date(anchor);
      const h = Math.floor(newStartHour);
      const m = Math.round((newStartHour - h) * 60);
      newAnchor.setHours(h, m, 0, 0);

      const newShiftLength = Math.round(newDurationHours * 3600);

      updateMut.mutate(
        {
          id: block.record.id,
          fields: {
            Start: newAnchor.toISOString(),
            "Shift Length": newShiftLength,
          },
        },
        {
          onSuccess: () => toast.success("Resized"),
          onError: (e) => toast.error(`Resize failed: ${e.message}`),
        }
      );
    },
    [updateMut]
  );

  function handleModeChange(newMode) {
    setMode(newMode);
    // In recurring mode, always have a day selected; in week view, default to all
    if (newMode === "recurring" && selectedDay === null) {
      setSelectedDay(1); // default to Monday
    }
  }

  function handleDayChange(day) {
    if (mode === "recurring" && day === null) return; // must always have a day in recurring
    setSelectedDay(day);
  }

  return (
    <div className="flex flex-col h-full">
      <AvailabilityToolbar
        mode={mode}
        onModeChange={handleModeChange}
        selectedDay={selectedDay}
        onDayChange={handleDayChange}
        weekMonday={weekMonday}
        onPrevWeek={() => setWeekMonday(prevWeek(weekMonday))}
        onNextWeek={() => setWeekMonday(nextWeek(weekMonday))}
        onToday={() => setWeekMonday(THIS_MONDAY)}
        onNew={handleNew}
        onBlockInstructor={() => { setShortcutType("instructor"); setShortcutOpen(true); }}
        onBlockCar={() => { setShortcutType("car"); setShortcutOpen(true); }}
      />

      {isLoading && (
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          Loading availability…
        </div>
      )}
      {isError && (
        <div className="flex items-center justify-center h-32 text-destructive text-sm">
          Failed to load availability.
        </div>
      )}

      {!isLoading && !isError && (
        <AvailabilityGrid
          scheduledByLane={scheduledByLane}
          blockedByLane={blockedByLane}
          pxPerHour={pxPerHour}
          refData={refData}
          showDayBadge={showDayBadge}
          daySubColumns={daySubColumns}
          onClickBlock={handleClickBlock}
          onClickEmpty={handleClickEmpty}
          onResize={handleResize}
        />
      )}

      <AvailabilitySidebar
        open={sidebarOpen}
        record={editRecord}
        prefill={prefill}
        refData={refData}
        mode={mode}
        onClose={handleCloseSidebar}
        onDelete={handleDelete}
      />

      <BlockShortcutDialog
        open={shortcutOpen}
        onOpenChange={setShortcutOpen}
        type={shortcutType}
        refData={refData}
        availabilityRecords={availabilityRecords}
      />
    </div>
  );
}
