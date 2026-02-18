import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AppointmentForm from "./AppointmentForm";
import DeleteButton from "./DeleteButton";

export default function AppointmentModal({
  open,
  onOpenChange,
  record,
  refData,
  weekStart,
}) {
  const isEdit = !!record;

  function close() {
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between pr-4">
            <DialogTitle>
              {isEdit ? "Edit Appointment" : "New Appointment"}
            </DialogTitle>
            {isEdit && (
              <DeleteButton record={record} weekStart={weekStart} onClose={close} />
            )}
          </div>
        </DialogHeader>

        <AppointmentForm
          record={record}
          refData={refData}
          onClose={close}
          weekStart={weekStart}
        />
      </DialogContent>
    </Dialog>
  );
}
