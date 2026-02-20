import { DAY_START_HOUR, HOUR_LABELS } from "@/utils/time";
import AvailabilityBlock from "./AvailabilityBlock";

/**
 * A single resource lane column in the availability grid.
 * Renders hour grid lines and positioned availability blocks.
 */
export default function ResourceColumn({
  laneKey,
  label,
  blocks = [],
  blockedOverlays = [],
  pxPerHour,
  refData,
  showDayBadge,
  daySubColumns,
  onClickBlock,
  onClickEmpty,
  onResize,
}) {
  const totalHeight = HOUR_LABELS.length * pxPerHour;

  function handleColumnClick(e) {
    if (e.defaultPrevented) return;
    // Compute clicked hour from Y position
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const rawHour = DAY_START_HOUR + y / pxPerHour;
    const snappedHour = Math.floor(rawHour);
    onClickEmpty?.({ laneKey, hour: snappedHour });
  }

  // If daySubColumns is set (Week View full-week mode), render sub-columns
  const numSubCols = daySubColumns ?? 1;

  return (
    <div
      className="relative border-r border-border/50 cursor-pointer"
      style={{ height: totalHeight, minWidth: 100, flex: "1 1 0" }}
      onClick={handleColumnClick}
    >
      {/* Hour grid lines */}
      {HOUR_LABELS.map(({ hour }) => (
        <div
          key={hour}
          className="absolute left-0 right-0 border-t border-border/30"
          style={{ top: (hour - DAY_START_HOUR) * pxPerHour }}
        />
      ))}

      {/* Scheduled blocks */}
      {blocks.map((block, idx) => {
        // In sub-column mode, position block within its day sub-column
        let laneLeft = "0%";
        let laneWidth = "100%";
        if (numSubCols > 1 && block.dayIndex != null) {
          const pct = 100 / numSubCols;
          laneLeft = `${block.dayIndex * pct}%`;
          laneWidth = `${pct}%`;
        }

        return (
          <AvailabilityBlock
            key={`s-${idx}`}
            block={block}
            pxPerHour={pxPerHour}
            refData={refData}
            isBlocked={false}
            showDayBadge={showDayBadge}
            onClick={onClickBlock}
            onResize={onResize}
            laneLeft={laneLeft}
            laneWidth={laneWidth}
          />
        );
      })}

      {/* Blocked overlays (Week View) */}
      {blockedOverlays.map((block, idx) => {
        let laneLeft = "0%";
        let laneWidth = "100%";
        if (numSubCols > 1 && block.dayIndex != null) {
          const pct = 100 / numSubCols;
          laneLeft = `${block.dayIndex * pct}%`;
          laneWidth = `${pct}%`;
        }

        return (
          <AvailabilityBlock
            key={`b-${idx}`}
            block={block}
            pxPerHour={pxPerHour}
            refData={refData}
            isBlocked={true}
            showDayBadge={false}
            onClick={onClickBlock}
            laneLeft={laneLeft}
            laneWidth={laneWidth}
          />
        );
      })}
    </div>
  );
}
