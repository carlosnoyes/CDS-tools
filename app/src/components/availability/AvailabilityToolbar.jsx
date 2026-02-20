import { ChevronLeft, ChevronRight, Plus, UserX, CarFront } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatWeekRange } from "@/utils/time";

const DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

export default function AvailabilityToolbar({
  mode,
  onModeChange,
  selectedDay,
  onDayChange,
  weekMonday,
  onPrevWeek,
  onNextWeek,
  onToday,
  onNew,
  onBlockInstructor,
  onBlockCar,
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b bg-white flex-wrap">
      {/* Mode toggle */}
      <div className="flex items-center rounded-md border">
        <button
          onClick={() => onModeChange("recurring")}
          className={`px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "recurring"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          } rounded-l-md`}
        >
          Recurring
        </button>
        <button
          onClick={() => onModeChange("week")}
          className={`px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "week"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          } rounded-r-md`}
        >
          Week View
        </button>
      </div>

      {/* Day-of-week selector (both modes — in week view acts as single-day filter) */}
      <div className="flex items-center gap-0.5">
        {DAYS.map((d) => (
          <button
            key={d.value}
            onClick={() => onDayChange(selectedDay === d.value && mode === "week" ? null : d.value)}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              selectedDay === d.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            {d.label}
          </button>
        ))}
        {mode === "week" && selectedDay !== null && (
          <button
            onClick={() => onDayChange(null)}
            className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            All
          </button>
        )}
      </div>

      {/* Week nav (week view only) */}
      {mode === "week" && (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onPrevWeek}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <button
            onClick={onToday}
            className="text-sm font-medium px-2 py-1 rounded hover:bg-accent transition-colors"
          >
            {formatWeekRange(weekMonday)}
          </button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onNextWeek}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions */}
      <Button variant="outline" size="sm" onClick={onBlockInstructor}>
        <UserX className="w-4 h-4 mr-1" />
        Block Instructor
      </Button>
      <Button variant="outline" size="sm" onClick={onBlockCar}>
        <CarFront className="w-4 h-4 mr-1" />
        Block Car
      </Button>
      <Button size="sm" onClick={onNew}>
        <Plus className="w-4 h-4 mr-1" />
        New
      </Button>
    </div>
  );
}
