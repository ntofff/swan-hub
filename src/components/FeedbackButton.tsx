import { useState } from "react";
import { MessageSquare, X, Bug, Lightbulb, AlertTriangle, ThumbsUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";

const types = [
  { value: "bug", label: "Bug", icon: Bug },
  { value: "suggestion", label: "Suggestion", icon: Lightbulb },
  { value: "ux", label: "Prob. UX", icon: AlertTriangle },
  { value: "useful", label: "Utile", icon: ThumbsUp },
] as const;

interface FeedbackButtonProps { context?: string; }

export const FeedbackButton = ({ context = "global" }: FeedbackButtonProps) => {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string>("suggestion");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!user || !message.trim()) return;
    await supabase.from("feedback").insert({
      user_id: user.id,
      type,
      message,
      context,
      plugin: context !== "global" ? context : null,
      screen: location.pathname,
    });
    setSent(true);
    setTimeout(() => { setOpen(false); setSent(false); setMessage(""); }, 1500);
  };

  if (!user) return null;

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="fixed bottom-20 right-4 md:bottom-6 z-40 p-3 rounded-full bg-secondary text-muted-foreground hover:text-foreground border border-border transition-all hover:scale-105">
        <MessageSquare size={18} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 z-50 w-72 glass-card p-4 fade-in">
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-semibold font-heading">Retour</span>
        <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
      </div>
      {sent ? (
        <p className="text-sm text-center py-4 text-primary">Merci ! ✓</p>
      ) : (
        <>
          <div className="flex gap-1.5 mb-3">
            {types.map(t => (
              <button key={t.value} onClick={() => setType(t.value)}
                className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] transition-colors ${type === t.value ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-secondary text-muted-foreground'}`}>
                <t.icon size={14} />
                {t.label}
              </button>
            ))}
          </div>
          <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Décrivez..." rows={3}
            className="w-full bg-secondary border border-border rounded-lg p-2.5 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary mb-2" />
          <div className="text-[10px] text-muted-foreground mb-2">Écran : {location.pathname}</div>
          <button onClick={handleSubmit} disabled={!message.trim()} className="w-full btn-primary-glow py-2 text-sm disabled:opacity-40">Envoyer</button>
        </>
      )}
    </div>
  );
};
