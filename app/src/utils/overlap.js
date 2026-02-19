import { parseISO } from "date-fns";

// ─────────────────────────────────────────────────────────────
// Tight mode — pure overlap resolution, no lane concept
// ─────────────────────────────────────────────────────────────

// Groups a sorted list of appointments into overlap clusters.
// Each cluster is a set where any two appointments share some time.
function buildClusters(sorted) {
  if (!sorted.length) return [];
  const clusters = [];
  let currentCluster = [sorted[0]];
  let clusterEnd = parseISO(sorted[0].fields.End ?? sorted[0].fields.Start);

  for (let i = 1; i < sorted.length; i++) {
    const appt = sorted[i];
    const start = parseISO(appt.fields.Start);
    if (start < clusterEnd) {
      currentCluster.push(appt);
      const end = parseISO(appt.fields.End ?? appt.fields.Start);
      if (end > clusterEnd) clusterEnd = end;
    } else {
      clusters.push(currentCluster);
      currentCluster = [appt];
      clusterEnd = parseISO(appt.fields.End ?? appt.fields.Start);
    }
  }
  clusters.push(currentCluster);
  return clusters;
}

// Assigns left/width to each appointment within a single cluster,
// scaled to a given lane width and offset.
// laneLeft and laneWidth are percentages of the total column (0–100).
function assignCluster(cluster, laneLeft = 0, laneWidth = 100) {
  const n = cluster.length;
  const slotWidth = laneWidth / n;
  return cluster.map((appt, idx) => ({
    appt,
    left: `${laneLeft + slotWidth * idx}%`,
    width: `${slotWidth}%`,
  }));
}

// Resolves overlapping appointments within a single day column — Tight mode.
// Returns an array of {appt, left: "X%", width: "Y%"} objects.
export function resolveOverlaps(appointments) {
  if (!appointments.length) return [];
  const sorted = [...appointments].sort(
    (a, b) => parseISO(a.fields.Start) - parseISO(b.fields.Start)
  );
  const clusters = buildClusters(sorted);
  return clusters.flatMap((cluster) => assignCluster(cluster));
}

// ─────────────────────────────────────────────────────────────
// Lane mode — By Car or By Instructor
// ─────────────────────────────────────────────────────────────

// Resolves appointments into lanes keyed by a lane ID extracted from each appointment.
// getLaneKey(appt) → string | null (null = unassigned → goes in "unassigned" lane)
// seedLaneKeys: optional array of lane keys to pre-populate the lane order
//   (used so availability-only days still show distinct non-overlapping lanes).
// seedUnassignedKeys: optional array of sub-lane keys for the unassigned lane
//   (used so no-car availability intervals get their own sub-lane within the unassigned lane).
// Returns { resolved: [{appt, left, width}], laneOrder: string[], laneWidth: number }
export function resolveByLane(
  appointments, getLaneKey, seedLaneKeys = [], seedUnassignedKeys = []
) {
  // Seed lane order from availability keys first
  const laneOrder = [];
  const laneMap = new Map(); // laneKey → appt[]

  for (const key of seedLaneKeys) {
    if (key && !laneMap.has(key)) {
      laneOrder.push(key);
      laneMap.set(key, []);
    }
  }

  for (const appt of appointments) {
    const key = getLaneKey(appt) ?? "__unassigned__";
    if (!laneMap.has(key)) {
      laneMap.set(key, []);
      if (key !== "__unassigned__") laneOrder.push(key);
    }
    laneMap.get(key).push(appt);
  }

  // Determine if we need an unassigned lane (from appointments or seed)
  const hasUnassigned = laneMap.has("__unassigned__") || seedUnassignedKeys.length > 0;
  if (hasUnassigned && !laneOrder.includes("__unassigned__")) {
    laneOrder.push("__unassigned__");
  }

  if (!laneOrder.length) return { resolved: [], laneOrder: [], laneWidth: 100 };

  const numLanes = laneOrder.length;
  const laneWidth = 100 / numLanes;

  const resolved = [];
  laneOrder.forEach((key, laneIdx) => {
    const laneLeft = laneIdx * laneWidth;

    if (key === "__unassigned__") {
      // Sub-divide the unassigned lane by instructor so each instructor
      // gets their own sub-lane. Seeds from availability ensure sub-lanes
      // appear even on days with no appointments in this lane.
      const unassignedAppts = laneMap.get("__unassigned__") ?? [];
      const subResult = resolveByLane(
        unassignedAppts,
        (appt) => appt.fields.Instructor?.[0] ?? null,
        seedUnassignedKeys,
        [] // no further nesting
      );
      // Re-scale sub-lane geometry to fit within this lane
      for (const item of subResult.resolved) {
        const subLeft  = parseFloat(item.left);
        const subWidth = parseFloat(item.width);
        resolved.push({
          appt: item.appt,
          left:  `${laneLeft  + (subLeft  / 100) * laneWidth}%`,
          width: `${(subWidth / 100) * laneWidth}%`,
        });
      }
    } else {
      // Normal lane: time-cluster within the lane
      const laneAppts = laneMap.get(key) ?? [];
      const sorted = [...laneAppts].sort(
        (a, b) => parseISO(a.fields.Start) - parseISO(b.fields.Start)
      );
      const clusters = buildClusters(sorted);
      for (const cluster of clusters) {
        resolved.push(...assignCluster(cluster, laneLeft, laneWidth));
      }
    }
  });

  return { resolved, laneOrder, laneWidth };
}

// Convenience wrappers for the two grouping modes.
// Returns { resolved, laneOrder, laneWidth } for By-lane modes.
export function resolveByInstructor(appointments, seedLaneKeys = []) {
  return resolveByLane(appointments, (appt) => appt.fields.Instructor?.[0] ?? null, seedLaneKeys);
}

// By Car: car lanes + an unassigned lane subdivided by instructor.
// seedCarKeys: car IDs from availability for seeding car lanes.
// seedNoCarInstructorKeys: instructor IDs from availability with no car,
//   for seeding the unassigned sub-lanes.
export function resolveByCar(appointments, seedCarKeys = [], seedNoCarInstructorKeys = []) {
  return resolveByLane(
    appointments,
    (appt) => appt.fields.Car?.[0] ?? null,
    seedCarKeys,
    seedNoCarInstructorKeys
  );
}
