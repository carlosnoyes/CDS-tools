import { HOUR_LABELS, DAY_START_HOUR } from "@/utils/time";
import { resolveByInstructor, resolveByCar } from "@/utils/overlap";
import AppointmentBlock from "./AppointmentBlock";
import AvailabilityOverlay from "./AvailabilityOverlay";

/**
 * Derive lane seed keys from availability intervals.
 * For By Car: returns { carKeys, noCarInstructorKeys }
 * For By Instructor: returns { instructorKeys }
 */
function availabilitySeeds(availabilityIntervals, grouping) {
  if (grouping === "By Instructor") {
    const keys = [...new Set(availabilityIntervals.map((iv) => iv.instructorId).filter(Boolean))];
    return { instructorKeys: keys };
  }
  if (grouping === "By Car") {
    const carKeys = [...new Set(
      availabilityIntervals.filter((iv) => iv.vehicleId).map((iv) => iv.vehicleId)
    )];
    const noCarInstructorKeys = [...new Set(
      availabilityIntervals.filter((iv) => !iv.vehicleId).map((iv) => iv.instructorId).filter(Boolean)
    )];
    return { carKeys, noCarInstructorKeys };
  }
  return {};
}

function resolveForGrouping(appointments, grouping, seeds) {
  if (grouping === "By Instructor") {
    return resolveByInstructor(appointments, seeds.instructorKeys ?? []);
  }
  // By Car (default fallback)
  return resolveByCar(appointments, seeds.carKeys ?? [], seeds.noCarInstructorKeys ?? []);
}

/**
 * Annotate each availability interval with laneLeft / laneWidth percentages
 * matching the resolved lane layout.
 *
 * For By Car mode:
 *   - Intervals with a vehicleId → clip to that car's lane
 *   - Intervals with no vehicleId → clip to the "__unassigned__" lane,
 *     then further sub-clip by instructorId within that lane
 *
 * For By Instructor mode:
 *   - Clip each interval to its instructor lane
 */
function annotateAvailabilityLanes(intervals, laneOrder, laneWidth, grouping, noCarSubLaneOrder, noCarSubLaneWidth) {
  const numLanes = laneOrder.length;
  if (!numLanes) return intervals.map((iv) => ({ ...iv, laneLeft: "0%", laneWidth: "100%" }));

  return intervals.map((iv) => {
    if (grouping === "By Instructor") {
      const idx = laneOrder.indexOf(iv.instructorId);
      if (idx === -1) return { ...iv, laneLeft: "0%", laneWidth: "100%" };
      return { ...iv, laneLeft: `${idx * laneWidth}%`, laneWidth: `${laneWidth}%` };
    }

    // By Car
    if (iv.vehicleId) {
      const idx = laneOrder.indexOf(iv.vehicleId);
      if (idx === -1) return { ...iv, laneLeft: "0%", laneWidth: "100%" };
      return { ...iv, laneLeft: `${idx * laneWidth}%`, laneWidth: `${laneWidth}%` };
    }

    // No car — place in the __unassigned__ lane, sub-divided by instructor
    const unassignedIdx = laneOrder.indexOf("__unassigned__");
    if (unassignedIdx === -1) return { ...iv, laneLeft: "0%", laneWidth: "100%" };

    const unassignedLeft  = unassignedIdx * laneWidth;

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
  pxPerHour, grouping = "By Instructor", availabilityIntervals = [],
}) {
  const seeds = availabilitySeeds(availabilityIntervals, grouping);
  const { resolved, laneOrder, laneWidth } = resolveForGrouping(appointments, grouping, seeds);

  // For By Car: also resolve the sub-lane layout of the unassigned lane so we
  // can annotate availability intervals that have no car with the right geometry.
  let noCarSubLaneOrder = [];
  let noCarSubLaneWidth = 100;
  if (grouping === "By Car") {
    const noCarInstructorSeeds = seeds.noCarInstructorKeys ?? [];
    // Collect instructor keys from unassigned appointments too
    const unassignedAppts = appointments.filter((a) => !a.fields.Car?.[0]);
    const unassignedInstructorKeys = [
      ...new Set(unassignedAppts.map((a) => a.fields.Instructor?.[0]).filter(Boolean)),
    ];
    const allNoCarSeeds = [...new Set([...noCarInstructorSeeds, ...unassignedInstructorKeys])];
    if (allNoCarSeeds.length) {
      const subResult = resolveByInstructor([], allNoCarSeeds);
      noCarSubLaneOrder = subResult.laneOrder;
      noCarSubLaneWidth = subResult.laneWidth;
    }
  }

  const displayIntervals = annotateAvailabilityLanes(
    availabilityIntervals, laneOrder, laneWidth, grouping,
    noCarSubLaneOrder, noCarSubLaneWidth
  );

  function handleColumnClick(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const hour = Math.floor(y / pxPerHour) + DAY_START_HOUR;
    const clickedDate = new Date(date);
    clickedDate.setHours(hour, 0, 0, 0);
    onClickTime(clickedDate);
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

      {/* Appointment blocks */}
      {resolved.map(({ appt, left, width }) => (
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
