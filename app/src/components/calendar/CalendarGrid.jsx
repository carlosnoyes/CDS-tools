import { useEffect, useRef, useCallback } from "react";
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
  onVerticalZoom,
  onHorizontalZoom,
  onGutterResize,
  onColResize,
  onPopoutDay,
}) {
  const scrollRef = useRef(null);
  const weekRefs = useRef({});       // monday ISO → DOM element
  const anchorRef = useRef(anchor);  // track anchor without triggering re-render
  const scrollingToAnchor = useRef(false); // suppress observer during programmatic scroll

  const weeks = getAllWeeks(anchor);

  // Keep anchorRef in sync
  anchorRef.current = anchor;

  // ── Scroll to target week — only fires when a nav button sets scrollTarget ──
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
    setTimeout(() => { scrollingToAnchor.current = false; }, 600);
  // Run when scrollTarget.seq changes (seq increments on every nav-button press)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollTarget?.seq]);

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

  // ── Drag-to-resize: gutter ──
  const startDragGutter = useCallback((e) => {
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
  }, [gutterWidth, onGutterResize]);

  // ── Drag-to-resize: column ──
  const startDragCol = useCallback((e) => {
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
  }, [dayColWidth, onColResize]);

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

  const gutterBase = zoomMode === "vertical"
    ? "shrink-0 border-r border-border bg-background ring-2 ring-inset ring-primary cursor-ns-resize"
    : "shrink-0 border-r border-border bg-background cursor-ns-resize";

  const headerZoneClass = zoomMode === "horizontal" ? "ring-2 ring-inset ring-primary" : "";

  // Total content width — used to size the inner container so the outer
  // scroll container can scroll both axes independently.
  const totalContentWidth = gutterWidth + 7 * dayColWidth;

  return (
    // Outer: single scroll container for both axes
    <div
      ref={scrollRef}
      className="overflow-auto h-full"
      onClick={handleGridClick}
    >
      {/* Inner: sized to full content width so horizontal scroll works */}
      <div style={{ minWidth: totalContentWidth }}>
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
              {/* Day header row — sticky top, double-click background for horizontal zoom */}
              <div
                className={`flex border-b bg-background sticky top-0 z-10 ${headerZoneClass}`}
                onDoubleClick={handleHeaderDoubleClick}
                onWheel={handleHeaderWheel}
                title={zoomMode === "horizontal"
                  ? "Scroll to resize columns · Esc or click to lock"
                  : "Double-click background to resize columns"}
              >
                {/* Gutter spacer — sticky left so it stays visible on horizontal scroll */}
                <div
                  className="relative shrink-0 bg-background sticky left-0 z-20"
                  style={{ width: gutterWidth }}
                >
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
                    {/* Day label — double-click opens day popout */}
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
                    {/* Column drag handle on right edge */}
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
                    scroll to resize · esc to lock
                  </div>
                )}
              </div>

              {/* Time grid */}
              <div className="flex">
                {/* Time gutter — sticky left so it stays visible on horizontal scroll */}
                <div
                  className={`${gutterBase} relative sticky left-0 z-10`}
                  style={{ width: gutterWidth }}
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
                  {/* Gutter drag handle on right edge */}
                  <div
                    className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-primary/30 z-20"
                    onMouseDown={startDragGutter}
                    onDoubleClick={(e) => e.stopPropagation()}
                  />
                </div>

                {/* Day columns */}
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
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
