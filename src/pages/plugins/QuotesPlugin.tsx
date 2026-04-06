import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import { Plus, ChevronRight, FileText, Receipt } from "lucide-react";

const statusColors: Record<string, string> = {
  Draft: "0 0% 50%", Sent: "217 91% 60%", Accepted: "142 71% 45%", Paid: "38 50% 58%", Overdue: "0 72% 51%",
};

const quotes = [
  { id: "Q-2024-018", title: "Website Redesign", client: "Acme Corp", amount: "€4,500", status: "Sent", date: "Apr 5" },
  { id: "Q-2024-017", title: "Photography Pack", client: "TechStart", amount: "€1,200", status: "Accepted", date: "Apr 2" },
  { id: "Q-2024-016", title: "Consulting 3 days", client: "InnoLab", amount: "€2,700", status: "Draft", date: "Mar 30" },
];

const invoices = [
  { id: "INV-2024-012", title: "Fleet Inspection", client: "LogiTrans", amount: "€3,200", status: "Paid", date: "Mar 28" },
  { id: "INV-2024-011", title: "Brand Workshop", client: "InnoLab", amount: "€1,800", status: "Overdue", date: "Mar 15" },
];

const QuotesPlugin = () => {
  const [tab, setTab] = useState<"quotes" | "invoices">("quotes");
  const items = tab === "quotes" ? quotes : invoices;

  return (
    <div className="fade-in">
      <PageHeader title="Quotes & Invoices" subtitle="Billing & payments" back
        action={<button className="p-2 rounded-xl bg-primary/10 text-primary"><Plus size={18} /></button>} />
      <div className="px-4 md:px-0">
        <div className="flex gap-1.5 mb-4">
          <button onClick={() => setTab("quotes")} className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-colors ${tab === "quotes" ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
            <FileText size={14} /> Quotes
          </button>
          <button onClick={() => setTab("invoices")} className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-colors ${tab === "invoices" ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
            <Receipt size={14} /> Invoices
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
