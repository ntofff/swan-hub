import { useState, useRef, useCallback } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import {
  Mic, MicOff, Camera, Clock, MapPin, Sparkles, ChevronDown, ChevronUp,
  Trash2, Image as ImageIcon, Loader2, AlertCircle, X
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const priorityOptions = [
  { value: "normale", label: "Normale", color: "text-muted-foreground" },
  { value: "haute", label: "Haute", color: "text-warning" },
  { value: "urgente", label: "Urgente", color: "text-destructive" },
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

  // Form state
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [location, setLocation] = useState("");
  const [color, setColor] = useState("38 50% 58%");
  const [priority, setPriority] = useState("normale");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Dictation state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // AI state
  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch report history ──
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

  // ── Create report ──
  const createReport = useMutation({
    mutationFn: async () => {
      if (!user || !title.trim()) return;

      let photo_url: string | null = null;

      // Upload photo if present
      if (photoFile) {
        const ext = photoFile.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("report-photos")
          .upload(path, photoFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("report-photos")
          .getPublicUrl(path);
        photo_url = urlData.publicUrl;
      }

      const finalNotes = aiSummary
        ? `${notes}\n\n── Résumé IA ──\n${aiSummary}`
        : notes;

      const { error } = await supabase.from("reports").insert({
        user_id: user.id,
        title: title.trim(),
        notes: finalNotes.trim() || null,
        location: location.trim() || null,
        color,
        priority,
        photo_url,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["recent_reports"] });
      resetForm();
      toast.success("Rapport créé !");
    },
    onError: () => toast.error("Erreur lors de la création"),
  });

  const resetForm = () => {
    setTitle("");
    setNotes("");
    setLocation("");
    setColor("38 50% 58%");
    setPriority("normale");
    setPhotoFile(null);
    setPhotoPreview(null);
    setAiSummary("");
  };

  // ── Delete report ──
  const deleteReport = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reports").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast.success("Rapport supprimé");
    },
  });

  // ── Photo handling ──
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo trop volumineuse (max 5 Mo)");
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  // ── Dictation (Web Speech API) ──
  const toggleDictation = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Dictée vocale non supportée par ce navigateur");
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalTranscript = notes;

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += (finalTranscript ? " " : "") + transcript;
          setNotes(finalTranscript);
        } else {
          interim += transcript;
        }
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      toast.error("Erreur de reconnaissance vocale");
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    toast.success("Dictée activée — parlez maintenant");
  }, [isListening, notes]);

  // ── AI Summary ──
  const handleAiSummary = async () => {
    if (!notes.trim()) {
      toast.error("Rédigez d'abord le contenu du rapport");
      return;
    }
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("summarize-report", {
        body: { text: notes, title, location },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      setAiSummary(data.summary);
      toast.success("Résumé IA généré");
    } catch (e: any) {
      toast.error("Erreur IA : " + (e.message || "inconnue"));
    } finally {
      setAiLoading(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", {
      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });

  return (
    <div className="fade-in">
      <PageHeader title="Outil Rapport" subtitle="Créer et consulter vos rapports" back />
      <div className="px-4 md:px-0 space-y-4">

        {/* ── Form ── */}
        <div className="glass-card p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Titre *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre du rapport..." className={inputCls} />
          </div>

          {/* Location */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1">
              <MapPin size={12} /> Lieu
            </label>
            <input value={location} onChange={(e) => setLocation(e.target.value)}
              placeholder="Lieu de l'intervention..." className={inputCls} />
          </div>

          {/* Color + Priority row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Color */}
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
            {/* Priority */}
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
              {aiLoading ? "Génération du résumé…" : "Résumé IA"}
            </button>
            {aiSummary && (
              <div className="glass-card p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                  <Sparkles size={12} /> Résumé IA
                </div>
                <p className="text-xs text-secondary-foreground leading-relaxed">{aiSummary}</p>
                <button onClick={() => setAiSummary("")} className="text-[10px] text-muted-foreground hover:text-destructive">
                  Supprimer le résumé
                </button>
              </div>
            )}
          </div>

          {/* Timestamp */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock size={12} /> Horodatage : {new Date().toLocaleString("fr-FR")}
          </div>
        </div>

        {/* ── Submit ── */}
        <button onClick={() => createReport.mutate()}
          disabled={!title.trim() || createReport.isPending}
          className="w-full btn-primary-glow py-3 text-sm disabled:opacity-50">
          {createReport.isPending ? "Création..." : "Générer le rapport"}
        </button>

        {/* ── History ── */}
        <div className="glass-card overflow-hidden">
          <button onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-secondary/50 transition-colors">
            <span className="flex items-center gap-2">
              <Clock size={14} className="text-muted-foreground" />
              Historique ({reports.length})
            </span>
            {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showHistory && (
            <div className="divide-y divide-border">
              {reports.length === 0 ? (
                <div className="p-6 text-center">
                  <AlertCircle size={20} className="mx-auto text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">Aucun rapport</p>
                </div>
              ) : (
                reports.map((r: any) => (
                  <div key={r.id} className="px-4 py-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: `hsl(${r.color || "38 50% 58%"})` }} />
                        <span className="text-sm font-medium truncate">{r.title}</span>
                        {r.priority && r.priority !== "normale" && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${r.priority === "urgente" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}>
                            {r.priority}
                          </span>
                        )}
                      </div>
                      <button onClick={() => deleteReport.mutate(r.id)}
                        className="p-1 text-muted-foreground hover:text-destructive shrink-0">
                        <Trash2 size={13} />
                      </button>
                    </div>
                    {r.location && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <MapPin size={10} /> {r.location}
                      </p>
                    )}
                    {r.notes && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{r.notes}</p>
                    )}
                    {r.photo_url && (
                      <img src={r.photo_url} alt="Photo" className="w-16 h-12 object-cover rounded-md border border-border" />
                    )}
                    <p className="text-[10px] text-muted-foreground">{formatDate(r.created_at)}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
      <FeedbackButton context="report" />
    </div>
  );
};

export default ReportPlugin;
