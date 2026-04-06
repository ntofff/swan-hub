import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import { Plus, Search } from "lucide-react";

const sampleEntries = [
  { id: 1, text: "Réunion client au siège — objectifs Q3 discutés", time: "09:15", date: "Aujourd'hui" },
  { id: 2, text: "Inspection des équipements terminée", time: "11:30", date: "Aujourd'hui" },
  { id: 3, text: "Proposition de projet v2 soumise", time: "14:00", date: "Hier" },
  { id: 4, text: "Déplacement sur le site de Lyon — arrivé à l'heure", time: "08:00", date: "Hier" },
  { id: 5, text: "Briefing sécurité mensuel", time: "16:45", date: "3 avr." },
];

const LogbookPlugin = () => {
  const [search, setSearch] = useState("");

  return (
    <div className="fade-in">
      <PageHeader title="Journal de bord" subtitle="Entrées chronologiques" back
        action={<button className="p-2 rounded-xl bg-primary/10 text-primary"><Plus size={18} /></button>} />
      <div className="px-4 md:px-0">
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher des entrées..."
            className="w-full bg-secondary border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div className="glass-card divide-y divide-border">
          {sampleEntries.map(e => (
            <div key={e.id} className="px-4 py-3">
              <div className="text-sm">{e.text}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{e.date} · {e.time}</div>
            </div>
          ))}
        </div>
      </div>
      <FeedbackButton context="logbook" />
    </div>
  );
};

export default LogbookPlugin;
