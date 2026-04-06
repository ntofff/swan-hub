import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import { Plus, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  Actif: "217 91% 60%", Terminé: "142 71% 45%", Archivé: "0 0% 50%",
};

const MissionsPlugin = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("tout");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");

  const { data: missions = [], isLoading } = useQuery({
    queryKey: ["missions"],
    queryFn: async () => {
      const { data } = await supabase.from("missions").select("*, user_activities(name, color)").order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const addMission = useMutation({
    mutationFn: async () => {
      if (!user || !title.trim()) return;
      await supabase.from("missions").insert({ user_id: user.id, title: title.trim(), client: client.trim() || null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      setTitle(""); setClient(""); setShowForm(false);
      toast.success("Mission créée !");
    },
  });

  const tabMap: Record<string, string> = { actif: "Actif", terminé: "Terminé", archivé: "Archivé" };
  const filtered = tab === "tout" ? missions : missions.filter((m: any) => m.status === tabMap[tab]);

  return (
    <div className="fade-in">
      <PageHeader title="Missions" subtitle="Gérer les affectations" back
        action={<button onClick={() => setShowForm(!showForm)} className="p-2 rounded-xl bg-primary/10 text-primary"><Plus size={18} /></button>} />
      <div className="px-4 md:px-0">
        {showForm && (
          <div className="glass-card p-4 mb-4 space-y-3 slide-up">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre de la mission..."
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            <input value={client} onChange={e => setClient(e.target.value)} placeholder="Client (optionnel)"
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            <button onClick={() => addMission.mutate()} disabled={!title.trim()} className="w-full btn-primary-glow py-2.5 text-sm disabled:opacity-40">Créer la mission</button>
          </div>
        )}

        <div className="flex gap-1.5 mb-4 overflow-x-auto">
          {["tout", "actif", "terminé", "archivé"].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium capitalize transition-colors whitespace-nowrap ${tab === t ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>{t}</button>
          ))}
        </div>

        {isLoading ? (
          <div className="glass-card p-8 flex justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-sm text-muted-foreground">Aucune mission</p>
            <p className="text-xs text-muted-foreground mt-1">Cliquez sur + pour en créer une</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((m: any) => (
              <div key={m.id} className="glass-card p-4 flex items-center gap-3">
                <div className="flex-1">
                  <div className="text-sm font-semibold">{m.title}</div>
                  <div className="text-xs text-muted-foreground">{m.client && `${m.client} · `}{new Date(m.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</div>
                  {m.user_activities && <span className="text-[10px] mt-1 inline-block" style={{ color: `hsl(${m.user_activities.color})` }}>{m.user_activities.name}</span>}
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: `hsl(${statusColors[m.status]} / 0.12)`, color: `hsl(${statusColors[m.status]})` }}>
                  {m.status}
                </span>
                <ChevronRight size={16} className="text-muted-foreground" />
              </div>
            ))}
          </div>
        )}
      </div>
      <FeedbackButton context="missions" />
    </div>
  );
};

export default MissionsPlugin;
