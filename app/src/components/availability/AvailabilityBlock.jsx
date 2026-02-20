import { useRef, useCallback } from "react";
import { DAY_START_HOUR } from "@/utils/time";
import { instructorColor } from "@/utils/colors";
import { fullName } from "@/hooks/useReferenceData";

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SNAP_MINUTES = 15;

function snapHour(h) {
  return Math.round(h * (60 / SNAP_MINUTES)) / (60 / SNAP_MINUTES);
}

function hourLabel(h) {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  const ampm = hrs >= 12 ? "PM" : "AM";
  const display = hrs > 12 ? hrs - 12 : hrs === 0 ? 12 : hrs;
  return `${display}:${String(mins).padStart(2, "0")} ${ampm}`;
}

/**
 * A single availability block in the grid.
 * Supports click-to-edit, drag-to-resize (top/bottom edges), and drag-to-move.
 */
export default function AvailabilityBlock({
  block,
  pxPerHour,
  refData,
  isBlocked,
  showDayBadge,
  onClick,
  onResize,
  onMove,
  laneLeft,
  laneWidth,
}) {
  const blockRef = useRef(null);
  const color = instructorColor(block.instructorId);
  const instructorName = fullName(refData?.instructorMap?.[block.instructorId]);
  const vehicleName = block.vehicleId
    ? (refData?.vehicleMap?.[block.vehicleId]?.["Car Name"] ?? "")
    : "";

  const topPx = (block.startHour - DAY_START_HOUR) * pxPerHour;
  const heightPx = block.durationHours * pxPerHour;

  const startLabel = hourLabel(block.startHour);
  const endLabel = hourLabel(block.startHour + block.durationHours);

  // Drag-to-resize (top edge)
  const handleTopResize = useCallback(
    (e) => {
      e.stopPropagation();
      e.preventDefault();
      const startY = e.clientY;
      const origStart = block.startHour;
      const origEnd = block.startHour + block.durationHours;

      function onMouseMove(ev) {
        const deltaHours = (ev.clientY - startY) / pxPerHour;
        const newStart = snapHour(Math.max(DAY_START_HOUR, origStart + deltaHours));
        if (newStart < origEnd - 0.25) {
          // visual preview: update block style directly for smooth feel
          if (blockRef.current) {
            blockRef.current.style.top = `${(newStart - DAY_START_HOUR) * pxPerHour}px`;
            blockRef.current.style.height = `${(origEnd - newStart) * pxPerHour}px`;
          }
        }
      }
      function onMouseUp(ev) {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        const deltaHours = (ev.clientY - startY) / pxPerHour;
        const newStart = snapHour(Math.max(DAY_START_HOUR, origStart + deltaHours));
        if (newStart !== origStart && newStart < origEnd - 0.25 && onResize) {
          onResize(block, newStart, origEnd - newStart);
        }
      }
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [block, pxPerHour, onResize]
  );

  // Drag-to-resize (bottom edge)
  const handleBottomResize = useCallback(
    (e) => {
      e.stopPropagation();
      e.preventDefault();
      const startY = e.clientY;
      const origDuration = block.durationHours;

      function onMouseMove(ev) {
        const deltaHours = (ev.clientY - startY) / pxPerHour;
        const newDuration = snapHour(Math.max(0.25, origDuration + deltaHours));
        if (blockRef.current) {
          blockRef.current.style.height = `${newDuration * pxPerHour}px`;
        }
      }
      function onMouseUp(ev) {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        const deltaHours = (ev.clientY - startY) / pxPerHour;
        const newDuration = snapHour(Math.max(0.25, origDuration + deltaHours));
        if (newDuration !== origDuration && onResize) {
          onResize(block, block.startHour, newDuration);
        }
      }
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [block, pxPerHour, onResize]
  );

  const showLabel = heightPx >= 28;
  const showVehicle = heightPx >= 44;
  const showTime = heightPx >= 58;

  const bgStyle = isBlocked
    ? {
        background: `repeating-linear-gradient(
          45deg,
          ${color}15,
          ${color}15 4px,
          ${color}08 4px,
          ${color}08 8px
        )`,
        borderLeft: `3px solid ${color}60`,
      }
    : {
        backgroundColor: color + "30",
        borderLeft: `3px solid ${color}80`,
      };

  return (
    <div
      ref={blockRef}
      className="absolute overflow-hidden rounded-sm cursor-pointer select-none group"
      style={{
        top: topPx,
        height: heightPx,
        left: laneLeft ?? 0,
        width: laneWidth ?? "100%",
        ...bgStyle,
        zIndex: isBlocked ? 2 : 1,
      }}
      title={`${instructorName}${vehicleName ? ` — ${vehicleName}` : ""}${block.location ? ` — ${block.location}` : ""}\n${startLabel} – ${endLabel}${block.cadence === "Bi-Weekly" ? " (Bi-Weekly)" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(block);
      }}
    >
      {/* Top resize handle */}
      {!isBlocked && onResize && (
        <div
          className="absolute top-0 left-0 right-0 h-1.5 cursor-ns-resize opacity-0 group-hover:opacity-100 bg-black/10"
          onMouseDown={handleTopResize}
        />
      )}

      {/* Content */}
      {showLabel && (
        <div className="px-1 pt-0.5 leading-tight pointer-events-none">
          {showDayBadge && (
            <span
              className="text-[9px] font-bold uppercase rounded px-1 mr-1"
              style={{ backgroundColor: color + "30", color: color }}
            >
              {block.dayName ?? DAY_SHORT[block.dayOfWeek]}
            </span>
          )}
          <div className="text-[10px] font-medium truncate" style={{ color }}>
            {instructorName}
          </div>
          {showVehicle && vehicleName && (
            <div className="text-[9px] truncate" style={{ color: color + "bb" }}>
              {vehicleName}{block.location ? ` · ${block.location}` : ""}
            </div>
          )}
          {showTime && (
            <div className="text-[9px] truncate" style={{ color: color + "99" }}>
              {startLabel} – {endLabel}
            </div>
          )}
        </div>
      )}

      {/* Bottom resize handle */}
      {!isBlocked && onResize && (
        <div
          className="absolute bottom-0 left-0 right-0 h-1.5 cursor-ns-resize opacity-0 group-hover:opacity-100 bg-black/10"
          onMouseDown={handleBottomResize}
        />
      )}
    </div>
  );
}
