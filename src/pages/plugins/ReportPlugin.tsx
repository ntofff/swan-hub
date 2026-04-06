import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import { Mic, Camera, Clock } from "lucide-react";

const ReportPlugin = () => {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <div className="fade-in">
      <PageHeader title="Outil Rapport" subtitle="Créer des rapports professionnels" back />
      <div className="px-4 md:px-0 space-y-4">
        <div className="glass-card p-4 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Titre</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre du rapport..."
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Décrivez..."
              rows={4} className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Mic size={16} /> Note vocale
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Camera size={16} /> Photo
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock size={12} /> Horodatage auto : {new Date().toLocaleString("fr-FR")}
          </div>
        </div>
        <button className="w-full btn-primary-glow py-3 text-sm">Générer le rapport</button>
      </div>
      <FeedbackButton context="report" />
    </div>
  );
};

export default ReportPlugin;
