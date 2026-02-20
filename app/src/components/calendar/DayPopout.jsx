import { useEffect, useRef, useState } from "react";
import { format, isToday } from "date-fns";
import { X } from "lucide-react";
import { toISODate, HOUR_LABELS } from "@/utils/time";
import { expandAvailability } from "@/utils/availability";
import DayColumn from "./DayColumn";
import TimeGutter from "./TimeGutter";

const GUTTER_WIDTH = 56; // px — matches w-14

/**
 * Full-screen popout for a single day.
 * pxPerHour is auto-calculated so the full 8 AM–9 PM range fits
 * exactly in the available body height — no internal scrolling.
 */
export default function DayPopout({
  day,
  appointments,
  refData,
  availabilityRecords,
  onEdit,
  onCreateAt,
  onClose,
}) {
  const bodyRef = useRef(null);
  const [pxPerHour, setPxPerHour] = useState(null); // null until measured

  // Compute pxPerHour to fill the body exactly, and re-compute if resized
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;

    function recalc() {
      const h = el.getBoundingClientRect().height;
      if (h > 0) setPxPerHour(h / HOUR_LABELS.length);
    }

    recalc();
    const ro = new ResizeObserver(recalc);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Escape key closes
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const dayStr = toISODate(day);
  const dayAppts = appointments.filter((a) => a.fields.Start?.startsWith(dayStr));
  const availIntervals = expandAvailability(availabilityRecords, day);

  const isCurrentDay = isToday(day);
  const dayLabel = format(day, "EEEE, MMMM d, yyyy");

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      {/* Modal panel — nearly full viewport */}
      <div
        className="relative bg-background border border-border rounded-lg shadow-xl flex flex-col w-full h-full max-w-6xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
          <span className={`text-sm font-semibold ${isCurrentDay ? "text-primary" : ""}`}>
            {dayLabel}
            {isCurrentDay && <span className="ml-2 text-xs font-normal text-primary">Today</span>}
          </span>
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-muted transition-colors"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Calendar body — fills remaining space, no overflow */}
        <div ref={bodyRef} className="flex-1 overflow-hidden flex min-h-0">
          {/* Time gutter */}
          <div
            className="relative shrink-0 border-r border-border bg-background"
            style={{ width: GUTTER_WIDTH }}
          >
            {pxPerHour && <TimeGutter pxPerHour={pxPerHour} />}
          </div>

          {/* Single day column fills remaining width */}
          <div className="flex-1 min-w-0">
            {pxPerHour && (
              <DayColumn
                date={day}
                appointments={dayAppts}
                refData={refData}
                pxPerHour={pxPerHour}
                availabilityIntervals={availIntervals}
                onEdit={onEdit}
                onClickTime={(time) => onCreateAt(time)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
