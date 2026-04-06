import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import { Plus, ChevronRight, FileText, Receipt } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  Brouillon: "0 0% 50%", Envoyé: "217 91% 60%", Accepté: "142 71% 45%", Payé: "38 50% 58%", "En retard": "0 72% 51%",
};

const QuotesPlugin = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"devis" | "factures">("devis");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [amount, setAmount] = useState("");

  const { data: quotes = [] } = useQuery({
    queryKey: ["quotes"],
    queryFn: async () => {
      const { data } = await supabase.from("quotes").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data } = await supabase.from("invoices").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const addQuote = useMutation({
    mutationFn: async () => {
      if (!user || !title.trim()) return;
      const num = `D-${new Date().getFullYear()}-${String(quotes.length + 1).padStart(3, "0")}`;
      await supabase.from("quotes").insert({
        user_id: user.id, quote_number: num, title: title.trim(),
        client: client.trim() || null, amount: amount ? parseFloat(amount) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      setTitle(""); setClient(""); setAmount(""); setShowForm(false);
      toast.success("Devis créé !");
    },
  });

  const items = tab === "devis" ? quotes : invoices;

  return (
    <div className="fade-in">
      <PageHeader title="Devis & Factures" subtitle="Facturation & paiements" back
        action={<button onClick={() => setShowForm(!showForm)} className="p-2 rounded-xl bg-primary/10 text-primary"><Plus size={18} /></button>} />
      <div className="px-4 md:px-0">
        {showForm && (
          <div className="glass-card p-4 mb-4 space-y-3 slide-up">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre..."
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            <input value={client} onChange={e => setClient(e.target.value)} placeholder="Client"
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Montant (€)" type="number"
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            <button onClick={() => addQuote.mutate()} disabled={!title.trim()} className="w-full btn-primary-glow py-2.5 text-sm disabled:opacity-40">Créer le devis</button>
          </div>
        )}

        <div className="flex gap-1.5 mb-4">
          <button onClick={() => setTab("devis")} className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-colors ${tab === "devis" ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
            <FileText size={14} /> Devis
          </button>
          <button onClick={() => setTab("factures")} className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-colors ${tab === "factures" ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
            <Receipt size={14} /> Factures
          </button>
        </div>

        {items.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-sm text-muted-foreground">{tab === "devis" ? "Aucun devis" : "Aucune facture"}</p>
            <p className="text-xs text-muted-foreground mt-1">Cliquez sur + pour en créer</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {items.map((item: any) => (
              <div key={item.id} className="glass-card p-4 flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold">{item.title}</span>
                    <span className="text-[10px] text-muted-foreground">{item.quote_number || item.invoice_number}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{item.client && `${item.client} · `}{new Date(item.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</div>
                </div>
                {item.amount && <span className="text-sm font-semibold">{Number(item.amount).toLocaleString("fr-FR")} €</span>}
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: `hsl(${statusColors[item.status] || "0 0% 50%"} / 0.12)`, color: `hsl(${statusColors[item.status] || "0 0% 50%"})` }}>
                  {item.status}
                </span>
                <ChevronRight size={16} className="text-muted-foreground" />
              </div>
            ))}
          </div>
        )}
      </div>
      <FeedbackButton context="quotes" />
    </div>
  );
};

export default QuotesPlugin;
