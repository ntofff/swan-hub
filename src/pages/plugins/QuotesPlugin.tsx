import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import { Plus, ChevronRight, FileText, Receipt } from "lucide-react";

const statusColors: Record<string, string> = {
  Brouillon: "0 0% 50%", Envoyé: "217 91% 60%", Accepté: "142 71% 45%", Payé: "38 50% 58%", "En retard": "0 72% 51%",
};

const quotes = [
  { id: "D-2024-018", title: "Refonte site web", client: "Acme Corp", amount: "4 500 €", status: "Envoyé", date: "5 avr." },
  { id: "D-2024-017", title: "Pack Photographie", client: "TechStart", amount: "1 200 €", status: "Accepté", date: "2 avr." },
  { id: "D-2024-016", title: "Consulting 3 jours", client: "InnoLab", amount: "2 700 €", status: "Brouillon", date: "30 mars" },
];

const invoices = [
  { id: "F-2024-012", title: "Inspection de flotte", client: "LogiTrans", amount: "3 200 €", status: "Payé", date: "28 mars" },
  { id: "F-2024-011", title: "Atelier marque", client: "InnoLab", amount: "1 800 €", status: "En retard", date: "15 mars" },
];

const QuotesPlugin = () => {
  const [tab, setTab] = useState<"devis" | "factures">("devis");
  const items = tab === "devis" ? quotes : invoices;

  return (
    <div className="fade-in">
      <PageHeader title="Devis & Factures" subtitle="Facturation & paiements" back
        action={<button className="p-2 rounded-xl bg-primary/10 text-primary"><Plus size={18} /></button>} />
      <div className="px-4 md:px-0">
        <div className="flex gap-1.5 mb-4">
          <button onClick={() => setTab("devis")} className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-colors ${tab === "devis" ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
            <FileText size={14} /> Devis
          </button>
          <button onClick={() => setTab("factures")} className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-colors ${tab === "factures" ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
            <Receipt size={14} /> Factures
          </button>
        </div>
        <div className="space-y-2.5">
          {items.map(item => (
            <div key={item.id} className="glass-card p-4 flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold">{item.title}</span>
                  <span className="text-[10px] text-muted-foreground">{item.id}</span>
                </div>
                <div className="text-xs text-muted-foreground">{item.client} · {item.date}</div>
              </div>
              <span className="text-sm font-semibold">{item.amount}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: `hsl(${statusColors[item.status]} / 0.12)`, color: `hsl(${statusColors[item.status]})` }}>
                {item.status}
              </span>
              <ChevronRight size={16} className="text-muted-foreground" />
            </div>
          ))}
        </div>
      </div>
      <FeedbackButton context="quotes" />
    </div>
  );
};

export default QuotesPlugin;
