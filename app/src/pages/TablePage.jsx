import { useState } from "react";
import { getMondayOf } from "@/utils/time";
import { useAppointments } from "@/hooks/useAppointments";
import { useReferenceData } from "@/hooks/useReferenceData";
import AppointmentTable from "@/components/table/AppointmentTable";
import TableFilters from "@/components/table/TableFilters";
import AppointmentModal from "@/components/form/AppointmentModal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const THIS_MONDAY = getMondayOf(new Date());

export default function TablePage() {
  const [weekStart, setWeekStart] = useState(THIS_MONDAY);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [filters, setFilters] = useState({ instructor: "", location: "" });

  const { data: appointments = [], isLoading, isError } = useAppointments(weekStart);
  const ref = useReferenceData();

  function openCreate() {
    setEditRecord(null);
    setModalOpen(true);
  }

  function openEdit(record) {
    setEditRecord(record);
    setModalOpen(true);
  }

  // Apply filters
  const filtered = appointments.filter((a) => {
    const instructorIds = a.fields.Instructor ?? [];
    if (filters.instructor && !instructorIds.includes(filters.instructor)) return false;
    if (filters.location && a.fields.Location !== filters.location) return false;
    return true;
  });

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Appointments</h1>
        <Button onClick={openCreate} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          New Appointment
        </Button>
      </div>

      <TableFilters
        filters={filters}
        onFilterChange={setFilters}
        instructorOptions={ref.instructorOptions}
        weekStart={weekStart}
        onWeekChange={setWeekStart}
      />

      {isLoading && <p className="text-muted-foreground text-sm mt-4">Loading…</p>}
      {isError && <p className="text-destructive text-sm mt-4">Failed to load appointments.</p>}

      {!isLoading && !isError && (
        <AppointmentTable
          appointments={filtered}
          refData={ref}
          onEdit={openEdit}
          weekStart={weekStart}
        />
      )}

      <AppointmentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        record={editRecord}
        refData={ref}
        weekStart={weekStart}
      />
    </div>
  );
}
