import { useState, useRef, useEffect } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth,
         eachDayOfInterval, getDay, isSameDay, isSameMonth } from "date-fns";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMondayOf, prevWeek, nextWeek, formatWeekRange } from "@/utils/time";

/**
 * Minimal inline month grid for the date picker.
 * Returns the clicked date via onSelect.
 */
function MiniCalendar({ viewMonth, onChangeMonth, onSelect, selectedMonday }) {
  const firstDay = startOfMonth(viewMonth);
  const lastDay = endOfMonth(viewMonth);

  // Days of month, padded on the left so the grid starts on Monday
  const days = eachDayOfInterval({ start: firstDay, end: lastDay });
  // getDay returns 0=Sun..6=Sat; convert to Mon-based offset
  const prefixBlanks = (getDay(firstDay) + 6) % 7; // Mon=0 … Sun=6

  const dayNames = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  return (
    <div className="p-2 w-56">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-1">
        <button
          className="p-1 rounded hover:bg-muted"
          onClick={() => onChangeMonth(subMonths(viewMonth, 1))}
        >
          <ChevronLeft className="w-3 h-3" />
        </button>
        <button
          className="text-xs font-semibold hover:underline"
          onClick={() => onChangeMonth(new Date())}
          title="Go to today's month"
        >
          {format(viewMonth, "MMMM yyyy")}
        </button>
        <button
          className="p-1 rounded hover:bg-muted"
          onClick={() => onChangeMonth(addMonths(viewMonth, 1))}
        >
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 gap-px mb-0.5">
        {dayNames.map((d) => (
          <div key={d} className="text-[10px] text-center text-muted-foreground font-medium py-0.5">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px">
        {Array.from({ length: prefixBlanks }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {days.map((day) => {
          const monday = getMondayOf(day);
          const isSelected = selectedMonday && isSameDay(monday, selectedMonday);
          const isOtherMonth = !isSameMonth(day, viewMonth);
          const isToday = isSameDay(day, new Date());

          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelect(day)}
              className={[
                "text-[11px] text-center rounded py-0.5 transition-colors",
                isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                isToday && !isSelected ? "font-bold text-primary" : "",
                isOtherMonth ? "opacity-40" : "",
              ].join(" ")}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function WeekNav({ weekStart, onWeekChange }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(weekStart);
  const pickerRef = useRef(null);

  // Sync viewMonth when weekStart changes externally (e.g. Today button)
  // only when picker is closed so we don't disrupt mid-navigation
  useEffect(() => {
    if (!pickerOpen) setViewMonth(weekStart);
  }, [weekStart, pickerOpen]);

  // Close picker on outside click
  useEffect(() => {
    if (!pickerOpen) return;
    function onOutside(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [pickerOpen]);

  // Close picker on Escape
  useEffect(() => {
    if (!pickerOpen) return;
    function onKey(e) {
      if (e.key === "Escape") setPickerOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pickerOpen]);

  function handleSelect(day) {
    onWeekChange(getMondayOf(day));
    setPickerOpen(false);
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onWeekChange(prevWeek(weekStart))}
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>

      {/* Week range label — click to open date picker */}
      <div className="relative" ref={pickerRef}>
        <button
          onClick={() => setPickerOpen((v) => !v)}
          className="flex items-center gap-1 text-sm font-medium w-48 text-center justify-center rounded px-2 py-1 hover:bg-muted transition-colors"
          title="Click to jump to a date"
        >
          {formatWeekRange(weekStart)}
          <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${pickerOpen ? "rotate-180" : ""}`} />
        </button>

        {pickerOpen && (
          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 bg-popover border border-border rounded-md shadow-lg z-50">
            <MiniCalendar
              viewMonth={viewMonth}
              onChangeMonth={setViewMonth}
              onSelect={handleSelect}
              selectedMonday={weekStart}
            />
          </div>
        )}
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={() => onWeekChange(nextWeek(weekStart))}
      >
        <ChevronRight className="w-4 h-4" />
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onWeekChange(getMondayOf(new Date()))}
      >
        Today
      </Button>
    </div>
  );
}
