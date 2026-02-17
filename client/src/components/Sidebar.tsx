import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Upload, 
  Users, 
  FileText, 
  History,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/upload", label: "Upload Data", icon: Upload },
  { path: "/customers", label: "Customers", icon: Users },
  { path: "/alerts", label: "Alerts", icon: AlertTriangle },
  { path: "/sars", label: "SARs", icon: FileText },
  { path: "/audit", label: "Audit Trail", icon: History },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-xl font-bold text-sidebar-foreground">
          SAR Generator
        </h1>
        <p className="text-xs text-muted-foreground mt-1">AML Compliance Suite</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          
          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                "text-sm font-medium",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="px-4 py-3 bg-muted rounded-lg">
          <p className="text-xs font-medium text-muted-foreground">Compliance Ready</p>
          <p className="text-sm font-semibold text-foreground mt-1">v1.0.0</p>
        </div>
      </div>
    </aside>
  );
}
