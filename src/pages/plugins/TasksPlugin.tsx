import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import {
  Plus, Check, Search, Trash2, Pencil, X, Clock, MapPin,
  AlertTriangle, Calendar, Archive, ChevronDown, ChevronUp,
  ArrowUp, ArrowDown, LayoutList, LayoutGrid, CalendarPlus
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const priorityOptions = [
  { value: "basse", label: "Basse", cls: "bg-green-500/15 text-green-500", color: "142 71% 45%" },
  { value: "moyenne", label: "Moyenne", cls: "bg-warning/15 text-warning", color: "38 92% 50%" },
  { value: "haute", label: "Haute", cls: "bg-orange-500/15 text-orange-500", color: "25 95% 53%" },
  { value: "urgente", label: "Urgente", cls: "bg-destructive/15 text-destructive", color: "0 72% 51%" },
];

const getPriorityInfo = (p: string) => priorityOptions.find(o => o.value === p) || priorityOptions[1];

type ViewMode = "list" | "compact";
type Tab = "active" | "archived";

const TasksPlugin = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [tab, setTab] = useState<Tab>("active");

  // New task state
  const [input, setInput] = useState("");
  const [newPriority, setNewPriority] = useState("moyenne");
  const [newDeadline, setNewDeadline] = useState("");
  const [newDeadlineTime, setNewDeadlineTime] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [showOptions, setShowOptions] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editPriority, setEditPriority] = useState("moyenne");
  const [editDeadline, setEditDeadline] = useState("");
  const [editDeadlineTime, setEditDeadlineTime] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const activeTasks = useMemo(() => tasks.filter((t: any) => !(t as any).archived), [tasks]);
  const archivedTasks = useMemo(() => tasks.filter((t: any) => (t as any).archived), [tasks]);

  const filtered = useMemo(() => {
    const source = tab === "active" ? activeTasks : archivedTasks;
    const q = search.toLowerCase().trim();
    if (!q) return source;
    return source.filter((t: any) => t.text.toLowerCase().includes(q) || ((t as any).location || "").toLowerCase().includes(q));
  }, [activeTasks, archivedTasks, tab, search]);

  const addTask = useMutation({
    mutationFn: async () => {
      if (!user || !input.trim()) return;
      const entryDate = newDate && newTime ? new Date(`${newDate}T${newTime}`).toISOString()
        : newDate ? new Date(`${newDate}T${new Date().toTimeString().slice(0, 5)}`).toISOString()
        : new Date().toISOString();
      const deadline = newDeadline ? (newDeadlineTime ? new Date(`${newDeadline}T${newDeadlineTime}`).toISOString() : new Date(`${newDeadline}T23:59`).toISOString()) : null;
      const { error } = await supabase.from("tasks").insert({
        user_id: user.id, text: input.trim(), priority: newPriority,
        entry_date: entryDate, deadline, location: newLocation.trim() || null, sort_order: 0,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setInput(""); setNewPriority("moyenne"); setNewDeadline(""); setNewDeadlineTime(""); setNewLocation(""); setNewDate(""); setNewTime("");
      setShowForm(false); setShowOptions(false);
      toast.success("Tâche ajoutée");
    },
    onError: (err: any) => { toast.error("Erreur : " + (err.message || "Impossible d'ajouter. Reconnectez-vous.")); },
  });

  const toggleTask = useMutation({
    mutationFn: async (task: any) => {
      const { error } = await supabase.from("tasks").update({ done: !task.done } as any).eq("id", task.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (err: any) => { toast.error("Erreur : " + (err.message || "Action impossible")); },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); toast.success("Tâche supprimée"); },
  });

  const archiveTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").update({ archived: true } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); toast.success("Tâche archivée"); },
  });

  const unarchiveTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").update({ archived: false } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); toast.success("Tâche restaurée"); },
  });

  const updateTask = useMutation({
    mutationFn: async (payload: any) => {
      const { id, ...rest } = payload;
      const { error } = await supabase.from("tasks").update(rest as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); setEditingId(null); toast.success("Tâche modifiée"); },
  });

  const moveTask = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: "up" | "down" }) => {
      const idx = filtered.findIndex((t: any) => t.id === id);
      if (idx < 0) return;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= filtered.length) return;
      const a = filtered[idx] as any;
      const b = filtered[swapIdx] as any;
      await supabase.from("tasks").update({ sort_order: b.sort_order ?? swapIdx } as any).eq("id", a.id);
      await supabase.from("tasks").update({ sort_order: a.sort_order ?? idx } as any).eq("id", b.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const startEdit = (t: any) => {
    setEditingId(t.id);
    setEditText(t.text);
    setEditPriority(t.priority);
    setEditLocation((t as any).location || "");
    const d = new Date((t as any).entry_date || t.created_at);
    setEditDate(d.toISOString().slice(0, 10));
    setEditTime(d.toTimeString().slice(0, 5));
    if ((t as any).deadline) {
      const dl = new Date((t as any).deadline);
      setEditDeadline(dl.toISOString().slice(0, 10));
      setEditDeadlineTime(dl.toTimeString().slice(0, 5));
    } else {
      setEditDeadline(""); setEditDeadlineTime("");
    }
  };

  const confirmEdit = () => {
    if (!editingId || !editText.trim()) return;
    if (!window.confirm("Confirmer la modification ?")) return;
    const entryDate = editDate && editTime ? new Date(`${editDate}T${editTime}`).toISOString() : new Date().toISOString();
    const deadline = editDeadline ? (editDeadlineTime ? new Date(`${editDeadline}T${editDeadlineTime}`).toISOString() : new Date(`${editDeadline}T23:59`).toISOString()) : null;
    updateTask.mutate({ id: editingId, text: editText.trim(), priority: editPriority, entry_date: entryDate, deadline, location: editLocation.trim() || null });
  };

  const handleDoneAction = (task: any) => {
    if (task.done) return;
    // Mark done then ask archive or delete
    toggleTask.mutate(task, {
      onSuccess: () => {
        const choice = window.confirm("Tâche accomplie ! Archiver ? (Annuler = supprimer)");
        if (choice) archiveTask.mutate(task.id);
        else if (window.confirm("Supprimer définitivement cette tâche ?")) deleteTask.mutate(task.id);
      },
    });
  };

  // Calendar export (.ics)
  const exportToCalendar = (task: any) => {
    const start = new Date((task as any).deadline || (task as any).entry_date || task.created_at);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//SWAN//Task//FR",
      "BEGIN:VEVENT",
      `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`,
      `SUMMARY:${task.text}`,
      (task as any).location ? `LOCATION:${(task as any).location}` : "",
      `DESCRIPTION:Priorite: ${task.priority}`,
      `UID:${task.id}@swan`,
      "END:VEVENT", "END:VCALENDAR",
    ].filter(Boolean).join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `tache-${task.id.slice(0, 6)}.ics`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Fichier calendrier téléchargé");
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return "Aujourd'hui";
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Hier";
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  const isOverdue = (task: any) => {
    if (!(task as any).deadline || task.done) return false;
    return new Date((task as any).deadline) < new Date();
  };

  return (
    <div className="fade-in">
      <PageHeader title="Tâches" subtitle="Gestionnaire de tâches" back
        action={
          <div className="flex items-center gap-1.5">
            <button onClick={() => setViewMode(viewMode === "list" ? "compact" : "list")}
              className="p-2 rounded-xl bg-secondary text-muted-foreground">
              {viewMode === "list" ? <LayoutGrid size={16} /> : <LayoutList size={16} />}
            </button>
            <button onClick={() => setShowForm(!showForm)}
              className={`p-2 rounded-xl transition-colors ${showForm ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
              {showForm ? <X size={18} /> : <Plus size={18} />}
            </button>
          </div>
        } />

      <div className="px-4 md:px-0 space-y-3">
        {/* New task form */}
        {showForm && (
          <div className="glass-card p-4 space-y-3 slide-up">
            {/* Priority */}
            <div>
              <label className="text-[10px] text-muted-foreground mb-1.5 block">Priorité</label>
              <div className="flex gap-1.5">
                {priorityOptions.map(p => (
                  <button key={p.value} onClick={() => setNewPriority(p.value)}
                    className={`flex-1 text-[10px] py-2 rounded-lg border transition-all ${newPriority === p.value ? p.cls + " border-transparent font-medium" : "border-border text-muted-foreground"}`}>
                    {p.value === "urgente" && <AlertTriangle size={9} className="inline mr-0.5" />}
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addTask.mutate()}
              placeholder="Nom de la tâche..." className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />

            {/* Options toggle */}
            <button onClick={() => setShowOptions(!showOptions)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              {showOptions ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              Plus d'options
            </button>

            {showOptions && (
              <div className="space-y-3 pt-1">
                {/* Location */}
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Lieu</label>
                  <div className="relative">
                    <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input value={newLocation} onChange={e => setNewLocation(e.target.value)} placeholder="Lieu..."
                      className="w-full bg-secondary border border-border rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                </div>
                {/* Date / Time */}
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
                {/* Deadline */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Deadline</label>
                    <input type="date" value={newDeadline} onChange={e => setNewDeadline(e.target.value)}
                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Heure limite</label>
                    <input type="time" value={newDeadlineTime} onChange={e => setNewDeadlineTime(e.target.value)}
                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                </div>
              </div>
            )}

            <button onClick={() => addTask.mutate()} disabled={!input.trim() || addTask.isPending}
              className="w-full btn-primary-glow py-2.5 text-sm disabled:opacity-40">Ajouter</button>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
            className="w-full bg-secondary border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-colors" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary/50 rounded-xl p-1">
          <button onClick={() => setTab("active")}
            className={`flex-1 text-xs py-2 rounded-lg transition-all font-medium ${tab === "active" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
            Actives ({activeTasks.length})
          </button>
          <button onClick={() => setTab("archived")}
            className={`flex-1 text-xs py-2 rounded-lg transition-all font-medium flex items-center justify-center gap-1 ${tab === "archived" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
            <Archive size={12} /> Archives ({archivedTasks.length})
          </button>
        </div>

        {/* Count */}
        {!isLoading && filtered.length > 0 && (
          <div className="text-[10px] text-muted-foreground px-1">
            {filtered.length} tâche{filtered.length > 1 ? "s" : ""}
            {search && ` pour "${search}"`}
          </div>
        )}

        {/* Tasks list */}
        {isLoading ? (
          <div className="glass-card p-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-sm text-muted-foreground">{search ? "Aucun résultat" : tab === "archived" ? "Aucune archive" : "Aucune tâche"}</p>
          </div>
        ) : viewMode === "compact" ? (
          /* Compact grid view */
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((t: any) => {
              const pInfo = getPriorityInfo(t.priority);
              const overdue = isOverdue(t);
              return (
                <div key={t.id} className={`glass-card p-3 space-y-2 ${overdue ? "border-destructive/30" : ""}`}>
                  <div className="flex items-start justify-between gap-1">
                    <button onClick={() => tab === "active" ? (t.done ? toggleTask.mutate(t) : handleDoneAction(t)) : undefined}
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 ${t.done ? "bg-primary border-primary" : "border-border"}`}>
                      {t.done && <Check size={10} className="text-primary-foreground" />}
                    </button>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${pInfo.cls}`}>{pInfo.label}</span>
                  </div>
                  <p className={`text-xs leading-snug ${t.done ? "line-through text-muted-foreground" : ""}`}>{t.text}</p>
                  {overdue && <span className="text-[9px] text-destructive font-medium">⚠ En retard</span>}
                  {(t as any).deadline && !overdue && (
                    <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                      <Calendar size={8} /> {formatDate((t as any).deadline)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* List view */
          <div className="glass-card divide-y divide-border overflow-hidden">
            {filtered.map((t: any, idx: number) => {
              const pInfo = getPriorityInfo(t.priority);
              const overdue = isOverdue(t);
              const entryDate = (t as any).entry_date || t.created_at;

              if (editingId === t.id) {
                return (
                  <div key={t.id} className="px-4 py-3 space-y-3">
                    <div className="flex gap-1.5">
                      {priorityOptions.map(p => (
                        <button key={p.value} onClick={() => setEditPriority(p.value)}
                          className={`flex-1 text-[10px] py-1.5 rounded-lg border transition-all ${editPriority === p.value ? p.cls + " border-transparent font-medium" : "border-border text-muted-foreground"}`}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <input value={editText} onChange={e => setEditText(e.target.value)}
                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                    <div className="relative">
                      <MapPin size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input value={editLocation} onChange={e => setEditLocation(e.target.value)} placeholder="Lieu..."
                        className="w-full bg-secondary border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                        className="bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                      <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)}
                        className="bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] text-muted-foreground mb-0.5 block">Deadline</label>
                        <input type="date" value={editDeadline} onChange={e => setEditDeadline(e.target.value)}
                          className="w-full bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted-foreground mb-0.5 block">Heure limite</label>
                        <input type="time" value={editDeadlineTime} onChange={e => setEditDeadlineTime(e.target.value)}
                          className="w-full bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                      </div>
                    </div>
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
                );
              }

              return (
                <div key={t.id} className={`px-4 py-3 space-y-1.5 ${overdue ? "bg-destructive/5" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <button onClick={() => tab === "active" ? (t.done ? toggleTask.mutate(t) : handleDoneAction(t)) : undefined}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${t.done ? "bg-primary border-primary" : "border-border hover:border-primary/50"}`}>
                        {t.done && <Check size={12} className="text-primary-foreground" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm leading-relaxed ${t.done ? "line-through text-muted-foreground" : ""}`}>{t.text}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {tab === "active" && (
                        <>
                          <button onClick={() => moveTask.mutate({ id: t.id, direction: "up" })} disabled={idx === 0}
                            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20"><ArrowUp size={12} /></button>
                          <button onClick={() => moveTask.mutate({ id: t.id, direction: "down" })} disabled={idx === filtered.length - 1}
                            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20"><ArrowDown size={12} /></button>
                          <button onClick={() => exportToCalendar(t)} className="p-1 text-muted-foreground hover:text-primary"><CalendarPlus size={13} /></button>
                          <button onClick={() => startEdit(t)} className="p-1.5 text-muted-foreground hover:text-primary"><Pencil size={13} /></button>
                          <button onClick={() => { if (window.confirm("Supprimer cette tâche ?")) deleteTask.mutate(t.id); }}
                            className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 size={13} /></button>
                        </>
                      )}
                      {tab === "archived" && (
                        <>
                          <button onClick={() => unarchiveTask.mutate(t.id)} className="p-1.5 text-muted-foreground hover:text-primary" title="Restaurer">
                            <Archive size={13} />
                          </button>
                          <button onClick={() => { if (window.confirm("Supprimer définitivement ?")) deleteTask.mutate(t.id); }}
                            className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 size={13} /></button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap ml-7">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${pInfo.cls}`}>{pInfo.label}</span>
                    {overdue && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive font-medium">En retard</span>}
                    {(t as any).location && (
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground"><MapPin size={9} /> {(t as any).location}</span>
                    )}
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <Clock size={9} /> {formatDate(entryDate)} · {new Date(entryDate).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {(t as any).deadline && (
                      <span className={`flex items-center gap-0.5 text-[10px] ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
                        <Calendar size={9} /> {formatDate((t as any).deadline)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <FeedbackButton context="tasks" />
    </div>
  );
};

export default TasksPlugin;
