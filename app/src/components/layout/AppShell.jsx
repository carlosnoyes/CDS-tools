import { NavLink } from "react-router-dom";
import { CalendarDays, Table2, Users, CalendarClock } from "lucide-react";
import cdsLogo from "../../assets/CDS Logo.svg";

export default function AppShell({ children }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top nav */}
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="flex items-center gap-6 px-4 h-14 w-full">
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

            <NavLink
              to="/students"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`
              }
            >
              <Users className="w-4 h-4" />
              Students
            </NavLink>

            <NavLink
              to="/availability"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`
              }
            >
              <CalendarClock className="w-4 h-4" />
              Availability
            </NavLink>
          </nav>

          <img src={cdsLogo} alt="CDS Logo" className="h-7 w-auto ml-auto" />
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
