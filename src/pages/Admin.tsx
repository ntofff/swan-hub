import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Users, Puzzle, MessageSquare, Shield, Settings, ChevronRight, Search,
  Plus, Check, X, Palette, ScrollText, BarChart3, Megaphone, Eye, Trash2
} from "lucide-react";

const AdminPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [section, setSection] = useState<string>("dashboard");
  const [search, setSearch] = useState("");
  const [promoForm, setPromoForm] = useState({ title: "", message: "", type: "banner" });
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [themeForm, setThemeForm] = useState({ name: "" });
  const [showThemeForm, setShowThemeForm] = useState(false);
  const [feedbackFilter, setFeedbackFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // ── Queries ──
  const { data: profiles = [] } = useQuery({
    queryKey: ["admin_profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user && section !== "themes",
  });

  const { data: allFeedback = [] } = useQuery({
    queryKey: ["admin_feedback"],
    queryFn: async () => {
      const { data } = await supabase.from("feedback").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: plugins = [] } = useQuery({
    queryKey: ["admin_plugins"],
    queryFn: async () => {
      const { data } = await supabase.from("plugins").select("*").order("name");
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: userPlugins = [] } = useQuery({
    queryKey: ["admin_user_plugins"],
    queryFn: async () => {
      const { data } = await supabase.from("user_plugins").select("*");
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: promotions = [] } = useQuery({
    queryKey: ["admin_promotions"],
    queryFn: async () => {
      const { data } = await supabase.from("promotions").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: themes = [] } = useQuery({
    queryKey: ["admin_themes"],
    queryFn: async () => {
      const { data } = await supabase.from("themes").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["admin_audit_logs"],
    queryFn: async () => {
      const { data } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
    enabled: !!user,
  });

  // ── Mutations ──
  const updateFeedback = useMutation({
    mutationFn: async ({ id, status, admin_note }: { id: string; status?: string; admin_note?: string }) => {
      const update: any = {};
      if (status) update.status = status;
      if (admin_note !== undefined) update.admin_note = admin_note;
      await supabase.from("feedback").update(update).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin_feedback"] }),
  });

  const createPromo = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await supabase.from("promotions").insert({ ...promoForm, created_by: user.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_promotions"] });
      setPromoForm({ title: "", message: "", type: "banner" });
      setShowPromoForm(false);
      toast.success("Promotion créée");
    },
  });

  const togglePromo = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      await supabase.from("promotions").update({ is_active }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin_promotions"] }),
  });

  const createTheme = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await supabase.from("themes").insert({ name: themeForm.name, created_by: user.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_themes"] });
      setThemeForm({ name: "" });
      setShowThemeForm(false);
      toast.success("Thème créé");
    },
  });

  const logAction = async (action: string, details?: any) => {
    if (!user) return;
    await supabase.rpc("log_audit_event", {
      _action: action,
      _details: details ?? null,
    });
  };

  // ── Stats ──
  const totalUsers = profiles.length;
  const recentSignups = profiles.filter((p: any) => Date.now() - new Date(p.created_at).getTime() < 86400000 * 7).length;
  const feedbackOpen = allFeedback.filter((f: any) => f.status === "open").length;
  const pluginActivations = userPlugins.length;

  const pluginUsage = plugins.map((p: any) => ({
    ...p,
    activations: userPlugins.filter((up: any) => up.plugin_id === p.id).length,
  })).sort((a: any, b: any) => b.activations - a.activations);

  const filteredFeedback = feedbackFilter === "all" ? allFeedback : allFeedback.filter((f: any) => f.type === feedbackFilter);

  const filteredProfiles = search
    ? profiles.filter((p: any) => p.full_name?.toLowerCase().includes(search.toLowerCase()) || p.user_id?.includes(search))
    : profiles;

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "users", label: "Utilisateurs", icon: Users },
    { id: "promotions", label: "Promotions", icon: Megaphone },
    { id: "feedback", label: "Feedback", icon: MessageSquare },
    { id: "plugins", label: "Plugins", icon: Puzzle },
    { id: "themes", label: "Thèmes", icon: Palette },
    { id: "audit", label: "Audit", icon: ScrollText },
  ];

  const formatDate = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="fade-in max-w-6xl mx-auto">
      <div className="flex items-center justify-between px-4 pt-6 pb-4">
        <div>
          <h1 className="text-xl font-bold font-heading flex items-center gap-2">
            <Shield size={20} className="text-primary" /> Console Admin
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Administration SWAN · HUB</p>
        </div>
      </div>

      <div className="px-4">
        {/* Nav */}
        <div className="flex gap-1 overflow-x-auto pb-1 mb-5 -mx-1 px-1">
          {navItems.map(n => (
            <button key={n.id} onClick={() => setSection(n.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${section === n.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
              <n.icon size={12} /> {n.label}
            </button>
          ))}
        </div>

        {/* ── Dashboard ── */}
        {section === "dashboard" && (
          <div className="space-y-5 slide-up">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {[
                { label: "Utilisateurs", value: totalUsers },
                { label: "Inscrits 7j", value: recentSignups },
                { label: "Plugins actifs", value: pluginActivations },
                { label: "Feedback ouvert", value: feedbackOpen },
              ].map(s => (
                <div key={s.label} className="glass-card p-4">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
                  <div className="text-2xl font-bold font-heading mt-1">{s.value}</div>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Inscriptions récentes</h2>
                <div className="glass-card divide-y divide-border">
                  {profiles.slice(0, 5).map((p: any) => (
                    <div key={p.id} className="px-4 py-3 flex items-center gap-3">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{p.full_name || "—"}</div>
                        <div className="text-[10px] text-muted-foreground">{p.user_id?.slice(0, 8)}… · {p.plan}</div>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{formatDate(p.created_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Plugins populaires</h2>
                <div className="glass-card divide-y divide-border">
                  {pluginUsage.slice(0, 6).map((p: any) => (
                    <div key={p.id} className="px-4 py-3 flex items-center gap-3">
                      <span className="text-sm flex-1">{p.name}</span>
                      <span className="text-xs text-muted-foreground">{p.activations} activations</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Feedback récent</h2>
              <div className="glass-card divide-y divide-border">
                {allFeedback.slice(0, 5).map((f: any) => (
                  <div key={f.id} className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] text-muted-foreground">{f.user_id?.slice(0, 8)}…</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{f.plugin || f.context}</span>
                      <TypeBadge type={f.type} />
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${f.status === 'resolved' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>{f.status === 'resolved' ? 'Résolu' : 'Ouvert'}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">{formatDate(f.created_at)}</span>
                    </div>
                    <p className="text-sm">{f.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Users ── */}
        {section === "users" && (
          <div className="space-y-4 slide-up">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par nom ou ID..."
                className="w-full bg-secondary border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>

            {selectedUser ? (
              <div className="glass-card p-5 space-y-4 slide-up">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{selectedUser.full_name || "—"}</h3>
                  <button onClick={() => setSelectedUser(null)} className="text-muted-foreground"><X size={16} /></button>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>ID : {selectedUser.user_id}</p>
                  <p>Plan : {selectedUser.plan}</p>
                  <p>Inscrit : {formatDate(selectedUser.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Plugins actifs :</p>
                  <div className="flex flex-wrap gap-1.5">
                    {plugins.map((p: any) => {
                      const active = userPlugins.some((up: any) => up.user_id === selectedUser.user_id && up.plugin_id === p.id);
                      return (
                        <span key={p.id} className={`text-[10px] px-2 py-1 rounded-full ${active ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                          {p.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-card divide-y divide-border">
                {filteredProfiles.map((p: any) => (
                  <button key={p.id} onClick={() => setSelectedUser(p)} className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-secondary/50 transition-colors">
                    <div className="flex-1">
                      <div className="text-sm font-medium">{p.full_name || "—"}</div>
                      <div className="text-[10px] text-muted-foreground">{p.user_id?.slice(0, 12)}… · {p.plan}</div>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{formatDate(p.created_at)}</span>
                    <ChevronRight size={14} className="text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Promotions ── */}
        {section === "promotions" && (
          <div className="space-y-4 slide-up">
            <button onClick={() => setShowPromoForm(!showPromoForm)} className="btn-primary-glow px-4 py-2 text-sm flex items-center gap-2">
              <Plus size={14} /> Nouvelle promotion
            </button>
            {showPromoForm && (
              <div className="glass-card p-4 space-y-3 slide-up">
                <input value={promoForm.title} onChange={e => setPromoForm(f => ({ ...f, title: e.target.value }))} placeholder="Titre"
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                <textarea value={promoForm.message} onChange={e => setPromoForm(f => ({ ...f, message: e.target.value }))} placeholder="Message" rows={2}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
                <button onClick={() => { createPromo.mutate(); logAction("create_promotion", promoForm); }} disabled={!promoForm.title.trim()}
                  className="w-full btn-primary-glow py-2.5 text-sm disabled:opacity-40">Créer</button>
              </div>
            )}
            <div className="glass-card divide-y divide-border">
              {promotions.map((p: any) => (
                <div key={p.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{p.title}</div>
                    <div className="text-[10px] text-muted-foreground">{p.message}</div>
                  </div>
                  <button onClick={() => togglePromo.mutate({ id: p.id, is_active: !p.is_active })}
                    className={`text-[10px] px-2.5 py-1 rounded-full ${p.is_active ? 'bg-success/10 text-success' : 'bg-secondary text-muted-foreground'}`}>
                    {p.is_active ? "Actif" : "Inactif"}
                  </button>
                </div>
              ))}
              {promotions.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Aucune promotion</div>}
            </div>
          </div>
        )}

        {/* ── Feedback ── */}
        {section === "feedback" && (
          <div className="space-y-4 slide-up">
            <div className="flex gap-1.5 overflow-x-auto">
              {["all", "bug", "suggestion", "ux", "useful"].map(t => (
                <button key={t} onClick={() => setFeedbackFilter(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize whitespace-nowrap transition-colors ${feedbackFilter === t ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
                  {t === "all" ? "Tout" : t}
                </button>
              ))}
            </div>
            <div className="glass-card divide-y divide-border">
              {filteredFeedback.map((f: any) => (
                <div key={f.id} className="px-4 py-3 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-muted-foreground">{f.user_id?.slice(0, 8)}…</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{f.plugin || f.context || "—"}</span>
                    <TypeBadge type={f.type} />
                    <span className="text-[10px] text-muted-foreground ml-auto">{formatDate(f.created_at)}</span>
                  </div>
                  <p className="text-sm">{f.message}</p>
                  {f.screen && <p className="text-[10px] text-muted-foreground">Écran : {f.screen}</p>}
                  {f.admin_note && <p className="text-xs text-info bg-info/5 rounded-lg p-2">Note : {f.admin_note}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => {
                      const note = prompt("Note admin :");
                      if (note) updateFeedback.mutate({ id: f.id, admin_note: note });
                    }} className="text-[10px] text-muted-foreground hover:text-foreground">+ Note</button>
                    <button onClick={() => updateFeedback.mutate({ id: f.id, status: f.status === "resolved" ? "open" : "resolved" })}
                      className={`text-[10px] ${f.status === "resolved" ? 'text-success' : 'text-warning'}`}>
                      {f.status === "resolved" ? "✓ Résolu" : "○ Ouvert"}
                    </button>
                  </div>
                </div>
              ))}
              {filteredFeedback.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Aucun feedback</div>}
            </div>
          </div>
        )}

        {/* ── Plugins ── */}
        {section === "plugins" && (
          <div className="space-y-4 slide-up">
            <div className="glass-card divide-y divide-border">
              {pluginUsage.map((p: any) => (
                <div key={p.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-[10px] text-muted-foreground">{p.description}</div>
                  </div>
                  <span className="text-xs text-muted-foreground">{p.activations} act.</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${p.is_active ? 'bg-success/10 text-success' : 'bg-secondary text-muted-foreground'}`}>
                    {p.is_active ? "Actif" : "Inactif"}
                  </span>
                  {p.is_locked && <span className="text-[10px] px-2 py-0.5 rounded-full bg-warning/10 text-warning">Verrouillé</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Themes ── */}
        {section === "themes" && (
          <div className="space-y-4 slide-up">
            <button onClick={() => setShowThemeForm(!showThemeForm)} className="btn-primary-glow px-4 py-2 text-sm flex items-center gap-2">
              <Plus size={14} /> Nouveau thème
            </button>
            {showThemeForm && (
              <div className="glass-card p-4 space-y-3 slide-up">
                <input value={themeForm.name} onChange={e => setThemeForm({ name: e.target.value })} placeholder="Nom du thème"
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                <button onClick={() => createTheme.mutate()} disabled={!themeForm.name.trim()}
                  className="w-full btn-primary-glow py-2.5 text-sm disabled:opacity-40">Créer</button>
              </div>
            )}
            <div className="glass-card divide-y divide-border">
              {themes.map((t: any) => (
                <div key={t.id} className="px-4 py-3 flex items-center gap-3">
                  <Palette size={16} className="text-muted-foreground" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{t.name}</div>
                  </div>
                  {t.is_default && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">Par défaut</span>}
                </div>
              ))}
              {themes.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Aucun thème</div>}
            </div>
          </div>
        )}

        {/* ── Audit ── */}
        {section === "audit" && (
          <div className="slide-up">
            <div className="glass-card divide-y divide-border">
              {auditLogs.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Aucun log d'audit</div>
              ) : auditLogs.map((l: any) => (
                <div key={l.id} className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{l.action}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{formatDate(l.created_at)}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">{l.user_id?.slice(0, 8)}…{l.details ? ` · ${JSON.stringify(l.details).slice(0, 80)}` : ""}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="h-8" />
    </div>
  );
};

const TypeBadge = ({ type }: { type: string }) => {
  const colors: Record<string, string> = {
    bug: "bg-destructive/10 text-destructive",
    suggestion: "bg-primary/10 text-primary",
    ux: "bg-warning/10 text-warning",
    useful: "bg-success/10 text-success",
  };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full ${colors[type] || 'bg-secondary text-muted-foreground'}`}>{type}</span>;
};

export default AdminPage;
