import { parseISO } from "date-fns";

// Resolves overlapping appointments within a single day column.
// Returns an array of {appt, left: "X%", width: "Y%"} objects.
//
// Algorithm:
// 1. Sort by Start time
// 2. Group into "clusters" — any set of appointments where at least one pair overlaps
// 3. Within each cluster, assign equal-width columns
export function resolveOverlaps(appointments) {
  if (!appointments.length) return [];

  // Sort by start time
  const sorted = [...appointments].sort(
    (a, b) => parseISO(a.fields.Start) - parseISO(b.fields.Start)
  );

  // Build clusters: each cluster is a group of overlapping appointments
  const clusters = [];
  let currentCluster = [sorted[0]];
  let clusterEnd = parseISO(sorted[0].fields.End ?? sorted[0].fields.Start);

  for (let i = 1; i < sorted.length; i++) {
    const appt = sorted[i];
    const start = parseISO(appt.fields.Start);
    if (start < clusterEnd) {
      // Overlaps with current cluster
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

  // Assign left/width per appointment within each cluster
  const result = [];
  for (const cluster of clusters) {
    const n = cluster.length;
    const width = `${Math.floor(100 / n)}%`;
    cluster.forEach((appt, idx) => {
      result.push({
        appt,
        left: `${Math.floor((100 / n) * idx)}%`,
        width,
      });
    });
  }

  return result;
}
