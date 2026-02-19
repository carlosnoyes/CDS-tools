import { format } from "date-fns";

function toInputDate(date) {
  return format(date, "yyyy-MM-dd");
}

export default function TableFilters({ startDate, endDate, onStartChange, onEndChange }) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium whitespace-nowrap">From</label>
        <input
          type="date"
          className="border rounded-md px-2 py-1.5 text-sm bg-background"
          value={toInputDate(startDate)}
          onChange={(e) => onStartChange(new Date(e.target.value + "T00:00:00"))}
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium whitespace-nowrap">To</label>
        <input
          type="date"
          className="border rounded-md px-2 py-1.5 text-sm bg-background"
          value={toInputDate(endDate)}
          onChange={(e) => onEndChange(new Date(e.target.value + "T00:00:00"))}
        />
      </div>
    </div>
  );
}
