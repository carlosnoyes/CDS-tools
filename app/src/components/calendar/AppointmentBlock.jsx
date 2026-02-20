import { format } from "date-fns";
import { DAY_START_HOUR, formatTime } from "@/utils/time";
import { instructorColor } from "@/utils/colors";

export default function AppointmentBlock({
  appt,
  left,
  width,
  refData,
  pxPerHour,
  onClick,
}) {
  const f = appt.fields;
  const instructorId = f.Instructor?.[0];
  const color = instructorColor(instructorId);
  const instructorName = refData.instructorMap[instructorId]?.["Full Name"] ?? "?";
  const studentName = refData.studentMap[f.Student?.[0]]?.["Full Name"] ?? "?";
  const courseName = (f["Name (from Course)"] ?? [])[0] ?? f["Abreviation"] ?? "?";

  const startDate = new Date(f.Start);
  const startHours = startDate.getHours() + startDate.getMinutes() / 60;
  const top = Math.max(0, (startHours - DAY_START_HOUR) * pxPerHour);

  let height = 48;
  if (f.End) {
    const durationHours = (new Date(f.End) - startDate) / 3_600_000;
    height = Math.max(20, durationHours * pxPerHour);
  }

  const isNoShow = !!f["No Show"];

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(appt); }}
      title={`${instructorName} — ${studentName}\n${courseName}\n${formatTime(f.Start)}${f.End ? " – " + formatTime(f.End) : ""}`}
      style={{
        position: "absolute",
        top,
        height: Math.max(height, 24),
        left: left ?? 0,
        width: width ?? "calc(100% - 4px)",
        backgroundColor: color + "dd",
        borderLeft: `3px solid ${color}`,
        cursor: "pointer",
        overflow: "hidden",
        boxSizing: "border-box",
        opacity: isNoShow ? 0.45 : 1,
      }}
      className="rounded-sm px-1.5 py-0.5 hover:brightness-95 transition-all"
    >
      <div className="text-[11px] font-semibold leading-tight truncate text-white">
        {instructorName}
      </div>
      <div className="text-[10px] leading-tight truncate text-white/90">
        {studentName}
      </div>
      {height >= 36 && (
        <div className="text-[10px] leading-tight truncate text-white/75">
          {courseName}
        </div>
      )}
    </div>
  );
}
