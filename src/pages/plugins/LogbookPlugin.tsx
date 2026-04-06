import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import { Plus, Search, Trash2, Pencil, X, Check, Clock, Hash, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const colorOptions = [
  { value: "38 50% 58%", label: "Sable" },
  { value: "210 60% 55%", label: "Bleu" },
  { value: "142 50% 45%", label: "Vert" },
  { value: "0 65% 55%", label: "Rouge" },
  { value: "280 55% 55%", label: "Violet" },
  { value: "45 85% 55%", label: "Jaune" },
  { value: "195 75% 45%", label: "Cyan" },
  { value: "25 75% 55%", label: "Orange" },
];

const priorityOptions = [
  { value: "normale", label: "Normale", cls: "" },
  { value: "important", label: "Important", cls: "bg-warning/15 text-warning" },
  { value: "urgent", label: "Urgent", cls: "bg-destructive/15 text-destructive" },
];

const LogbookPlugin = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  // New entry state
  const [newEntry, setNewEntry] = useState("");
  const [newColor, setNewColor] = useState("38 50% 58%");
  const [newPriority, setNewPriority] = useState("normale");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editColor, setEditColor] = useState("38 50% 58%");
  const [editPriority, setEditPriority] = useState("normale");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["log_entries"],
    queryFn: async () => {
      const { data } = await supabase.from("log_entries").select("*").order("entry_date", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const addEntry = useMutation({
    mutationFn: async () => {
      if (!user || !newEntry.trim()) return;
      const entryDate = newDate && newTime
        ? new Date(`${newDate}T${newTime}`).toISOString()
        : newDate
          ? new Date(`${newDate}T${new Date().toTimeString().slice(0, 5)}`).toISOString()
          : new Date().toISOString();
      await supabase.from("log_entries").insert({
        user_id: user.id,
        text: newEntry.trim(),
        color: newColor,
        priority: newPriority,
        entry_date: entryDate,
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["log_entries"] });
      setNewEntry(""); setNewColor("38 50% 58%"); setNewPriority("normale"); setNewDate(""); setNewTime("");
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
    mutationFn: async (payload: { id: string; text: string; color: string; priority: string; entry_date: string }) => {
      const { id, ...rest } = payload;
      const { error } = await supabase.from("log_entries").update(rest as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["log_entries"] });
      setEditingId(null);
      toast.success("Entrée modifiée");
    },
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return entries;
    return entries.filter((e: any) => e.text.toLowerCase().includes(q));
  }, [entries, search]);

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return "Aujourd'hui";
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Hier";
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  const getEntryDate = (e: any) => (e as any).entry_date || e.created_at;

  const startEdit = (e: any) => {
    const d = new Date(getEntryDate(e));
    setEditingId(e.id);
    setEditText(e.text);
    setEditColor((e as any).color || "38 50% 58%");
    setEditPriority((e as any).priority || "normale");
    setEditDate(d.toISOString().slice(0, 10));
    setEditTime(d.toTimeString().slice(0, 5));
  };

  const confirmEdit = () => {
    if (!editingId || !editText.trim()) return;
    if (window.confirm("Confirmer la modification de cette entrée ?")) {
      const entryDate = editDate && editTime
        ? new Date(`${editDate}T${editTime}`).toISOString()
        : new Date().toISOString();
      updateEntry.mutate({ id: editingId, text: editText.trim(), color: editColor, priority: editPriority, entry_date: entryDate });
    }
  };

  const confirmDelete = (id: string) => {
    if (window.confirm("Supprimer cette entrée du journal ?")) {
      deleteEntry.mutate(id);
    }
  };

  const shortId = (id: string) => id.slice(0, 6).toUpperCase();

  const getPriorityInfo = (p: string) => priorityOptions.find(o => o.value === p) || priorityOptions[0];

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
            {/* Priority selector */}
            <div>
              <label className="text-[10px] text-muted-foreground mb-1.5 block">Étiquette</label>
              <div className="flex gap-1.5">
                {priorityOptions.map(p => (
                  <button key={p.value} onClick={() => setNewPriority(p.value)}
                    className={`flex-1 text-xs py-2 rounded-lg border transition-all ${newPriority === p.value
                      ? (p.cls || "bg-primary/10 text-primary border-primary/30")
                      : "border-border text-muted-foreground hover:bg-secondary"
                    } ${p.cls && newPriority === p.value ? p.cls + " border-transparent" : ""}`}>
                    {p.value === "urgent" && <AlertTriangle size={10} className="inline mr-1" />}
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Color picker */}
            <div>
              <label className="text-[10px] text-muted-foreground mb-1.5 block">Couleur</label>
              <div className="flex gap-2">
                {colorOptions.map(c => (
                  <button key={c.value} onClick={() => setNewColor(c.value)} title={c.label}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${newColor === c.value ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: `hsl(${c.value})` }} />
                ))}
              </div>
            </div>

            {/* Date & time */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Date</label>
                <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Heure</label>
                <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            </div>

            <textarea value={newEntry} onChange={e => setNewEntry(e.target.value)} placeholder="Contenu de l'entrée..."
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

        {!isLoading && filtered.length > 0 && (
          <div className="text-[10px] text-muted-foreground px-1">
            {filtered.length} entrée{filtered.length > 1 ? "s" : ""}
            {search && ` pour "${search}"`}
          </div>
        )}

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
            {filtered.map((e: any) => {
              const pInfo = getPriorityInfo(e.priority);
              const date = getEntryDate(e);
              return (
                <div key={e.id} className="px-4 py-3 space-y-1.5">
                  {editingId === e.id ? (
                    <div className="space-y-3">
                      {/* Edit priority */}
                      <div className="flex gap-1.5">
                        {priorityOptions.map(p => (
                          <button key={p.value} onClick={() => setEditPriority(p.value)}
                            className={`flex-1 text-[10px] py-1.5 rounded-lg border transition-all ${editPriority === p.value
                              ? (p.cls || "bg-primary/10 text-primary border-primary/30")
                              : "border-border text-muted-foreground"
                            } ${p.cls && editPriority === p.value ? p.cls + " border-transparent" : ""}`}>
                            {p.label}
                          </button>
                        ))}
                      </div>
                      {/* Edit color */}
                      <div className="flex gap-1.5">
                        {colorOptions.map(c => (
                          <button key={c.value} onClick={() => setEditColor(c.value)}
                            className={`w-6 h-6 rounded-full border-2 transition-all ${editColor === c.value ? "border-foreground scale-110" : "border-transparent"}`}
                            style={{ backgroundColor: `hsl(${c.value})` }} />
                        ))}
                      </div>
                      {/* Edit date/time */}
                      <div className="grid grid-cols-2 gap-2">
                        <input type="date" value={editDate} onChange={ev => setEditDate(ev.target.value)}
                          className="bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                        <input type="time" value={editTime} onChange={ev => setEditTime(ev.target.value)}
                          className="bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                      </div>
                      <textarea value={editText} onChange={ev => setEditText(ev.target.value)}
                        rows={3} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
                      <div className="flex gap-2">
                        <button onClick={confirmEdit} disabled={!editText.trim()}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium disabled:opacity-40">
                          <Check size={12} /> Confirmer
                        </button>
                        <button onClick={() => setEditingId(null)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-secondary text-muted-foreground text-xs">
                          <X size={12} /> Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0 flex-1">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5"
                            style={{ backgroundColor: `hsl(${e.color || "38 50% 58%"})` }} />
                          <p className="text-sm leading-relaxed">{e.text}</p>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button onClick={() => startEdit(e)} className="p-1.5 text-muted-foreground hover:text-primary transition-colors">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => confirmDelete(e.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap ml-4">
                        {pInfo.value !== "normale" && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${pInfo.cls}`}>
                            {pInfo.label}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock size={10} />
                          {formatDate(date)} · {new Date(date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                          <Hash size={9} />{shortId(e.id)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <FeedbackButton context="logbook" />
    </div>
  );
};

export default LogbookPlugin;
