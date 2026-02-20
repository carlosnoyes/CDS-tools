import { useMemo } from "react";
import { HOUR_LABELS, DAY_START_HOUR } from "@/utils/time";
import { sortLaneKeys, laneLabel } from "@/utils/availabilityView";
import ResourceColumn from "./ResourceColumn";

const DAY_SHORT_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEK_DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Main grid container for the Availability view.
 * Renders a time gutter on the left and one ResourceColumn per active resource lane.
 */
export default function AvailabilityGrid({
  scheduledByLane,
  blockedByLane,
  pxPerHour,
  refData,
  showDayBadge,
  daySubColumns,
  onClickBlock,
  onClickEmpty,
  onResize,
}) {
  const totalHeight = HOUR_LABELS.length * pxPerHour;

  // Collect all lane keys from both scheduled and blocked, then sort
  const allKeys = useMemo(() => {
    const keys = new Set();
    if (scheduledByLane) for (const k of scheduledByLane.keys()) keys.add(k);
    if (blockedByLane) for (const k of blockedByLane.keys()) keys.add(k);
    return sortLaneKeys([...keys]);
  }, [scheduledByLane, blockedByLane]);

  if (allKeys.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        No availability records for this day. Click "+ New" to create one.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="flex min-w-0">
        {/* Time gutter */}
        <div className="shrink-0 border-r border-border" style={{ width: 56 }}>
          {/* Header spacer */}
          <div className="h-10 border-b border-border" />
          {/* Hour labels */}
          <div className="relative" style={{ height: totalHeight }}>
            {HOUR_LABELS.map(({ hour, label }) => (
              <div
                key={hour}
                className="absolute right-2 text-xs text-muted-foreground"
                style={{ top: (hour - DAY_START_HOUR) * pxPerHour - 8 }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Resource columns */}
        {allKeys.map((key) => (
          <div key={key} className="flex flex-col min-w-0" style={{ flex: "1 1 0", minWidth: 100 }}>
            {/* Column header */}
            <div className="h-10 border-b border-r border-border flex flex-col items-center justify-center px-1">
              <span className="text-xs font-medium truncate">{laneLabel(key)}</span>
              {/* Day sub-headers for week view */}
              {daySubColumns > 1 && (
                <div className="flex w-full">
                  {WEEK_DAY_HEADERS.map((d, i) => (
                    <span
                      key={i}
                      className="flex-1 text-center text-[8px] text-muted-foreground"
                    >
                      {d.charAt(0)}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {/* Column body */}
            <ResourceColumn
              laneKey={key}
              label={laneLabel(key)}
              blocks={scheduledByLane?.get(key) ?? []}
              blockedOverlays={blockedByLane?.get(key) ?? []}
              pxPerHour={pxPerHour}
              refData={refData}
              showDayBadge={showDayBadge}
              daySubColumns={daySubColumns}
              onClickBlock={onClickBlock}
              onClickEmpty={onClickEmpty}
              onResize={onResize}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
