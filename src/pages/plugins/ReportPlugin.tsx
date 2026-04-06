import { useState, useRef, useCallback } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import {
  Mic, MicOff, Camera, Clock, MapPin, Sparkles, ChevronDown, ChevronUp,
  Trash2, Loader2, AlertCircle, X, Copy, Mail, MessageSquare, Phone,
  Pencil, Share2, FolderOpen, Plus, FolderPlus
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import ReportFolderManager from "@/components/reports/ReportFolderManager";
import ReportHistory from "@/components/reports/ReportHistory";

const priorityOptions = [
  { value: "normale", label: "Normale" },
  { value: "haute", label: "Haute" },
  { value: "urgente", label: "Urgente" },
];

const colorOptions = [
  { value: "38 50% 58%", label: "Or" },
  { value: "217 91% 60%", label: "Bleu" },
  { value: "142 71% 45%", label: "Vert" },
  { value: "0 72% 51%", label: "Rouge" },
  { value: "270 50% 60%", label: "Violet" },
  { value: "38 92% 50%", label: "Orange" },
  { value: "190 80% 50%", label: "Cyan" },
  { value: "330 70% 55%", label: "Rose" },
];

const inputCls = "w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary";

const ReportPlugin = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [location, setLocation] = useState("");
  const [color, setColor] = useState("38 50% 58%");
  const [priority, setPriority] = useState("normale");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reportDate, setReportDate] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showFolderManager, setShowFolderManager] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Folders ──
  const { data: folders = [] } = useQuery({
    queryKey: ["report_folders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("report_folders")
        .select("*")
        .order("sort_order", { ascending: true });
      return data ?? [];
    },
    enabled: !!user,
  });

  // ── Reports ──
  const { data: reports = [] } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const { data } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
    enabled: !!user,
  });

  // ── Save report ──
  const saveReport = useMutation({
    mutationFn: async () => {
      if (!user || !title.trim()) return;
      let photo_url: string | null = null;
      if (photoFile) {
        const ext = photoFile.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("report-photos").upload(path, photoFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("report-photos").getPublicUrl(path);
        photo_url = urlData.publicUrl;
      }
      const finalNotes = aiSummary ? `${notes}\n\n── Résumé IA ──\n${aiSummary}` : notes;
      const payload: any = {
        user_id: user.id, title: title.trim(),
        notes: finalNotes.trim() || null, location: location.trim() || null,
        color, priority, folder_id: folderId,
        report_date: new Date(reportDate).toISOString(),
        ...(photo_url ? { photo_url } : {}),
      };
      if (editingId) {
        const { error } = await supabase.from("reports").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("reports").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["recent_reports"] });
      resetForm();
      toast.success(editingId ? "Rapport modifié !" : "Rapport créé !");
    },
    onError: () => toast.error("Erreur lors de la sauvegarde"),
  });

  const resetForm = () => {
    setTitle(""); setNotes(""); setLocation("");
    setColor("38 50% 58%"); setPriority("normale"); setFolderId(null);
    setPhotoFile(null); setPhotoPreview(null);
    setAiSummary(""); setEditingId(null);
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setReportDate(now.toISOString().slice(0, 16));
  };

  const startEdit = (r: any) => {
    setEditingId(r.id); setTitle(r.title);
    const rawNotes = (r.notes || "").replace(/\n\n── Résumé IA ──\n[\s\S]*$/, "");
    setNotes(rawNotes); setLocation(r.location || "");
    setColor(r.color || "38 50% 58%"); setPriority(r.priority || "normale");
    setFolderId(r.folder_id || null);
    if (r.report_date) {
      const d = new Date(r.report_date);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      setReportDate(d.toISOString().slice(0, 16));
    }
    setPhotoPreview(r.photo_url || null); setAiSummary("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteReport = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reports").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["reports"] }); toast.success("Rapport supprimé"); },
  });

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5 Mo"); return; }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const toggleDictation = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error("Non supporté"); return; }
    if (isListening && recognitionRef.current) { recognitionRef.current.stop(); setIsListening(false); return; }
    const recognition = new SR();
    recognition.lang = "fr-FR"; recognition.continuous = true; recognition.interimResults = true;
    let finalTranscript = notes;
    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += (finalTranscript ? " " : "") + event.results[i][0].transcript;
          setNotes(finalTranscript);
        }
      }
    };
    recognition.onerror = () => { setIsListening(false); toast.error("Erreur vocale"); };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition; recognition.start(); setIsListening(true);
    toast.success("Dictée activée");
  }, [isListening, notes]);

  const handleAiSummary = async () => {
    if (!notes.trim()) { toast.error("Rédigez d'abord le contenu"); return; }
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("summarize-report", {
        body: { text: notes, title, location },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      setAiSummary(data.summary); toast.success("Résumé IA généré");
    } catch (e: any) { toast.error("Erreur IA"); } finally { setAiLoading(false); }
  };

  const exportAiSummary = (method: string) => {
    if (!aiSummary) return;
    const text = `📋 Résumé IA — ${title}\n\n${aiSummary}`;
    if (method === "copy") { navigator.clipboard.writeText(text); toast.success("Copié"); }
    else if (method === "email") window.open(`mailto:?subject=${encodeURIComponent(`Résumé : ${title}`)}&body=${encodeURIComponent(text)}`);
    else if (method === "whatsapp") window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
    else if (method === "sms") window.open(`sms:?body=${encodeURIComponent(text)}`);
  };

  return (
    <div className="fade-in">
      <PageHeader title="Outil Rapport" subtitle="Créer et consulter vos rapports" back />
      <div className="px-4 md:px-0 space-y-4">

        {/* ── Folders ── */}
        <div className="glass-card p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <FolderOpen size={13} /> Dossiers
            </span>
            <button onClick={() => setShowFolderManager((prev) => !prev)}
              className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 font-medium">
              <FolderPlus size={12} /> {showFolderManager ? "Fermer" : "Gérer"}
            </button>
          </div>
          {folders.length === 0 ? (
            <p className="text-[10px] text-muted-foreground text-center py-2">
              Aucun dossier — cliquez sur Gérer pour en créer
            </p>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button onClick={() => setFolderId(null)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl min-w-[64px] shrink-0 transition-all ${!folderId ? "bg-primary/10 border border-primary/20" : "bg-secondary/50 border border-transparent hover:bg-secondary"}`}>
                <span className="text-lg">📋</span>
                <span className="text-[9px] font-medium truncate max-w-[56px]">Tous</span>
              </button>
              {folders.map((f: any) => (
                <button key={f.id} onClick={() => setFolderId(folderId === f.id ? null : f.id)}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl min-w-[64px] shrink-0 transition-all ${folderId === f.id ? "border border-primary/20 scale-105" : "border border-transparent hover:bg-secondary"}`}
                  style={{ backgroundColor: folderId === f.id ? `hsl(${f.color} / 0.15)` : undefined }}>
                  <span className="text-lg">{f.icon}</span>
                  <span className="text-[9px] font-medium truncate max-w-[56px]">{f.name}</span>
                </button>
              ))}
            </div>
          )}

          {showFolderManager && (
            <div className="mt-3">
              <ReportFolderManager
                folders={folders}
                colorOptions={colorOptions}
                onClose={() => setShowFolderManager(false)}
              />
            </div>
          )}
        </div>

        {/* ── Form ── */}
        <div className="glass-card p-4 space-y-4">
          {editingId && (
            <div className="flex items-center justify-between bg-primary/10 px-3 py-2 rounded-lg">
              <span className="text-xs font-medium text-primary">Mode édition</span>
              <button onClick={resetForm} className="text-xs text-muted-foreground hover:text-foreground">Annuler</button>
            </div>
          )}

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Titre *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre du rapport..." className={inputCls} />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1">
              <MapPin size={12} /> Lieu
            </label>
            <input value={location} onChange={(e) => setLocation(e.target.value)}
              placeholder="Lieu de l'intervention..." className={inputCls} />
          </div>

          {/* Folder selector in form */}
          {folders.length > 0 && (
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1">
                <FolderOpen size={12} /> Dossier
              </label>
              <div className="flex gap-1.5 flex-wrap">
                <button onClick={() => setFolderId(null)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors ${!folderId ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary"}`}>
                  Aucun
                </button>
                {folders.map((f: any) => (
                  <button key={f.id} onClick={() => setFolderId(f.id)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${folderId === f.id ? "font-medium" : "text-muted-foreground hover:bg-secondary"}`}
                    style={folderId === f.id ? { backgroundColor: `hsl(${f.color} / 0.15)`, color: `hsl(${f.color})` } : {}}>
                    <span className="text-sm">{f.icon}</span> {f.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Couleur</label>
              <div className="flex flex-wrap gap-1.5">
                {colorOptions.map((c) => (
                  <button key={c.value} onClick={() => setColor(c.value)} title={c.label}
                    className={`w-7 h-7 rounded-lg border-2 transition-all ${color === c.value ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: `hsl(${c.value})` }} />
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Priorité</label>
              <div className="flex flex-col gap-1">
                {priorityOptions.map((p) => (
                  <button key={p.value} onClick={() => setPriority(p.value)}
                    className={`text-left text-xs px-2.5 py-1.5 rounded-lg transition-colors ${priority === p.value ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary"}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Notes + Dictation */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-muted-foreground">Contenu du rapport</label>
              <button onClick={toggleDictation}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors ${isListening ? "bg-destructive/15 text-destructive animate-pulse" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                {isListening ? <MicOff size={12} /> : <Mic size={12} />}
                {isListening ? "Arrêter" : "Dicter"}
              </button>
            </div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Décrivez le rapport... ou utilisez la dictée vocale"
              rows={5} className={`${inputCls} resize-none`} />
          </div>

          {/* Photo */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Photo</label>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
              onChange={handlePhotoSelect} className="hidden" />
            {photoPreview ? (
              <div className="relative">
                <img src={photoPreview} alt="Aperçu" className="w-full h-40 object-cover rounded-lg border border-border" />
                <button onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 text-destructive hover:bg-background">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-4 py-6 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors">
                <Camera size={18} /> Ajouter une photo
              </button>
            )}
          </div>

          {/* AI Summary */}
          <div className="space-y-2">
            <button onClick={handleAiSummary} disabled={aiLoading || !notes.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors disabled:opacity-40">
              {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {aiLoading ? "Génération…" : "Résumé IA"}
            </button>
            {aiSummary && (
              <div className="glass-card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                    <Sparkles size={12} /> Résumé IA
                  </div>
                  <button onClick={() => setAiSummary("")} className="p-0.5 text-muted-foreground hover:text-destructive"><X size={12} /></button>
                </div>
                <p className="text-xs text-secondary-foreground leading-relaxed">{aiSummary}</p>
                <div className="flex gap-1.5 pt-1">
                  {[
                    { id: "copy", icon: Copy, label: "Copier" },
                    { id: "email", icon: Mail, label: "Email" },
                    { id: "whatsapp", icon: MessageSquare, label: "WhatsApp" },
                    { id: "sms", icon: Phone, label: "SMS" },
                  ].map((m) => (
                    <button key={m.id} onClick={() => exportAiSummary(m.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                      <m.icon size={10} /> {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock size={12} /> {new Date().toLocaleString("fr-FR")}
          </div>
        </div>

        {/* ── Submit ── */}
        <button onClick={() => saveReport.mutate()}
          disabled={!title.trim() || saveReport.isPending}
          className="w-full btn-primary-glow py-3 text-sm disabled:opacity-50">
          {saveReport.isPending ? "Sauvegarde..." : editingId ? "Modifier le rapport" : "Générer le rapport"}
        </button>

        {/* ── History ── */}
        <ReportHistory
          reports={reports}
          folders={folders}
          colorOptions={colorOptions}
          onEdit={startEdit}
          onDelete={(id) => deleteReport.mutate(id)}
        />
      </div>


      <FeedbackButton context="report" />
    </div>
  );
};

export default ReportPlugin;
