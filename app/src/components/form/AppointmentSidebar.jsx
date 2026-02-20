import { X } from "lucide-react";
import AppointmentForm from "./AppointmentForm";
import DeleteButton from "./DeleteButton";

/**
 * Sidebar version of the appointment form for the Calendar view.
 * Renders as a fixed right-side panel so the calendar stays visible behind it.
 * When the user changes the Date field, onDateChange(dateStr) is called so
 * CalendarPage can navigate to the week containing that date.
 */
export default function AppointmentSidebar({
  open,
  record,
  prefill,
  refData,
  startDate,
  endDate,
  onClose,
  onDateChange,
}) {
  if (!open) return null;

  const isEdit = !!record;

  return (
    <div
      className="fixed top-0 right-0 h-full z-50 bg-background border-l border-border shadow-xl flex flex-col"
      style={{ width: 440 }}
    >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <span className="text-sm font-semibold">
            {isEdit ? "Edit Appointment" : "New Appointment"}
          </span>
          <div className="flex items-center gap-1">
            {isEdit && (
              <DeleteButton
                record={record}
                startDate={startDate}
                endDate={endDate}
                onClose={onClose}
              />
            )}
            <button
              onClick={onClose}
              className="rounded p-1 hover:bg-muted transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable form body */}
        <div className="flex-1 overflow-y-auto p-4">
          <AppointmentForm
            record={record}
            prefill={prefill}
            refData={refData}
            onClose={onClose}
            startDate={startDate}
            endDate={endDate}
            onDateChange={onDateChange}
          />
        </div>
    </div>
  );
}
