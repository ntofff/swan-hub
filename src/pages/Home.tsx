import { useNavigate } from "react-router-dom";
import { DesktopNav } from "@/components/layout/BottomNav";
import { FeedbackButton } from "@/components/FeedbackButton";
import { FileText, BookOpen, CheckSquare, Target, Receipt, Car } from "lucide-react";

const quickActions = [
  { label: "Nouveau rapport", icon: FileText, path: "/plugins/report", color: "38 50% 58%" },
  { label: "Entrée journal", icon: BookOpen, path: "/plugins/logbook", color: "217 91% 60%" },
  { label: "Ajouter tâche", icon: CheckSquare, path: "/plugins/tasks", color: "142 71% 45%" },
  { label: "Nouvelle mission", icon: Target, path: "/plugins/missions", color: "0 72% 51%" },
  { label: "Nouveau devis", icon: Receipt, path: "/plugins/quotes", color: "270 50% 60%" },
  { label: "Nouveau trajet", icon: Car, path: "/plugins/vehicle", color: "38 92% 50%" },
];

const recentActivity = [
  { text: "Rapport #042 créé", time: "Il y a 2 min", icon: FileText },
  { text: "Tâche « Revue client » terminée", time: "Il y a 1h", icon: CheckSquare },
  { text: "Trajet enregistré : Paris → Lyon", time: "Il y a 3h", icon: Car },
  { text: "Devis Q-2024-018 envoyé", time: "Hier", icon: Receipt },
];

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between px-4 pt-6 pb-2 md:px-0">
        <div>
          <h1 className="text-2xl font-bold font-heading"><span className="text-gradient-gold">SWAN</span></h1>
          <p className="text-xs text-muted-foreground mt-0.5">Simple Work Activity Network</p>
        </div>
        <DesktopNav />
      </div>

      <div className="px-4 md:px-0 mt-4">
        <div className="glass-card-glow p-4 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <p className="text-sm text-secondary-foreground flex-1">
            <span className="font-semibold text-primary">Nouveau :</span> Le plugin Carnet de véhicule est disponible avec export Excel
          </p>
        </div>
      </div>

      <div className="px-4 md:px-0 mt-6">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 font-heading uppercase tracking-wider">Actions rapides</h2>
        <div className="grid grid-cols-3 gap-2.5">
          {quickActions.map(a => (
            <button key={a.label} onClick={() => navigate(a.path)}
              className="glass-card p-4 flex flex-col items-center gap-2.5 hover:border-primary/30 transition-all active:scale-95">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `hsl(${a.color} / 0.12)` }}>
                <a.icon size={20} style={{ color: `hsl(${a.color})` }} />
              </div>
              <span className="text-xs font-medium text-secondary-foreground">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 md:px-0 mt-8">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 font-heading uppercase tracking-wider">Activité récente</h2>
        <div className="glass-card divide-y divide-border">
          {recentActivity.map((item, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <item.icon size={16} className="text-muted-foreground shrink-0" />
              <span className="text-sm flex-1">{item.text}</span>
              <span className="text-xs text-muted-foreground">{item.time}</span>
            </div>
          ))}
        </div>
      </div>

      <FeedbackButton context="home" />
    </div>
  );
};

export default HomePage;
