import { useState } from "react";
import { X, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
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

const inputCls = "w-full bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary";

const ReportFolderManager = ({ folders, colorOptions, onClose }: Props) => {
  const [collapsed, setCollapsed] = useState(false);
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

  return (
    <div className="rounded-xl border border-border bg-secondary/20 p-2.5 space-y-2 max-w-xs">
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => setCollapsed(!collapsed)} className="flex items-center gap-1.5 text-xs font-semibold hover:text-primary transition-colors">
          {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          Dossiers
        </button>
        <button onClick={onClose} className="p-0.5 text-muted-foreground hover:text-foreground">
          <X size={14} />
        </button>
      </div>

      {!collapsed && (
        <>
          <div className="space-y-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom du dossier..."
              className={inputCls}
            />

            <div className="flex flex-wrap gap-1">
              {emojiOptions.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setIcon(emoji)}
                  className={`w-6 h-6 rounded flex items-center justify-center text-sm transition-all ${icon === emoji ? "bg-primary/15 border border-primary/30 scale-110" : "bg-secondary hover:bg-secondary/80"}`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-1">
              {colorOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setColor(option.value)}
                  title={option.label}
                  className={`w-5 h-5 rounded border-2 transition-all ${color === option.value ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: `hsl(${option.value})` }}
                />
              ))}
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-background/70">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-base shrink-0"
                style={{ backgroundColor: `hsl(${color} / 0.15)` }}
              >
                {icon}
              </div>
              <span className="text-xs font-medium truncate">{name || "Aperçu"}</span>
            </div>

            <button
              onClick={() => createFolder.mutate()}
              disabled={!name.trim() || createFolder.isPending}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40"
            >
              <Plus size={12} /> Créer
            </button>
          </div>

          {folders.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-[10px] font-medium text-muted-foreground">Existants</h4>
              {folders.map((folder: any) => (
                <div key={folder.id} className="flex items-center justify-between p-2 rounded-lg border border-border bg-background/70 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center text-sm shrink-0"
                      style={{ backgroundColor: `hsl(${folder.color} / 0.15)` }}
                    >
                      {folder.icon}
                    </div>
                    <span className="text-xs font-medium truncate">{folder.name}</span>
                  </div>
                  <button
                    onClick={() => { if (window.confirm(`Supprimer "${folder.name}" ?`)) deleteFolder.mutate(folder.id); }}
                    className="p-1 text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReportFolderManager;
