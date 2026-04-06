import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import { Plus, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const LogbookPlugin = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [newEntry, setNewEntry] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["log_entries"],
    queryFn: async () => {
      const { data } = await supabase.from("log_entries").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const addEntry = useMutation({
    mutationFn: async () => {
      if (!user || !newEntry.trim()) return;
      await supabase.from("log_entries").insert({ user_id: user.id, text: newEntry.trim() });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["log_entries"] }); setNewEntry(""); setShowForm(false); },
  });

  const filtered = entries.filter((e: any) => e.text.toLowerCase().includes(search.toLowerCase()));

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return "Aujourd'hui";
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Hier";
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  return (
    <div className="fade-in">
      <PageHeader title="Journal de bord" subtitle="Entrées chronologiques" back
        action={<button onClick={() => setShowForm(!showForm)} className="p-2 rounded-xl bg-primary/10 text-primary"><Plus size={18} /></button>} />
      <div className="px-4 md:px-0">
        {showForm && (
          <div className="glass-card p-4 mb-4 space-y-3 slide-up">
            <textarea value={newEntry} onChange={e => setNewEntry(e.target.value)} placeholder="Nouvelle entrée..."
              rows={3} className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
            <button onClick={() => addEntry.mutate()} disabled={!newEntry.trim()} className="w-full btn-primary-glow py-2.5 text-sm disabled:opacity-40">Ajouter</button>
          </div>
        )}

        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher des entrées..."
            className="w-full bg-secondary border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>

        {isLoading ? (
          <div className="glass-card p-8 flex justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-sm text-muted-foreground">Aucune entrée</p>
            <p className="text-xs text-muted-foreground mt-1">Cliquez sur + pour ajouter</p>
          </div>
        ) : (
          <div className="glass-card divide-y divide-border">
            {filtered.map((e: any) => (
              <div key={e.id} className="px-4 py-3">
                <div className="text-sm">{e.text}</div>
                <div className="text-[10px] text-muted-foreground mt-1">{formatDate(e.created_at)} · {new Date(e.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <FeedbackButton context="logbook" />
    </div>
  );
};

export default LogbookPlugin;
