import { DAY_START_HOUR, HOUR_LABELS } from "@/utils/time";
import { instructorColor } from "@/utils/colors";

/**
 * Renders translucent instructor-colored strips behind appointment blocks.
 * Each interval in `intervals` is { instructorId, vehicleId, startMs, endMs }.
 *
 * In By Instructor grouping the parent clips each strip to its lane via
 * left/width props. In Tight and By Car modes all strips paint across the
 * full column width (painter's order, overlapping washes are intentional).
 *
 * @param {object[]} intervals   - availability intervals for this day
 * @param {number}   pxPerHour   - vertical zoom value
 * @param {object}   refData     - reference data (instructors, vehicles maps)
 */
export default function AvailabilityOverlay({ intervals, pxPerHour, refData }) {
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

        // Build tooltip text (instructorMap / vehicleMap values are the fields objects directly)
        const instructorName =
          refData?.instructorMap?.[iv.instructorId]?.["Full Name"] ?? "Unknown";
        const vehicleName =
          iv.vehicleId
            ? (refData?.vehicleMap?.[iv.vehicleId]?.["Car Name"] ?? "Unknown Car")
            : null;

        const startLabel = new Date(iv.startMs).toLocaleTimeString("en-US", {
          hour: "numeric", minute: "2-digit",
        });
        const endLabel = new Date(iv.endMs).toLocaleTimeString("en-US", {
          hour: "numeric", minute: "2-digit",
        });

        const tooltip = vehicleName
          ? `${instructorName} — ${vehicleName} — ${startLabel}–${endLabel}`
          : `${instructorName} — ${startLabel}–${endLabel}`;

        return (
          <div
            key={idx}
            className="absolute pointer-events-auto"
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
          />
        );
      })}
    </>
  );
}
