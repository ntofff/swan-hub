import { useState } from "react";
import { X, Plus, Trash2, GripVertical, ArrowUp, ArrowDown } from "lucide-react";
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

const inputCls = "w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary";

const ReportFolderManager = ({ folders, colorOptions, onClose }: Props) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📁");
  const [color, setColor] = useState("38 50% 58%");

  const createFolder = useMutation({
    mutationFn: async () => {
      if (!user || !name.trim()) return;
      const { error } = await supabase.from("report_folders").insert({
        user_id: user.id,
        name: name.trim(),
        icon,
        color,
        sort_order: folders.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report_folders"] });
      setName("");
      setIcon("📁");
      setColor("38 50% 58%");
      toast.success("Dossier créé");
    },
    onError: () => toast.error("Erreur"),
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
    mutationFn: async ({ folderId, direction }: { folderId: string; direction: "up" | "down" }) => {
      const idx = folders.findIndex((f: any) => f.id === folderId);
      if (idx < 0) return;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= folders.length) return;

      const current = folders[idx];
      const swap = folders[swapIdx];

      const { error: e1 } = await supabase.from("report_folders").update({ sort_order: swapIdx }).eq("id", current.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("report_folders").update({ sort_order: idx }).eq("id", swap.id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report_folders"] });
    },
    onError: () => toast.error("Erreur de réorganisation"),
  });

  return (
    <div className="rounded-2xl border border-border bg-secondary/20 p-3 sm:p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Gérer les dossiers</h3>
        <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
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
          <label className="text-[10px] text-muted-foreground mb-1 block">Icône</label>
          <div className="flex flex-wrap gap-1.5">
            {emojiOptions.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setIcon(emoji)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all ${icon === emoji ? "bg-primary/15 border border-primary/30 scale-110" : "bg-secondary hover:bg-secondary/80"}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block">Couleur</label>
          <div className="flex flex-wrap gap-1.5">
            {colorOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setColor(option.value)}
                title={option.label}
                className={`w-7 h-7 rounded-lg border-2 transition-all ${color === option.value ? "border-foreground scale-110" : "border-transparent"}`}
                style={{ backgroundColor: `hsl(${option.value})` }}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background/70">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{ backgroundColor: `hsl(${color} / 0.15)` }}
          >
            {icon}
          </div>
          <span className="text-sm font-medium truncate">{name || "Aperçu"}</span>
        </div>

        <button
          onClick={() => createFolder.mutate()}
          disabled={!name.trim() || createFolder.isPending}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
        >
          <Plus size={14} /> Créer le dossier
        </button>
      </div>

      {folders.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">Dossiers existants</h4>
          {folders.map((folder: any, idx: number) => (
            <div key={folder.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-background/70 gap-2">
              <div className="flex items-center gap-1 shrink-0">
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => reorderFolder.mutate({ folderId: folder.id, direction: "up" })}
                    disabled={idx === 0 || reorderFolder.isPending}
                    className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    onClick={() => reorderFolder.mutate({ folderId: folder.id, direction: "down" })}
                    disabled={idx === folders.length - 1 || reorderFolder.isPending}
                    className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                  >
                    <ArrowDown size={12} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0"
                  style={{ backgroundColor: `hsl(${folder.color} / 0.15)` }}
                >
                  {folder.icon}
                </div>
                <span className="text-sm font-medium truncate">{folder.name}</span>
              </div>
              <button
                onClick={() => { if (window.confirm(`Supprimer le dossier "${folder.name}" ?`)) deleteFolder.mutate(folder.id); }}
                className="p-1.5 text-muted-foreground hover:text-destructive shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReportFolderManager;
