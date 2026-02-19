import { HOUR_LABELS, DAY_START_HOUR } from "@/utils/time";

export default function TimeGutter({ pxPerHour }) {
  const totalHeight = HOUR_LABELS.length * pxPerHour;

  return (
    <div
      className="relative select-none"
      style={{ height: totalHeight }}
    >
      {HOUR_LABELS.map(({ hour, label }) => (
        <div
          key={hour}
          className="absolute right-2 text-xs text-muted-foreground"
          style={{ top: (hour - DAY_START_HOUR) * pxPerHour - 8 }}
        >
          {label}
        </div>
      ))}
    </div>
  );
}
