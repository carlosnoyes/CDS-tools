import { useState } from "react";
import { startOfYear, endOfYear, addDays, parseISO } from "date-fns";
import { getMondayOf, DEFAULT_PX_PER_HOUR } from "@/utils/time";
import { useAppointments } from "@/hooks/useAppointments";
import { useReferenceData } from "@/hooks/useReferenceData";
import { useAvailability } from "@/hooks/useAvailability";
import WeekNav from "@/components/calendar/WeekNav";
import CalendarGrid from "@/components/calendar/CalendarGrid";
import DayPopout from "@/components/calendar/DayPopout";
import AppointmentSidebar from "@/components/form/AppointmentSidebar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const THIS_MONDAY = getMondayOf(new Date());

export default function CalendarPage() {
  const [pxPerHour, setPxPerHour] = useState(DEFAULT_PX_PER_HOUR);
  const [dayColWidth, setDayColWidth] = useState(160);
  const [gutterWidth, setGutterWidth] = useState(56); // px, matches w-14 (3.5rem)

  // anchor = the Monday shown in the week label (updated by scroll observer AND nav buttons)
  const [anchor, setAnchor] = useState(THIS_MONDAY);
  // scrollTarget = set ONLY by nav buttons; tells CalendarGrid to programmatically scroll
  const [scrollTarget, setScrollTarget] = useState({ date: THIS_MONDAY, seq: 0 });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [prefill, setPrefill] = useState(null); // { startDate, startTime, instructorId?, carId? }
  const [popoutDay, setPopoutDay] = useState(null); // Date | null

  // Fetch the full year so scrolling doesn't need extra fetches
  const yearStart = startOfYear(anchor);
  const yearEnd   = addDays(endOfYear(anchor), 1);
  const { data: appointments = [], isLoading, isError } = useAppointments(yearStart, yearEnd);
  const refData = useReferenceData();
  const { data: availabilityRecords = [] } = useAvailability();

  // ctx = { time: Date, instructorId, carId } from DayColumn click, or null from "New" button
  function openCreate(ctx) {
    setEditRecord(null);
    if (ctx?.time) {
      const t = ctx.time;
      setPrefill({
        startDate: t.toLocaleDateString("en-CA"), // yyyy-MM-dd in local time
        startTime: String(t.getHours()).padStart(2, "0") + ":00",
        instructorId: ctx.instructorId ?? null,
        carId: ctx.carId ?? null,
      });
    } else {
      setPrefill(null);
    }
    setSidebarOpen(true);
  }

  function openEdit(record) {
    setEditRecord(record);
    setPrefill(null);
    setSidebarOpen(true);
  }

  // Called by the sidebar when the user changes the Date field.
  // Only navigates if the selected date is in a different week than the current anchor,
  // so free calendar scrolling isn't interrupted.
  function handleSidebarDateChange(dateStr) {
    try {
      const monday = getMondayOf(parseISO(dateStr));
      if (monday.toISOString() !== getMondayOf(anchor).toISOString()) {
        navigateTo(monday);
      }
    } catch { /* ignore invalid dates */ }
  }

  // Zoom mode — null | "vertical" | "horizontal"
  const [zoomMode, setZoomMode] = useState(null);

  function handleVerticalZoom(delta) {
    setPxPerHour((prev) => Math.max(20, Math.min(600, prev - delta * 12)));
  }
  function handleHorizontalZoom(delta) {
    setDayColWidth((prev) => Math.max(60, Math.min(1200, prev - delta * 20)));
  }
  function exitZoom() {
    setZoomMode(null);
  }

  // Called by nav buttons (prev/next/today/date picker) — scrolls to the week
  function navigateTo(monday) {
    setAnchor(monday);
    setScrollTarget((prev) => ({ date: monday, seq: prev.seq + 1 }));
  }

  function handleGutterResize(newWidth) {
    setGutterWidth(Math.max(40, Math.min(200, newWidth)));
  }
  function handleColResize(newWidth) {
    setDayColWidth(Math.max(60, Math.min(1200, newWidth)));
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Calendar toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background gap-4 flex-wrap">
        {/* Left: week nav */}
        <div className="flex items-center gap-3">
          <WeekNav weekStart={anchor} onWeekChange={navigateTo} />
        </div>

        {/* Right: status + new button */}
        <div className="flex items-center gap-2">
          {isLoading && <span className="text-xs text-muted-foreground">Loading…</span>}
          {isError && <span className="text-xs text-destructive">Failed to load</span>}
          <Button size="sm" onClick={() => openCreate()}>
            <Plus className="w-4 h-4 mr-1" />
            New
          </Button>
        </div>
      </div>

      {/* Calendar grid — always year-stacked */}
      <div className="flex-1 overflow-hidden">
        <CalendarGrid
          anchor={anchor}
          scrollTarget={scrollTarget}
          appointments={appointments}
          refData={refData}
          availabilityRecords={availabilityRecords}
          pxPerHour={pxPerHour}
          dayColWidth={dayColWidth}
          gutterWidth={gutterWidth}
          zoomMode={zoomMode}
          onSetZoomMode={setZoomMode}
          onExitZoom={exitZoom}
          onAnchorChange={setAnchor}
          onEdit={openEdit}
          onCreateAt={openCreate}
          onVerticalZoom={handleVerticalZoom}
          onHorizontalZoom={handleHorizontalZoom}
          onGutterResize={handleGutterResize}
          onColResize={handleColResize}
          onPopoutDay={setPopoutDay}
        />
      </div>

      {popoutDay && (
        <DayPopout
          day={popoutDay}
          appointments={appointments}
          refData={refData}
          availabilityRecords={availabilityRecords}
          onEdit={openEdit}
          onCreateAt={openCreate}
          onClose={() => setPopoutDay(null)}
        />
      )}

      <AppointmentSidebar
        open={sidebarOpen}
        record={editRecord}
        prefill={prefill}
        refData={refData}
        startDate={yearStart}
        endDate={yearEnd}
        onClose={() => setSidebarOpen(false)}
        onDateChange={handleSidebarDateChange}
      />
    </div>
  );
}
