import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import {
  Plus, Search, Trash2, Pencil, X, Check, Clock, Hash,
  AlertTriangle, CheckSquare, Square, FileDown, Share2,
  Copy, Mail, Phone, MessageSquare, Archive, RotateCcw
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

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

const shareActions = [
  { id: "copy", icon: Copy, label: "Copier" },
  { id: "email", icon: Mail, label: "Email" },
  { id: "sms", icon: Phone, label: "SMS" },
  { id: "whatsapp", icon: MessageSquare, label: "WhatsApp" },
];

type Tab = "active" | "archived";

const buildShareText = (entries: any[]) => {
  let text = "Journal de bord\n\n";
  entries.forEach((e, i) => {
    const d = new Date(e.entry_date || e.created_at);
    const dateStr = d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    const prio = e.priority && e.priority !== "normale" ? ` [${e.priority.toUpperCase()}]` : "";
    text += `#${e.seq_number || "???"} — ${dateStr}${prio}\n${e.text}\n`;
    if (i < entries.length - 1) text += "---\n";
  });
  return text;
};

const LogbookPlugin = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<Tab>("active");

  // Selection mode
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Delete confirm dialog
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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

  const { data: allEntries = [], isLoading } = useQuery({
    queryKey: ["log_entries"],
    queryFn: async () => {
      const { data } = await supabase.from("log_entries").select("*").order("entry_date", { ascending: true });
      return data ?? [];
    },
    enabled: !!user,
  });

  const activeEntries = useMemo(() => allEntries.filter((e: any) => !e.archived), [allEntries]);
  const archivedEntries = useMemo(() => allEntries.filter((e: any) => e.archived), [allEntries]);
  const entries = tab === "active" ? activeEntries : archivedEntries;

  const addEntry = useMutation({
    mutationFn: async () => {
      if (!user || !newEntry.trim()) return;
      const entryDate = newDate && newTime
        ? new Date(`${newDate}T${newTime}`).toISOString()
        : newDate ? new Date(`${newDate}T${new Date().toTimeString().slice(0, 5)}`).toISOString()
        : new Date().toISOString();
      const { error } = await supabase.from("log_entries").insert({
        user_id: user.id, text: newEntry.trim(), color: newColor, priority: newPriority, entry_date: entryDate,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["log_entries"] });
      setNewEntry(""); setNewColor("38 50% 58%"); setNewPriority("normale"); setNewDate(""); setNewTime("");
      setShowForm(false);
      toast.success("Entrée ajoutée");
    },
    onError: (err: any) => { toast.error("Erreur : " + (err.message || "Impossible d'ajouter.")); },
  });

  // Archive = soft delete (from active view)
  const archiveEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("log_entries").update({ archived: true } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["log_entries"] });
      toast.success("Entrée archivée");
    },
  });

  // Restore from archive
  const restoreEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("log_entries").update({ archived: false } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["log_entries"] });
      toast.success("Entrée restaurée");
    },
  });

  // Permanent delete (only from archive)
  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("log_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["log_entries"] });
      setDeleteConfirmId(null);
      toast.success("Entrée supprimée définitivement");
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
    return entries.filter((e: any) => {
      const haystack = `${e.text} ${e.seq_number || ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [entries, search]);

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return "Aujourd'hui";
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Hier";
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  const getEntryDate = (e: any) => e.entry_date || e.created_at;
  const getPriorityInfo = (p: string) => priorityOptions.find(o => o.value === p) || priorityOptions[0];

  const startEdit = (e: any) => {
    const d = new Date(getEntryDate(e));
    setEditingId(e.id);
    setEditText(e.text);
    setEditColor(e.color || "38 50% 58%");
    setEditPriority(e.priority || "normale");
    setEditDate(d.toISOString().slice(0, 10));
    setEditTime(d.toTimeString().slice(0, 5));
  };

  const confirmEdit = () => {
    if (!editingId || !editText.trim()) return;
    const entryDate = editDate && editTime
      ? new Date(`${editDate}T${editTime}`).toISOString()
      : new Date().toISOString();
    updateEntry.mutate({ id: editingId, text: editText.trim(), color: editColor, priority: editPriority, entry_date: entryDate });
  };

  // Selection logic
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((e: any) => e.id)));
  };
  const exitSelectMode = () => { setSelectMode(false); setSelectedIds(new Set()); setShowShareMenu(false); };

  const getSelectedEntries = () => {
    if (selectedIds.size === 0) return filtered;
    return filtered.filter((e: any) => selectedIds.has(e.id));
  };

  const handleShare = (method: string) => {
    const selected = getSelectedEntries();
    if (selected.length === 0) { toast.error("Aucune entrée sélectionnée"); return; }
    const text = buildShareText(selected);
    if (method === "copy") { navigator.clipboard.writeText(text); toast.success("Copié"); }
    else if (method === "email") window.open(`mailto:?subject=${encodeURIComponent("Journal de bord")}&body=${encodeURIComponent(text)}`);
    else if (method === "sms") window.open(`sms:?body=${encodeURIComponent(text)}`);
    else if (method === "whatsapp") window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
    setShowShareMenu(false);
  };

  const handleExportPdf = async () => {
    const selected = getSelectedEntries();
    if (selected.length === 0) { toast.error("Aucune entrée à exporter"); return; }
    setExporting(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const { data: profileData } = await supabase.from("profiles").select("full_name").eq("user_id", currentUser?.id ?? "").maybeSingle();
      const userName = profileData?.full_name || currentUser?.email || "Utilisateur";
      const { data, error } = await supabase.functions.invoke("export-logbook", { body: { entries: selected, userName } });
      if (error) throw error;
      if (data?.pdf_base64) {
        const byteChars = atob(data.pdf_base64);
        const byteArray = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i);
        const blob = new Blob([byteArray], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `journal-de-bord-${new Date().toISOString().slice(0, 10)}.pdf`;
        a.click(); URL.revokeObjectURL(url);
        toast.success("PDF téléchargé");
      }
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'export");
    } finally { setExporting(false); }
  };

  return (
    <div className="fade-in">
      <PageHeader title="Journal de bord" subtitle="Entrées chronologiques" back
        action={
          <div className="flex items-center gap-1.5">
            {allEntries.length > 0 && tab === "active" && (
              <button onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
                className={`btn btn-icon-sm ${selectMode ? "btn-ghost" : "btn-ghost"}`}>
                <CheckSquare size={18} />
              </button>
            )}
            <button onClick={() => setShowForm(!showForm)}
              className={`btn btn-icon-sm ${showForm ? "btn-danger" : "btn-ghost"}`}>
              {showForm ? <X size={18} /> : <Plus size={18} />}
            </button>
          </div>
        } />

      <div className="px-4 md:px-0 space-y-3">
        {/* Tabs */}
        <div className="flex gap-1 bg-secondary rounded-xl p-1">
          <button onClick={() => { setTab("active"); exitSelectMode(); }}
            className={`flex-1 text-xs py-2 rounded-lg transition-all font-medium ${tab === "active" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
            Actif ({activeEntries.length})
          </button>
          <button onClick={() => { setTab("archived"); exitSelectMode(); }}
            className={`flex-1 text-xs py-2 rounded-lg transition-all font-medium flex items-center justify-center gap-1.5 ${tab === "archived" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
            <Archive size={12} /> Archives ({archivedEntries.length})
          </button>
        </div>

        {/* Selection toolbar */}
        {selectMode && tab === "active" && (
          <div className="glass-card p-3 space-y-2 slide-up">
            <div className="flex items-center justify-between">
              <button onClick={selectAll} className="btn btn-secondary btn-xs">
                {selectedIds.size === filtered.length ? "Tout désélectionner" : "Tout sélectionner"}
              </button>
              <span className="text-[10px] text-muted-foreground">
                {selectedIds.size === 0 ? `${filtered.length} entrées (toutes)` : `${selectedIds.size} sélectionnée${selectedIds.size > 1 ? "s" : ""}`}
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={handleExportPdf} disabled={exporting}
                className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                <FileDown size={14} /> {exporting ? "Export..." : "Export PDF"}
              </button>
              <button onClick={() => setShowShareMenu(!showShareMenu)}
                className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                <Share2 size={14} /> Partager
              </button>
            </div>
            {showShareMenu && (
              <div className="flex gap-1.5 pt-1">
                {shareActions.map(s => (
                  <button key={s.id} onClick={() => handleShare(s.id)}
                    className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                    <s.icon size={12} /> {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {showForm && (
          <div className="glass-card p-4 space-y-3 slide-up">
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
              className="btn btn-primary btn-full">Ajouter</button>
          </div>
        )}

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par texte ou ID..."
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
            <p className="text-sm text-muted-foreground">{search ? "Aucun résultat" : tab === "archived" ? "Aucune entrée archivée" : "Aucune entrée"}</p>
            {!search && tab === "active" && <p className="text-xs text-muted-foreground mt-1">Cliquez sur + pour ajouter</p>}
          </div>
        ) : (
          <div className="glass-card divide-y divide-border overflow-hidden">
            {filtered.map((e: any) => {
              const pInfo = getPriorityInfo(e.priority);
              const date = getEntryDate(e);
              const isSelected = selectedIds.has(e.id);
              const seqNum = e.seq_number || "—";
              return (
                <div key={e.id}
                  className={`px-4 py-3 space-y-1.5 transition-colors ${selectMode ? "cursor-pointer" : ""} ${isSelected ? "bg-primary/5" : ""} ${e.archived ? "opacity-70" : ""}`}
                  onClick={selectMode ? () => toggleSelect(e.id) : undefined}>
                  {editingId === e.id ? (
                    <div className="space-y-3" onClick={ev => ev.stopPropagation()}>
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
                      <div className="flex gap-1.5">
                        {colorOptions.map(c => (
                          <button key={c.value} onClick={() => setEditColor(c.value)}
                            className={`w-6 h-6 rounded-full border-2 transition-all ${editColor === c.value ? "border-foreground scale-110" : "border-transparent"}`}
                            style={{ backgroundColor: `hsl(${c.value})` }} />
                        ))}
                      </div>
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
                          className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                          <Check size={12} /> Confirmer
                        </button>
                        <button onClick={() => setEditingId(null)}
                          className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                          <X size={12} /> Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0 flex-1">
                          {selectMode ? (
                            <div className="mt-0.5 shrink-0">
                              {isSelected ? <CheckSquare size={16} className="text-primary" /> : <Square size={16} className="text-muted-foreground" />}
                            </div>
                          ) : (
                            <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5"
                              style={{ backgroundColor: `hsl(${e.color || "38 50% 58%"})` }} />
                          )}
                          <p className="text-sm leading-relaxed">{e.text}</p>
                        </div>
                        {!selectMode && (
                          <div className="flex items-center gap-0.5 shrink-0">
                            {tab === "active" ? (
                              <>
                                <button onClick={() => startEdit(e)} className="btn btn-icon-sm btn-ghost">
                                  <Pencil size={13} />
                                </button>
                                <button onClick={() => archiveEntry.mutate(e.id)} className="btn btn-icon-sm btn-ghost" title="Archiver">
                                  <Archive size={13} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => restoreEntry.mutate(e.id)} className="btn btn-icon-sm btn-ghost" title="Restaurer">
                                  <RotateCcw size={13} />
                                </button>
                                <button onClick={() => setDeleteConfirmId(e.id)} className="btn btn-icon-sm btn-ghost" title="Supprimer définitivement">
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap ml-4">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: `hsl(${e.color || "38 50% 58%"})` }} />
                        {pInfo.value !== "normale" && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${pInfo.cls}`}>
                            {pInfo.label}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock size={10} />
                          {formatDate(date)} · {new Date(date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-mono text-primary/70 bg-primary/5 px-1.5 py-0.5 rounded">
                          <Hash size={9} />{seqNum}
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

      {/* Delete confirmation dialog (archive only) */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer définitivement ?</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. L'entrée et son ID seront perdus pour toujours.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <button onClick={() => setDeleteConfirmId(null)}
              className="btn btn-secondary" style={{ flex: 1 }}>Annuler</button>
            <button onClick={() => deleteConfirmId && deleteEntry.mutate(deleteConfirmId)}
              className="btn btn-danger" style={{ flex: 1 }}>Supprimer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FeedbackButton context="logbook" />
    </div>
  );
};

export default LogbookPlugin;
