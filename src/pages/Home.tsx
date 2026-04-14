import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FeedbackButton } from "@/components/FeedbackButton";
import { FileText, CheckSquare, Target, Car, Sun, Moon, ArrowUp, ArrowDown } from "lucide-react";
import { parseTheme, buildThemeId } from "@/hooks/useAuth";
import { WelcomeScreen, APP_BUILD } from "@/components/WelcomeScreen";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ACTIVE_PLUGINS } from "@/config/plugins";

// ─── Icônes pour l'iconMap (compatibilité mode édition) ───────────────────────
const iconMap: Record<string, React.ComponentType<any>> = Object.fromEntries(
  ACTIVE_PLUGINS.map((p) => [p.iconName, p.icon]),
);

// ─── Persistance de l'ordre des plugins ───────────────────────────────────────
const STORAGE_KEY = "swan_hub_plugin_order";

function getStoredOrder() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return ACTIVE_PLUGINS;
    const ids: string[] = JSON.parse(stored);
    const ordered = ids.map((id) => ACTIVE_PLUGINS.find((a) => a.id === id)).filter(Boolean) as typeof ACTIVE_PLUGINS;
    // Ajoute les nouveaux plugins non encore stockés
    ACTIVE_PLUGINS.forEach((a) => {
      if (!ordered.find((o) => o.id === a.id)) ordered.push(a);
    });
    return ordered;
  } catch {
    return ACTIVE_PLUGINS;
  }
}

// ─── Clé welcome liée au build → réapparaît à chaque nouvelle version ─────────
const WELCOME_KEY = `welcome_seen_v${APP_BUILD}`;

// ─── Composant ────────────────────────────────────────────────────────────────
const HomePage = () => {
  const navigate = useNavigate();
  const { user, profile, updateProfile } = useAuth();
  const [quickActions, setQuickActions] = useState(getStoredOrder);
  const [editMode, setEditMode] = useState(false);

  // Welcome screen : ne s'affiche qu'une fois par version
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem(WELCOME_KEY));
  const handleCloseWelcome = () => {
    localStorage.setItem(WELCOME_KEY, "1");
    setShowWelcome(false);
  };

  // Thème
  const { style, mode } = parseTheme(profile?.theme || "dark-night");
  const isDark = mode === "dark";
  const toggleDarkLight = async () => {
    const next = buildThemeId(style, isDark ? "light" : "dark");
    await updateProfile({ theme: next });
  };

  // Réorganisation plugins
  const movePlugin = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= quickActions.length) return;
    const reordered = [...quickActions];
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
    setQuickActions(reordered);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reordered.map((a) => a.id)));
  };

  // ─── Requêtes Supabase groupées en 1 seul appel ───────────────────────────
  const {
    data: activityData,
    isLoading: activityLoading,
    isError: activityError,
  } = useQuery({
    queryKey: ["home_activity"],
    queryFn: async () => {
      const [tasks, reports, missions, trips] = await Promise.all([
        supabase
          .from("tasks")
          .select("text, done, priority, updated_at")
          .order("updated_at", { ascending: false })
          .limit(3),
        supabase.from("reports").select("title, created_at").order("created_at", { ascending: false }).limit(2),
        supabase
          .from("missions")
          .select("title, status, updated_at")
          .order("updated_at", { ascending: false })
          .limit(2),
        supabase
          .from("trips")
          .select("start_location, end_location, distance, date")
          .order("date", { ascending: false })
          .limit(2),
      ]);
      return {
        tasks: tasks.data ?? [],
        reports: reports.data ?? [],
        missions: missions.data ?? [],
        trips: trips.data ?? [],
      };
    },
    enabled: !!user,
    staleTime: 30_000, // cache 30s → évite les rechargements inutiles
  });

  const recentTasks = activityData?.tasks ?? [];
  const recentReports = activityData?.reports ?? [];
  const recentMissions = activityData?.missions ?? [];
  const recentTrips = activityData?.trips ?? [];

  // Promo (requête légère, séparée intentionnellement)
  const { data: promo } = useQuery({
    queryKey: ["active_promo"],
    queryFn: async () => {
      const { data } = await supabase
        .from("promotions")
        .select("title, message")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  // ─── Formatage temps relatif ──────────────────────────────────────────────
  const formatTime = (date: string) => {
    const d = new Date(date);
    const diff = Date.now() - d.getTime();
    if (diff < 3_600_000) return `Il y a ${Math.max(1, Math.floor(diff / 60_000))} min`;
    if (diff < 86_400_000) return `Il y a ${Math.floor(diff / 3_600_000)}h`;
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  // ─── Activité récente fusionnée ───────────────────────────────────────────
  const recentActivity = [
    ...recentReports.map((r: any) => ({
      text: `Rapport « ${r.title} »`,
      time: formatTime(r.created_at),
      icon: FileText,
      path: "/plugins/report",
    })),
    ...recentTasks.map((t: any) => ({
      text: `${t.done ? "✓" : "○"} ${t.text.slice(0, 35)}`,
      time: formatTime(t.updated_at),
      icon: CheckSquare,
      path: "/plugins/tasks",
    })),
    ...recentMissions.map((m: any) => ({
      text: `Mission « ${m.title} » — ${m.status}`,
      time: formatTime(m.updated_at),
      icon: Target,
      path: "/plugins/missions",
    })),
    ...recentTrips.map((t: any) => ({
      text: `${t.start_location || "?"} → ${t.end_location || "?"} · ${t.distance ?? "?"} km`,
      time: formatTime(t.date),
      icon: Car,
      path: "/plugins/vehicle",
    })),
  ].slice(0, 6);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  // ─── Skeleton loader ──────────────────────────────────────────────────────
  const ActivitySkeleton = () => (
    <div className="glass-card divide-y divide-border animate-pulse">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="w-4 h-4 rounded bg-secondary shrink-0" />
          <div className="flex-1 h-3 rounded bg-secondary" />
          <div className="w-12 h-2 rounded bg-secondary" />
        </div>
      ))}
    </div>
  );

  // ─── Rendu ────────────────────────────────────────────────────────────────
  return (
    <div className="fade-in">
      {showWelcome && <WelcomeScreen onClose={handleCloseWelcome} />}

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-2 md:px-0 md:pt-0">
        <div>
          <h1 className="text-2xl font-bold font-heading md:hidden">
            <span className="text-gradient-gold">SWAN · HUB</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {profile?.full_name ? `${greeting}, ${profile.full_name}` : "Simple Work"}
          </p>
        </div>
        <button
          onClick={toggleDarkLight}
          className="p-2.5 rounded-xl bg-secondary border border-border text-muted-foreground hover:text-foreground transition-colors"
          title={isDark ? "Mode clair" : "Mode sombre"}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      {/* Promo banner */}
      {promo && (
        <div className="px-4 md:px-0 mt-4">
          <div className="glass-card-glow p-4 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <p className="text-sm text-secondary-foreground flex-1">
              <span className="font-semibold text-primary">{promo.title}</span> {promo.message}
            </p>
          </div>
        </div>
      )}

      {/* Actions rapides */}
      <div className="px-4 md:px-0 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-muted-foreground font-heading uppercase tracking-wider">
            Actions rapides
          </h2>
          <button
            onClick={() => setEditMode(!editMode)}
            className={`text-[10px] font-medium px-2 py-0.5 rounded-md transition-colors ${
              editMode ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {editMode ? "Terminé" : "Réorganiser"}
          </button>
        </div>

        {editMode ? (
          <div className="space-y-1.5">
            {quickActions.map((a, idx) => {
              const IconComp = iconMap[a.iconName];
              return (
                <div key={a.id} className="glass-card px-3 py-2.5 flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `hsl(${a.color} / 0.12)` }}
                  >
                    {IconComp && <IconComp size={18} style={{ color: `hsl(${a.color})` }} />}
                  </div>
                  <span className="text-sm font-medium flex-1">{a.label}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => movePlugin(idx, -1)}
                      disabled={idx === 0}
                      className="p-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      onClick={() => movePlugin(idx, 1)}
                      disabled={idx === quickActions.length - 1}
                      className="p-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5">
            {quickActions.map((a) => {
              const IconComp = iconMap[a.iconName];
              return (
                <button
                  key={a.id}
                  onClick={() => navigate(a.path)}
                  className="glass-card p-4 flex flex-col items-center gap-2.5 hover:border-primary/30 transition-all active:scale-95"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `hsl(${a.color} / 0.12)` }}
                  >
                    {IconComp && <IconComp size={20} style={{ color: `hsl(${a.color})` }} />}
                  </div>
                  <span className="text-[10px] font-medium text-secondary-foreground text-center leading-tight">
                    {a.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Activité récente */}
      <div className="px-4 md:px-0 mt-8">
        <h2 className="text-xs font-semibold text-muted-foreground mb-3 font-heading uppercase tracking-wider">
          Activité récente
        </h2>

        {/* Erreur */}
        {activityError && (
          <div className="glass-card p-4 text-center text-xs text-muted-foreground">
            ⚠️ Impossible de charger l'activité. Vérifie ta connexion.
          </div>
        )}

        {/* Chargement */}
        {activityLoading && <ActivitySkeleton />}

        {/* Vide */}
        {!activityLoading && !activityError && recentActivity.length === 0 && (
          <div className="glass-card p-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <FileText size={20} className="text-primary" />
            </div>
            <p className="text-sm font-medium">Pas encore d'activité</p>
            <p className="text-xs text-muted-foreground">Commencez par créer un rapport ou une tâche</p>
          </div>
        )}

        {/* Liste */}
        {!activityLoading && !activityError && recentActivity.length > 0 && (
          <div className="glass-card divide-y divide-border">
            {recentActivity.map((item, i) => (
              <button
                key={i}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/50 transition-colors"
              >
                <item.icon size={16} className="text-muted-foreground shrink-0" />
                <span className="text-sm flex-1 truncate">{item.text}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">{item.time}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer version */}
      <div className="text-center mt-10 pb-2">
        <p className="text-[10px] text-muted-foreground/50">SWAN · HUB v{APP_BUILD}</p>
      </div>

      <FeedbackButton context="home" />
    </div>
  );
};

export default HomePage;
