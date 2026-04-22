import { useState, useMemo, type CSSProperties } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import { TutorialButton } from "@/components/TutorialButton";
import { TOOL_TUTORIALS } from "@/config/tutorials";
import {
  Plus, Search, Trash2, Pencil, X, Check, Clock,
  AlertTriangle, CheckSquare, Square, FileDown, Share2,
  Copy, Mail, Phone, MessageSquare, Archive, RotateCcw
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { jsPDF } from "jspdf";

const priorityOptions = [
  { value: "normale", label: "Normale", color: "142 50% 45%", cls: "bg-success/15 text-success" },
  { value: "important", label: "Important", color: "38 85% 50%", cls: "bg-warning/15 text-warning" },
  { value: "urgent", label: "Urgent", color: "0 65% 55%", cls: "bg-destructive/15 text-destructive" },
];

const exportFieldOptions = [
  { key: "seq", label: "ID" },
  { key: "date", label: "Date" },
  { key: "priority", label: "Urgence" },
  { key: "text", label: "Note" },
] as const;

type ExportField = (typeof exportFieldOptions)[number]["key"];

const getPriorityInfo = (p: string) => priorityOptions.find(o => o.value === p) || priorityOptions[0];
const getPriorityColor = (p: string) => getPriorityInfo(p).color;

const getPriorityPanelStyle = (priority: string): CSSProperties => ({
  borderColor: `hsl(${getPriorityColor(priority)})`,
  boxShadow: `inset 5px 0 0 hsl(${getPriorityColor(priority)}), 0 0 0 3px hsl(${getPriorityColor(priority)} / 0.12)`,
});

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
  const [exportFields, setExportFields] = useState<Record<ExportField, boolean>>({
    seq: true,
    date: true,
    priority: true,
    text: true,
  });

  // Delete confirm dialog
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // New entry state
  const [newEntry, setNewEntry] = useState("");
  const [newPriority, setNewPriority] = useState("normale");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editPriority, setEditPriority] = useState("normale");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");

  const { data: allEntries = [], isLoading } = useQuery({
    queryKey: ["log_entries", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("log_entries").select("*").eq("user_id", user!.id).order("entry_date", { ascending: true });
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
      const nextSeq = String(allEntries.length + 1).padStart(3, "0");
      const { error } = await supabase.from("log_entries").insert({
        user_id: user.id, text: newEntry.trim(), color: getPriorityColor(newPriority), priority: newPriority, entry_date: entryDate, seq_number: nextSeq,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["log_entries"] });
      setNewEntry(""); setNewPriority("normale"); setNewDate(""); setNewTime("");
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
    mutationFn: async (payload: { id: string; text: string; priority: string; entry_date: string }) => {
      const { id, ...rest } = payload;
      const { error } = await supabase.from("log_entries").update({ ...rest, color: getPriorityColor(rest.priority) } as any).eq("id", id);
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

  const startEdit = (e: any) => {
    const d = new Date(getEntryDate(e));
    setEditingId(e.id);
    setEditText(e.text);
    setEditPriority(e.priority || "normale");
    setEditDate(d.toISOString().slice(0, 10));
    setEditTime(d.toTimeString().slice(0, 5));
  };

  const confirmEdit = () => {
    if (!editingId || !editText.trim()) return;
    const entryDate = editDate && editTime
      ? new Date(`${editDate}T${editTime}`).toISOString()
      : new Date().toISOString();
    updateEntry.mutate({ id: editingId, text: editText.trim(), priority: editPriority, entry_date: entryDate });
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

  const toggleExportField = (field: ExportField) => {
    setExportFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleExportPdf = async () => {
    const selected = getSelectedEntries();
    if (selected.length === 0) { toast.error("Aucune entrée à exporter"); return; }
    const enabledFields = exportFieldOptions.filter(field => exportFields[field.key]);
    if (enabledFields.length === 0) { toast.error("Choisis au moins une information à exporter"); return; }

    setExporting(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const { data: profileData } = await supabase.from("profiles").select("full_name").eq("user_id", currentUser?.id ?? "").maybeSingle();
      const userName = profileData?.full_name || currentUser?.email || "Utilisateur";

      const pdf = new jsPDF("l", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 12;
      const usableWidth = pageWidth - margin * 2;
      const fixedWidths: Partial<Record<ExportField, number>> = { seq: 24, date: 44, priority: 30 };
      const textWidth = exportFields.text
        ? Math.max(70, usableWidth - enabledFields.reduce((sum, field) => sum + (field.key === "text" ? 0 : fixedWidths[field.key] || 28), 0))
        : 0;
      const columns = enabledFields.map(field => ({
        ...field,
        width: field.key === "text" ? textWidth : fixedWidths[field.key] || 28,
      }));

      const drawHeader = () => {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(16);
        pdf.text("Journal de bord", margin, 16);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.text(`Export du ${new Date().toLocaleDateString("fr-FR")} - ${userName}`, margin, 22);
        pdf.text(`${selected.length} entree${selected.length > 1 ? "s" : ""}`, pageWidth - margin, 22, { align: "right" });
        pdf.setDrawColor(210);
        pdf.line(margin, 27, pageWidth - margin, 27);
      };

      const drawTableHeader = (y: number) => {
        let x = margin;
        pdf.setFillColor(242, 240, 235);
        pdf.rect(margin, y - 5, usableWidth, 8, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        columns.forEach(col => {
          pdf.text(col.label, x + 2, y);
          x += col.width;
        });
        return y + 8;
      };

      const formatExportDate = (value: string) => new Date(value).toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const getCellValue = (entry: any, key: ExportField) => {
        if (key === "seq") return entry.seq_number ? `#${entry.seq_number}` : "-";
        if (key === "date") return formatExportDate(getEntryDate(entry));
        if (key === "priority") return getPriorityInfo(entry.priority).label;
        return entry.text || "-";
      };

      drawHeader();
      let y = drawTableHeader(34);

      selected.forEach((entry: any) => {
        const cellLines = columns.map(col => pdf.splitTextToSize(String(getCellValue(entry, col.key)), col.width - 4));
        const rowHeight = Math.max(10, ...cellLines.map(lines => lines.length * 4 + 4));

        if (y + rowHeight > pageHeight - margin) {
          pdf.addPage();
          drawHeader();
          y = drawTableHeader(34);
        }

        let x = margin;
        pdf.setDrawColor(225);
        pdf.line(margin, y - 3, pageWidth - margin, y - 3);
        pdf.setFillColor(138, 106, 30);
        pdf.rect(margin, y - 2, 1.5, rowHeight - 2, "F");
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);

        columns.forEach((col, index) => {
          pdf.text(cellLines[index], x + 2, y + 2);
          x += col.width;
        });
        y += rowHeight;
      });

      const blob = pdf.output("blob");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `journal-de-bord-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF téléchargé");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'export");
    } finally { setExporting(false); }
  };

  return (
    <div className="fade-in">
      <PageHeader title="Journal de bord" subtitle="Notes datées et partageables" back
        action={
          <div className="flex items-center gap-1.5">
            <TutorialButton {...TOOL_TUTORIALS.logbook} />
            {entries.length > 0 && (
              <button onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
                className={`btn btn-icon-sm ${selectMode ? "btn-ghost" : "btn-ghost"}`}>
                <CheckSquare size={18} />
              </button>
            )}
            <button onClick={() => setShowForm(!showForm)}
              className={`btn btn-add ${showForm ? "btn-add-active" : ""}`}
              aria-label={showForm ? "Fermer le formulaire" : "Ajouter une entrée"}>
              {showForm ? <X size={22} /> : <Plus size={24} />}
            </button>
          </div>
        } />

      <div className="field-workspace">
        <div className="field-simple-note">
          Rapide : notez l'essentiel, choisissez l'urgence, puis enregistrez.
        </div>
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
        {selectMode && (
          <div className="glass-card p-3 space-y-2 slide-up">
            <div className="flex items-center justify-between">
              <button onClick={selectAll} className="btn btn-secondary btn-xs">
                {selectedIds.size === filtered.length ? "Tout désélectionner" : "Tout sélectionner"}
              </button>
              <span className="text-sm font-semibold text-muted-foreground">
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
            <div className="rounded-xl border border-border bg-background/50 p-2">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Informations dans le PDF</p>
              <div className="grid grid-cols-2 gap-1.5">
                {exportFieldOptions.map(field => (
                  <button key={field.key} type="button" onClick={() => toggleExportField(field.key)}
                    className={`flex items-center gap-2 rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${
                      exportFields[field.key] ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground"
                    }`}>
                    {exportFields[field.key] ? <CheckSquare size={13} /> : <Square size={13} />}
                    {field.label}
                  </button>
                ))}
              </div>
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
          <div className="field-form-panel space-y-4 slide-up transition-all" style={getPriorityPanelStyle(newPriority)}>
            <div>
              <label className="field-label">Urgence</label>
              <div className="field-choice-row">
                {priorityOptions.map(p => (
                  <button key={p.value} onClick={() => setNewPriority(p.value)}
                    className={`field-choice ${newPriority === p.value
                      ? (p.cls || "bg-primary/10 text-primary border-primary/30")
                      : "border-border text-muted-foreground hover:bg-secondary"
                    } ${p.cls && newPriority === p.value ? p.cls + " border-transparent" : ""}`}>
                    {p.value === "urgent" && <AlertTriangle size={10} className="inline mr-1" />}
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="field-label">Date</label>
                <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                  className="field-input" />
              </div>
              <div>
                <label className="field-label">Heure</label>
                <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)}
                  className="field-input" />
              </div>
            </div>
            <textarea value={newEntry} onChange={e => setNewEntry(e.target.value)} placeholder="Contenu de l'entrée..."
              rows={3} className="field-input field-textarea" />
            <button onClick={() => addEntry.mutate()} disabled={!newEntry.trim() || addEntry.isPending}
              className="btn btn-primary btn-full">Ajouter</button>
          </div>
        )}

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par texte ou ID..."
            className="field-input pl-9" />
        </div>

        {!isLoading && filtered.length > 0 && (
          <div className="text-sm font-semibold text-muted-foreground px-1">
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
          <div className="space-y-3">
            {filtered.map((e: any) => {
              const pInfo = getPriorityInfo(e.priority);
              const date = getEntryDate(e);
              const isSelected = selectedIds.has(e.id);
              const seqNum = e.seq_number || "—";
              return (
                <div key={e.id}
                  className={`plugin-record space-y-2 ${selectMode ? "cursor-pointer" : ""} ${isSelected ? "ring-1 ring-primary/30" : ""} ${e.archived ? "opacity-70" : ""}`}
                  style={{ "--record-color": `hsl(${getPriorityColor(e.priority)})` } as CSSProperties}
                  onClick={selectMode ? () => toggleSelect(e.id) : undefined}>
                  {editingId === e.id ? (
                    <div className="space-y-3 rounded-xl border p-3 transition-all" style={getPriorityPanelStyle(editPriority)} onClick={ev => ev.stopPropagation()}>
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
                      <div className="grid grid-cols-2 gap-2">
                        <input type="date" value={editDate} onChange={ev => setEditDate(ev.target.value)}
                          className="field-input field-input-compact" />
                        <input type="time" value={editTime} onChange={ev => setEditTime(ev.target.value)}
                          className="field-input field-input-compact" />
                      </div>
                      <textarea value={editText} onChange={ev => setEditText(ev.target.value)}
                        rows={3} className="field-input field-textarea" />
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
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 min-w-0 flex-1">
                          {selectMode ? (
                            <div className="mt-0.5 shrink-0">
                              {isSelected ? <CheckSquare size={16} className="text-primary" /> : <Square size={16} className="text-muted-foreground" />}
                            </div>
                          ) : (
                            <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded-md shrink-0">
                              #{seqNum}
                            </span>
                          )}
                          <p className="plugin-record-title break-words">{e.text}</p>
                        </div>
                        {!selectMode && (
                          <div className="plugin-record-actions">
                            {tab === "active" ? (
                              <>
                                <button onClick={() => startEdit(e)} className="btn btn-icon-sm btn-ghost">
                                  <Pencil size={13} />
                                </button>
                                <button onClick={() => archiveEntry.mutate(e.id)} className="btn btn-icon-sm btn-archive rounded-full" title="Archiver">
                                  <Archive size={13} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => restoreEntry.mutate(e.id)} className="btn btn-icon-sm btn-ghost" title="Restaurer">
                                  <RotateCcw size={13} />
                                </button>
                                <button onClick={() => setDeleteConfirmId(e.id)} className="btn btn-icon-sm btn-delete rounded-full" title="Supprimer définitivement">
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="plugin-record-divider" />
                      <div className="plugin-record-meta">
                        {pInfo.value !== "normale" && (
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${pInfo.cls}`}>
                            {pInfo.label}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatDate(date)} · {new Date(date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
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
