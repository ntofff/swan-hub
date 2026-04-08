import { useState, useRef, useCallback } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import {
  Mic, MicOff, Camera, Clock, MapPin, Sparkles,
  Trash2, Loader2, X, Copy, Mail, MessageSquare, Phone,
  FolderOpen, FolderPlus, ChevronUp, ChevronDown
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import ReportFolderManager from "@/components/reports/ReportFolderManager";
import ReportHistory from "@/components/reports/ReportHistory";
import ReportPhotoGallery, { type PhotoItem } from "@/components/reports/ReportPhotoGallery";

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

const inputCls = "w-full max-w-full box-border bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-colors [&::-webkit-calendar-picker-indicator]:opacity-60";

const ReportPlugin = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [location, setLocation] = useState("");
  const [color, setColor] = useState("38 50% 58%");
  const [priority, setPriority] = useState("normale");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
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
  const [showFolderStrip, setShowFolderStrip] = useState(true);
  const [showOptions, setShowOptions] = useState(false);

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

  const saveReport = useMutation({
    mutationFn: async () => {
      if (!user || !title.trim()) return;

      const finalNotes = aiSummary ? `${notes}\n\n── Résumé IA ──\n${aiSummary}` : notes;

      // Keep first photo as legacy photo_url for backwards compat
      let photo_url: string | null = null;
      const uploadedPhotos: { url: string; photo: PhotoItem }[] = [];

      for (const photo of photos) {
        if (photo.file) {
          const ext = photo.file.name.split(".").pop();
          const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: uploadError } = await supabase.storage.from("report-photos").upload(path, photo.file);
          if (uploadError) throw uploadError;
          // Store the storage path (not a public URL) — we'll generate signed URLs when displaying
          const storagePath = path;
          uploadedPhotos.push({ url: storagePath, photo });
        } else {
          uploadedPhotos.push({ url: photo.url, photo });
        }
      }

      if (uploadedPhotos.length > 0) photo_url = uploadedPhotos[0].url;

      const payload: any = {
        user_id: user.id, title: title.trim(),
        notes: finalNotes.trim() || null, location: location.trim() || null,
        color, priority, folder_id: folderId,
        report_date: new Date(reportDate).toISOString(),
        photo_url,
      };

      let reportId = editingId;
      if (editingId) {
        const { error } = await supabase.from("reports").update(payload).eq("id", editingId);
        if (error) throw error;
        // Delete old photos for this report
        await supabase.from("report_photos").delete().eq("report_id", editingId);
      } else {
        const { data: inserted, error } = await supabase.from("reports").insert(payload).select("id").single();
        if (error) throw error;
        reportId = inserted.id;
      }

      // Insert all photos into report_photos
      if (reportId && uploadedPhotos.length > 0) {
        const photoRows = uploadedPhotos.map(({ url, photo }, idx) => ({
          report_id: reportId!,
          user_id: user.id,
          photo_url: url,
          caption: photo.caption || null,
          caption_position: photo.captionPosition,
          caption_font: photo.captionFont,
          caption_size: photo.captionSize,
          caption_color: photo.captionColor,
          caption_opacity: photo.captionOpacity,
          sort_order: idx,
          taken_at: photo.takenAt.toISOString(),
        }));
        const { error: photosError } = await supabase.from("report_photos").insert(photoRows);
        if (photosError) throw photosError;
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
    setPhotos([]);
    setAiSummary(""); setEditingId(null); setShowOptions(false);
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setReportDate(now.toISOString().slice(0, 16));
  };

  const startEdit = useCallback(async (r: any) => {
    setEditingId(r.id); setTitle(r.title);
    const rawNotes = (r.notes || "").replace(/\n\n── Résumé IA ──\n[\s\S]*$/, "");
    setNotes(rawNotes); setLocation(r.location || "");
    setColor(r.color || "38 50% 58%"); setPriority(r.priority || "normale");
    setFolderId(r.folder_id || null); setShowOptions(true);
    if (r.report_date) {
      const d = new Date(r.report_date);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      setReportDate(d.toISOString().slice(0, 16));
    }
    setAiSummary("");

    // Helper to resolve signed URLs for private bucket
    const resolveUrl = async (path: string) => {
      if (path.startsWith("http")) return path;
      const { data } = await supabase.storage.from("report-photos").createSignedUrl(path, 3600);
      return data?.signedUrl ?? path;
    };

    // Load photos from report_photos table
    const { data: reportPhotos } = await supabase
      .from("report_photos")
      .select("*")
      .eq("report_id", r.id)
      .order("sort_order", { ascending: true });

    if (reportPhotos && reportPhotos.length > 0) {
      const resolved = await Promise.all(reportPhotos.map(async (p: any) => ({
        id: p.id,
        url: await resolveUrl(p.photo_url),
        caption: p.caption || "",
        captionPosition: p.caption_position || "bottom-center",
        captionFont: p.caption_font || "sans-serif",
        captionSize: p.caption_size || 24,
        captionColor: p.caption_color || "#FFFFFF",
        captionOpacity: Number(p.caption_opacity) || 0.8,
        takenAt: new Date(p.taken_at || p.created_at),
      })));
      setPhotos(resolved);
    } else if (r.photo_url) {
      const resolvedUrl = await resolveUrl(r.photo_url);
      setPhotos([{
        id: `legacy-${r.id}`,
        url: resolvedUrl,
        caption: "",
        captionPosition: "bottom-center",
        captionFont: "sans-serif",
        captionSize: 24,
        captionColor: "#FFFFFF",
        captionOpacity: 0.8,
        takenAt: new Date(r.created_at),
      }]);
    } else {
      setPhotos([]);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const deleteReport = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reports").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["reports"] }); toast.success("Rapport supprimé"); },
  });

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
      const formattedDate = new Date(reportDate).toLocaleString("fr-FR", {
        day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
      });
      const { data, error } = await supabase.functions.invoke("summarize-report", {
        body: { text: notes, title, location, date: formattedDate, priority, photo_url: photos[0]?.url },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      setAiSummary(data.summary); toast.success("Résumé IA généré");
    } catch (e: any) { toast.error("Erreur IA"); } finally { setAiLoading(false); }
  };

  const exportAiSummary = async (method: string) => {
    if (!aiSummary) return;
    const photoUrls = photos.filter(p => p.url && !p.url.startsWith("data:")).map(p => p.url);
    let text = `Résumé — ${title}\n\n${aiSummary}`;
    if (photoUrls.length > 0) {
      text += `\n\n📷 Photos (${photoUrls.length}) :\n`;
      photoUrls.forEach((url, i) => { text += `${i + 1}. ${url}\n`; });
    }
    if (method === "copy") { navigator.clipboard.writeText(text); toast.success("Copié"); }
    else if (method === "email") window.open(`mailto:?subject=${encodeURIComponent(`Résumé : ${title}`)}&body=${encodeURIComponent(text)}`);
    else if (method === "whatsapp") window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
    else if (method === "sms") window.open(`sms:?body=${encodeURIComponent(text)}`);
  };

  return (
    <div className="fade-in">
      <PageHeader title="Outil Rapport" subtitle="Créer et consulter vos rapports" back />
      <div className="px-4 md:px-0 space-y-3">

        {/* Folders strip */}
        <div className="glass-card px-3 py-2">
          <div className="flex items-center justify-between">
            <button onClick={() => setShowFolderStrip(!showFolderStrip)}
              className="text-[10px] font-medium text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors">
              {showFolderStrip ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              <FolderOpen size={11} /> Dossiers
            </button>
            <button onClick={() => setShowFolderManager((prev) => !prev)}
              className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 font-medium">
              <FolderPlus size={10} /> {showFolderManager ? "Fermer" : "Gérer"}
            </button>
          </div>
          {showFolderStrip && (
            <>
              {folders.length === 0 ? (
                <p className="text-[10px] text-muted-foreground text-center py-1 mt-1">
                  Aucun dossier — cliquez sur Gérer
                </p>
              ) : (
                <div className="flex gap-1.5 overflow-x-auto scrollbar-hide mt-1">
                  <button onClick={() => setFolderId(null)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg shrink-0 transition-all text-[10px] font-medium ${!folderId ? "bg-primary/10 border border-primary/20" : "bg-secondary/50 border border-transparent hover:bg-secondary"}`}>
                    Tous
                  </button>
                  {folders.map((f: any) => (
                    <button key={f.id} onClick={() => setFolderId(folderId === f.id ? null : f.id)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg shrink-0 transition-all text-[10px] font-medium ${folderId === f.id ? "border border-primary/20" : "border border-transparent hover:bg-secondary"}`}
                      style={{ backgroundColor: folderId === f.id ? `hsl(${f.color} / 0.15)` : undefined }}>
                      <span className="text-sm">{f.icon}</span>
                      <span className="truncate max-w-[48px]">{f.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          {showFolderManager && (
            <div className="mt-3">
              <ReportFolderManager folders={folders} colorOptions={colorOptions} onClose={() => setShowFolderManager(false)} />
            </div>
          )}
        </div>

        {/* Form */}
        <div className="glass-card p-4 space-y-3">
          {editingId && (
            <div className="flex items-center justify-between bg-primary/10 px-3 py-2 rounded-lg">
              <span className="text-xs font-medium text-primary">Mode édition</span>
              <button onClick={resetForm} className="text-xs text-muted-foreground hover:text-foreground">Annuler</button>
            </div>
          )}

          {/* Title */}
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre du rapport *" className={inputCls} />

          {/* Priority */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Priorité</label>
            <div className="flex gap-1.5">
              {priorityOptions.map((p) => (
                <button key={p.value} onClick={() => setPriority(p.value)}
                  className={`flex-1 text-xs py-2 rounded-lg transition-colors font-medium ${
                    priority === p.value
                      ? p.value === "urgente" ? "bg-destructive/15 text-destructive"
                        : p.value === "haute" ? "bg-warning/15 text-warning"
                        : "bg-primary/10 text-primary"
                      : "text-muted-foreground bg-secondary hover:bg-secondary/80"
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div className="relative">
            <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={location} onChange={(e) => setLocation(e.target.value)}
              placeholder="Lieu" className={`${inputCls} pl-9`} />
          </div>

          {/* Date & Time */}
          <div className="relative">
            <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="datetime-local" value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className={`${inputCls} pl-9`} />
          </div>

          {/* Notes + Dictation */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-muted-foreground">Contenu</label>
              <button onClick={toggleDictation}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors ${isListening ? "bg-destructive/15 text-destructive animate-pulse" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                {isListening ? <MicOff size={12} /> : <Mic size={12} />}
                {isListening ? "Stop" : "Dicter"}
              </button>
            </div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Décrivez le rapport..."
              rows={4} className={`${inputCls} resize-none`} />
          </div>

          {/* AI Summary */}
          <button onClick={handleAiSummary} disabled={aiLoading || !notes.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors disabled:opacity-40">
            {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {aiLoading ? "Génération…" : "Résumé IA"}
          </button>
          {aiSummary && (
            <div className="glass-card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-primary flex items-center gap-1.5"><Sparkles size={12} /> Résumé IA</span>
                <button onClick={() => setAiSummary("")} className="p-0.5 text-muted-foreground hover:text-destructive"><X size={12} /></button>
              </div>
              <p className="text-xs text-secondary-foreground leading-relaxed whitespace-pre-line">{aiSummary}</p>
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

          {/* Collapsible options */}
          <button onClick={() => setShowOptions(!showOptions)}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground py-1 transition-colors">
            {showOptions ? "Masquer les options" : "Plus d'options"}
          </button>

          {showOptions && (
            <div className="space-y-3 pt-1 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Color */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Couleur</label>
                <div className="flex flex-wrap gap-1.5">
                  {colorOptions.map((c) => (
                    <button key={c.value} onClick={() => setColor(c.value)} title={c.label}
                      className={`w-6 h-6 rounded-lg border-2 transition-all ${color === c.value ? "border-foreground scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: `hsl(${c.value})` }} />
                  ))}
                </div>
              </div>

              {/* Folder selector */}
              {folders.length > 0 && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Dossier</label>
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
            </div>
          )}

          {/* Photos gallery */}
          <ReportPhotoGallery photos={photos} onChange={setPhotos} />
        </div>

        {/* Submit */}
        <button onClick={() => saveReport.mutate()}
          disabled={!title.trim() || saveReport.isPending}
          className="w-full btn-primary-glow py-3 text-sm disabled:opacity-50 rounded-xl">
          {saveReport.isPending ? "Sauvegarde..." : editingId ? "Modifier" : "Enregistrer le rapport"}
        </button>

        {/* History */}
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
