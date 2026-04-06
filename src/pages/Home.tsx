import { useNavigate } from "react-router-dom";
import { FeedbackButton } from "@/components/FeedbackButton";
import { FileText, BookOpen, CheckSquare, Target, Receipt, Car, Sun, Moon } from "lucide-react";
import { parseTheme, buildThemeId } from "@/hooks/useAuth";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const quickActions = [
  { label: "Outil Rapport", icon: FileText, path: "/plugins/report", color: "38 50% 58%" },
  { label: "Journal de bord", icon: BookOpen, path: "/plugins/logbook", color: "217 91% 60%" },
  { label: "Tâches", icon: CheckSquare, path: "/plugins/tasks", color: "142 71% 45%" },
  { label: "Gestionnaire de missions", icon: Target, path: "/plugins/missions", color: "0 72% 51%" },
  { label: "Devis & Factures", icon: Receipt, path: "/plugins/quotes", color: "270 50% 60%" },
  { label: "Carnet de véhicule", icon: Car, path: "/plugins/vehicle", color: "38 92% 50%" },
];

const HomePage = () => {
  const navigate = useNavigate();
  const { user, profile, updateProfile } = useAuth();

  const isDark = !profile?.theme || profile.theme !== "light";

  const toggleDarkLight = async () => {
    const next = isDark ? "light" : "dark-night";
    await updateProfile({ theme: next });
  };

  const { data: recentTasks = [] } = useQuery({
    queryKey: ["recent_tasks"],
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("text, done, priority, updated_at").order("updated_at", { ascending: false }).limit(3);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: recentReports = [] } = useQuery({
    queryKey: ["recent_reports"],
    queryFn: async () => {
      const { data } = await supabase.from("reports").select("title, created_at").order("created_at", { ascending: false }).limit(2);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: recentMissions = [] } = useQuery({
    queryKey: ["recent_missions_home"],
    queryFn: async () => {
      const { data } = await supabase.from("missions").select("title, status, updated_at").order("updated_at", { ascending: false }).limit(2);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: recentTrips = [] } = useQuery({
    queryKey: ["recent_trips_home"],
    queryFn: async () => {
      const { data } = await supabase.from("trips").select("start_location, end_location, distance, date").order("date", { ascending: false }).limit(2);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: promo } = useQuery({
    queryKey: ["active_promo"],
    queryFn: async () => {
      const { data } = await supabase.from("promotions").select("title, message").eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const formatTime = (date: string) => {
    const d = new Date(date);
    const diff = Date.now() - d.getTime();
    if (diff < 3600000) return `Il y a ${Math.max(1, Math.floor(diff / 60000))} min`;
    if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)}h`;
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  const recentActivity = [
    ...recentReports.map((r: any) => ({ text: `Rapport « ${r.title} »`, time: formatTime(r.created_at), icon: FileText, path: "/plugins/report" })),
    ...recentTasks.map((t: any) => ({ text: `${t.done ? "✓" : "○"} ${t.text.slice(0, 35)}`, time: formatTime(t.updated_at), icon: CheckSquare, path: "/plugins/tasks" })),
    ...recentMissions.map((m: any) => ({ text: `Mission « ${m.title} » — ${m.status}`, time: formatTime(m.updated_at), icon: Target, path: "/plugins/missions" })),
    ...recentTrips.map((t: any) => ({ text: `${t.start_location || "?"} → ${t.end_location || "?"} · ${t.distance ?? "?"} km`, time: formatTime(t.date), icon: Car, path: "/plugins/vehicle" })),
  ].slice(0, 6);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between px-4 pt-6 pb-2 md:px-0 md:pt-0">
        <div>
          <h1 className="text-2xl font-bold font-heading md:hidden"><span className="text-gradient-gold">SWAN</span></h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {profile?.full_name ? `${greeting}, ${profile.full_name}` : "Simple Work Activity Network"}
          </p>
        </div>
        <button onClick={toggleDarkLight} className="p-2.5 rounded-xl bg-secondary border border-border text-muted-foreground hover:text-foreground transition-colors" title={isDark ? "Mode clair" : "Mode sombre"}>
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

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

      <div className="px-4 md:px-0 mt-6">
        <h2 className="text-xs font-semibold text-muted-foreground mb-3 font-heading uppercase tracking-wider">Actions rapides</h2>
        <div className="grid grid-cols-3 gap-2.5">
          {quickActions.map(a => (
            <button key={a.label} onClick={() => navigate(a.path)}
              className="glass-card p-4 flex flex-col items-center gap-2.5 hover:border-primary/30 transition-all active:scale-95">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `hsl(${a.color} / 0.12)` }}>
                <a.icon size={20} style={{ color: `hsl(${a.color})` }} />
              </div>
              <span className="text-[10px] font-medium text-secondary-foreground text-center leading-tight">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 md:px-0 mt-8">
        <h2 className="text-xs font-semibold text-muted-foreground mb-3 font-heading uppercase tracking-wider">Activité récente</h2>
        {recentActivity.length === 0 ? (
          <div className="glass-card p-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <FileText size={20} className="text-primary" />
            </div>
            <p className="text-sm font-medium">Pas encore d'activité</p>
            <p className="text-xs text-muted-foreground">Commencez par créer un rapport ou une tâche</p>
          </div>
        ) : (
          <div className="glass-card divide-y divide-border">
            {recentActivity.map((item, i) => (
              <button key={i} onClick={() => navigate(item.path)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/50 transition-colors">
                <item.icon size={16} className="text-muted-foreground shrink-0" />
                <span className="text-sm flex-1 truncate">{item.text}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">{item.time}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <FeedbackButton context="home" />
    </div>
  );
};

export default HomePage;
