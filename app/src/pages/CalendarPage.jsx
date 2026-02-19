import { useState } from "react";
import { startOfYear, endOfYear, addDays } from "date-fns";
import { getMondayOf, DEFAULT_PX_PER_HOUR } from "@/utils/time";
import { useAppointments } from "@/hooks/useAppointments";
import { useReferenceData } from "@/hooks/useReferenceData";
import { useAvailability } from "@/hooks/useAvailability";
import WeekNav from "@/components/calendar/WeekNav";
import CalendarGrid from "@/components/calendar/CalendarGrid";
import AppointmentModal from "@/components/form/AppointmentModal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const THIS_MONDAY = getMondayOf(new Date());
const GROUPINGS = ["By Car", "By Instructor"];

export default function CalendarPage() {
  const [grouping, setGrouping] = useState("By Instructor");
  const [pxPerHour, setPxPerHour] = useState(DEFAULT_PX_PER_HOUR);
  const [dayColWidth, setDayColWidth] = useState(160);

  // anchor = the Monday currently at the top of the visible calendar area
  const [anchor, setAnchor] = useState(THIS_MONDAY);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [prefillStart, setPrefillStart] = useState(null);

  // Fetch the full year so scrolling doesn't need extra fetches
  const yearStart = startOfYear(anchor);
  const yearEnd   = addDays(endOfYear(anchor), 1);
  const { data: appointments = [], isLoading, isError } = useAppointments(yearStart, yearEnd);
  const refData = useReferenceData();
  const { data: availabilityRecords = [] } = useAvailability();

  function openCreate(time) {
    setEditRecord(null);
    setPrefillStart(time ?? null);
    setModalOpen(true);
  }

  function openEdit(record) {
    setEditRecord(record);
    setPrefillStart(null);
    setModalOpen(true);
  }

  const modalRecord = editRecord
    ? editRecord
    : prefillStart
    ? { fields: { Start: prefillStart.toISOString() } }
    : null;

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

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Calendar toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background gap-4 flex-wrap">
        {/* Left: week nav + grouping toggle */}
        <div className="flex items-center gap-3">
          <WeekNav weekStart={anchor} onWeekChange={setAnchor} />

          {/* Grouping toggle */}
          <div className="flex rounded-md border overflow-hidden">
            {GROUPINGS.map((g) => (
              <button
                key={g}
                onClick={() => setGrouping(g)}
                className={`px-3 py-1 text-xs font-medium border-l first:border-l-0 transition-colors ${
                  grouping === g
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
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
          grouping={grouping}
          anchor={anchor}
          appointments={appointments}
          refData={refData}
          availabilityRecords={availabilityRecords}
          pxPerHour={pxPerHour}
          dayColWidth={dayColWidth}
          zoomMode={zoomMode}
          onSetZoomMode={setZoomMode}
          onExitZoom={exitZoom}
          onAnchorChange={setAnchor}
          onEdit={openEdit}
          onCreateAt={openCreate}
          onVerticalZoom={handleVerticalZoom}
          onHorizontalZoom={handleHorizontalZoom}
        />
      </div>

      <AppointmentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        record={modalRecord}
        refData={refData}
        startDate={yearStart}
        endDate={yearEnd}
      />
    </div>
  );
}
