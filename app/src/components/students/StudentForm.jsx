import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createStudent, updateStudent, deleteStudent } from "@/airtable/students";
import { fullName } from "@/hooks/useReferenceData";

function Field({ label, error, children }) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SectionHeader({ children }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-2 pb-1 border-b mb-1">
      {children}
    </p>
  );
}

export default function StudentForm({ record, onClose }) {
  const isEdit = !!record;
  const qc = useQueryClient();

  const defaultValues = isEdit
    ? {
        firstName:         record.fields["First Name"]          ?? "",
        lastName:          record.fields["Last Name"]           ?? "",
        phone:             record.fields["Phone"]               ?? "",
        email:             record.fields["Email"]               ?? "",
        address:           record.fields["Address"]             ?? "",
        teen:              record.fields["Teen"]                ?? false,
        guardianFirstName: record.fields["Guardian First Name"] ?? "",
        guardianLastName:  record.fields["Guardian Last Name"]  ?? "",
        guardianRelation:  record.fields["Guardian Relation"]   ?? "",
        guardianPhone:     record.fields["Guardian Phone"]      ?? "",
        guardianEmail:     record.fields["Guardian Email"]      ?? "",
      }
    : {
        firstName: "", lastName: "", phone: "", email: "", address: "",
        teen: false,
        guardianFirstName: "", guardianLastName: "", guardianRelation: "",
        guardianPhone: "", guardianEmail: "",
      };

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ defaultValues });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["students"] });

  const createMut = useMutation({
    mutationFn: createStudent,
    onSuccess: () => { invalidate(); toast.success("Student created"); onClose(); },
    onError: (e) => toast.error(`Failed to create: ${e.message}`),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, fields }) => updateStudent(id, fields),
    onSuccess: () => { invalidate(); toast.success("Student updated"); onClose(); },
    onError: (e) => toast.error(`Failed to update: ${e.message}`),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteStudent(record.id),
    onSuccess: () => { invalidate(); toast.success("Student deleted"); onClose(); },
    onError: (e) => toast.error(`Failed to delete: ${e.message}`),
  });

  function buildFields(data) {
    const f = {};
    if (data.firstName)         f["First Name"]          = data.firstName;
    if (data.lastName)          f["Last Name"]           = data.lastName;
    if (data.phone)             f["Phone"]               = data.phone;
    if (data.email)             f["Email"]               = data.email;
    if (data.address)           f["Address"]             = data.address;
    f["Teen"] = !!data.teen;
    if (data.guardianFirstName) f["Guardian First Name"] = data.guardianFirstName;
    if (data.guardianLastName)  f["Guardian Last Name"]  = data.guardianLastName;
    if (data.guardianRelation)  f["Guardian Relation"]   = data.guardianRelation;
    if (data.guardianPhone)     f["Guardian Phone"]      = data.guardianPhone;
    if (data.guardianEmail)     f["Guardian Email"]      = data.guardianEmail;
    return f;
  }

  function onSubmit(data) {
    const fields = buildFields(data);
    if (isEdit) {
      updateMut.mutate({ id: record.id, fields });
    } else {
      createMut.mutate(fields);
    }
  }

  function handleDelete() {
    if (confirm(`Delete ${fullName(record.fields)}? This cannot be undone.`)) {
      deleteMut.mutate();
    }
  }

  const busy = isSubmitting || createMut.isPending || updateMut.isPending || deleteMut.isPending;

  return (
    <div
      className="fixed top-0 right-0 h-full z-50 bg-background border-l border-border shadow-xl flex flex-col"
      style={{ width: 440 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <span className="text-sm font-semibold">
          {isEdit ? fullName(record.fields) : "New Student"}
        </span>
        <div className="flex items-center gap-1">
          {isEdit && (
            <button
              onClick={handleDelete}
              disabled={busy}
              className="rounded p-1 hover:bg-destructive/10 text-destructive transition-colors"
              title="Delete student"
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

      {/* Scrollable form */}
      <div className="flex-1 overflow-y-auto p-4">
        <form id="student-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <SectionHeader>Student Info</SectionHeader>

          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name *" error={errors.firstName?.message}>
              <Input
                {...register("firstName", { required: "Required" })}
                placeholder="First name"
                className={errors.firstName ? "border-destructive" : ""}
              />
            </Field>
            <Field label="Last Name *" error={errors.lastName?.message}>
              <Input
                {...register("lastName", { required: "Required" })}
                placeholder="Last name"
                className={errors.lastName ? "border-destructive" : ""}
              />
            </Field>
          </div>

          <Field label="Phone">
            <Input {...register("phone")} placeholder="(804) 555-0100" type="tel" />
          </Field>

          <Field label="Email">
            <Input {...register("email")} placeholder="student@example.com" type="email" />
          </Field>

          <Field label="Address">
            <Input {...register("address")} placeholder="Street address" />
          </Field>

          <div className="flex items-center gap-2 pt-1">
            <input
              id="teen-checkbox"
              type="checkbox"
              {...register("teen")}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            <Label htmlFor="teen-checkbox" className="text-sm cursor-pointer">
              Teen student
            </Label>
          </div>

          <SectionHeader>Guardian Info</SectionHeader>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Guardian First Name">
              <Input {...register("guardianFirstName")} placeholder="First name" />
            </Field>
            <Field label="Guardian Last Name">
              <Input {...register("guardianLastName")} placeholder="Last name" />
            </Field>
          </div>

          <Field label="Relation">
            <Input {...register("guardianRelation")} placeholder="e.g. Parent, Guardian" />
          </Field>

          <Field label="Guardian Phone">
            <Input {...register("guardianPhone")} placeholder="(804) 555-0100" type="tel" />
          </Field>

          <Field label="Guardian Email">
            <Input {...register("guardianEmail")} placeholder="guardian@example.com" type="email" />
          </Field>
        </form>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 px-4 py-3 border-t shrink-0">
        <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button size="sm" type="submit" form="student-form" disabled={busy}>
          {isEdit ? "Save Changes" : "Create Student"}
        </Button>
      </div>
    </div>
  );
}
