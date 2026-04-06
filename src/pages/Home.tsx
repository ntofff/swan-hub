import { useNavigate } from "react-router-dom";
import { DesktopNav } from "@/components/layout/BottomNav";
import { FeedbackButton } from "@/components/FeedbackButton";
import { FileText, BookOpen, CheckSquare, Target, Receipt, Car } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const HomePage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const quickActions = [
    { labelKey: "home.newReport", icon: FileText, path: "/plugins/report", color: "38 50% 58%" },
    { labelKey: "home.logEntry", icon: BookOpen, path: "/plugins/logbook", color: "217 91% 60%" },
    { labelKey: "home.addTask", icon: CheckSquare, path: "/plugins/tasks", color: "142 71% 45%" },
    { labelKey: "home.newMission", icon: Target, path: "/plugins/missions", color: "0 72% 51%" },
    { labelKey: "home.newQuote", icon: Receipt, path: "/plugins/quotes", color: "270 50% 60%" },
    { labelKey: "home.newTrip", icon: Car, path: "/plugins/vehicle", color: "38 92% 50%" },
  ];

  const recentActivity = [
    { textKey: "home.report042", timeKey: "home.2minAgo", icon: FileText },
    { textKey: "home.taskCompleted", timeKey: "home.1hAgo", icon: CheckSquare },
    { textKey: "home.tripLogged", timeKey: "home.3hAgo", icon: Car },
    { textKey: "home.quoteSent", timeKey: "home.yesterday", icon: Receipt },
  ];

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between px-4 pt-6 pb-2 md:px-0">
        <div>
          <h1 className="text-2xl font-bold font-heading"><span className="text-gradient-gold">SWAN</span></h1>
          <p className="text-xs text-muted-foreground mt-0.5">{t("home.subtitle")}</p>
        </div>
        <DesktopNav />
      </div>

      <div className="px-4 md:px-0 mt-4">
        <div className="glass-card-glow p-4 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <p className="text-sm text-secondary-foreground flex-1">
            <span className="font-semibold text-primary">{t("home.new")}</span> {t("home.promo")}
          </p>
        </div>
      </div>

      <div className="px-4 md:px-0 mt-6">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 font-heading uppercase tracking-wider">{t("home.quickActions")}</h2>
        <div className="grid grid-cols-3 gap-2.5">
          {quickActions.map(a => (
            <button key={a.labelKey} onClick={() => navigate(a.path)}
              className="glass-card p-4 flex flex-col items-center gap-2.5 hover:border-primary/30 transition-all active:scale-95">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `hsl(${a.color} / 0.12)` }}>
                <a.icon size={20} style={{ color: `hsl(${a.color})` }} />
              </div>
              <span className="text-xs font-medium text-secondary-foreground">{t(a.labelKey)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 md:px-0 mt-8">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 font-heading uppercase tracking-wider">{t("home.recentActivity")}</h2>
        <div className="glass-card divide-y divide-border">
          {recentActivity.map((item, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <item.icon size={16} className="text-muted-foreground shrink-0" />
              <span className="text-sm flex-1">{t(item.textKey)}</span>
              <span className="text-xs text-muted-foreground">{t(item.timeKey)}</span>
            </div>
          ))}
        </div>
      </div>

      <FeedbackButton context="home" />
    </div>
  );
};

export default HomePage;
