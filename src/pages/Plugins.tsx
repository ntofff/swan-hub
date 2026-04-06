import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import { FileText, BookOpen, CheckSquare, Target, Receipt, Car, Users, Wallet, Calendar, Lock } from "lucide-react";

const activePlugins = [
  { id: "report", name: "Report Tool", desc: "Fast professional reports", icon: FileText, path: "/plugins/report" },
  { id: "logbook", name: "Logbook", desc: "Chronological entries", icon: BookOpen, path: "/plugins/logbook" },
  { id: "tasks", name: "Tasks", desc: "Simple task manager", icon: CheckSquare, path: "/plugins/tasks" },
  { id: "missions", name: "Mission Manager", desc: "Assignments & missions", icon: Target, path: "/plugins/missions" },
  { id: "quotes", name: "Quotes & Invoices", desc: "Billing & payments", icon: Receipt, path: "/plugins/quotes" },
  { id: "vehicle", name: "Vehicle Logbook", desc: "Mileage & IK tracking", icon: Car, path: "/plugins/vehicle" },
];

const lockedPlugins = [
  { name: "CRM Lite", desc: "Client management", icon: Users },
  { name: "Budget Tracker", desc: "Financial overview", icon: Wallet },
  { name: "Booking Tool", desc: "Appointment scheduling", icon: Calendar },
];

const PluginsPage = () => {
  const navigate = useNavigate();
  return (
    <div className="fade-in">
      <PageHeader title="Plugins" subtitle="Activate tools for your workflow" />
      <div className="px-4 md:px-0 space-y-2.5">
        {activePlugins.map(p => (
          <button key={p.id} onClick={() => navigate(p.path)}
            className="w-full glass-card p-4 flex items-center gap-4 hover:border-primary/30 transition-all active:scale-[0.98] text-left">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <p.icon size={20} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">{p.name}</div>
              <div className="text-xs text-muted-foreground">{p.desc}</div>
            </div>
            <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary">Active</span>
          </button>
        ))}
      </div>
      <div className="px-4 md:px-0 mt-8">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 font-heading uppercase tracking-wider">Coming Soon</h2>
        <div className="space-y-2.5">
          {lockedPlugins.map(p => (
            <div key={p.name} className="glass-card p-4 flex items-center gap-4 opacity-50">
              <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                <p.icon size={20} className="text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.desc}</div>
              </div>
              <Lock size={14} className="text-muted-foreground" />
            </div>
          ))}
        </div>
      </div>
      <FeedbackButton context="plugins" />
    </div>
  );
};

export default PluginsPage;
