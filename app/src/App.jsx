import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import AppShell from "@/components/layout/AppShell";
import CalendarPage from "@/pages/CalendarPage";
import TablePage from "@/pages/TablePage";
import StudentsPage from "@/pages/StudentsPage";
import AvailabilityPage from "@/pages/AvailabilityPage";

export default function App() {
  return (
    <>
      <AppShell>
        <Routes>
          <Route path="/" element={<CalendarPage />} />
          <Route path="/table" element={<TablePage />} />
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/availability" element={<AvailabilityPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
      <Toaster richColors position="top-right" />
    </>
  );
}
