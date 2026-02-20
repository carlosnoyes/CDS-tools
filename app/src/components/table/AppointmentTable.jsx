import { useState } from "react";
import { fullName } from "@/hooks/useReferenceData";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatTime, formatDuration } from "@/utils/time";
import { instructorColor } from "@/utils/colors";
import { ChevronUp, ChevronDown, Pencil } from "lucide-react";

const COLUMNS = [
  { key: "start", label: "Start" },
  { key: "end", label: "End" },
  { key: "student", label: "Student" },
  { key: "instructor", label: "Instructor" },
  { key: "vehicle", label: "Vehicle" },
  { key: "course", label: "Course" },
  { key: "classNumber", label: "#" },
  { key: "pudu", label: "PUDO" },
  { key: "location", label: "Location" },
  { key: "notes", label: "Notes" },
];

function getSort(appt, key, maps) {
  const f = appt.fields;
  switch (key) {
    case "start": return f.Start ?? "";
    case "end": return f.End ?? "";
    case "student": return fullName(maps.studentMap[f.Student?.[0]]);
    case "instructor": return fullName(maps.instructorMap[f.Instructor?.[0]]);
    case "vehicle": return maps.vehicleMap[f.Car?.[0]]?.["Car Name"] ?? "";
    case "course": return (f["Name (from Course)"] ?? [])[0] ?? "";
    case "classNumber": return f["Class Number"] ?? 0;
    case "pudu": return f.PUDO ?? 0;
    case "location": return f.Location ?? "";
    default: return "";
  }
}

export default function AppointmentTable({ appointments, refData, onEdit }) {
  const [sort, setSort] = useState({ key: "start", dir: "asc" });

  function toggleSort(key) {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
    );
  }

  const sorted = [...appointments].sort((a, b) => {
    const av = getSort(a, sort.key, refData);
    const bv = getSort(b, sort.key, refData);
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sort.dir === "asc" ? cmp : -cmp;
  });

  if (sorted.length === 0) {
    return (
      <p className="text-muted-foreground text-sm mt-4">
        No appointments found for this week.
      </p>
    );
  }

  return (
    <div className="border rounded-lg overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((col) => (
              <TableHead
                key={col.key}
                className="whitespace-nowrap cursor-pointer select-none"
                onClick={() => toggleSort(col.key)}
              >
                <span className="flex items-center gap-1">
                  {col.label}
                  {sort.key === col.key ? (
                    sort.dir === "asc" ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )
                  ) : null}
                </span>
              </TableHead>
            ))}
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((appt) => {
            const f = appt.fields;
            const instructorId = f.Instructor?.[0];
            const color = instructorColor(instructorId);
            const instructorName = fullName(refData.instructorMap[instructorId]);
            const studentName = fullName(refData.studentMap[f.Student?.[0]]);
            const vehicleName =
              refData.vehicleMap[f.Car?.[0]]?.["Car Name"] ?? "—";
            const courseName = (f["Name (from Course)"] ?? [])[0] ?? "—";

            return (
              <TableRow key={appt.id}>
                <TableCell className="whitespace-nowrap text-sm">
                  {f.Start ? formatTime(f.Start) : "—"}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {f.End ? formatTime(f.End) : "—"}
                </TableCell>
                <TableCell className="whitespace-nowrap">{studentName}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    style={{ borderColor: color, color }}
                    className="whitespace-nowrap"
                  >
                    {instructorName}
                  </Badge>
                </TableCell>
                <TableCell>{vehicleName}</TableCell>
                <TableCell className="whitespace-nowrap">{courseName}</TableCell>
                <TableCell className="text-center">{f["Class Number"] ?? "—"}</TableCell>
                <TableCell>{formatDuration(f.PUDO)}</TableCell>
                <TableCell>{f.Location ?? "—"}</TableCell>
                <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm">
                  {f.Notes ?? ""}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(appt)}
                    className="h-7 w-7"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
