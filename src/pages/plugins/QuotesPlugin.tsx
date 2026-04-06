import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import { Plus, ChevronRight, ChevronLeft, FileText, Receipt, ArrowRightLeft, CreditCard, Filter } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  Brouillon: "0 0% 50%", Envoyé: "217 91% 60%", Accepté: "142 71% 45%", Payé: "38 50% 58%", "En retard": "0 72% 51%",
};
const statuses = ["Brouillon", "Envoyé", "Accepté", "Payé", "En retard"];

const QuotesPlugin = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"devis" | "factures" | "paiements">("devis");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [amount, setAmount] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState<any>(null);

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

  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data } = await supabase.from("payments").select("*, invoices(title, invoice_number)").order("created_at", { ascending: false });
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

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, type }: { id: string; status: string; type: "quotes" | "invoices" }) => {
      await supabase.from(type).update({ status }).eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      if (selectedItem) setSelectedItem({ ...selectedItem, status: selectedItem._newStatus });
    },
  });

  const convertToInvoice = useMutation({
    mutationFn: async (quote: any) => {
      if (!user) return;
      const num = `F-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, "0")}`;
      await supabase.from("invoices").insert({
        user_id: user.id, invoice_number: num, title: quote.title,
        client: quote.client, amount: quote.amount, quote_id: quote.id,
      });
      await supabase.from("quotes").update({ status: "Accepté" }).eq("id", quote.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setSelectedItem(null);
      toast.success("Converti en facture !");
    },
  });

  const addPayment = useMutation({
    mutationFn: async (invoice: any) => {
      if (!user || !invoice.amount) return;
      await supabase.from("payments").insert({
        user_id: user.id, invoice_id: invoice.id, amount: invoice.amount, status: "Payé", paid_at: new Date().toISOString(),
      });
      await supabase.from("invoices").update({ status: "Payé" }).eq("id", invoice.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      setSelectedItem(null);
      toast.success("Paiement enregistré !");
    },
  });

  const items = tab === "devis" ? quotes : tab === "factures" ? invoices : [];
  const filtered = statusFilter === "all" ? items : items.filter((i: any) => i.status === statusFilter);

  const formatDate = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

  // ── Detail view ──
  if (selectedItem) {
    const isQuote = !!selectedItem.quote_number;
    return (
      <div className="fade-in">
        <PageHeader title={isQuote ? "Détail devis" : "Détail facture"} back
          action={<button onClick={() => setSelectedItem(null)} className="p-2 rounded-xl bg-secondary text-muted-foreground"><ChevronLeft size={18} /></button>} />
        <div className="px-4 md:px-0 space-y-4">
          <div className="glass-card-glow p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold font-heading">{selectedItem.title}</h2>
              <span className="text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: `hsl(${statusColors[selectedItem.status] || "0 0% 50%"} / 0.12)`, color: `hsl(${statusColors[selectedItem.status] || "0 0% 50%"})` }}>
                {selectedItem.status}
              </span>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>N° : {selectedItem.quote_number || selectedItem.invoice_number}</p>
              {selectedItem.client && <p>Client : {selectedItem.client}</p>}
              {selectedItem.amount && <p>Montant : {Number(selectedItem.amount).toLocaleString("fr-FR")} €</p>}
              <p>Créé le : {formatDate(selectedItem.created_at)}</p>
            </div>
          </div>

          {/* Status change */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Changer le statut</p>
            <div className="flex flex-wrap gap-1.5">
              {statuses.map(s => (
                <button key={s} onClick={() => {
                  updateStatus.mutate({ id: selectedItem.id, status: s, type: isQuote ? "quotes" : "invoices" });
                  setSelectedItem({ ...selectedItem, status: s });
                }}
                  className={`text-xs px-3 py-1.5 rounded-full transition-colors ${selectedItem.status === s ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          {isQuote && selectedItem.status !== "Accepté" && selectedItem.status !== "Payé" && (
            <button onClick={() => convertToInvoice.mutate(selectedItem)} className="w-full btn-primary-glow py-3 text-sm flex items-center justify-center gap-2">
              <ArrowRightLeft size={16} /> Convertir en facture
            </button>
          )}
          {!isQuote && selectedItem.status !== "Payé" && (
            <button onClick={() => addPayment.mutate(selectedItem)} className="w-full btn-primary-glow py-3 text-sm flex items-center justify-center gap-2">
              <CreditCard size={16} /> Marquer comme payé
            </button>
          )}
        </div>
        <FeedbackButton context="quotes" />
      </div>
    );
  }

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

        {/* Tabs */}
        <div className="flex gap-1.5 mb-3">
          {[
            { id: "devis" as const, label: "Devis", icon: FileText },
            { id: "factures" as const, label: "Factures", icon: Receipt },
            { id: "paiements" as const, label: "Paiements", icon: CreditCard },
          ].map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setStatusFilter("all"); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-colors ${tab === t.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        {tab !== "paiements" && (
          <div className="flex gap-1 overflow-x-auto mb-4">
            {["all", ...statuses].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors ${statusFilter === s ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
                {s === "all" ? "Tout" : s}
              </button>
            ))}
          </div>
        )}

        {/* Payments tab */}
        {tab === "paiements" ? (
          payments.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <p className="text-sm text-muted-foreground">Aucun paiement</p>
            </div>
          ) : (
            <div className="glass-card divide-y divide-border">
              {payments.map((p: any) => (
                <div key={p.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{p.invoices?.title || "—"}</div>
                    <div className="text-[10px] text-muted-foreground">{p.invoices?.invoice_number} · {p.method || "—"} · {p.paid_at ? formatDate(p.paid_at) : "—"}</div>
                  </div>
                  <span className="text-sm font-semibold">{Number(p.amount).toLocaleString("fr-FR")} €</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success">{p.status}</span>
                </div>
              ))}
            </div>
          )
        ) : filtered.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-sm text-muted-foreground">{tab === "devis" ? "Aucun devis" : "Aucune facture"}</p>
            <p className="text-xs text-muted-foreground mt-1">Cliquez sur + pour en créer</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((item: any) => (
              <button key={item.id} onClick={() => setSelectedItem(item)} className="w-full glass-card p-4 flex items-center gap-3 text-left hover:border-primary/20 transition-all">
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold">{item.title}</span>
                    <span className="text-[10px] text-muted-foreground">{item.quote_number || item.invoice_number}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{item.client && `${item.client} · `}{formatDate(item.created_at)}</div>
                </div>
                {item.amount && <span className="text-sm font-semibold">{Number(item.amount).toLocaleString("fr-FR")} €</span>}
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: `hsl(${statusColors[item.status] || "0 0% 50%"} / 0.12)`, color: `hsl(${statusColors[item.status] || "0 0% 50%"})` }}>
                  {item.status}
                </span>
                <ChevronRight size={16} className="text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>
      <FeedbackButton context="quotes" />
    </div>
  );
};

export default QuotesPlugin;
