import { isToday, isSameDay } from "date-fns";
import { formatDayHeader, weekDays, toISODate } from "@/utils/time";
import TimeGutter from "./TimeGutter";
import DayColumn from "./DayColumn";

export default function WeekCalendar({
  weekStart,
  appointments,
  refData,
  onEdit,
  onCreateAt,
}) {
  const days = weekDays(weekStart);

  // Group appointments by day (using ISO date of Start field)
  function apptsByDay(date) {
    const dayStr = toISODate(date);
    return appointments.filter((a) => {
      if (!a.fields.Start) return false;
      return a.fields.Start.startsWith(dayStr);
    });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Day headers */}
      <div className="flex border-b bg-background sticky top-0 z-10">
        {/* Gutter header spacer */}
        <div className="w-14 shrink-0" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={`flex-1 text-center py-2 text-xs font-medium border-l border-border ${
              isToday(day) ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <div className={isToday(day) ? "font-bold" : ""}>{formatDayHeader(day)}</div>
          </div>
        ))}
      </div>

      {/* Scrollable time area */}
      <div className="flex overflow-y-auto flex-1">
        {/* Time gutter */}
        <div className="w-14 shrink-0 border-r border-border bg-background sticky left-0">
          <TimeGutter />
        </div>

        {/* Day columns */}
        {days.map((day) => (
          <div key={day.toISOString()} className="flex-1 min-w-0">
            <DayColumn
              date={day}
              appointments={apptsByDay(day)}
              refData={refData}
              onEdit={onEdit}
              onClickTime={(time) => onCreateAt(time)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
