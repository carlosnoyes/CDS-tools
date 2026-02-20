import { DAY_START_HOUR, formatTime } from "@/utils/time";
import { instructorColor } from "@/utils/colors";
import { fullName } from "@/hooks/useReferenceData";

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

  const instructorName = fullName(refData.instructorMap[instructorId]);
  const studentName = fullName(refData.studentMap[f.Student?.[0]]);

  const courseId = f.Course?.[0];
  const course = courseId ? refData.courseMap?.[courseId] : null;
  const courseAbbr = course?.Abreviation ?? "?";
  const courseName = (f["Name (from Course)"] ?? [])[0] ?? course?.Name ?? "?";

  const classNumber = f["Class Number"];
  const classSuffix = classNumber != null && classNumber !== "" ? String(classNumber) : "";

  const tier = f.Tier;
  const tierPrefix = tier ? `${tier}-` : "";
  const courseToken = `${tierPrefix}${courseAbbr}${classSuffix}`;

  const location = f.Location;
  const pudoSec = Number(f.PUDO ?? 0);
  const pudoLabel = pudoSec === 1800 ? "PUDO30" : pudoSec === 3600 ? "PUDO60" : null;
  const metaParts = [location === "GA" ? "GA" : null, pudoLabel].filter(Boolean);
  const metaLine = metaParts.join(" - ");

  const carName = refData.vehicleMap[f.Car?.[0]]?.["Car Name"] ?? null;
  const carOrClassroom = carName ?? f.Classroom ?? "�";

  const notes = typeof f.Notes === "string" ? f.Notes.trim() : "";

  const startDate = new Date(f.Start);
  const startHours = startDate.getHours() + startDate.getMinutes() / 60;
  const top = Math.max(0, (startHours - DAY_START_HOUR) * pxPerHour);

  let height = 48;
  if (f.End) {
    const durationHours = (new Date(f.End) - startDate) / 3_600_000;
    height = Math.max(20, durationHours * pxPerHour);
  }

  const isNoShow = !!f["No Show"];

  const tooltipLines = [
    `Time: ${formatTime(f.Start)}${f.End ? ` - ${formatTime(f.End)}` : ""}`,
    `Location: ${location ?? "�"}`,
    ...(pudoLabel ? [`PUDO: ${pudoSec / 60} min`] : []),
    `Instructor: ${instructorName}`,
    `Student: ${studentName}`,
    `Car/Classroom: ${carOrClassroom}`,
    `Course: ${courseAbbr} - ${courseName}`,
    ...(classSuffix ? [`Class Number: ${classSuffix}`] : []),
    ...(tier ? [`Tier: ${tier}`] : []),
    ...(f.Spanish ? ["Spanish: True"] : []),
    ...(notes ? [`Notes: ${notes}`] : []),
  ];

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick(appt);
      }}
      title={tooltipLines.join("\n")}
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
      {metaLine && height >= 44 && (
        <div className="text-[10px] leading-tight truncate text-white/90">{metaLine}</div>
      )}

      <div className="text-[11px] font-semibold leading-tight truncate text-white">{instructorName}</div>
      <div className="text-[10px] leading-tight truncate text-white/90">{studentName}</div>

      {height >= 32 && (
        <div className="text-[10px] leading-tight truncate text-white/80">{courseToken}</div>
      )}
    </div>
  );
}
