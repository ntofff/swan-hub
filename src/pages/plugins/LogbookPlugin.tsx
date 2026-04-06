import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import { Plus, Search, Trash2, Pencil, X, Check, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const LogbookPlugin = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [newEntry, setNewEntry] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["log_entries"] });
      setNewEntry("");
      setShowForm(false);
      toast.success("Entrée ajoutée");
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("log_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["log_entries"] });
      toast.success("Entrée supprimée");
    },
  });

  const updateEntry = useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) => {
      const { error } = await supabase.from("log_entries").update({ text }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["log_entries"] });
      setEditingId(null);
      setEditText("");
      toast.success("Entrée modifiée");
    },
  });

  const filtered = entries.filter((e: any) => e.text.toLowerCase().includes(search.toLowerCase()));

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return "Aujourd'hui";
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Hier";
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  const startEdit = (e: any) => {
    setEditingId(e.id);
    setEditText(e.text);
  };

  const confirmEdit = () => {
    if (!editingId || !editText.trim()) return;
    if (window.confirm("Confirmer la modification de cette entrée ?")) {
      updateEntry.mutate({ id: editingId, text: editText.trim() });
    }
  };

  const confirmDelete = (id: string) => {
    if (window.confirm("Supprimer cette entrée du journal ?")) {
      deleteEntry.mutate(id);
    }
  };

  return (
    <div className="fade-in">
      <PageHeader title="Journal de bord" subtitle="Entrées chronologiques" back
        action={
          <button onClick={() => setShowForm(!showForm)}
            className={`p-2 rounded-xl transition-colors ${showForm ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
            {showForm ? <X size={18} /> : <Plus size={18} />}
          </button>
        } />

      <div className="px-4 md:px-0 space-y-3">
        {showForm && (
          <div className="glass-card p-4 space-y-3 slide-up">
            <textarea value={newEntry} onChange={e => setNewEntry(e.target.value)} placeholder="Nouvelle entrée..."
              rows={3} className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
            <button onClick={() => addEntry.mutate()} disabled={!newEntry.trim() || addEntry.isPending}
              className="w-full btn-primary-glow py-2.5 text-sm disabled:opacity-40">
              Ajouter
            </button>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
            className="w-full bg-secondary border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-colors" />
        </div>

        {/* Count */}
        {!isLoading && filtered.length > 0 && (
          <div className="text-[10px] text-muted-foreground px-1">
            {filtered.length} entrée{filtered.length > 1 ? "s" : ""}
            {search && ` pour "${search}"`}
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <div className="glass-card p-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-sm text-muted-foreground">{search ? "Aucun résultat" : "Aucune entrée"}</p>
            {!search && <p className="text-xs text-muted-foreground mt-1">Cliquez sur + pour ajouter</p>}
          </div>
        ) : (
          <div className="glass-card divide-y divide-border overflow-hidden">
            {filtered.map((e: any) => (
              <div key={e.id} className="px-4 py-3 space-y-1">
                {editingId === e.id ? (
                  <div className="space-y-2">
                    <textarea value={editText} onChange={ev => setEditText(ev.target.value)}
                      rows={3} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
                    <div className="flex gap-2">
                      <button onClick={confirmEdit} disabled={!editText.trim()}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium disabled:opacity-40">
                        <Check size={12} /> Confirmer
                      </button>
                      <button onClick={() => { setEditingId(null); setEditText(""); }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-secondary text-muted-foreground text-xs">
                        <X size={12} /> Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm leading-relaxed flex-1">{e.text}</p>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button onClick={() => startEdit(e)} className="p-1.5 text-muted-foreground hover:text-primary transition-colors">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => confirmDelete(e.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Clock size={10} />
                      {formatDate(e.created_at)} · {new Date(e.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </>
                )}
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
