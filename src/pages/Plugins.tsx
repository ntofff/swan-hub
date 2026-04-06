import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import { FileText, BookOpen, CheckSquare, Target, Receipt, Car, Users, Wallet, Calendar, Lock } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const PluginsPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const activePlugins = [
    { id: "report", nameKey: "plugins.reportTool", descKey: "plugins.reportDesc", icon: FileText, path: "/plugins/report" },
    { id: "logbook", nameKey: "plugins.logbook", descKey: "plugins.logbookDesc", icon: BookOpen, path: "/plugins/logbook" },
    { id: "tasks", nameKey: "plugins.tasks", descKey: "plugins.tasksDesc", icon: CheckSquare, path: "/plugins/tasks" },
    { id: "missions", nameKey: "plugins.missions", descKey: "plugins.missionsDesc", icon: Target, path: "/plugins/missions" },
    { id: "quotes", nameKey: "plugins.quotes", descKey: "plugins.quotesDesc", icon: Receipt, path: "/plugins/quotes" },
    { id: "vehicle", nameKey: "plugins.vehicle", descKey: "plugins.vehicleDesc", icon: Car, path: "/plugins/vehicle" },
  ];

  const lockedPlugins = [
    { nameKey: "plugins.crmLite", descKey: "plugins.crmDesc", icon: Users },
    { nameKey: "plugins.budgetTracker", descKey: "plugins.budgetDesc", icon: Wallet },
    { nameKey: "plugins.bookingTool", descKey: "plugins.bookingDesc", icon: Calendar },
  ];

  return (
    <div className="fade-in">
      <PageHeader title={t("plugins.title")} subtitle={t("plugins.subtitle")} />
      <div className="px-4 md:px-0 space-y-2.5">
        {activePlugins.map(p => (
          <button key={p.id} onClick={() => navigate(p.path)}
            className="w-full glass-card p-4 flex items-center gap-4 hover:border-primary/30 transition-all active:scale-[0.98] text-left">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <p.icon size={20} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">{t(p.nameKey)}</div>
              <div className="text-xs text-muted-foreground">{t(p.descKey)}</div>
            </div>
            <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary">{t("plugins.active")}</span>
          </button>
        ))}
      </div>
      <div className="px-4 md:px-0 mt-8">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 font-heading uppercase tracking-wider">{t("plugins.comingSoon")}</h2>
        <div className="space-y-2.5">
          {lockedPlugins.map(p => (
            <div key={p.nameKey} className="glass-card p-4 flex items-center gap-4 opacity-50">
              <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                <p.icon size={20} className="text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{t(p.nameKey)}</div>
                <div className="text-xs text-muted-foreground">{t(p.descKey)}</div>
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
