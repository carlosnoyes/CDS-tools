import { X, Trash2 } from "lucide-react";
import AvailabilityForm from "./AvailabilityForm";

export default function AvailabilitySidebar({
  open,
  record,
  prefill,
  refData,
  mode,
  onClose,
  onDelete,
}) {
  if (!open) return null;

  const isEdit = !!record;
  const title = isEdit
    ? `Edit ${record.fields.Status === "Blocked Off" ? "Block" : "Availability"}`
    : prefill?.status === "Blocked Off"
    ? "New Block"
    : "New Availability";

  return (
    <div
      className="fixed top-0 right-0 h-full z-50 bg-background border-l border-border shadow-xl flex flex-col"
      style={{ width: 440 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <span className="text-sm font-semibold">{title}</span>
        <div className="flex items-center gap-1">
          {isEdit && (
            <button
              onClick={onDelete}
              className="rounded p-1 hover:bg-destructive/10 text-destructive transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-muted transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable form body */}
      <div className="flex-1 overflow-y-auto p-4">
        <AvailabilityForm
          record={record}
          prefill={prefill}
          refData={refData}
          mode={mode}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
