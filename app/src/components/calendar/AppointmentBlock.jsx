import { apptTopPx, apptHeightPx, formatTime } from "@/utils/time";
import { instructorColor } from "@/utils/colors";

export default function AppointmentBlock({
  appt,
  left,
  width,
  refData,
  onClick,
}) {
  const f = appt.fields;
  const instructorId = f.Instructor?.[0];
  const color = instructorColor(instructorId);
  const instructorName =
    refData.instructorMap[instructorId]?.["Full Name"] ?? "?";
  const studentName =
    refData.studentMap[f.Student?.[0]]?.["Full Name"] ?? "?";
  const courseName = (f["Name (from Course)"] ?? [])[0] ?? f["Abreviation"] ?? "?";

  const top = apptTopPx(f.Start);
  const height = f.End ? apptHeightPx(f.Start, f.End) : 48;

  return (
    <div
      onClick={() => onClick(appt)}
      title={`${instructorName} — ${studentName}\n${courseName}\n${formatTime(f.Start)}${f.End ? " – " + formatTime(f.End) : ""}`}
      style={{
        position: "absolute",
        top,
        height: Math.max(height, 24),
        left: left ?? 0,
        width: width ?? "calc(100% - 4px)",
        backgroundColor: color + "22",
        borderLeft: `3px solid ${color}`,
        cursor: "pointer",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
      className="rounded-sm px-1.5 py-0.5 hover:brightness-95 transition-all"
    >
      <div
        className="text-[11px] font-semibold leading-tight truncate"
        style={{ color }}
      >
        {instructorName}
      </div>
      <div className="text-[10px] leading-tight truncate text-foreground/80">
        {studentName}
      </div>
      {height >= 36 && (
        <div className="text-[10px] leading-tight truncate text-muted-foreground">
          {courseName}
        </div>
      )}
    </div>
  );
}
