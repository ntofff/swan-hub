import { useState, useMemo, useCallback } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import {
  Plus, Check, Search, Trash2, Pencil, X, Clock, MapPin,
  AlertTriangle, Calendar, Archive, ChevronDown, ChevronUp,
  ArrowUp, ArrowDown, LayoutList, LayoutGrid, CalendarPlus,
  Share2, Mail, MessageCircle, Phone
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const priorityOptions = [
  { value: "basse", label: "Basse", cls: "bg-green-500/15 text-green-500", color: "142 71% 45%" },
  { value: "moyenne", label: "Moyenne", cls: "bg-warning/15 text-warning", color: "38 92% 50%" },
  { value: "haute", label: "Haute", cls: "bg-orange-500/15 text-orange-500", color: "25 95% 53%" },
  { value: "urgente", label: "Urgente", cls: "bg-destructive/15 text-destructive", color: "0 72% 51%" },
];

const getPriorityInfo = (p: string) => priorityOptions.find(o => o.value === p) || priorityOptions[1];

type ViewMode = "list" | "compact";
type Tab = "active" | "archived";

/** Deadline urgency: "overdue" (past), "red" (<12h), "orange" (<24h), "green" (>24h), or null */
const getDeadlineUrgency = (task: any): "overdue" | "red" | "orange" | "green" | null => {
  if (!task.deadline || task.done) return null;
  const now = Date.now();
  const dl = new Date(task.deadline).getTime();
  if (dl < now) return "overdue";
  const hoursLeft = (dl - now) / 3600000;
  if (hoursLeft <= 12) return "red";
  if (hoursLeft <= 24) return "orange";
  return "green";
};

const deadlineBadgeClasses: Record<string, string> = {
  overdue: "bg-foreground/10 text-foreground border-foreground/20 font-bold",
  red: "bg-destructive/15 text-destructive border-destructive/20 font-semibold",
  orange: "bg-orange-500/15 text-orange-500 border-orange-500/20 font-medium",
  green: "bg-green-500/10 text-green-600 border-green-500/20",
};

const formatDeadlineLabel = (deadline: string, urgency: string) => {
  const dl = new Date(deadline);
  const now = new Date();
  const diff = dl.getTime() - now.getTime();
  if (diff < 0) {
    const overHours = Math.floor(-diff / 3600000);
    if (overHours < 1) return "Dépassée";
    if (overHours < 24) return `Dépassée +${overHours}h`;
    return `Dépassée +${Math.floor(overHours / 24)}j`;
  }
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours < 1) return `${mins}min restantes`;
  if (hours < 24) return `${hours}h restantes`;
  const days = Math.floor(hours / 24);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Demain";
  return dl.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
};

// ICS generation
const generateICS = (task: any) => {
  const start = new Date(task.deadline || task.entry_date || task.created_at);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "PRODID:-//SWAN//Task//FR",
    "BEGIN:VEVENT",
    `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`,
    `SUMMARY:${task.text.replace(/\n/g, "\\n")}`,
    task.location ? `LOCATION:${task.location}` : "",
    `DESCRIPTION:Priorité: ${task.priority}`,
    `UID:${task.id}@swan-hub`,
    `DTSTAMP:${fmt(new Date())}`,
    "END:VEVENT", "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
};

const TasksPlugin = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [tab, setTab] = useState<Tab>("active");
  const [shareTask, setShareTask] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

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

  const activeTasks = useMemo(() => {
    const active = tasks.filter((t: any) => !t.archived);
    // Sort by deadline (soonest first), then by entry_date
    return active.sort((a: any, b: any) => {
      const aSort = a.sort_order ?? 0;
      const bSort = b.sort_order ?? 0;
      if (aSort !== bSort) return aSort - bSort;
      const aDate = new Date(a.deadline || a.entry_date || a.created_at).getTime();
      const bDate = new Date(b.deadline || b.entry_date || b.created_at).getTime();
      return aDate - bDate;
    });
  }, [tasks]);
  const archivedTasks = useMemo(() => tasks.filter((t: any) => t.archived), [tasks]);

  const filtered = useMemo(() => {
    const source = tab === "active" ? activeTasks : archivedTasks;
    const q = search.toLowerCase().trim();
    if (!q) return source;
    return source.filter((t: any) => t.text.toLowerCase().includes(q) || (t.location || "").toLowerCase().includes(q));
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
    onError: (err: any) => toast.error("Erreur : " + (err.message || "Impossible d'ajouter")),
  });

  // Toggle done only — no archive/delete prompt
  const toggleTask = useMutation({
    mutationFn: async (task: any) => {
      const { error } = await supabase.from("tasks").update({ done: !task.done } as any).eq("id", task.id);
      if (error) throw error;
    },
    onSuccess: (_, task: any) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success(task.done ? "Tâche réactivée" : "Tâche accomplie ✓");
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); setDeleteConfirm(null); toast.success("Tâche supprimée"); },
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
    setEditLocation(t.location || "");
    const d = new Date(t.entry_date || t.created_at);
    setEditDate(d.toISOString().slice(0, 10));
    setEditTime(d.toTimeString().slice(0, 5));
    if (t.deadline) {
      const dl = new Date(t.deadline);
      setEditDeadline(dl.toISOString().slice(0, 10));
      setEditDeadlineTime(dl.toTimeString().slice(0, 5));
    } else {
      setEditDeadline(""); setEditDeadlineTime("");
    }
  };

  const confirmEdit = () => {
    if (!editingId || !editText.trim()) return;
    const entryDate = editDate && editTime ? new Date(`${editDate}T${editTime}`).toISOString() : new Date().toISOString();
    const deadline = editDeadline ? (editDeadlineTime ? new Date(`${editDeadline}T${editDeadlineTime}`).toISOString() : new Date(`${editDeadline}T23:59`).toISOString()) : null;
    updateTask.mutate({ id: editingId, text: editText.trim(), priority: editPriority, entry_date: entryDate, deadline, location: editLocation.trim() || null });
  };

  // Share calendar via native share / email / WhatsApp / SMS
  const shareCalendar = useCallback(async (task: any, method: "native" | "email" | "whatsapp" | "sms") => {
    const icsContent = generateICS(task);
    const filename = `tache-${task.id.slice(0, 6)}.ics`;
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const file = new File([blob], filename, { type: "text/calendar" });

    if (method === "native" && navigator.share) {
      try {
        await navigator.share({ title: task.text, files: [file] });
        toast.success("Partagé !");
        return;
      } catch (e: any) {
        if (e.name === "AbortError") return;
      }
    }

    // For email/whatsapp/sms — download the file first, then open the link
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);

    const subject = encodeURIComponent(`Tâche: ${task.text}`);
    const body = encodeURIComponent(`Tâche: ${task.text}\nPriorité: ${task.priority}${task.deadline ? `\nDeadline: ${new Date(task.deadline).toLocaleString("fr-FR")}` : ""}${task.location ? `\nLieu: ${task.location}` : ""}\n\nLe fichier calendrier est en pièce jointe.`);

    if (method === "email") {
      window.open(`mailto:?subject=${subject}&body=${body}`);
    } else if (method === "whatsapp") {
      window.open(`https://wa.me/?text=${body}`);
    } else if (method === "sms") {
      window.open(`sms:?body=${decodeURIComponent(body)}`);
    }

    setShareTask(null);
    toast.success("Fichier calendrier téléchargé");
  }, []);

  const exportToCalendar = useCallback((task: any) => {
    // On iOS/mobile, try native share first
    if (navigator.share && /iPhone|iPad/i.test(navigator.userAgent)) {
      const icsContent = generateICS(task);
      const file = new File([new Blob([icsContent], { type: "text/calendar;charset=utf-8" })], `tache.ics`, { type: "text/calendar" });
      navigator.share({ title: task.text, files: [file] }).catch(() => {
        // Fallback: download
        const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `tache-${task.id.slice(0, 6)}.ics`; a.click();
        URL.revokeObjectURL(url);
      });
    } else {
      const icsContent = generateICS(task);
      const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `tache-${task.id.slice(0, 6)}.ics`; a.click();
      URL.revokeObjectURL(url);
    }
    toast.success("Fichier calendrier téléchargé");
  }, []);

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return "Aujourd'hui";
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Hier";
    const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
    if (d.toDateString() === tomorrow.toDateString()) return "Demain";
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  // Deadline badge component
  const DeadlineBadge = ({ task }: { task: any }) => {
    if (!task.deadline || task.done) return null;
    const urgency = getDeadlineUrgency(task);
    if (!urgency) return null;
    const label = formatDeadlineLabel(task.deadline, urgency);
    const cls = deadlineBadgeClasses[urgency];
    return (
      <span className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full border transition-colors ${cls}`}>
        <Calendar size={8} className={urgency === "red" ? "animate-pulse" : ""} />
        {label}
        {urgency !== "normal" && <span className="text-[8px]">
          {new Date(task.deadline).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
        </span>}
      </span>
    );
  };

  return (
    <div className="fade-in">
      <PageHeader title="Tâches" subtitle="Gestionnaire de tâches" back
        action={
          <div className="flex items-center gap-1.5">
            <button onClick={() => setViewMode(viewMode === "list" ? "compact" : "list")}
              className="p-2 rounded-xl bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              {viewMode === "list" ? <LayoutGrid size={16} /> : <LayoutList size={16} />}
            </button>
            <button onClick={() => setShowForm(!showForm)}
              className={`p-2 rounded-xl transition-all ${showForm ? "bg-destructive/10 text-destructive rotate-45" : "bg-primary/10 text-primary"}`}>
              <Plus size={18} />
            </button>
          </div>
        } />

      <div className="px-4 md:px-0 space-y-3">
        {/* New task form */}
        {showForm && (
          <div className="glass-card p-4 space-y-3 slide-up">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1.5 block">Priorité</label>
              <div className="flex gap-1.5">
                {priorityOptions.map(p => (
                  <button key={p.value} onClick={() => setNewPriority(p.value)}
                    className={`flex-1 text-[10px] py-2 rounded-lg border transition-all ${newPriority === p.value ? p.cls + " border-transparent font-medium scale-105" : "border-border text-muted-foreground"}`}>
                    {p.value === "urgente" && <AlertTriangle size={9} className="inline mr-0.5" />}
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addTask.mutate()}
              placeholder="Nom de la tâche..." className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" autoFocus />

            <button onClick={() => setShowOptions(!showOptions)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              {showOptions ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              Plus d'options
            </button>

            {showOptions && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Lieu</label>
                  <div className="relative">
                    <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input value={newLocation} onChange={e => setNewLocation(e.target.value)} placeholder="Lieu..."
                      className="w-full bg-secondary border border-border rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                </div>
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
              className="w-full btn-primary-glow py-2.5 text-sm disabled:opacity-40 transition-all active:scale-95">Ajouter</button>
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
          <div className="glass-card p-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Check size={18} className="text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">{search ? "Aucun résultat" : tab === "archived" ? "Aucune archive" : "Aucune tâche"}</p>
          </div>
        ) : viewMode === "compact" ? (
          /* Compact grid view */
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((t: any) => {
              const pInfo = getPriorityInfo(t.priority);
              const urgency = getDeadlineUrgency(t);
              return (
                <div key={t.id} className={`glass-card p-3 space-y-2 transition-all ${urgency === "red" ? "border-destructive/30" : urgency === "orange" ? "border-orange-500/30" : ""}`}>
                  <div className="flex items-start justify-between gap-1">
                    <button onClick={() => toggleTask.mutate(t)}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all active:scale-90 ${t.done ? "bg-primary border-primary" : "border-border hover:border-primary/50"}`}>
                      {t.done && <Check size={11} className="text-primary-foreground" />}
                    </button>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${pInfo.cls}`}>{pInfo.label}</span>
                  </div>
                  <p className={`text-xs leading-snug ${t.done ? "line-through text-muted-foreground" : ""}`}>{t.text}</p>
                  <DeadlineBadge task={t} />
                </div>
              );
            })}
          </div>
        ) : (
          /* List view */
          <div className="glass-card divide-y divide-border overflow-hidden">
            {filtered.map((t: any, idx: number) => {
              const pInfo = getPriorityInfo(t.priority);
              const urgency = getDeadlineUrgency(t);
              const entryDate = t.entry_date || t.created_at;

              if (editingId === t.id) {
                return (
                  <div key={t.id} className="px-4 py-3 space-y-3 slide-up">
                    <div className="flex gap-1.5">
                      {priorityOptions.map(p => (
                        <button key={p.value} onClick={() => setEditPriority(p.value)}
                          className={`flex-1 text-[10px] py-1.5 rounded-lg border transition-all ${editPriority === p.value ? p.cls + " border-transparent font-medium" : "border-border text-muted-foreground"}`}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <input value={editText} onChange={e => setEditText(e.target.value)}
                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" autoFocus />
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
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium disabled:opacity-40 active:scale-95 transition-all">
                        <Check size={12} /> Confirmer
                      </button>
                      <button onClick={() => setEditingId(null)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-secondary text-muted-foreground text-xs active:scale-95 transition-all">
                        <X size={12} /> Annuler
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={t.id} className={`px-4 py-3 space-y-1.5 transition-colors ${urgency === "red" ? "bg-destructive/5" : urgency === "orange" ? "bg-orange-500/5" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      {/* Checkbox: only toggles done, no archive/delete */}
                      <button onClick={() => toggleTask.mutate(t)}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all active:scale-90 ${t.done ? "bg-primary border-primary" : "border-border hover:border-primary/50"}`}>
                        {t.done && <Check size={12} className="text-primary-foreground" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm leading-relaxed transition-all ${t.done ? "line-through text-muted-foreground" : ""}`}>{t.text}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {tab === "active" && (
                        <>
                          <button onClick={() => moveTask.mutate({ id: t.id, direction: "up" })} disabled={idx === 0}
                            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"><ArrowUp size={12} /></button>
                          <button onClick={() => moveTask.mutate({ id: t.id, direction: "down" })} disabled={idx === filtered.length - 1}
                            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"><ArrowDown size={12} /></button>
                          <button onClick={() => setShareTask(t)} className="p-1 text-muted-foreground hover:text-primary transition-colors" title="Partager">
                            <Share2 size={13} />
                          </button>
                          <button onClick={() => startEdit(t)} className="p-1.5 text-muted-foreground hover:text-primary transition-colors"><Pencil size={13} /></button>
                          <button onClick={() => archiveTask.mutate(t.id)} className="p-1.5 text-muted-foreground hover:text-warning transition-colors" title="Archiver">
                            <Archive size={13} />
                          </button>
                          <button onClick={() => setDeleteConfirm(t.id)}
                            className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={13} /></button>
                        </>
                      )}
                      {tab === "archived" && (
                        <>
                          <button onClick={() => unarchiveTask.mutate(t.id)} className="p-1.5 text-muted-foreground hover:text-primary transition-colors" title="Restaurer">
                            <Archive size={13} />
                          </button>
                          <button onClick={() => setDeleteConfirm(t.id)}
                            className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={13} /></button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap ml-7">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${pInfo.cls}`}>{pInfo.label}</span>
                    <DeadlineBadge task={t} />
                    {t.location && (
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground"><MapPin size={9} /> {t.location}</span>
                    )}
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <Clock size={9} /> {formatDate(entryDate)} · {new Date(entryDate).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-[340px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Supprimer la tâche ?</DialogTitle>
            <DialogDescription className="text-xs">Cette action est irréversible.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2">
            <button onClick={() => setDeleteConfirm(null)}
              className="flex-1 py-2.5 rounded-lg bg-secondary text-sm font-medium active:scale-95 transition-all">Annuler</button>
            <button onClick={() => deleteConfirm && deleteTask.mutate(deleteConfirm)}
              className="flex-1 py-2.5 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium active:scale-95 transition-all">Supprimer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share dialog */}
      <Dialog open={!!shareTask} onOpenChange={() => setShareTask(null)}>
        <DialogContent className="max-w-[340px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Partager la tâche</DialogTitle>
            <DialogDescription className="text-xs">{shareTask?.text}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => shareTask && exportToCalendar(shareTask)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary hover:bg-secondary/80 transition-all active:scale-95">
              <CalendarPlus size={22} className="text-primary" />
              <span className="text-xs font-medium">Calendrier</span>
            </button>
            <button onClick={() => shareTask && shareCalendar(shareTask, "email")}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary hover:bg-secondary/80 transition-all active:scale-95">
              <Mail size={22} className="text-blue-500" />
              <span className="text-xs font-medium">E-mail</span>
            </button>
            <button onClick={() => shareTask && shareCalendar(shareTask, "whatsapp")}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary hover:bg-secondary/80 transition-all active:scale-95">
              <MessageCircle size={22} className="text-green-500" />
              <span className="text-xs font-medium">WhatsApp</span>
            </button>
            <button onClick={() => shareTask && shareCalendar(shareTask, "sms")}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary hover:bg-secondary/80 transition-all active:scale-95">
              <Phone size={22} className="text-orange-500" />
              <span className="text-xs font-medium">SMS</span>
            </button>
          </div>
          {navigator.share && (
            <button onClick={() => shareTask && shareCalendar(shareTask, "native")}
              className="w-full py-2.5 rounded-lg btn-primary-glow text-sm font-medium active:scale-95 transition-all mt-1">
              Partage natif
            </button>
          )}
        </DialogContent>
      </Dialog>

      <FeedbackButton context="tasks" />
    </div>
  );
};

export default TasksPlugin;
