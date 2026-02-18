import { HOUR_LABELS, PX_PER_HOUR } from "@/utils/time";

export default function TimeGutter() {
  return (
    <div className="relative" style={{ height: HOUR_LABELS.length * PX_PER_HOUR }}>
      {HOUR_LABELS.map(({ hour, label }) => (
        <div
          key={hour}
          className="absolute right-2 text-xs text-muted-foreground"
          style={{ top: (hour - HOUR_LABELS[0].hour) * PX_PER_HOUR - 8 }}
        >
          {label}
        </div>
      ))}
    </div>
  );
}
