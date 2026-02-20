import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { fetchAllStudents } from "@/airtable/students";
import { fullName } from "@/hooks/useReferenceData";
import StudentForm from "@/components/students/StudentForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const STALE_30M = 30 * 60 * 1000;

export default function StudentsPage() {
  const [search, setSearch] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null); // null = closed, undefined = new
  const sidebarOpen = selectedRecord !== null;

  const { data: students = [], isLoading, isError } = useQuery({
    queryKey: ["students"],
    queryFn: fetchAllStudents,
    staleTime: STALE_30M,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((r) => {
      const f = r.fields;
      return (
        fullName(f).toLowerCase().includes(q) ||
        (f["Phone"] ?? "").toLowerCase().includes(q) ||
        (f["Email"] ?? "").toLowerCase().includes(q)
      );
    });
  }, [students, search]);

  function openNew() {
    setSelectedRecord(undefined); // undefined = create mode (no record)
  }

  function openEdit(record) {
    setSelectedRecord(record);
  }

  function closeSidebar() {
    setSelectedRecord(null);
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Students</h1>
        <Button onClick={openNew} size="sm">
          <UserPlus className="w-4 h-4 mr-1" />
          New Student
        </Button>
      </div>

      {/* Search bar */}
      <div className="mb-4 max-w-sm">
        <Input
          placeholder="Search by name, phone, or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* State feedback */}
      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
      {isError && <p className="text-destructive text-sm">Failed to load students.</p>}

      {/* Table */}
      {!isLoading && !isError && (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Phone</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Address</th>
                <th className="px-4 py-2 font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    {search ? "No students match your search." : "No students found."}
                  </td>
                </tr>
              )}
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => openEdit(r)}
                  className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-2 font-medium">
                    <span className="mr-2">{fullName(r.fields)}</span>
                    {r.fields["Teen"] && (
                      <Badge variant="secondary" className="text-xs">Teen</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{r.fields["Phone"] ?? "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{r.fields["Email"] ?? "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{r.fields["Address"] ?? "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground text-right text-xs">Edit →</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sidebar — create (selectedRecord === undefined) or edit (selectedRecord is a record) */}
      {sidebarOpen && (
        <StudentForm
          record={selectedRecord || null}
          onClose={closeSidebar}
        />
      )}
    </div>
  );
}
