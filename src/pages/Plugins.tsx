import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import { FileText, BookOpen, CheckSquare, Target, Receipt, Car, Lock, Users, Wallet, Calendar } from "lucide-react";
import { toast } from "sonner";
import { ACTIVE_PLUGINS } from "@/pages/Home";

// ─── Map iconName → composant (doit rester en sync avec Home.tsx) ─────────────
const iconMap: Record<string, React.ComponentType<any>> = {
  FileText,
  BookOpen,
  CheckSquare,
  Target,
  Receipt,
  Car,
};

// ─── Plugins verrouillés ──────────────────────────────────────────────────────
const LOCKED_PLUGINS = [
  { name: "CRM Lite", desc: "Gestion clients", icon: Users, eta: "Q3 2025" },
  { name: "Suivi budget", desc: "Vue financière", icon: Wallet, eta: "Q4 2025" },
  { name: "Outil réservation", desc: "Prise de rendez-vous", icon: Calendar, eta: "2026" },
];

// ─── Composant ────────────────────────────────────────────────────────────────
const PluginsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="fade-in">
      <PageHeader title="Plugins" subtitle={`${ACTIVE_PLUGINS.length} outils actifs pour votre workflow`} />

      {/* ── Plugins actifs ── */}
      <div className="px-4 md:px-0 space-y-2.5">
        {ACTIVE_PLUGINS.map((p) => {
          const IconComp = iconMap[p.iconName];
          return (
            <button
              key={p.id}
              onClick={() => navigate(p.path)}
              className="w-full glass-card p-4 flex items-center gap-4 hover:border-primary/30 transition-all active:scale-[0.98] text-left"
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `hsl(${p.color} / 0.12)` }}
              >
                {IconComp && <IconComp size={20} style={{ color: `hsl(${p.color})` }} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">{p.label}</div>
              </div>
              <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary shrink-0">
                Actif
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Plugins verrouillés ── */}
      <div className="px-4 md:px-0 mt-8">
        <h2 className="text-xs font-semibold text-muted-foreground mb-3 font-heading uppercase tracking-wider">
          Bientôt disponible
        </h2>
        <div className="space-y-2.5">
          {LOCKED_PLUGINS.map((p) => (
            <button
              key={p.name}
              onClick={() => toast(`${p.name} arrive ${p.eta} — reste connecté ! 🚀`)}
              className="w-full glass-card p-4 flex items-center gap-4 opacity-50 hover:opacity-70 active:scale-[0.98] transition-all text-left"
            >
              <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                <p.icon size={20} className="text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.desc}</div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Lock size={13} className="text-muted-foreground" />
                <span className="text-[9px] text-muted-foreground">{p.eta}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <FeedbackButton context="plugins" />
    </div>
  );
};

export default PluginsPage;
