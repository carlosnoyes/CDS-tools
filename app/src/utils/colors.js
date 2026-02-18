import { INSTRUCTOR_ORDER } from "./constants";

// 14 distinct, readable colors — one per instructor
const PALETTE = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
  "#f97316", // orange
  "#6366f1", // indigo
  "#14b8a6", // teal
  "#a855f7", // purple
  "#0ea5e9", // sky
  "#d946ef", // fuchsia
];

// Stable map: instructor record ID → hex color
const COLOR_MAP = Object.fromEntries(
  INSTRUCTOR_ORDER.map((id, i) => [id, PALETTE[i % PALETTE.length]])
);

export function instructorColor(instructorRecordId) {
  return COLOR_MAP[instructorRecordId] ?? "#6b7280"; // gray fallback
}

// Lightened background version for appointment blocks (20% opacity)
export function instructorColorBg(instructorRecordId) {
  return instructorColor(instructorRecordId) + "33"; // hex alpha 20%
}

export { COLOR_MAP };
