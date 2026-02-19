import { useEffect, useRef } from "react";
import { isToday, eachWeekOfInterval, startOfYear, endOfYear, addDays } from "date-fns";
import { formatDayHeader, weekDays, toISODate, getMondayOf } from "@/utils/time";
import { expandAvailability } from "@/utils/availability";
import TimeGutter from "./TimeGutter";
import DayColumn from "./DayColumn";

// All weeks for the full calendar year containing `anchor`, plus a few weeks
// before/after so nav arrows near year boundaries feel seamless.
function getAllWeeks(anchor) {
  const yearStart = startOfYear(anchor);
  const yearEnd = endOfYear(anchor);
  const weeks = eachWeekOfInterval(
    { start: addDays(yearStart, -7), end: addDays(yearEnd, 7) },
    { weekStartsOn: 1 }
  );
  const seen = new Set();
  return weeks.filter((w) => {
    const key = w.toISOString();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function apptsByDay(appointments, date) {
  const dayStr = toISODate(date);
  return appointments.filter((a) => a.fields.Start?.startsWith(dayStr));
}

export default function CalendarGrid({
  grouping,
  anchor,
  appointments,
  refData,
  availabilityRecords,
  pxPerHour,
  dayColWidth,
  zoomMode,
  onSetZoomMode,
  onExitZoom,
  onAnchorChange,
  onEdit,
  onCreateAt,
  onVerticalZoom,
  onHorizontalZoom,
}) {
  const scrollRef = useRef(null);
  const weekRefs = useRef({});       // monday ISO → DOM element
  const anchorRef = useRef(anchor);  // track anchor without triggering re-render
  const scrollingToAnchor = useRef(false); // suppress observer during programmatic scroll

  const weeks = getAllWeeks(anchor);

  // Keep anchorRef in sync
  anchorRef.current = anchor;

  // ── Scroll to anchor week (instant on mount, smooth on nav-button click) ──
  const prevAnchorRef = useRef(null);
  useEffect(() => {
    const anchorKey = getMondayOf(anchor).toISOString();
    const el = weekRefs.current[anchorKey];
    if (!el || !scrollRef.current) return;

    const isFirstMount = prevAnchorRef.current === null;
    prevAnchorRef.current = anchorKey;

    scrollingToAnchor.current = true;
    el.scrollIntoView({ block: "start", behavior: isFirstMount ? "instant" : "smooth" });
    // Allow observer to resume after scroll settles
    setTimeout(() => { scrollingToAnchor.current = false; }, 600);
  // Only run when anchor changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor]);

  // ── IntersectionObserver: update anchor label as user scrolls ──
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (scrollingToAnchor.current) return;
        // Pick the topmost week row that is intersecting near the top of the viewport
        let best = null;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (!best || entry.boundingClientRect.top < best.boundingClientRect.top) {
            best = entry;
          }
        }
        if (best) {
          const mondayISO = best.target.dataset.monday;
          if (mondayISO) {
            const monday = new Date(mondayISO);
            // Only call if it actually changed
            if (monday.toISOString() !== getMondayOf(anchorRef.current).toISOString()) {
              onAnchorChange(monday);
            }
          }
        }
      },
      { root: container, threshold: 0, rootMargin: "-10px 0px -80% 0px" }
    );

    Object.values(weekRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  // Re-run when the week list changes (new year loaded)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weeks.length]);

  // ── Zoom mode: block container scroll so wheel only zooms ──
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !zoomMode) return;

    function blockScroll(e) {
      e.preventDefault();
    }
    container.addEventListener("wheel", blockScroll, { passive: false });
    return () => container.removeEventListener("wheel", blockScroll);
  }, [zoomMode]);

  // ── Keyboard Escape exits zoom ──
  useEffect(() => {
    if (!zoomMode) return;
    function onKey(e) { if (e.key === "Escape") onExitZoom(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomMode, onExitZoom]);

  function handleGutterDoubleClick(e) {
    e.preventDefault(); e.stopPropagation();
    onSetZoomMode(zoomMode === "vertical" ? null : "vertical");
  }
  function handleHeaderDoubleClick(e) {
    e.preventDefault(); e.stopPropagation();
    onSetZoomMode(zoomMode === "horizontal" ? null : "horizontal");
  }
  function handleGutterWheel(e) {
    if (zoomMode !== "vertical") return;
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    onVerticalZoom(e.deltaY > 0 ? 1 : -1);
  }
  function handleHeaderWheel(e) {
    if (zoomMode !== "horizontal") return;
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    onHorizontalZoom(e.deltaY > 0 ? 1 : -1);
  }
  function handleGridClick() {
    if (zoomMode) onExitZoom();
  }

  const gutterClass = zoomMode === "vertical"
    ? "w-14 shrink-0 border-r border-border bg-background ring-2 ring-inset ring-primary cursor-ns-resize"
    : "w-14 shrink-0 border-r border-border bg-background cursor-ns-resize";

  const headerZoneClass = zoomMode === "horizontal" ? "ring-2 ring-inset ring-primary" : "";

  return (
    <div
      ref={scrollRef}
      className="overflow-y-auto h-full"
      onClick={handleGridClick}
    >
      {weeks.map((monday) => {
        const weekDaysArr = weekDays(monday);
        const mondayKey = monday.toISOString();

        return (
          <div
            key={mondayKey}
            ref={(el) => { weekRefs.current[mondayKey] = el; }}
            data-monday={mondayKey}
            className="border-b border-border"
          >
            {/* Day header row — double-click for horizontal zoom */}
            <div
              className={`flex border-b bg-background sticky top-0 z-10 ${headerZoneClass}`}
              onDoubleClick={handleHeaderDoubleClick}
              onWheel={handleHeaderWheel}
              title={zoomMode === "horizontal"
                ? "Scroll to resize columns · Esc or click to lock"
                : "Double-click to resize columns"}
            >
              <div className="w-14 shrink-0" />
              {weekDaysArr.map((day) => (
                <div
                  key={day.toISOString()}
                  style={{ width: dayColWidth, flexShrink: 0 }}
                  className={`text-center py-1.5 text-xs font-medium border-l border-border ${
                    isToday(day) ? "text-primary font-bold" : "text-muted-foreground"
                  } ${zoomMode === "horizontal" ? "select-none" : ""}`}
                >
                  {formatDayHeader(day)}
                  {zoomMode === "horizontal" && (
                    <span className="ml-1 text-[9px] text-primary opacity-70">{dayColWidth}px</span>
                  )}
                </div>
              ))}
              {zoomMode === "horizontal" && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-primary font-medium pointer-events-none">
                  scroll to resize · esc to lock
                </div>
              )}
            </div>

            {/* Time grid */}
            <div className="flex">
              {/* Time gutter — double-click for vertical zoom */}
              <div
                className={`${gutterClass} relative`}
                onDoubleClick={handleGutterDoubleClick}
                onWheel={handleGutterWheel}
                title={zoomMode === "vertical"
                  ? "Scroll to resize rows · Esc or click to lock"
                  : "Double-click to resize rows"}
              >
                <TimeGutter pxPerHour={pxPerHour} />
                {zoomMode === "vertical" && (
                  <div className="absolute bottom-1 left-0 right-0 text-center text-[8px] text-primary pointer-events-none">
                    scroll · esc
                  </div>
                )}
              </div>

              {/* Day columns */}
              {weekDaysArr.map((day) => (
                <div key={day.toISOString()} style={{ width: dayColWidth, flexShrink: 0 }}>
                  <DayColumn
                    date={day}
                    appointments={apptsByDay(appointments, day)}
                    refData={refData}
                    pxPerHour={pxPerHour}
                    grouping={grouping}
                    availabilityIntervals={expandAvailability(availabilityRecords, day)}
                    onEdit={onEdit}
                    onClickTime={(time) => onCreateAt(time)}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
