import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import { Plus, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const priorityColors: Record<string, string> = { haute: "0 72% 51%", moyenne: "38 92% 50%", basse: "142 71% 45%" };

const TasksPlugin = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("*, user_activities(name, color)").order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const addTask = useMutation({
    mutationFn: async () => {
      if (!user || !input.trim()) return;
      await supabase.from("tasks").insert({ user_id: user.id, text: input.trim(), priority: "moyenne" });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); setInput(""); },
  });

  const toggleTask = useMutation({
    mutationFn: async (task: any) => {
      await supabase.from("tasks").update({ done: !task.done }).eq("id", task.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  return (
    <div className="fade-in">
      <PageHeader title="Tâches" subtitle="Gestionnaire de tâches simple" back />
      <div className="px-4 md:px-0">
        <div className="flex gap-2 mb-4">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addTask.mutate()}
            placeholder="Ajouter une tâche..." className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          <button onClick={() => addTask.mutate()} className="p-2.5 rounded-xl bg-primary/10 text-primary"><Plus size={18} /></button>
        </div>

        {isLoading ? (
          <div className="glass-card p-8 flex justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : tasks.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-sm text-muted-foreground">Aucune tâche pour le moment</p>
            <p className="text-xs text-muted-foreground mt-1">Ajoutez votre première tâche ci-dessus</p>
          </div>
        ) : (
          <div className="glass-card divide-y divide-border">
            {tasks.map((t: any) => (
              <button key={t.id} onClick={() => toggleTask.mutate(t)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
                <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${t.done ? 'bg-primary border-primary' : 'border-border'}`}>
                  {t.done && <Check size={12} className="text-primary-foreground" />}
                </div>
                <span className={`text-sm flex-1 ${t.done ? 'line-through text-muted-foreground' : ''}`}>{t.text}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: `hsl(${priorityColors[t.priority] || "0 0% 50%"} / 0.12)`, color: `hsl(${priorityColors[t.priority] || "0 0% 50%"})` }}>
                  {t.priority}
                </span>
                {t.user_activities && <span className="text-[10px] text-muted-foreground">{t.user_activities.name}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      <FeedbackButton context="tasks" />
    </div>
  );
};

export default TasksPlugin;
