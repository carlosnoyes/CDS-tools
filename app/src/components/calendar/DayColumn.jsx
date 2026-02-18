import { HOUR_LABELS, PX_PER_HOUR, DAY_START_HOUR } from "@/utils/time";
import { resolveOverlaps } from "@/utils/overlap";
import AppointmentBlock from "./AppointmentBlock";

export default function DayColumn({ appointments, refData, onEdit, onClickTime, date }) {
  const resolved = resolveOverlaps(appointments);

  function handleColumnClick(e) {
    // Calculate which time was clicked
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const hour = Math.floor(y / PX_PER_HOUR) + DAY_START_HOUR;
    const minutes = Math.round(((y % PX_PER_HOUR) / PX_PER_HOUR) * 60 / 15) * 15;
    const clickedDate = new Date(date);
    clickedDate.setHours(hour, minutes, 0, 0);
    onClickTime(clickedDate);
  }

  return (
    <div
      className="relative border-l border-border"
      style={{ height: HOUR_LABELS.length * PX_PER_HOUR }}
      onClick={handleColumnClick}
    >
      {/* Hour grid lines */}
      {HOUR_LABELS.map(({ hour }) => (
        <div
          key={hour}
          className="absolute w-full border-t border-border/40"
          style={{ top: (hour - DAY_START_HOUR) * PX_PER_HOUR }}
        />
      ))}
      {/* Half-hour lines */}
      {HOUR_LABELS.map(({ hour }) => (
        <div
          key={`${hour}-half`}
          className="absolute w-full border-t border-border/20"
          style={{ top: (hour - DAY_START_HOUR) * PX_PER_HOUR + PX_PER_HOUR / 2 }}
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
          onClick={(a) => {
            onEdit(a);
          }}
        />
      ))}
    </div>
  );
}
