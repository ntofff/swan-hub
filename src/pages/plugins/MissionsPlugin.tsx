import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import { Plus, ChevronRight } from "lucide-react";

interface Mission {
  id: number; title: string; client: string; status: string; date: string; activity?: string;
}

const statusColors: Record<string, string> = {
  Actif: "217 91% 60%", Terminé: "142 71% 45%", Archivé: "0 0% 50%",
};

const sampleMissions: Mission[] = [
  { id: 1, title: "Refonte site web", client: "Acme Corp", status: "Actif", date: "6 avr. 2026", activity: "Consulting" },
  { id: 2, title: "Shooting photo rapport annuel", client: "TechStart", status: "Actif", date: "3 avr. 2026", activity: "Photographie" },
  { id: 3, title: "Inspection de flotte", client: "LogiTrans", status: "Terminé", date: "28 mars 2026", activity: "Transport" },
  { id: 4, title: "Atelier stratégie de marque", client: "InnoLab", status: "Archivé", date: "15 fév. 2026" },
];

const MissionsPlugin = () => {
  const [tab, setTab] = useState("tout");
  const tabMap: Record<string, string> = { actif: "Actif", terminé: "Terminé", archivé: "Archivé" };
  const filtered = tab === "tout" ? sampleMissions : sampleMissions.filter(m => m.status === tabMap[tab]);

  return (
    <div className="fade-in">
      <PageHeader title="Missions" subtitle="Gérer les affectations" back
        action={<button className="p-2 rounded-xl bg-primary/10 text-primary"><Plus size={18} /></button>} />
      <div className="px-4 md:px-0">
        <div className="flex gap-1.5 mb-4 overflow-x-auto">
          {["tout", "actif", "terminé", "archivé"].map(t => (
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
