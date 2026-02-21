import { useEffect, useRef, useCallback } from "react";
import { isToday, eachWeekOfInterval, startOfYear, endOfYear, addDays } from "date-fns";
import { formatDayHeader, weekDays, toISODate, getMondayOf, HOUR_LABELS } from "@/utils/time";
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
  anchor,
  scrollTarget,
  appointments,
  refData,
  availabilityRecords,
  pxPerHour,
  dayColWidth,
  gutterWidth,
  zoomMode,
  onSetZoomMode,
  onExitZoom,
  onAnchorChange,
  onEdit,
  onCreateAt,
  onVerticalResize,
  onHorizontalZoom,
  onGutterResize,
  onColResize,
  onPopoutDay,
  onClickAvailability,
  hideAppointments,
}) {
  const scrollRef = useRef(null);
  const weekRefs = useRef({});
  const anchorRef = useRef(anchor);
  const scrollingToAnchor = useRef(false);

  const weeks = getAllWeeks(anchor);
  anchorRef.current = anchor;

  // Scroll to target week when nav sets scrollTarget
  const prevSeqRef = useRef(-1);
  useEffect(() => {
    if (!scrollTarget) return;
    const targetKey = getMondayOf(scrollTarget.date).toISOString();
    const el = weekRefs.current[targetKey];
    if (!el || !scrollRef.current) return;

    const isFirstMount = prevSeqRef.current === -1;
    prevSeqRef.current = scrollTarget.seq;

    scrollingToAnchor.current = true;
    el.scrollIntoView({ block: "start", behavior: isFirstMount ? "instant" : "smooth" });
    setTimeout(() => {
      scrollingToAnchor.current = false;
    }, 600);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollTarget?.seq]);

  // Update nav anchor while user scrolls
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (scrollingToAnchor.current) return;
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weeks.length]);

  // Horizontal zoom mode blocks wheel scroll to make wheel exclusively resize columns.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !zoomMode) return;

    function blockScroll(e) {
      e.preventDefault();
    }
    container.addEventListener("wheel", blockScroll, { passive: false });
    return () => container.removeEventListener("wheel", blockScroll);
  }, [zoomMode]);

  useEffect(() => {
    if (!zoomMode) return;
    function onKey(e) {
      if (e.key === "Escape") onExitZoom();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomMode, onExitZoom]);

  // Drag-to-resize: gutter width
  const startDragGutter = useCallback(
    (e) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = gutterWidth;
      function onMove(mv) {
        onGutterResize(startWidth + (mv.clientX - startX));
      }
      function onUp() {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      }
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [gutterWidth, onGutterResize]
  );

  // Drag-to-resize: column width
  const startDragCol = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startWidth = dayColWidth;
      function onMove(mv) {
        onColResize(startWidth + (mv.clientX - startX));
      }
      function onUp() {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      }
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [dayColWidth, onColResize]
  );

  // Drag-to-resize: vertical scale using end-of-day line.
  const dayHourCount = HOUR_LABELS.length;
  const startDragVertical = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      const startY = e.clientY;
      const startPx = pxPerHour;
      function onMove(mv) {
        const deltaY = mv.clientY - startY;
        const nextPx = startPx + deltaY / dayHourCount;
        onVerticalResize(nextPx);
      }
      function onUp() {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      }
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [pxPerHour, dayHourCount, onVerticalResize]
  );

  function handleHeaderDoubleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    onSetZoomMode(zoomMode === "horizontal" ? null : "horizontal");
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

  const headerZoneClass = zoomMode === "horizontal" ? "ring-2 ring-inset ring-primary" : "";
  const totalContentWidth = gutterWidth + 7 * dayColWidth;

  return (
    <div ref={scrollRef} className="overflow-auto h-full" onClick={handleGridClick}>
      <div style={{ minWidth: totalContentWidth }}>
        {weeks.map((monday) => {
          const weekDaysArr = weekDays(monday);
          const mondayKey = monday.toISOString();

          return (
            <div
              key={mondayKey}
              ref={(el) => {
                weekRefs.current[mondayKey] = el;
              }}
              data-monday={mondayKey}
              className="border-b border-border"
            >
              <div
                className={`flex border-b bg-background sticky top-0 z-10 ${headerZoneClass}`}
                onDoubleClick={handleHeaderDoubleClick}
                onWheel={handleHeaderWheel}
                title={
                  zoomMode === "horizontal"
                    ? "Scroll to resize columns | Esc or click to lock"
                    : "Double-click background to resize columns"
                }
              >
                <div className="relative shrink-0 bg-background sticky left-0 z-20" style={{ width: gutterWidth }}>
                  <div
                    className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-primary/30 z-20"
                    onMouseDown={startDragGutter}
                    onDoubleClick={(e) => e.stopPropagation()}
                    title="Drag to resize time gutter"
                  />
                </div>

                {weekDaysArr.map((day) => (
                  <div
                    key={day.toISOString()}
                    style={{ width: dayColWidth, flexShrink: 0 }}
                    className="relative border-l border-border"
                  >
                    <div
                      className={`text-center py-1.5 text-xs font-medium ${
                        isToday(day) ? "text-primary font-bold" : "text-muted-foreground"
                      } ${zoomMode === "horizontal" ? "select-none" : ""} cursor-pointer hover:text-foreground`}
                      onDoubleClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onPopoutDay(day);
                      }}
                      title="Double-click to open day view"
                    >
                      {formatDayHeader(day)}
                      {zoomMode === "horizontal" && (
                        <span className="ml-1 text-[9px] text-primary opacity-70">{dayColWidth}px</span>
                      )}
                    </div>
                    <div
                      className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-primary/30 z-20"
                      onMouseDown={startDragCol}
                      onDoubleClick={(e) => e.stopPropagation()}
                      title="Drag to resize columns"
                    />
                  </div>
                ))}

                {zoomMode === "horizontal" && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-primary font-medium pointer-events-none">
                    scroll to resize | esc to lock
                  </div>
                )}
              </div>

              <div className="relative flex">
                <div className="shrink-0 border-r border-border bg-background relative sticky left-0 z-10" style={{ width: gutterWidth }} title="Time axis">
                  <TimeGutter pxPerHour={pxPerHour} />
                  <div
                    className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-primary/30 z-20"
                    onMouseDown={startDragGutter}
                    onDoubleClick={(e) => e.stopPropagation()}
                    title="Drag to resize time gutter"
                  />
                </div>

                {weekDaysArr.map((day) => (
                  <div key={day.toISOString()} style={{ width: dayColWidth, flexShrink: 0 }}>
                    <DayColumn
                      date={day}
                      appointments={apptsByDay(appointments, day)}
                      refData={refData}
                      pxPerHour={pxPerHour}
                      availabilityIntervals={expandAvailability(availabilityRecords, day)}
                      onEdit={onEdit}
                      onClickTime={(time) => onCreateAt(time)}
                      onClickAvailability={onClickAvailability}
                      hideAppointments={hideAppointments}
                    />
                  </div>
                ))}

                <div
                  className="absolute left-0 right-0 bottom-0 h-1.5 cursor-row-resize hover:bg-primary/40 z-30"
                  onMouseDown={startDragVertical}
                  title="Drag end-of-day line to resize vertical scale"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
