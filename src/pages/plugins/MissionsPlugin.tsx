import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import { Plus, ChevronRight } from "lucide-react";

interface Mission {
  id: number; title: string; client: string; status: string; date: string; activity?: string;
}

const statusColors: Record<string, string> = {
  Active: "217 91% 60%", Completed: "142 71% 45%", Archived: "0 0% 50%",
};

const sampleMissions: Mission[] = [
  { id: 1, title: "Website Redesign", client: "Acme Corp", status: "Active", date: "Apr 6, 2026", activity: "Consulting" },
  { id: 2, title: "Annual Report Photography", client: "TechStart", status: "Active", date: "Apr 3, 2026", activity: "Photography" },
  { id: 3, title: "Fleet Inspection", client: "LogiTrans", status: "Completed", date: "Mar 28, 2026", activity: "Transport" },
  { id: 4, title: "Brand Strategy Workshop", client: "InnoLab", status: "Archived", date: "Feb 15, 2026" },
];

const MissionsPlugin = () => {
  const [tab, setTab] = useState("all");
  const filtered = tab === "all" ? sampleMissions : sampleMissions.filter(m => m.status.toLowerCase() === tab);

  return (
    <div className="fade-in">
      <PageHeader title="Missions" subtitle="Manage assignments" back
        action={<button className="p-2 rounded-xl bg-primary/10 text-primary"><Plus size={18} /></button>} />
      <div className="px-4 md:px-0">
        <div className="flex gap-1.5 mb-4 overflow-x-auto">
          {["all", "active", "completed", "archived"].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium capitalize transition-colors whitespace-nowrap ${tab === t ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>{t}</button>
          ))}
        </div>
        <div className="space-y-2.5">
          {filtered.map(m => (
            <div key={m.id} className="glass-card p-4 flex items-center gap-3">
              <div className="flex-1">
                <div className="text-sm font-semibold">{m.title}</div>
                <div className="text-xs text-muted-foreground">{m.client} · {m.date}</div>
                {m.activity && <span className="text-[10px] text-primary mt-1 inline-block">{m.activity}</span>}
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: `hsl(${statusColors[m.status]} / 0.12)`, color: `hsl(${statusColors[m.status]})` }}>
                {m.status}
              </span>
              <ChevronRight size={16} className="text-muted-foreground" />
            </div>
          ))}
        </div>
      </div>
      <FeedbackButton context="missions" />
    </div>
  );
};

export default MissionsPlugin;
