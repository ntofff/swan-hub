import { useState } from "react";
import { X, Plus, Trash2, GripVertical } from "lucide-react";
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
        user_id: user.id, name: name.trim(), icon, color,
        sort_order: folders.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report_folders"] });
      setName(""); setIcon("📁"); setColor("38 50% 58%");
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
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border px-4 py-3 flex items-center justify-between rounded-t-2xl">
          <h3 className="text-sm font-semibold">Gérer les dossiers</h3>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-4">
          {/* Create new */}
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-muted-foreground">Nouveau dossier</h4>
            <input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Nom du dossier..." className={inputCls} />

            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Icône</label>
              <div className="flex flex-wrap gap-1.5">
                {emojiOptions.map((e) => (
                  <button key={e} onClick={() => setIcon(e)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all ${icon === e ? "bg-primary/15 border border-primary/30 scale-110" : "bg-secondary hover:bg-secondary/80"}`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Couleur</label>
              <div className="flex flex-wrap gap-1.5">
                {colorOptions.map((c) => (
                  <button key={c.value} onClick={() => setColor(c.value)} title={c.label}
                    className={`w-7 h-7 rounded-lg border-2 transition-all ${color === c.value ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: `hsl(${c.value})` }} />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-secondary/30">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{ backgroundColor: `hsl(${color} / 0.15)` }}>
                {icon}
              </div>
              <span className="text-sm font-medium">{name || "Aperçu"}</span>
            </div>

            <button onClick={() => createFolder.mutate()}
              disabled={!name.trim() || createFolder.isPending}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40">
              <Plus size={14} /> Créer le dossier
            </button>
          </div>

          {/* Existing folders */}
          {folders.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground">Dossiers existants</h4>
              {folders.map((f: any) => (
                <div key={f.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-secondary/30">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
                      style={{ backgroundColor: `hsl(${f.color} / 0.15)` }}>
                      {f.icon}
                    </div>
                    <span className="text-sm font-medium">{f.name}</span>
                  </div>
                  <button onClick={() => deleteFolder.mutate(f.id)}
                    className="p-1.5 text-muted-foreground hover:text-destructive">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportFolderManager;
