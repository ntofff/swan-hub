import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import { Plus, Search } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const sampleEntries = [
  { id: 1, text: "Client meeting at HQ — discussed Q3 targets", time: "09:15", dateKey: "logbook.today" },
  { id: 2, text: "Equipment inspection completed", time: "11:30", dateKey: "logbook.today" },
  { id: 3, text: "Submitted project proposal v2", time: "14:00", dateKey: "home.yesterday" },
  { id: 4, text: "Travel to Lyon site — arrived on time", time: "08:00", dateKey: "home.yesterday" },
  { id: 5, text: "Monthly safety briefing", time: "16:45", date: "3 avr." },
];

const LogbookPlugin = () => {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");

  return (
    <div className="fade-in">
      <PageHeader title={t("logbook.title")} subtitle={t("logbook.subtitle")} back
        action={<button className="p-2 rounded-xl bg-primary/10 text-primary"><Plus size={18} /></button>} />
      <div className="px-4 md:px-0">
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("logbook.search")}
            className="w-full bg-secondary border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div className="glass-card divide-y divide-border">
          {sampleEntries.map(e => (
            <div key={e.id} className="px-4 py-3">
              <div className="text-sm">{e.text}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{e.dateKey ? t(e.dateKey) : e.date} · {e.time}</div>
            </div>
          ))}
        </div>
      </div>
      <FeedbackButton context="logbook" />
    </div>
  );
};

export default LogbookPlugin;
