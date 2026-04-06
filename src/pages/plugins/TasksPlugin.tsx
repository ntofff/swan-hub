import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import { Plus, Check } from "lucide-react";

interface Task { id: number; text: string; done: boolean; priority: string; activity?: string; }

const initialTasks: Task[] = [
  { id: 1, text: "Send updated proposal to client", done: false, priority: "high", activity: "Consulting" },
  { id: 2, text: "Review photo edits for wedding shoot", done: false, priority: "medium", activity: "Photography" },
  { id: 3, text: "Update vehicle insurance docs", done: true, priority: "low", activity: "Transport" },
  { id: 4, text: "Prepare Q2 financial summary", done: false, priority: "high" },
];

const priorityColors: Record<string, string> = { high: "0 72% 51%", medium: "38 92% 50%", low: "142 71% 45%" };

const TasksPlugin = () => {
  const [tasks, setTasks] = useState(initialTasks);
  const [input, setInput] = useState("");

  const toggle = (id: number) => setTasks(t => t.map(x => x.id === id ? { ...x, done: !x.done } : x));
  const addTask = () => {
    if (!input.trim()) return;
    setTasks(t => [{ id: Date.now(), text: input, done: false, priority: "medium" }, ...t]);
    setInput("");
  };

  return (
    <div className="fade-in">
      <PageHeader title="Tasks" subtitle="Simple task manager" back />
      <div className="px-4 md:px-0">
        <div className="flex gap-2 mb-4">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addTask()}
            placeholder="Add a task..." className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
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
