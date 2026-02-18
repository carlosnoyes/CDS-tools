import { NavLink } from "react-router-dom";
import { CalendarDays, Table2 } from "lucide-react";

export default function AppShell({ children }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top nav */}
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto flex items-center gap-6 px-4 h-14">
          <span className="font-semibold text-sm tracking-tight text-foreground">
            CDS Scheduler
          </span>

          <nav className="flex items-center gap-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`
              }
            >
              <CalendarDays className="w-4 h-4" />
              Calendar
            </NavLink>

            <NavLink
              to="/table"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`
              }
            >
              <Table2 className="w-4 h-4" />
              Table
            </NavLink>
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
