import { Button } from "@/components/ui/button";
import { LOCATIONS } from "@/utils/constants";
import { formatWeekRange, prevWeek, nextWeek, getMondayOf } from "@/utils/time";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function TableFilters({
  filters,
  onFilterChange,
  instructorOptions,
  weekStart,
  onWeekChange,
}) {
  function set(key, value) {
    onFilterChange((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      {/* Week navigation */}
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" onClick={() => onWeekChange(prevWeek(weekStart))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-medium w-44 text-center">
          {formatWeekRange(weekStart)}
        </span>
        <Button variant="outline" size="icon" onClick={() => onWeekChange(nextWeek(weekStart))}>
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

      {/* Instructor filter */}
      <select
        className="border rounded-md px-2 py-1.5 text-sm bg-background"
        value={filters.instructor}
        onChange={(e) => set("instructor", e.target.value)}
      >
        <option value="">All Instructors</option>
        {instructorOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {/* Location filter */}
      <select
        className="border rounded-md px-2 py-1.5 text-sm bg-background"
        value={filters.location}
        onChange={(e) => set("location", e.target.value)}
      >
        <option value="">All Locations</option>
        {LOCATIONS.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>

      {/* Clear filters */}
      {(filters.instructor || filters.location) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFilterChange({ instructor: "", location: "" })}
        >
          Clear
        </Button>
      )}
    </div>
  );
}
