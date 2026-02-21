import { HOUR_LABELS, DAY_START_HOUR } from "@/utils/time";
import { CLASSROOMS } from "@/utils/constants";
import { resolveByInstructor, resolveByCar } from "@/utils/overlap";
import AppointmentBlock from "./AppointmentBlock";
import AvailabilityOverlay from "./AvailabilityOverlay";

/**
 * Build the seed arrays for lane layout — only includes lanes that are active on this day.
 * Cars: vehicle IDs present in availability intervals, sorted by Car Name.
 * Classrooms: only classrooms that have at least one appointment today, in CLASSROOMS order.
 * No-car instructor seeds: from availability intervals with no vehicle.
 *
 * A lane is omitted entirely if it has no availability and no appointments — empty lanes
 * take no space so the available width is shared among active lanes only.
 */
function buildSeeds(availabilityIntervals, appointments, refData) {
  // Car seeds: vehicle IDs seen in availability today, sorted numerically by Car Name
  const carIds = [...new Set(
    availabilityIntervals.filter((iv) => iv.vehicleId).map((iv) => iv.vehicleId)
  )];
  const sortedCarKeys = carIds.slice().sort((a, b) => {
    const nameA = refData.vehicleMap?.[a]?.["Car Name"] ?? a;
    const nameB = refData.vehicleMap?.[b]?.["Car Name"] ?? b;
    return nameA.localeCompare(nameB, undefined, { numeric: true });
  });

  // Classroom seeds: only classrooms actually used by appointments today, in stable order
  const usedClassrooms = new Set(
    appointments.map((a) => a.fields.Classroom).filter(Boolean)
  );
  const classroomKeys = CLASSROOMS.filter((c) => usedClassrooms.has(c));

  // No-car instructor seeds for the unassigned sub-lane
  const noCarInstructorKeys = [...new Set(
    availabilityIntervals.filter((iv) => !iv.vehicleId).map((iv) => iv.instructorId).filter(Boolean)
  )];

  return { sortedCarKeys, classroomKeys, noCarInstructorKeys };
}

/**
 * Annotate each availability interval with laneLeft / laneWidth percentages.
 * Intervals with a car clip to that car's lane.
 * Intervals with no car clip to the instructor's sub-lane within the __unassigned__ lane.
 */
function annotateAvailabilityLanes(intervals, laneOrder, laneWidth, noCarSubLaneOrder, noCarSubLaneWidth) {
  const numLanes = laneOrder.length;
  if (!numLanes) return intervals.map((iv) => ({ ...iv, laneLeft: "0%", laneWidth: "100%" }));

  return intervals.map((iv) => {
    if (iv.vehicleId) {
      const idx = laneOrder.indexOf(iv.vehicleId);
      if (idx === -1) return { ...iv, laneLeft: "0%", laneWidth: "100%" };
      return { ...iv, laneLeft: `${idx * laneWidth}%`, laneWidth: `${laneWidth}%` };
    }

    // No car — place in the __unassigned__ lane, sub-divided by instructor
    const unassignedIdx = laneOrder.indexOf("__unassigned__");
    if (unassignedIdx === -1) return { ...iv, laneLeft: "0%", laneWidth: "100%" };

    const unassignedLeft = unassignedIdx * laneWidth;

    if (!noCarSubLaneOrder?.length) {
      return { ...iv, laneLeft: `${unassignedLeft}%`, laneWidth: `${laneWidth}%` };
    }

    const subIdx = noCarSubLaneOrder.indexOf(iv.instructorId);
    if (subIdx === -1) {
      return { ...iv, laneLeft: `${unassignedLeft}%`, laneWidth: `${laneWidth}%` };
    }

    const subLeft  = unassignedLeft + subIdx * noCarSubLaneWidth * (laneWidth / 100);
    const subWidth = noCarSubLaneWidth * (laneWidth / 100);
    return { ...iv, laneLeft: `${subLeft}%`, laneWidth: `${subWidth}%` };
  });
}

export default function DayColumn({
  appointments, refData, onEdit, onClickTime, date,
  pxPerHour, availabilityIntervals = [],
  onClickAvailability, hideAppointments,
}) {
  const { sortedCarKeys, classroomKeys, noCarInstructorKeys } = buildSeeds(availabilityIntervals, appointments, refData);

  const { resolved, laneOrder, laneWidth } = resolveByCar(
    appointments, sortedCarKeys, noCarInstructorKeys, classroomKeys
  );

  // Resolve sub-lane layout for the unassigned (no car, no classroom) lane
  let noCarSubLaneOrder = [];
  let noCarSubLaneWidth = 100;
  const unassignedAppts = appointments.filter((a) => !a.fields.Car?.[0] && !a.fields.Classroom);
  const unassignedInstructorKeys = [
    ...new Set(unassignedAppts.map((a) => a.fields.Instructor?.[0]).filter(Boolean)),
  ];
  const allNoCarSeeds = [...new Set([...noCarInstructorKeys, ...unassignedInstructorKeys])];
  if (allNoCarSeeds.length) {
    const subResult = resolveByInstructor([], allNoCarSeeds);
    noCarSubLaneOrder = subResult.laneOrder;
    noCarSubLaneWidth = subResult.laneWidth;
  }

  const displayIntervals = annotateAvailabilityLanes(
    availabilityIntervals, laneOrder, laneWidth,
    noCarSubLaneOrder, noCarSubLaneWidth
  );

  // Column-level click fires when clicking outside an availability strip or appointment.
  // Strips stop propagation and fire onClickTime themselves with instructor/car pre-fill.
  function handleColumnClick(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const hour = Math.floor(y / pxPerHour) + DAY_START_HOUR;
    const clickedDate = new Date(date);
    clickedDate.setHours(hour, 0, 0, 0);
    onClickTime({ time: clickedDate, instructorId: null, carId: null });
  }

  const totalHeight = HOUR_LABELS.length * pxPerHour;

  return (
    <div
      className="relative border-l border-border"
      style={{ height: totalHeight }}
      onClick={handleColumnClick}
    >
      {/* Availability overlay — behind grid lines and appointment blocks */}
      <AvailabilityOverlay
        intervals={displayIntervals}
        pxPerHour={pxPerHour}
        refData={refData}
        date={date}
        onClickTime={onClickTime}
        onClickAvailability={onClickAvailability}
      />

      {/* Hour grid lines */}
      {HOUR_LABELS.map(({ hour }) => (
        <div
          key={hour}
          className="absolute w-full border-t border-border/40"
          style={{ top: (hour - DAY_START_HOUR) * pxPerHour }}
        />
      ))}
      {/* Half-hour lines */}
      {HOUR_LABELS.map(({ hour }) => (
        <div
          key={`${hour}-half`}
          className="absolute w-full border-t border-border/20"
          style={{ top: (hour - DAY_START_HOUR) * pxPerHour + pxPerHour / 2 }}
        />
      ))}

      {/* Appointment blocks — hidden in availability-only mode */}
      {!hideAppointments && resolved.map(({ appt, left, width }) => (
        <AppointmentBlock
          key={appt.id}
          appt={appt}
          left={left}
          width={width}
          refData={refData}
          pxPerHour={pxPerHour}
          onClick={(a) => onEdit(a)}
        />
      ))}
    </div>
  );
}
