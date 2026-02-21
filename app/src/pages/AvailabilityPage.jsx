import { useState } from "react";
import { getMondayOf, DEFAULT_PX_PER_HOUR } from "@/utils/time";
import { useAvailability } from "@/hooks/useAvailability";
import { useReferenceData } from "@/hooks/useReferenceData";
import WeekNav from "@/components/calendar/WeekNav";
import CalendarGrid from "@/components/calendar/CalendarGrid";
import DayPopout from "@/components/calendar/DayPopout";
import AvailabilitySidebar from "@/components/availability/AvailabilitySidebar";
import BlockShortcutDialog from "@/components/availability/BlockShortcutDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const THIS_MONDAY = getMondayOf(new Date());

export default function AvailabilityPage() {
  const [pxPerHour, setPxPerHour] = useState(DEFAULT_PX_PER_HOUR);
  const [dayColWidth, setDayColWidth] = useState(160);
  const [gutterWidth, setGutterWidth] = useState(56);

  // Navigation
  const [anchor, setAnchor] = useState(THIS_MONDAY);
  const [scrollTarget, setScrollTarget] = useState({ date: THIS_MONDAY, seq: 0 });
  const [popoutDay, setPopoutDay] = useState(null);

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [prefill, setPrefill] = useState(null);

  // Shortcut dialog state
  const [shortcutOpen, setShortcutOpen] = useState(false);
  const [shortcutType, setShortcutType] = useState("instructor");

  // Zoom mode
  const [zoomMode, setZoomMode] = useState(null);

  // Data
  const { data: availabilityRecords = [], isLoading, isError } = useAvailability();
  const refData = useReferenceData();

  // --- Navigation ---
  function navigateTo(monday) {
    setAnchor(monday);
    setScrollTarget((prev) => ({ date: monday, seq: prev.seq + 1 }));
  }

  // --- Sidebar handlers ---
  function openEdit(record) {
    setEditRecord(record);
    setPrefill(null);
    setSidebarOpen(true);
  }

  function openCreate(ctx) {
    setEditRecord(null);
    if (ctx?.time) {
      const t = ctx.time;
      setPrefill({
        startDate: t.toLocaleDateString("en-CA"),
        startTime: String(t.getHours()).padStart(2, "0") + ":00",
        instructorId: ctx.instructorId ?? null,
        carId: ctx.carId ?? null,
      });
    } else {
      setPrefill(null);
    }
    setSidebarOpen(true);
  }

  function handleCloseSidebar() {
    setSidebarOpen(false);
    setEditRecord(null);
    setPrefill(null);
  }

  // --- Zoom ---
  function handleHorizontalZoom(delta) {
    setDayColWidth((prev) => Math.max(60, Math.min(1200, prev - delta * 20)));
  }
  function handleVerticalResize(newPxPerHour) {
    setPxPerHour(Math.max(20, Math.min(600, newPxPerHour)));
  }
  function exitZoom() {
    setZoomMode(null);
  }
  function handleGutterResize(newWidth) {
    setGutterWidth(Math.max(40, Math.min(200, newWidth)));
  }
  function handleColResize(newWidth) {
    setDayColWidth(Math.max(60, Math.min(1200, newWidth)));
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <WeekNav weekStart={anchor} onWeekChange={navigateTo} />
        </div>

        <div className="flex items-center gap-2">
          {isLoading && <span className="text-xs text-muted-foreground">Loading…</span>}
          {isError && <span className="text-xs text-destructive">Failed to load</span>}
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setShortcutType("instructor"); setShortcutOpen(true); }}
          >
            Block Instructor
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setShortcutType("car"); setShortcutOpen(true); }}
          >
            Block Car
          </Button>
          <Button size="sm" onClick={() => openCreate()}>
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
      </div>

      {/* Calendar grid — availability only (no appointments) */}
      <div className="flex-1 overflow-hidden">
        <CalendarGrid
          anchor={anchor}
          scrollTarget={scrollTarget}
          appointments={[]}
          refData={refData}
          availabilityRecords={availabilityRecords}
          pxPerHour={pxPerHour}
          dayColWidth={dayColWidth}
          gutterWidth={gutterWidth}
          zoomMode={zoomMode}
          onSetZoomMode={setZoomMode}
          onExitZoom={exitZoom}
          onAnchorChange={setAnchor}
          onEdit={() => {}}
          onCreateAt={openCreate}
          onVerticalResize={handleVerticalResize}
          onHorizontalZoom={handleHorizontalZoom}
          onGutterResize={handleGutterResize}
          onColResize={handleColResize}
          onPopoutDay={setPopoutDay}
          onClickAvailability={openEdit}
          hideAppointments
        />
      </div>

      {popoutDay && (
        <DayPopout
          day={popoutDay}
          appointments={[]}
          refData={refData}
          availabilityRecords={availabilityRecords}
          onEdit={() => {}}
          onCreateAt={openCreate}
          onClose={() => setPopoutDay(null)}
          onClickAvailability={openEdit}
          hideAppointments
        />
      )}

      <AvailabilitySidebar
        open={sidebarOpen}
        record={editRecord}
        prefill={prefill}
        refData={refData}
        availabilityRecords={availabilityRecords}
        onClose={handleCloseSidebar}
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
