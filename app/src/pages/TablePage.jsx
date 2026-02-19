import { useState } from "react";
import { addMonths } from "date-fns";
import { useAppointments } from "@/hooks/useAppointments";
import { useReferenceData } from "@/hooks/useReferenceData";
import AppointmentTable from "@/components/table/AppointmentTable";
import TableFilters from "@/components/table/TableFilters";
import AppointmentModal from "@/components/form/AppointmentModal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);
const ONE_MONTH_OUT = addMonths(TODAY, 1);

export default function TablePage() {
  const [startDate, setStartDate] = useState(TODAY);
  const [endDate, setEndDate] = useState(ONE_MONTH_OUT);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);

  const { data: appointments = [], isLoading, isError } = useAppointments(startDate, endDate);
  const ref = useReferenceData();

  function openCreate() {
    setEditRecord(null);
    setModalOpen(true);
  }

  function openEdit(record) {
    setEditRecord(record);
    setModalOpen(true);
  }

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
        startDate={startDate}
        endDate={endDate}
        onStartChange={setStartDate}
        onEndChange={setEndDate}
      />

      {isLoading && <p className="text-muted-foreground text-sm mt-4">Loading…</p>}
      {isError && <p className="text-destructive text-sm mt-4">Failed to load appointments.</p>}

      {!isLoading && !isError && (
        <AppointmentTable
          appointments={appointments}
          refData={ref}
          onEdit={openEdit}
          startDate={startDate}
          endDate={endDate}
        />
      )}

      <AppointmentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        record={editRecord}
        refData={ref}
        startDate={startDate}
        endDate={endDate}
      />
    </div>
  );
}
