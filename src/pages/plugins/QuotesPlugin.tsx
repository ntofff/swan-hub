import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import {
  Plus, ChevronRight, ChevronLeft, FileText, Receipt, CreditCard,
  ArrowRightLeft, Users, BarChart3, Download, Share2, Copy, Mail,
  MessageSquare, Phone, Search, Trash2, Edit2, Check, X
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  Brouillon: "0 0% 50%", Envoyé: "217 91% 60%", Accepté: "142 71% 45%",
  Payé: "38 50% 58%", "En retard": "0 72% 51%", "En attente": "38 92% 50%",
};
const statuses = ["Brouillon", "Envoyé", "Accepté", "Payé", "En retard"];

type Tab = "devis" | "factures" | "paiements" | "clients" | "dashboard";

const inputCls = "w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary";

const QuotesPlugin = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("devis");
  const [showForm, setShowForm] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState("");
  const [amount, setAmount] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");

  // Client form
  const [cName, setCName] = useState("");
  const [cSiret, setCSiret] = useState("");
  const [cAddr, setCAddr] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [editingClient, setEditingClient] = useState<any>(null);

  // Export
  const [showExport, setShowExport] = useState(false);
  const [exportSections, setExportSections] = useState({ devis: true, factures: true, paiements: true, clients: false });
  const [showShare, setShowShare] = useState(false);

  // ── Queries ──
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"], queryFn: async () => {
      const { data } = await supabase.from("clients").select("*").order("name");
      return data ?? [];
    }, enabled: !!user,
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ["quotes"], queryFn: async () => {
      const { data } = await supabase.from("quotes").select("*, clients(name, siret, address)").order("created_at", { ascending: false });
      return data ?? [];
    }, enabled: !!user,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"], queryFn: async () => {
      const { data } = await supabase.from("invoices").select("*, clients(name, siret, address)").order("created_at", { ascending: false });
      return data ?? [];
    }, enabled: !!user,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["payments"], queryFn: async () => {
      const { data } = await supabase.from("payments").select("*, invoices(title, invoice_number, client, client_id, clients(name))").order("created_at", { ascending: false });
      return data ?? [];
    }, enabled: !!user,
  });

  // ── Mutations ──
  const addQuote = useMutation({
    mutationFn: async () => {
      if (!user || !title.trim()) return;
      const num = `D-${new Date().getFullYear()}-${String(quotes.length + 1).padStart(3, "0")}`;
      const cl = clients.find((c: any) => c.id === clientId);
      await supabase.from("quotes").insert({
        user_id: user.id, quote_number: num, title: title.trim(),
        client: cl?.name || null, client_id: clientId || null,
        amount: amount ? parseFloat(amount) : null,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quotes"] }); setTitle(""); setClientId(""); setAmount(""); setShowForm(false); toast.success("Devis créé !"); },
  });

  const addClient = useMutation({
    mutationFn: async () => {
      if (!user || !cName.trim()) return;
      if (editingClient) {
        await supabase.from("clients").update({ name: cName.trim(), siret: cSiret || null, address: cAddr || null, email: cEmail || null, phone: cPhone || null }).eq("id", editingClient.id);
      } else {
        await supabase.from("clients").insert({ user_id: user.id, name: cName.trim(), siret: cSiret || null, address: cAddr || null, email: cEmail || null, phone: cPhone || null });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clients"] }); resetClientForm(); toast.success(editingClient ? "Client modifié !" : "Client ajouté !"); },
  });

  const deleteClient = useMutation({
    mutationFn: async (id: string) => { await supabase.from("clients").delete().eq("id", id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clients"] }); toast.success("Client supprimé"); },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, type }: { id: string; status: string; type: "quotes" | "invoices" }) => {
      await supabase.from(type).update({ status }).eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quotes"] }); qc.invalidateQueries({ queryKey: ["invoices"] }); },
  });

  const convertToInvoice = useMutation({
    mutationFn: async (quote: any) => {
      if (!user) return;
      const num = `F-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, "0")}`;
      await supabase.from("invoices").insert({
        user_id: user.id, invoice_number: num, title: quote.title,
        client: quote.client, client_id: quote.client_id, amount: quote.amount, quote_id: quote.id,
      });
      await supabase.from("quotes").update({ status: "Accepté" }).eq("id", quote.id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quotes"] }); qc.invalidateQueries({ queryKey: ["invoices"] }); setSelectedItem(null); toast.success("Converti en facture !"); },
  });

  const addPayment = useMutation({
    mutationFn: async (invoice: any) => {
      if (!user || !invoice.amount) return;
      await supabase.from("payments").insert({ user_id: user.id, invoice_id: invoice.id, amount: invoice.amount, status: "Payé", paid_at: new Date().toISOString() });
      await supabase.from("invoices").update({ status: "Payé" }).eq("id", invoice.id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoices"] }); qc.invalidateQueries({ queryKey: ["payments"] }); setSelectedItem(null); toast.success("Paiement enregistré !"); },
  });

  const deleteItem = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: "quotes" | "invoices" }) => {
      await supabase.from(type).delete().eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quotes"] }); qc.invalidateQueries({ queryKey: ["invoices"] }); setSelectedItem(null); toast.success("Supprimé"); },
  });

  // ── Helpers ──
  const resetClientForm = () => { setCName(""); setCSiret(""); setCAddr(""); setCEmail(""); setCPhone(""); setEditingClient(null); setShowClientForm(false); };
  const editClient = (c: any) => { setCName(c.name); setCSiret(c.siret || ""); setCAddr(c.address || ""); setCEmail(c.email || ""); setCPhone(c.phone || ""); setEditingClient(c); setShowClientForm(true); };
  const formatDate = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  const fmtAmount = (n: number) => Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2 }) + " €";
  const getClientName = (item: any) => item.clients?.name || item.client || "";

  // ── Dashboard stats ──
  const stats = useMemo(() => {
    const now = new Date();
    let start: Date;
    if (period === "week") { start = new Date(now); start.setDate(now.getDate() - 7); }
    else if (period === "month") { start = new Date(now.getFullYear(), now.getMonth(), 1); }
    else { start = new Date(now.getFullYear(), 0, 1); }

    const periodInvoices = invoices.filter((i: any) => new Date(i.created_at) >= start);
    const periodPayments = payments.filter((p: any) => new Date(p.created_at) >= start);

    const sent = periodInvoices.filter((i: any) => i.status === "Envoyé").length;
    const pending = periodInvoices.filter((i: any) => ["Envoyé", "En retard", "Accepté"].includes(i.status));
    const paid = periodInvoices.filter((i: any) => i.status === "Payé");
    const totalPaid = paid.reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0);
    const totalPending = pending.reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0);
    const totalAll = periodInvoices.reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0);

    // By client
    const byClient: Record<string, number> = {};
    periodInvoices.forEach((i: any) => {
      const name = i.clients?.name || i.client || "Sans client";
      byClient[name] = (byClient[name] || 0) + (Number(i.amount) || 0);
    });

    return { sent, pending: pending.length, paid: paid.length, totalPaid, totalPending, totalAll, byClient, total: periodInvoices.length };
  }, [invoices, payments, period]);

  // ── Filtered items ──
  const items = tab === "devis" ? quotes : tab === "factures" ? invoices : [];
  const filtered = useMemo(() => {
    let list = statusFilter === "all" ? items : items.filter((i: any) => i.status === statusFilter);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((i: any) => (i.title?.toLowerCase().includes(s) || getClientName(i).toLowerCase().includes(s) || (i.quote_number || i.invoice_number || "").toLowerCase().includes(s)));
    }
    return list;
  }, [items, statusFilter, search]);

  // ── Export handlers ──
  const handleExport = async (format: "pdf" | "csv") => {
    const exportItems: any[] = [];
    if (exportSections.devis) quotes.forEach((q: any) => exportItems.push({ ...q, client_name: getClientName(q), siret: q.clients?.siret, address: q.clients?.address }));
    if (exportSections.factures) invoices.forEach((i: any) => exportItems.push({ ...i, client_name: getClientName(i), siret: i.clients?.siret, address: i.clients?.address }));
    if (exportItems.length === 0) { toast.error("Aucune donnée à exporter"); return; }

    toast.loading("Export en cours...");
    try {
      const { data, error } = await supabase.functions.invoke("export-quotes", {
        body: { items: exportItems, title: "Devis & Factures", format },
      });
      if (error) throw error;
      const b64 = format === "csv" ? data.csv_base64 : data.pdf_base64;
      const mime = format === "csv" ? "text/csv" : "application/pdf";
      const ext = format === "csv" ? "csv" : "pdf";
      const blob = new Blob([Uint8Array.from(atob(b64), c => c.charCodeAt(0))], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `export-devis-factures.${ext}`; a.click();
      URL.revokeObjectURL(url);
      toast.dismiss(); toast.success(`Export ${ext.toUpperCase()} téléchargé !`);
    } catch { toast.dismiss(); toast.error("Erreur lors de l'export"); }
    setShowExport(false);
  };

  const handleShare = (method: "copy" | "email" | "sms" | "whatsapp") => {
    const lines: string[] = [];
    if (exportSections.devis) quotes.forEach((q: any) => lines.push(`${q.quote_number} - ${q.title} - ${getClientName(q)} - ${q.amount ? fmtAmount(q.amount) : "-"} - ${q.status}`));
    if (exportSections.factures) invoices.forEach((i: any) => lines.push(`${i.invoice_number} - ${i.title} - ${getClientName(i)} - ${i.amount ? fmtAmount(i.amount) : "-"} - ${i.status}`));
    if (exportSections.paiements) payments.forEach((p: any) => lines.push(`Paiement ${p.invoices?.invoice_number || ""} - ${fmtAmount(p.amount)} - ${p.status}`));
    const text = "SWAN — Devis & Factures\n\n" + lines.join("\n");

    if (method === "copy") { navigator.clipboard.writeText(text); toast.success("Copié !"); }
    else if (method === "email") window.open(`mailto:?subject=${encodeURIComponent("Devis & Factures")}&body=${encodeURIComponent(text)}`);
    else if (method === "sms") window.open(`sms:?body=${encodeURIComponent(text)}`);
    else if (method === "whatsapp") window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
    setShowShare(false);
  };

  // ══════════════════════ DETAIL VIEW ══════════════════════
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
              {getClientName(selectedItem) && <p>Client : {getClientName(selectedItem)}</p>}
              {selectedItem.clients?.siret && <p>SIRET : {selectedItem.clients.siret}</p>}
              {selectedItem.clients?.address && <p>Adresse : {selectedItem.clients.address}</p>}
              {selectedItem.amount && <p>Montant : {fmtAmount(selectedItem.amount)}</p>}
              <p>Créé le : {formatDate(selectedItem.created_at)}</p>
            </div>
          </div>

          {/* Status change */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Changer le statut</p>
            <div className="flex flex-wrap gap-1.5">
              {statuses.map(s => (
                <button key={s} onClick={() => {
                  if (!window.confirm(`Changer le statut en "${s}" ?`)) return;
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
          <div className="space-y-2">
            {isQuote && selectedItem.status !== "Accepté" && selectedItem.status !== "Payé" && (
              <button onClick={() => { if (window.confirm("Convertir ce devis en facture ?")) convertToInvoice.mutate(selectedItem); }}
                className="w-full btn-primary-glow py-3 text-sm flex items-center justify-center gap-2">
                <ArrowRightLeft size={16} /> Convertir en facture
              </button>
            )}
            {!isQuote && selectedItem.status !== "Payé" && (
              <button onClick={() => { if (window.confirm("Marquer cette facture comme payée ?")) addPayment.mutate(selectedItem); }}
                className="w-full btn-primary-glow py-3 text-sm flex items-center justify-center gap-2">
                <CreditCard size={16} /> Marquer comme payé
              </button>
            )}
            <button onClick={() => {
              if (window.confirm(`Supprimer ce ${isQuote ? "devis" : "facture"} définitivement ?`))
                deleteItem.mutate({ id: selectedItem.id, type: isQuote ? "quotes" : "invoices" });
            }} className="w-full py-2.5 text-sm rounded-xl bg-destructive/10 text-destructive flex items-center justify-center gap-2">
              <Trash2 size={16} /> Supprimer
            </button>
          </div>
        </div>
        <FeedbackButton context="quotes" />
      </div>
    );
  }

  // ══════════════════════ MAIN VIEW ══════════════════════
  return (
    <div className="fade-in">
      <PageHeader title="Devis & Factures" subtitle="Facturation & paiements" back
        action={
          <div className="flex gap-1.5">
            <button onClick={() => setShowExport(!showExport)} className="p-2 rounded-xl bg-secondary text-muted-foreground"><Download size={18} /></button>
            <button onClick={() => setShowShare(!showShare)} className="p-2 rounded-xl bg-secondary text-muted-foreground"><Share2 size={18} /></button>
            <button onClick={() => { if (tab === "clients") setShowClientForm(!showClientForm); else setShowForm(!showForm); }}
              className="p-2 rounded-xl bg-primary/10 text-primary"><Plus size={18} /></button>
          </div>
        } />
      <div className="px-4 md:px-0">

        {/* Export modal */}
        {showExport && (
          <div className="glass-card p-4 mb-4 space-y-3 slide-up">
            <p className="text-sm font-semibold">Sélectionner les rubriques</p>
            {(["devis", "factures", "paiements", "clients"] as const).map(k => (
              <label key={k} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={exportSections[k]} onChange={e => setExportSections({ ...exportSections, [k]: e.target.checked })} className="rounded" />
                {k.charAt(0).toUpperCase() + k.slice(1)}
              </label>
            ))}
            <div className="flex gap-2">
              <button onClick={() => handleExport("pdf")} className="flex-1 btn-primary-glow py-2 text-sm">Export PDF</button>
              <button onClick={() => handleExport("csv")} className="flex-1 py-2 text-sm rounded-xl bg-secondary text-foreground">Export Excel (CSV)</button>
            </div>
          </div>
        )}

        {/* Share modal */}
        {showShare && (
          <div className="glass-card p-4 mb-4 space-y-3 slide-up">
            <p className="text-sm font-semibold">Sélectionner & partager</p>
            {(["devis", "factures", "paiements"] as const).map(k => (
              <label key={k} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={exportSections[k]} onChange={e => setExportSections({ ...exportSections, [k]: e.target.checked })} className="rounded" />
                {k.charAt(0).toUpperCase() + k.slice(1)}
              </label>
            ))}
            <div className="grid grid-cols-4 gap-2">
              {[
                { m: "copy" as const, icon: Copy, label: "Copier" },
                { m: "email" as const, icon: Mail, label: "Email" },
                { m: "sms" as const, icon: MessageSquare, label: "SMS" },
                { m: "whatsapp" as const, icon: Phone, label: "WhatsApp" },
              ].map(s => (
                <button key={s.m} onClick={() => handleShare(s.m)} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-secondary text-xs">
                  <s.icon size={16} />{s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto mb-3">
          {([
            { id: "devis" as Tab, label: "Devis", icon: FileText },
            { id: "factures" as Tab, label: "Factures", icon: Receipt },
            { id: "paiements" as Tab, label: "Paiements", icon: CreditCard },
            { id: "clients" as Tab, label: "Clients", icon: Users },
            { id: "dashboard" as Tab, label: "Stats", icon: BarChart3 },
          ]).map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setStatusFilter("all"); setSearch(""); }}
              className={`flex items-center gap-1 px-3 py-2 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${tab === t.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {/* ── DASHBOARD TAB ── */}
        {tab === "dashboard" && (
          <div className="space-y-3">
            <div className="flex gap-1.5">
              {(["week", "month", "year"] as const).map(p => (
                <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 rounded-full text-xs ${period === p ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                  {p === "week" ? "Semaine" : p === "month" ? "Mois" : "Année"}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: "Factures envoyées", value: stats.sent, color: "217 91% 60%" },
                { label: "En attente", value: stats.pending, color: "38 92% 50%" },
                { label: "Payées", value: stats.paid, color: "142 71% 45%" },
                { label: "Total factures", value: stats.total, color: "0 0% 70%" },
              ].map(s => (
                <div key={s.label} className="glass-card p-3">
                  <p className="text-[10px] text-muted-foreground uppercase">{s.label}</p>
                  <p className="text-xl font-bold font-heading" style={{ color: `hsl(${s.color})` }}>{s.value}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="glass-card p-3">
                <p className="text-[10px] text-muted-foreground uppercase">Montant encaissé</p>
                <p className="text-lg font-bold text-primary">{fmtAmount(stats.totalPaid)}</p>
              </div>
              <div className="glass-card p-3">
                <p className="text-[10px] text-muted-foreground uppercase">À encaisser</p>
                <p className="text-lg font-bold" style={{ color: "hsl(38 92% 50%)" }}>{fmtAmount(stats.totalPending)}</p>
              </div>
            </div>
            {Object.keys(stats.byClient).length > 0 && (
              <div className="glass-card p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Montants par client</p>
                {Object.entries(stats.byClient).sort((a, b) => b[1] - a[1]).map(([name, total]) => (
                  <div key={name} className="flex justify-between text-sm">
                    <span>{name}</span>
                    <span className="font-semibold">{fmtAmount(total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CLIENTS TAB ── */}
        {tab === "clients" && (
          <div className="space-y-3">
            {showClientForm && (
              <div className="glass-card p-4 space-y-3 slide-up">
                <input value={cName} onChange={e => setCName(e.target.value)} placeholder="Nom du client *" className={inputCls} />
                <input value={cSiret} onChange={e => setCSiret(e.target.value)} placeholder="SIRET" className={inputCls} />
                <input value={cAddr} onChange={e => setCAddr(e.target.value)} placeholder="Adresse" className={inputCls} />
                <input value={cEmail} onChange={e => setCEmail(e.target.value)} placeholder="Email" type="email" className={inputCls} />
                <input value={cPhone} onChange={e => setCPhone(e.target.value)} placeholder="Téléphone" type="tel" className={inputCls} />
                <div className="flex gap-2">
                  <button onClick={() => addClient.mutate()} disabled={!cName.trim()} className="flex-1 btn-primary-glow py-2.5 text-sm disabled:opacity-40">
                    {editingClient ? "Modifier" : "Ajouter"}
                  </button>
                  <button onClick={resetClientForm} className="px-4 py-2.5 text-sm rounded-xl bg-secondary text-muted-foreground"><X size={16} /></button>
                </div>
              </div>
            )}
            {clients.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <p className="text-sm text-muted-foreground">Aucun client</p>
                <p className="text-xs text-muted-foreground mt-1">Cliquez sur + pour ajouter</p>
              </div>
            ) : (
              <div className="space-y-2">
                {clients.map((c: any) => (
                  <div key={c.id} className="glass-card p-4 flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {[c.siret, c.address, c.email, c.phone].filter(Boolean).join(" · ") || "Aucune info"}
                      </p>
                    </div>
                    <button onClick={() => editClient(c)} className="p-1.5 rounded-lg bg-secondary text-muted-foreground"><Edit2 size={14} /></button>
                    <button onClick={() => { if (window.confirm(`Supprimer le client "${c.name}" ?`)) deleteClient.mutate(c.id); }}
                      className="p-1.5 rounded-lg bg-destructive/10 text-destructive"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── DEVIS / FACTURES TABS ── */}
        {(tab === "devis" || tab === "factures") && (
          <>
            {/* New quote form */}
            {showForm && tab === "devis" && (
              <div className="glass-card p-4 mb-4 space-y-3 slide-up">
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre..." className={inputCls} />
                <select value={clientId} onChange={e => setClientId(e.target.value)} className={inputCls}>
                  <option value="">-- Client (optionnel) --</option>
                  {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Montant (€)" type="number" className={inputCls} />
                <button onClick={() => addQuote.mutate()} disabled={!title.trim()} className="w-full btn-primary-glow py-2.5 text-sm disabled:opacity-40">Créer le devis</button>
              </div>
            )}

            {/* Search */}
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
                className="w-full bg-secondary border border-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>

            {/* Status filter */}
            <div className="flex gap-1 overflow-x-auto mb-4">
              {["all", ...statuses].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors ${statusFilter === s ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
                  {s === "all" ? "Tout" : s}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
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
                      <div className="text-xs text-muted-foreground">{getClientName(item) && `${getClientName(item)} · `}{formatDate(item.created_at)}</div>
                    </div>
                    {item.amount && <span className="text-sm font-semibold">{fmtAmount(item.amount)}</span>}
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: `hsl(${statusColors[item.status] || "0 0% 50%"} / 0.12)`, color: `hsl(${statusColors[item.status] || "0 0% 50%"})` }}>
                      {item.status}
                    </span>
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── PAYMENTS TAB ── */}
        {tab === "paiements" && (
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
                    <div className="text-[10px] text-muted-foreground">
                      {p.invoices?.invoice_number} · {p.invoices?.clients?.name || p.invoices?.client || "—"} · {p.paid_at ? formatDate(p.paid_at) : "—"}
                    </div>
                  </div>
                  <span className="text-sm font-semibold">{fmtAmount(p.amount)}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{p.status}</span>
                </div>
              ))}
            </div>
          )
        )}
      </div>
      <FeedbackButton context="quotes" />
    </div>
  );
};

export default QuotesPlugin;
