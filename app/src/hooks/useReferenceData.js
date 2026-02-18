import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchAllInstructors } from "@/airtable/instructors";
import { fetchAllStudents } from "@/airtable/students";
import { fetchAllVehicles } from "@/airtable/vehicles";
import { fetchAllCourses } from "@/airtable/courses";

const STALE_30M = 30 * 60 * 1000;

// Build a lookup map keyed by Airtable record ID
function toMap(records) {
  if (!records) return {};
  return Object.fromEntries(records.map((r) => [r.id, r.fields]));
}

// Build a dropdown options array [{value: recId, label: string}]
function toOptions(records, labelField) {
  if (!records) return [];
  return records.map((r) => ({
    value: r.id,
    label: r.fields[labelField] ?? r.id,
  }));
}

export function useReferenceData() {
  const instructors = useQuery({
    queryKey: ["instructors"],
    queryFn: fetchAllInstructors,
    staleTime: STALE_30M,
  });

  const students = useQuery({
    queryKey: ["students"],
    queryFn: fetchAllStudents,
    staleTime: STALE_30M,
  });

  const vehicles = useQuery({
    queryKey: ["vehicles"],
    queryFn: fetchAllVehicles,
    staleTime: STALE_30M,
  });

  const courses = useQuery({
    queryKey: ["courses"],
    queryFn: fetchAllCourses,
    staleTime: STALE_30M,
  });

  const instructorMap = useMemo(() => toMap(instructors.data), [instructors.data]);
  const studentMap    = useMemo(() => toMap(students.data),    [students.data]);
  const vehicleMap    = useMemo(() => toMap(vehicles.data),    [vehicles.data]);
  const courseMap     = useMemo(() => toMap(courses.data),     [courses.data]);

  const instructorOptions = useMemo(() => toOptions(instructors.data, "Full Name"), [instructors.data]);
  const studentOptions    = useMemo(() => toOptions(students.data, "Full Name"),    [students.data]);
  const vehicleOptions    = useMemo(() => toOptions(vehicles.data, "Car Name"),     [vehicles.data]);
  const courseOptions     = useMemo(() => toOptions(courses.data, "Abreviation"),   [courses.data]);

  const isLoading =
    instructors.isLoading ||
    students.isLoading ||
    vehicles.isLoading ||
    courses.isLoading;

  const isError =
    instructors.isError ||
    students.isError ||
    vehicles.isError ||
    courses.isError;

  return {
    instructorMap,
    studentMap,
    vehicleMap,
    courseMap,
    instructorOptions,
    studentOptions,
    vehicleOptions,
    courseOptions,
    isLoading,
    isError,
  };
}
