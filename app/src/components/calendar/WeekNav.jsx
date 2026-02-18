import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getMondayOf, prevWeek, nextWeek, formatWeekRange } from "@/utils/time";

export default function WeekNav({ weekStart, onWeekChange }) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onWeekChange(prevWeek(weekStart))}
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>

      <span className="text-sm font-medium w-48 text-center">
        {formatWeekRange(weekStart)}
      </span>

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
