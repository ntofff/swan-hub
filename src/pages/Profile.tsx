import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Shield, Eye, Download, Trash2, CreditCard, Palette, ChevronRight, LogOut, Plus, X, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ProfilePage = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newActivity, setNewActivity] = useState("");
  const [newColor, setNewColor] = useState("38 50% 58%");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
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
      await supabase.from("user_activities").update({ name: editName, color: editColor }).eq("id", editId);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["user_activities"] }); setEditId(null); },
  });

  const deleteActivity = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("user_activities").delete().eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user_activities"] }),
  });

  const handleLogout = async () => { await signOut(); navigate("/login"); };

  const colorPresets = ["38 50% 58%", "217 91% 60%", "142 71% 45%", "0 72% 51%", "270 50% 60%", "38 92% 50%", "190 80% 50%", "330 70% 55%"];

  const profileSections = [
    { label: "Paramètres de sécurité", icon: Shield, desc: "Mot de passe, 2FA" },
    { label: "Paramètres de confidentialité", icon: Eye, desc: "Données, cookies, RGPD" },
    { label: "Thème", icon: Palette, desc: "Dark Night" },
    { label: "Changer de plan", icon: CreditCard, desc: "Gratuit → Pro" },
    { label: "Exporter mes données", icon: Download, desc: "Télécharger toutes les données" },
    { label: "Supprimer le compte", icon: Trash2, desc: "Suppression permanente", danger: true },
  ];

  return (
    <div className="fade-in">
      <PageHeader title="Profil" />
      <div className="px-4 md:px-0">
        {/* User card */}
        <div className="glass-card-glow p-5 flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center">
            <User size={24} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold font-heading truncate">{profile?.full_name || "Utilisateur"}</div>
            <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
            <div className="text-[10px] text-muted-foreground mt-1">ID : {user?.id?.slice(0, 8)}...</div>
          </div>
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary capitalize">{profile?.plan || "free"}</span>
        </div>

        {/* Activities */}
        <h2 className="text-sm font-semibold text-muted-foreground mb-2 font-heading uppercase tracking-wider">Activités</h2>
        <div className="space-y-2 mb-4">
          {activities.map((a: any) => (
            <div key={a.id} className="glass-card p-3 flex items-center gap-3">
              {editId === a.id ? (
                <>
                  <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: `hsl(${editColor})` }} />
                  <input value={editName} onChange={e => setEditName(e.target.value)}
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
                  <button onClick={() => { setEditId(a.id); setEditName(a.name); setEditColor(a.color); }} className="text-muted-foreground hover:text-foreground"><Pencil size={14} /></button>
                  <button onClick={() => deleteActivity.mutate(a.id)} className="text-muted-foreground hover:text-destructive"><X size={14} /></button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Add activity */}
        <div className="flex gap-2 mb-6">
          <input value={newActivity} onChange={e => setNewActivity(e.target.value)} placeholder="Nouvelle activité..."
            className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          <div className="flex gap-1 items-center">
            {colorPresets.slice(0, 4).map(c => (
              <button key={c} onClick={() => setNewColor(c)} className={`w-5 h-5 rounded-full border-2 ${newColor === c ? 'border-foreground' : 'border-transparent'}`} style={{ backgroundColor: `hsl(${c})` }} />
            ))}
          </div>
          <button onClick={() => addActivity.mutate()} disabled={!newActivity.trim()} className="p-2 rounded-xl bg-primary/10 text-primary disabled:opacity-40"><Plus size={18} /></button>
        </div>

        {/* Settings */}
        <div className="glass-card divide-y divide-border">
          {profileSections.map(s => (
            <button key={s.label} className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/50 ${s.danger ? 'text-destructive' : ''}`}>
              <s.icon size={18} className={s.danger ? 'text-destructive' : 'text-muted-foreground'} />
              <div className="flex-1">
                <div className="text-sm font-medium">{s.label}</div>
                <div className="text-[10px] text-muted-foreground">{s.desc}</div>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* Logout */}
        <button onClick={handleLogout} className="w-full mt-4 glass-card p-4 flex items-center gap-3 text-destructive hover:bg-destructive/5 transition-colors">
          <LogOut size={18} />
          <span className="text-sm font-medium">Se déconnecter</span>
        </button>
      </div>

      <div className="px-4 md:px-0 mt-8 mb-8 flex flex-wrap gap-4 justify-center">
        {["Politique de confidentialité", "Conditions d'utilisation", "Préférences cookies", "Droits RGPD"].map(l => (
          <button key={l} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">{l}</button>
        ))}
      </div>
      <FeedbackButton context="profile" />
    </div>
  );
};

export default ProfilePage;
