import { useState } from "react";
import { X, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

const emojiOptions = ["📁", "🏗️", "🔧", "🚗", "🏠", "📊", "⚡", "🔍", "📝", "🎯", "🛡️", "🌿", "💼", "🏭", "📦", "🔥", "💧", "🏢"];

interface Props {
  folders: any[];
  colorOptions: { value: string; label: string }[];
  onClose: () => void;
}

const inputCls = "field-input";

const ReportFolderManager = ({ folders, colorOptions, onClose }: Props) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📁");
  const [color, setColor] = useState("38 50% 58%");

  const createFolder = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Session introuvable. Reconnectez-vous.");
      if (!name.trim()) throw new Error("Le nom du dossier est requis.");

      const nextSortOrder = folders.reduce((max, folder) => Math.max(max, Number(folder.sort_order) || 0), -1) + 1;
      const { error } = await supabase.from("report_folders").insert({
        user_id: user.id,
        name: name.trim(),
        icon,
        color,
        sort_order: nextSortOrder,
      }).select("id").single();
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report_folders"] });
      setName("");
      setIcon("📁");
      setColor("38 50% 58%");
      toast.success("Dossier créé");
    },
    onError: (err: any) => {
      console.error("Erreur création dossier:", err);
      const message = err?.message || "Impossible de créer le dossier";
      toast.error(message);
    },
  });

  const deleteFolder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("report_folders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report_folders"] });
      toast.success("Dossier supprimé");
    },
  });

  const reorderFolder = useMutation({
    mutationFn: async ({ idx, dir }: { idx: number; dir: -1 | 1 }) => {
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= folders.length) return;
      const a = folders[idx], b = folders[newIdx];
      await Promise.all([
        supabase.from("report_folders").update({ sort_order: newIdx }).eq("id", a.id),
        supabase.from("report_folders").update({ sort_order: idx }).eq("id", b.id),
      ]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["report_folders"] }),
  });

  return (
    <div className="rounded-2xl border border-border bg-secondary/20 p-3 sm:p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Gérer les dossiers</h3>
        <button onClick={onClose} className="btn btn-icon-xs btn-ghost">
          <X size={18} />
        </button>
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-medium text-muted-foreground">Nouveau dossier</h4>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom du dossier..."
          className={inputCls}
        />

        <div>
          <label className="field-label">Icône</label>
          <div className="flex flex-wrap gap-2">
            {emojiOptions.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setIcon(emoji)}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-base border-2 transition-all ${icon === emoji ? "bg-primary/15 scale-105 shadow-lg shadow-primary/20" : "bg-secondary hover:bg-secondary/80 border-transparent"}`}
                style={icon === emoji ? { borderColor: `hsl(${color})`, boxShadow: `0 0 0 3px hsl(${color} / 0.22)` } : undefined}
                aria-pressed={icon === emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="field-label">Couleur</label>
          <div className="flex flex-wrap gap-2">
            {colorOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setColor(option.value)}
                title={option.label}
                className={`w-10 h-10 rounded-full border-2 transition-all ${color === option.value ? "scale-105 shadow-lg" : "border-transparent"}`}
                style={{
                  backgroundColor: `hsl(${option.value})`,
                  borderColor: color === option.value ? `hsl(${option.value})` : "transparent",
                  boxShadow: color === option.value ? `0 0 0 3px hsl(${option.value} / 0.28)` : undefined,
                }}
                aria-pressed={color === option.value}
              />
            ))}
          </div>
        </div>

        <div
          className="flex items-center gap-3 p-3 rounded-xl border-2 bg-background/70"
          style={{ borderColor: `hsl(${color})`, boxShadow: `0 0 0 3px hsl(${color} / 0.12)` }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{ backgroundColor: `hsl(${color} / 0.18)`, color: `hsl(${color})` }}
          >
            {icon}
          </div>
          <span className="text-sm font-medium truncate">{name || "Aperçu"}</span>
        </div>

        <button
          onClick={() => createFolder.mutate()}
          disabled={!name.trim() || createFolder.isPending}
          className="btn btn-primary btn-full"
        >
          <Plus size={14} /> Créer le dossier
        </button>
      </div>

      {folders.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">Dossiers existants — glissez pour réordonner</h4>
          {folders.map((folder: any, idx: number) => (
            <div
              key={folder.id}
              className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-background/70 gap-2 transition-all"
              style={{ borderLeft: `4px solid hsl(${folder.color || "38 50% 58%"})` }}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0"
                  style={{ backgroundColor: `hsl(${folder.color} / 0.15)` }}
                >
                  {folder.icon}
                </div>
                <span className="text-sm font-semibold truncate">{folder.name}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => reorderFolder.mutate({ idx, dir: -1 })} disabled={idx === 0} className="btn btn-icon-xs btn-secondary">
                  <ArrowUp size={14} />
                </button>
                <button onClick={() => reorderFolder.mutate({ idx, dir: 1 })} disabled={idx === folders.length - 1} className="btn btn-icon-xs btn-secondary">
                  <ArrowDown size={14} />
                </button>
                <button
                  onClick={() => { if (window.confirm(`Supprimer le dossier "${folder.name}" ?`)) deleteFolder.mutate(folder.id); }}
                  className="btn btn-icon-xs btn-ghost"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReportFolderManager;
