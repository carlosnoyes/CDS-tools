import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useDeleteAppointment } from "@/hooks/useAppointments";

export default function DeleteButton({ record, weekStart, onClose }) {
  const [confirm, setConfirm] = useState(false);
  const del = useDeleteAppointment(weekStart);

  async function handleDelete() {
    try {
      await del.mutateAsync(record.id);
      toast.success("Appointment deleted");
      onClose();
    } catch (err) {
      toast.error(`Failed to delete: ${err.message}`);
    }
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Delete?</span>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={del.isPending}
        >
          {del.isPending ? "Deleting…" : "Yes, delete"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setConfirm(false)}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-muted-foreground hover:text-destructive"
      onClick={() => setConfirm(true)}
    >
      <Trash2 className="w-4 h-4" />
    </Button>
  );
}
