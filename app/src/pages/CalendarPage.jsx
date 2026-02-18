import { useState } from "react";
import { format } from "date-fns";
import { getMondayOf } from "@/utils/time";
import { useAppointments } from "@/hooks/useAppointments";
import { useReferenceData } from "@/hooks/useReferenceData";
import WeekNav from "@/components/calendar/WeekNav";
import WeekCalendar from "@/components/calendar/WeekCalendar";
import AppointmentModal from "@/components/form/AppointmentModal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const THIS_MONDAY = getMondayOf(new Date());

// Build a datetime-local string from a Date for pre-filling the form
function toDatetimeLocal(date) {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

export default function CalendarPage() {
  const [weekStart, setWeekStart] = useState(THIS_MONDAY);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [prefillStart, setPrefillStart] = useState(null);

  const { data: appointments = [], isLoading, isError } = useAppointments(weekStart);
  const refData = useReferenceData();

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

  // Inject prefill start into the record for the form (used when clicking empty space)
  const modalRecord = editRecord
    ? editRecord
    : prefillStart
    ? { fields: { Start: prefillStart.toISOString() } }
    : null;

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Calendar toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
        <WeekNav weekStart={weekStart} onWeekChange={setWeekStart} />

        <div className="flex items-center gap-2">
          {isLoading && (
            <span className="text-xs text-muted-foreground">Loading…</span>
          )}
          {isError && (
            <span className="text-xs text-destructive">Failed to load</span>
          )}
          <Button size="sm" onClick={() => openCreate()}>
            <Plus className="w-4 h-4 mr-1" />
            New
          </Button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-hidden">
        <WeekCalendar
          weekStart={weekStart}
          appointments={appointments}
          refData={refData}
          onEdit={openEdit}
          onCreateAt={openCreate}
        />
      </div>

      <AppointmentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        record={modalRecord}
        refData={refData}
        weekStart={weekStart}
      />
    </div>
  );
}
