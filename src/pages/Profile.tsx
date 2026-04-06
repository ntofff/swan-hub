import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import { useAuth, parseTheme, buildThemeId } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Shield, Eye, Download, Trash2, CreditCard, Palette, LogOut, Plus, X, Pencil, Lock, Check, ChevronRight, Sun, Moon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const styleOptions = [
  { id: "dark-night", label: "Dark Night", color: "38 50% 58%" },
  { id: "corporate", label: "Corporate", color: "210 80% 55%" },
  { id: "professional", label: "Professional", color: "0 0% 75%" },
  { id: "artistic", label: "Artistic", color: "280 65% 60%" },
  { id: "sunset", label: "Sunset", color: "20 85% 55%" },
  { id: "gaming", label: "Gaming", color: "160 100% 45%" },
  { id: "fun", label: "Fun", color: "330 85% 60%" },
];

const colorPresets = ["38 50% 58%", "217 91% 60%", "142 71% 45%", "0 72% 51%", "270 50% 60%", "38 92% 50%", "190 80% 50%", "330 70% 55%"];

const ProfilePage = () => {
  const { user, profile, signOut, updateProfile, updatePassword } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [section, setSection] = useState<string>("compte");

  // Account
  const [editName, setEditName] = useState(false);
  const [nameValue, setNameValue] = useState("");

  // Security
  const [changePw, setChangePw] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  // Activities
  const [newActivity, setNewActivity] = useState("");
  const [newColor, setNewColor] = useState("38 50% 58%");
  const [editId, setEditId] = useState<string | null>(null);
  const [editActivityName, setEditActivityName] = useState("");
  const [editColor, setEditColor] = useState("");

  const { data: activities = [] } = useQuery({
    queryKey: ["user_activities"],
    queryFn: async () => {
      const { data } = await supabase.from("user_activities").select("*").order("created_at");
      return data ?? [];
    },
    enabled: !!user,
  });

  const addActivity = useMutation({
    mutationFn: async () => {
      if (!user || !newActivity.trim()) return;
      await supabase.from("user_activities").insert({ user_id: user.id, name: newActivity.trim(), color: newColor });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["user_activities"] }); setNewActivity(""); },
  });

  const updateActivity = useMutation({
    mutationFn: async () => {
      if (!editId) return;
      await supabase.from("user_activities").update({ name: editActivityName, color: editColor }).eq("id", editId);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["user_activities"] }); setEditId(null); },
  });

  const deleteActivity = useMutation({
    mutationFn: async (id: string) => { await supabase.from("user_activities").delete().eq("id", id); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user_activities"] }),
  });

  const handleLogout = async () => { await signOut(); navigate("/login"); };

  const handleNameSave = async () => {
    if (!nameValue.trim()) return;
    await updateProfile({ full_name: nameValue.trim() });
    setEditName(false);
    toast.success("Nom mis à jour");
  };

  const handlePasswordChange = async () => {
    if (newPw.length < 6) { toast.error("6 caractères minimum"); return; }
    if (newPw !== confirmPw) { toast.error("Les mots de passe ne correspondent pas"); return; }
    const { error } = await updatePassword(newPw);
    if (error) { toast.error(error.message); return; }
    setChangePw(false); setNewPw(""); setConfirmPw("");
    toast.success("Mot de passe modifié");
  };

  const { style: currentStyle, mode: currentMode } = parseTheme(profile?.theme || "dark-night");

  const handleStyleChange = async (styleId: string) => {
    const newTheme = buildThemeId(styleId, currentMode);
    await updateProfile({ theme: newTheme });
    toast.success("Style appliqué");
  };

  const handleModeToggle = async () => {
    const newMode = currentMode === "dark" ? "light" : "dark";
    const newTheme = buildThemeId(currentStyle, newMode);
    await updateProfile({ theme: newTheme });
    toast.success(newMode === "dark" ? "Mode sombre" : "Mode clair");
  };

  const handleExportData = () => {
    const data = { profile, activities, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "swan-data-export.json"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Données exportées");
  };

  const sections = [
    { id: "compte", label: "Compte", icon: User },
    { id: "securite", label: "Sécurité", icon: Shield },
    { id: "activites", label: "Activités", icon: Palette },
    { id: "apparence", label: "Apparence", icon: Palette },
    { id: "confidentialite", label: "Confidentialité", icon: Eye },
    { id: "abonnement", label: "Abonnement", icon: CreditCard },
    { id: "donnees", label: "Données", icon: Download },
  ];

  const inputCls = "w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="fade-in">
      <PageHeader title="Profil" />
      <div className="px-4 md:px-0">
        {/* User card */}
        <div className="glass-card-glow p-5 flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center">
            <User size={24} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold font-heading truncate">{profile?.full_name || "Utilisateur"}</div>
            <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">ID : {user?.id?.slice(0, 8)}… · <span className="capitalize">{profile?.plan || "free"}</span></div>
          </div>
        </div>

        {/* Section nav — grid on mobile, row on desktop */}
        <div className="grid grid-cols-4 gap-1.5 mb-5 md:flex md:flex-wrap md:gap-1">
          {sections.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)}
              className={`flex flex-col md:flex-row items-center gap-1 md:gap-1.5 px-2 py-2.5 md:px-3 md:py-1.5 rounded-xl md:rounded-full text-[10px] md:text-xs font-medium transition-colors ${section === s.id ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-secondary/50 text-muted-foreground border border-transparent'}`}>
              <s.icon size={16} className="shrink-0 md:hidden" />
              <span className="leading-tight text-center">{s.label}</span>
            </button>
          ))}
        </div>

        {/* ── Compte ── */}
        {section === "compte" && (
          <div className="space-y-4 slide-up">
            <div className="glass-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Nom</p>
                  {editName ? (
                    <div className="flex gap-2 mt-1">
                      <input value={nameValue} onChange={e => setNameValue(e.target.value)} className={inputCls} autoFocus />
                      <button onClick={handleNameSave} className="p-2 rounded-lg bg-primary/10 text-primary"><Check size={16} /></button>
                      <button onClick={() => setEditName(false)} className="p-2 rounded-lg bg-secondary text-muted-foreground"><X size={16} /></button>
                    </div>
                  ) : (
                    <p className="text-sm font-medium mt-0.5">{profile?.full_name || "—"}</p>
                  )}
                </div>
                {!editName && <button onClick={() => { setNameValue(profile?.full_name || ""); setEditName(true); }} className="text-muted-foreground hover:text-foreground"><Pencil size={14} /></button>}
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium mt-0.5">{user?.email}</p>
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">ID utilisateur</p>
                <p className="text-sm font-mono mt-0.5 text-muted-foreground">{user?.id}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="w-full glass-card p-4 flex items-center gap-3 text-destructive hover:bg-destructive/5 transition-colors">
              <LogOut size={18} /> <span className="text-sm font-medium">Se déconnecter</span>
            </button>
          </div>
        )}

        {/* ── Sécurité ── */}
        {section === "securite" && (
          <div className="space-y-4 slide-up">
            <div className="glass-card p-4 space-y-3">
              <h3 className="text-sm font-semibold">Mot de passe</h3>
              {changePw ? (
                <div className="space-y-2">
                  <input value={newPw} onChange={e => setNewPw(e.target.value)} type="password" placeholder="Nouveau mot de passe" className={inputCls} />
                  <input value={confirmPw} onChange={e => setConfirmPw(e.target.value)} type="password" placeholder="Confirmer" className={inputCls} />
                  <div className="flex gap-2">
                    <button onClick={handlePasswordChange} className="flex-1 btn-primary-glow py-2.5 text-sm">Modifier</button>
                    <button onClick={() => setChangePw(false)} className="px-4 py-2.5 rounded-xl bg-secondary text-muted-foreground text-sm">Annuler</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setChangePw(true)} className="text-sm text-primary">Changer le mot de passe</button>
              )}
            </div>
            <div className="glass-card p-4 space-y-2">
              <div className="flex items-center gap-3">
                <Lock size={18} className="text-muted-foreground" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold">Authentification 2FA</h3>
                  <p className="text-xs text-muted-foreground">Non activée</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-warning/10 text-warning">Bientôt</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Activités ── */}
        {section === "activites" && (
          <div className="space-y-3 slide-up">
            {activities.map((a: any) => (
              <div key={a.id} className="glass-card p-3 flex items-center gap-3">
                {editId === a.id ? (
                  <>
                    <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: `hsl(${editColor})` }} />
                    <input value={editActivityName} onChange={e => setEditActivityName(e.target.value)}
                      className="flex-1 bg-secondary border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                    <div className="flex gap-1">
                      {colorPresets.slice(0, 4).map(c => (
                        <button key={c} onClick={() => setEditColor(c)} className={`w-4 h-4 rounded-full border ${editColor === c ? 'border-foreground' : 'border-transparent'}`} style={{ backgroundColor: `hsl(${c})` }} />
                      ))}
                    </div>
                    <button onClick={() => updateActivity.mutate()} className="text-primary text-xs">✓</button>
                    <button onClick={() => setEditId(null)} className="text-muted-foreground"><X size={14} /></button>
                  </>
                ) : (
                  <>
                    <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: `hsl(${a.color})` }} />
                    <span className="text-sm flex-1">{a.name}</span>
                    <button onClick={() => { setEditId(a.id); setEditActivityName(a.name); setEditColor(a.color); }} className="text-muted-foreground hover:text-foreground"><Pencil size={14} /></button>
                    <button onClick={() => deleteActivity.mutate(a.id)} className="text-muted-foreground hover:text-destructive"><X size={14} /></button>
                  </>
                )}
              </div>
            ))}
            <div className="flex gap-2">
              <input value={newActivity} onChange={e => setNewActivity(e.target.value)} placeholder="Nouvelle activité..."
                className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              <div className="flex gap-1 items-center">
                {colorPresets.slice(0, 4).map(c => (
                  <button key={c} onClick={() => setNewColor(c)} className={`w-5 h-5 rounded-full border-2 ${newColor === c ? 'border-foreground' : 'border-transparent'}`} style={{ backgroundColor: `hsl(${c})` }} />
                ))}
              </div>
              <button onClick={() => addActivity.mutate()} disabled={!newActivity.trim()} className="p-2 rounded-xl bg-primary/10 text-primary disabled:opacity-40"><Plus size={18} /></button>
            </div>
          </div>
        )}

        {/* ── Apparence ── */}
        {section === "apparence" && (
          <div className="space-y-4 slide-up">
            {/* Mode toggle */}
            <div className="glass-card p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Mode d'affichage</p>
                <p className="text-xs text-muted-foreground">{currentMode === "dark" ? "Sombre" : "Clair"}</p>
              </div>
              <button onClick={handleModeToggle} className="p-2.5 rounded-xl bg-secondary border border-border text-muted-foreground hover:text-foreground transition-colors">
                {currentMode === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>

            {/* Style selector */}
            <p className="text-xs text-muted-foreground">Choisissez un style visuel pour SWAN</p>
            <div className="grid grid-cols-2 gap-2.5">
              {styleOptions.map(t => (
                <button key={t.id} onClick={() => handleStyleChange(t.id)}
                  className={`glass-card p-4 flex flex-col items-center gap-3 transition-all ${currentStyle === t.id ? 'border-primary ring-1 ring-primary/30' : 'hover:border-primary/20'}`}>
                  <div className="w-10 h-10 rounded-xl" style={{ backgroundColor: `hsl(${t.color})` }} />
                  <span className="text-xs font-medium">{t.label}</span>
                  {currentStyle === t.id && <Check size={14} className="text-primary" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Confidentialité ── */}
        {section === "confidentialite" && (
          <div className="space-y-3 slide-up">
            {["Politique de confidentialité", "Conditions d'utilisation", "Préférences cookies", "Droits RGPD"].map(l => (
              <button key={l} className="w-full glass-card p-4 flex items-center justify-between text-sm text-left hover:bg-secondary/50 transition-colors">
                {l} <ChevronRight size={16} className="text-muted-foreground" />
              </button>
            ))}
          </div>
        )}

        {/* ── Abonnement ── */}
        {section === "abonnement" && (
          <div className="space-y-4 slide-up">
            <div className="glass-card-glow p-5 text-center">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Plan actuel</div>
              <div className="text-2xl font-bold font-heading capitalize">{profile?.plan || "free"}</div>
            </div>
            <div className="glass-card divide-y divide-border">
              {[
                { plan: "Free", price: "0 €", features: "6 plugins, 1 activité" },
                { plan: "Pro", price: "9.99 €/mois", features: "Tous les plugins, activités illimitées, export" },
                { plan: "Business", price: "24.99 €/mois", features: "Pro + multi-utilisateur, API, support prioritaire" },
              ].map(p => (
                <div key={p.plan} className="px-4 py-3.5 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{p.plan}</div>
                    <div className="text-[10px] text-muted-foreground">{p.features}</div>
                  </div>
                  <span className="text-sm font-semibold text-primary">{p.price}</span>
                </div>
              ))}
            </div>
            <button className="w-full btn-primary-glow py-3 text-sm">Passer à Pro</button>
          </div>
        )}

        {/* ── Données ── */}
        {section === "donnees" && (
          <div className="space-y-4 slide-up">
            <button onClick={handleExportData} className="w-full glass-card p-4 flex items-center gap-3 hover:bg-secondary/50 transition-colors">
              <Download size={18} className="text-primary" />
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">Exporter mes données</div>
                <div className="text-[10px] text-muted-foreground">Télécharger profil, activités et préférences</div>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
            <button className="w-full glass-card p-4 flex items-center gap-3 text-destructive hover:bg-destructive/5 transition-colors">
              <Trash2 size={18} />
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">Supprimer le compte</div>
                <div className="text-[10px] text-muted-foreground/70">Suppression définitive après 30 jours</div>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          </div>
        )}
      </div>
      <FeedbackButton context="profile" />
    </div>
  );
};

export default ProfilePage;
