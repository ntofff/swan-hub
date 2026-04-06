import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import { Plus, Check } from "lucide-react";

interface Task { id: number; text: string; done: boolean; priority: string; activity?: string; }

const initialTasks: Task[] = [
  { id: 1, text: "Envoyer la proposition mise à jour au client", done: false, priority: "haute", activity: "Consulting" },
  { id: 2, text: "Vérifier les retouches photo du mariage", done: false, priority: "moyenne", activity: "Photographie" },
  { id: 3, text: "Mettre à jour les documents d'assurance véhicule", done: true, priority: "basse", activity: "Transport" },
  { id: 4, text: "Préparer le bilan financier Q2", done: false, priority: "haute" },
];

const priorityColors: Record<string, string> = { haute: "0 72% 51%", moyenne: "38 92% 50%", basse: "142 71% 45%" };

const TasksPlugin = () => {
  const [tasks, setTasks] = useState(initialTasks);
  const [input, setInput] = useState("");

  const toggle = (id: number) => setTasks(t => t.map(x => x.id === id ? { ...x, done: !x.done } : x));
  const addTask = () => {
    if (!input.trim()) return;
    setTasks(t => [{ id: Date.now(), text: input, done: false, priority: "moyenne" }, ...t]);
    setInput("");
  };

  return (
    <div className="fade-in">
      <PageHeader title="Tâches" subtitle="Gestionnaire de tâches simple" back />
      <div className="px-4 md:px-0">
        <div className="flex gap-2 mb-4">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addTask()}
            placeholder="Ajouter une tâche..." className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          <button onClick={addTask} className="p-2.5 rounded-xl bg-primary/10 text-primary"><Plus size={18} /></button>
        </div>
        <div className="glass-card divide-y divide-border">
          {tasks.map(t => (
            <button key={t.id} onClick={() => toggle(t.id)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
              <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${t.done ? 'bg-primary border-primary' : 'border-border'}`}>
                {t.done && <Check size={12} className="text-primary-foreground" />}
              </div>
              <span className={`text-sm flex-1 ${t.done ? 'line-through text-muted-foreground' : ''}`}>{t.text}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: `hsl(${priorityColors[t.priority]} / 0.12)`, color: `hsl(${priorityColors[t.priority]})` }}>
                {t.priority}
              </span>
              {t.activity && <span className="text-[10px] text-muted-foreground">{t.activity}</span>}
            </button>
          ))}
        </div>
      </div>
      <FeedbackButton context="tasks" />
    </div>
  );
};

export default TasksPlugin;
