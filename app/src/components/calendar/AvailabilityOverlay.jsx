import { DAY_START_HOUR, HOUR_LABELS } from "@/utils/time";
import { instructorColor } from "@/utils/colors";
import { fullName } from "@/hooks/useReferenceData";

/**
 * Renders translucent instructor-colored strips behind appointment blocks.
 * Each interval in `intervals` is { instructorId, vehicleId, startMs, endMs }.
 * Strips are clipped to their lane (laneLeft / laneWidth set by DayColumn).
 * Shows inline text labels (instructor name + car name) and a tooltip with time range.
 *
 * @param {object[]} intervals   - availability intervals for this day
 * @param {number}   pxPerHour   - vertical zoom value
 * @param {object}   refData     - reference data (instructors, vehicles maps)
 */
export default function AvailabilityOverlay({ intervals, pxPerHour, refData, date, onClickTime }) {
  if (!intervals?.length) return null;

  return (
    <>
      {intervals.map((iv, idx) => {
        const color = instructorColor(iv.instructorId);

        // Convert absolute ms to hours-of-day for positioning
        const ivDate = new Date(iv.startMs);
        const startHour = ivDate.getHours() + ivDate.getMinutes() / 60;
        const durationHours = (iv.endMs - iv.startMs) / 3_600_000;

        // Clamp to visible calendar range
        const clampedStart = Math.max(startHour, DAY_START_HOUR);
        const dayEndHour = DAY_START_HOUR + HOUR_LABELS.length;
        const endHour = startHour + durationHours;
        const clampedEnd = Math.min(endHour, dayEndHour);

        if (clampedEnd <= clampedStart) return null;

        const topPx = (clampedStart - DAY_START_HOUR) * pxPerHour;
        const heightPx = (clampedEnd - clampedStart) * pxPerHour;

        const instructorName = fullName(refData?.instructorMap?.[iv.instructorId]);
        const vehicleName =
          iv.vehicleId
            ? (refData?.vehicleMap?.[iv.vehicleId]?.["Car Name"] ?? "Unknown Car")
            : null;
        const locationLabel = iv.location ?? null;

        const startLabel = new Date(iv.startMs).toLocaleTimeString("en-US", {
          hour: "numeric", minute: "2-digit",
        });
        const endLabel = new Date(iv.endMs).toLocaleTimeString("en-US", {
          hour: "numeric", minute: "2-digit",
        });

        // Tooltip: instructor, car (if any), location (if any), time range
        const tooltipParts = [instructorName];
        if (vehicleName) tooltipParts.push(vehicleName);
        if (locationLabel) tooltipParts.push(locationLabel);
        tooltipParts.push(`${startLabel} – ${endLabel}`);
        const tooltip = tooltipParts.join("\n");

        // Only show inline label text when the strip is tall enough
        const showLabel = heightPx >= 28;

        function handleStripClick(e) {
          e.stopPropagation(); // don't bubble to column's generic click handler
          const rect = e.currentTarget.getBoundingClientRect();
          const y = e.clientY - rect.top;
          // Hour offset within this strip, then add the strip's own start hour
          const hourOffset = Math.floor(y / pxPerHour);
          const clickedHour = Math.floor(clampedStart) + hourOffset;
          const clickedDate = new Date(date);
          clickedDate.setHours(clickedHour, 0, 0, 0);
          onClickTime({
            time: clickedDate,
            instructorId: iv.instructorId,
            carId: iv.vehicleId ?? null,
            locationId: iv.location ?? null,
          });
        }

        return (
          <div
            key={idx}
            className="absolute overflow-hidden cursor-pointer"
            style={{
              top: topPx,
              height: heightPx,
              backgroundColor: color + "1a", // ~10% opacity
              borderLeft: `3px solid ${color}40`,
              zIndex: 0,
              left: iv.laneLeft ?? 0,
              width: iv.laneWidth ?? "100%",
            }}
            title={tooltip}
            onClick={handleStripClick}
          >
            {showLabel && (
              <div className="px-1 pt-0.5 leading-tight pointer-events-none select-none">
                <div
                  className="text-[10px] font-medium truncate"
                  style={{ color: color + "cc" }}
                >
                  {instructorName}
                </div>
                {vehicleName && heightPx >= 42 && (
                  <div
                    className="text-[9px] truncate"
                    style={{ color: color + "99" }}
                  >
                    {vehicleName}
                  </div>
                )}
                {locationLabel && heightPx >= 56 && (
                  <div
                    className="text-[9px] truncate"
                    style={{ color: color + "99" }}
                  >
                    {locationLabel}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
