import { useState, useMemo, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import {
  Plus, ChevronRight, ChevronLeft, FileText, Receipt, CreditCard,
  ArrowRightLeft, Users, BarChart3, Download, Share2, Copy, Mail,
  MessageSquare, Phone, Search, Trash2, Edit2, X, Settings, Palette, Check, Eye
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  Brouillon: "0 0% 50%", Envoyé: "217 91% 60%", Accepté: "142 71% 45%",
  Payé: "38 50% 58%", "En retard": "0 72% 51%",
};
const statuses = ["Brouillon", "Envoyé", "Accepté", "Payé", "En retard"];
const paymentMethods = ["Virement", "CB", "Espèces", "Chèque"];
const tvaMentions = [
  "TVA non applicable, art. 293 B du CGI",
  "Exonération de TVA, art. 261 du CGI",
  "Autoliquidation de la TVA",
  ""
];
const colorPalette = [
  "217 91% 60%", "142 71% 45%", "38 50% 58%", "0 72% 51%",
  "262 83% 58%", "199 89% 48%", "45 93% 47%", "330 81% 60%",
  "173 80% 40%", "0 0% 50%"
];

type Tab = "devis" | "factures" | "paiements" | "clients" | "dashboard" | "settings";

const inputCls = "w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary";
const labelCls = "text-[11px] font-medium text-muted-foreground uppercase tracking-wider";

const QuotesPlugin = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("devis");
  const [showForm, setShowForm] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");

  // Quote/Invoice form
  const [fTitle, setFTitle] = useState("");
  const [fClientId, setFClientId] = useState("");
  const [fAmountHt, setFAmountHt] = useState("");
  const [fPayment, setFPayment] = useState("");
  const [fTva, setFTva] = useState("");
  const [fColor, setFColor] = useState("");
  const [fDiscountType, setFDiscountType] = useState<"" | "percent" | "fixed">("");
  const [fDiscountValue, setFDiscountValue] = useState("");
  const [fShowRib, setFShowRib] = useState(false);
  const [fShowOptions, setFShowOptions] = useState(false);

  // Client form
  const [cName, setCName] = useState("");
  const [cSiret, setCSiret] = useState("");
  const [cAddr, setCAddr] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [editingClient, setEditingClient] = useState<any>(null);

  // Export/Share
  const [showExport, setShowExport] = useState(false);
  const [exportSections, setExportSections] = useState({ devis: true, factures: true, paiements: true, clients: false });
  const [showShare, setShowShare] = useState(false);

  // ── Queries ──
  const { data: settings } = useQuery({
    queryKey: ["invoice_settings"], queryFn: async () => {
      const { data } = await supabase.from("invoice_settings").select("*").maybeSingle();
      return data;
    }, enabled: !!user,
  });

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

  // ── Settings state ──
  const [sQuotePrefix, setSQuotePrefix] = useState("D");
  const [sQuoteCounter, setSQuoteCounter] = useState("1");
  const [sInvoicePrefix, setSInvoicePrefix] = useState("F");
  const [sInvoiceCounter, setSInvoiceCounter] = useState("1");
  const [sYearInNumber, setSYearInNumber] = useState(true);
  const [sIban, setSIban] = useState("");
  const [sBic, setSBic] = useState("");
  const [sBank, setSBank] = useState("");
  const [sHolder, setSHolder] = useState("");
  const [sDefaultTva, setSDefaultTva] = useState("");
  const [sDefaultPayment, setSDefaultPayment] = useState("");

  useEffect(() => {
    if (settings) {
      setSQuotePrefix(settings.quote_prefix || "D");
      setSQuoteCounter(String(settings.quote_counter || 1));
      setSInvoicePrefix(settings.invoice_prefix || "F");
      setSInvoiceCounter(String(settings.invoice_counter || 1));
      setSYearInNumber(settings.year_in_number ?? true);
      setSIban(settings.rib_iban || "");
      setSBic(settings.rib_bic || "");
      setSBank(settings.rib_bank || "");
      setSHolder(settings.rib_holder || "");
      setSDefaultTva(settings.default_tva_mention || "");
      setSDefaultPayment(settings.default_payment_method || "");
    }
  }, [settings]);

  // ── Mutations ──
  const saveSettings = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const payload = {
        user_id: user.id, quote_prefix: sQuotePrefix, quote_counter: parseInt(sQuoteCounter) || 1,
        invoice_prefix: sInvoicePrefix, invoice_counter: parseInt(sInvoiceCounter) || 1,
        year_in_number: sYearInNumber, rib_iban: sIban || null, rib_bic: sBic || null,
        rib_bank: sBank || null, rib_holder: sHolder || null,
        default_tva_mention: sDefaultTva || null, default_payment_method: sDefaultPayment || null,
      };
      if (settings?.id) {
        await supabase.from("invoice_settings").update(payload).eq("id", settings.id);
      } else {
        await supabase.from("invoice_settings").insert(payload);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoice_settings"] }); toast.success("Paramètres sauvegardés !"); },
  });

  const generateNumber = (type: "quote" | "invoice") => {
    const prefix = type === "quote" ? (settings?.quote_prefix || "D") : (settings?.invoice_prefix || "F");
    const counter = type === "quote" ? (settings?.quote_counter || quotes.length + 1) : (settings?.invoice_counter || invoices.length + 1);
    const year = (settings?.year_in_number ?? true) ? `-${new Date().getFullYear()}` : "";
    return `${prefix}${year}-${String(counter).padStart(3, "0")}`;
  };

  const calcFinal = () => {
    const ht = parseFloat(fAmountHt) || 0;
    if (!fDiscountType || !fDiscountValue) return ht;
    const dv = parseFloat(fDiscountValue) || 0;
    if (fDiscountType === "percent") return ht * (1 - dv / 100);
    return Math.max(0, ht - dv);
  };

  const addQuote = useMutation({
    mutationFn: async () => {
      if (!user || !fTitle.trim()) return;
      const num = generateNumber("quote");
      const cl = clients.find((c: any) => c.id === fClientId);
      const finalAmount = calcFinal();
      await supabase.from("quotes").insert({
        user_id: user.id, quote_number: num, title: fTitle.trim(),
        client: cl?.name || null, client_id: fClientId || null,
        amount: finalAmount || null, amount_ht: parseFloat(fAmountHt) || null,
        payment_method: fPayment || null, tva_mention: fTva || null,
        color: fColor || null,
        discount_type: fDiscountType || null, discount_value: parseFloat(fDiscountValue) || null,
      });
      // Increment counter
      if (settings?.id) {
        await supabase.from("invoice_settings").update({ quote_counter: (settings.quote_counter || 1) + 1 }).eq("id", settings.id);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quotes"] }); qc.invalidateQueries({ queryKey: ["invoice_settings"] }); resetForm(); toast.success("Devis créé !"); },
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

  const updateColor = useMutation({
    mutationFn: async ({ id, color, type }: { id: string; color: string; type: "quotes" | "invoices" }) => {
      await supabase.from(type).update({ color }).eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quotes"] }); qc.invalidateQueries({ queryKey: ["invoices"] }); },
  });

  const convertToInvoice = useMutation({
    mutationFn: async (quote: any) => {
      if (!user) return;
      const num = generateNumber("invoice");
      const ribDetails = (sIban || sBic) ? { iban: sIban, bic: sBic, bank: sBank, holder: sHolder } : null;
      await supabase.from("invoices").insert({
        user_id: user.id, invoice_number: num, title: quote.title,
        client: quote.client, client_id: quote.client_id, amount: quote.amount,
        amount_ht: quote.amount_ht, quote_id: quote.id, color: quote.color,
        payment_method: quote.payment_method, tva_mention: quote.tva_mention,
        discount_type: quote.discount_type, discount_value: quote.discount_value,
        rib_details: ribDetails,
      });
      await supabase.from("quotes").update({ status: "Accepté" }).eq("id", quote.id);
      if (settings?.id) {
        await supabase.from("invoice_settings").update({ invoice_counter: (settings.invoice_counter || 1) + 1 }).eq("id", settings.id);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quotes"] }); qc.invalidateQueries({ queryKey: ["invoices"] }); qc.invalidateQueries({ queryKey: ["invoice_settings"] }); setSelectedItem(null); toast.success("Converti en facture !"); },
  });

  const addPayment = useMutation({
    mutationFn: async ({ invoice, method }: { invoice: any; method: string }) => {
      if (!user || !invoice.amount) return;
      await supabase.from("payments").insert({ user_id: user.id, invoice_id: invoice.id, amount: invoice.amount, status: "Payé", method, paid_at: new Date().toISOString() });
      await supabase.from("invoices").update({ status: "Payé" }).eq("id", invoice.id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoices"] }); qc.invalidateQueries({ queryKey: ["payments"] }); setSelectedItem(null); setPayMethodPick(""); toast.success("Paiement enregistré !"); },
  });

  const deleteItem = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: "quotes" | "invoices" }) => {
      await supabase.from(type).delete().eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quotes"] }); qc.invalidateQueries({ queryKey: ["invoices"] }); setSelectedItem(null); toast.success("Supprimé"); },
  });

  const [payMethodPick, setPayMethodPick] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);

  // ── Helpers ──
  const resetForm = () => { setFTitle(""); setFClientId(""); setFAmountHt(""); setFPayment(""); setFTva(""); setFColor(""); setFDiscountType(""); setFDiscountValue(""); setFShowRib(false); setFShowOptions(false); setShowForm(false); };
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

    const pi = invoices.filter((i: any) => new Date(i.created_at) >= start);
    const sent = pi.filter((i: any) => i.status === "Envoyé").length;
    const pending = pi.filter((i: any) => ["Envoyé", "En retard", "Accepté"].includes(i.status));
    const paid = pi.filter((i: any) => i.status === "Payé");
    const totalPaid = paid.reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0);
    const totalPending = pending.reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0);

    const byClient: Record<string, number> = {};
    pi.forEach((i: any) => {
      const name = i.clients?.name || i.client || "Sans client";
      byClient[name] = (byClient[name] || 0) + (Number(i.amount) || 0);
    });

    return { sent, pending: pending.length, paid: paid.length, totalPaid, totalPending, byClient, total: pi.length };
  }, [invoices, period]);

  // ── Filtered ──
  const items = tab === "devis" ? quotes : tab === "factures" ? invoices : [];
  const filtered = useMemo(() => {
    let list = statusFilter === "all" ? items : items.filter((i: any) => i.status === statusFilter);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((i: any) => (i.title?.toLowerCase().includes(s) || getClientName(i).toLowerCase().includes(s) || (i.quote_number || i.invoice_number || "").toLowerCase().includes(s)));
    }
    return list;
  }, [items, statusFilter, search]);

  // ── Export ──
  const handleExport = async (format: "pdf" | "csv") => {
    const exportItems: any[] = [];
    if (exportSections.devis) quotes.forEach((q: any) => exportItems.push({ ...q, client_name: getClientName(q), siret: q.clients?.siret, address: q.clients?.address }));
    if (exportSections.factures) invoices.forEach((i: any) => exportItems.push({ ...i, client_name: getClientName(i), siret: i.clients?.siret, address: i.clients?.address }));
    if (exportItems.length === 0) { toast.error("Aucune donnée à exporter"); return; }
    toast.loading("Export en cours...");
    try {
      const { data, error } = await supabase.functions.invoke("export-quotes", { body: { items: exportItems, title: "Devis & Factures", format } });
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
    if (exportSections.paiements) payments.forEach((p: any) => lines.push(`Paiement ${p.invoices?.invoice_number || ""} - ${fmtAmount(p.amount)} - ${p.method || ""} - ${p.status}`));
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
          {/* Main card */}
          <div className="glass-card-glow p-5 space-y-3" style={selectedItem.color ? { borderLeft: `3px solid hsl(${selectedItem.color})` } : {}}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold font-heading">{selectedItem.title}</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowColorPicker(!showColorPicker)} className="p-1"><Palette size={14} className="text-muted-foreground" /></button>
                <span className="text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: `hsl(${statusColors[selectedItem.status] || "0 0% 50%"} / 0.12)`, color: `hsl(${statusColors[selectedItem.status] || "0 0% 50%"})` }}>
                  {selectedItem.status}
                </span>
              </div>
            </div>

            {showColorPicker && (
              <div className="flex flex-wrap gap-1.5">
                {colorPalette.map(c => (
                  <button key={c} onClick={() => {
                    updateColor.mutate({ id: selectedItem.id, color: c, type: isQuote ? "quotes" : "invoices" });
                    setSelectedItem({ ...selectedItem, color: c });
                    setShowColorPicker(false);
                  }} className="w-6 h-6 rounded-full border-2 transition-all" style={{ backgroundColor: `hsl(${c})`, borderColor: selectedItem.color === c ? "hsl(var(--primary))" : "transparent" }} />
                ))}
                <button onClick={() => {
                  updateColor.mutate({ id: selectedItem.id, color: "", type: isQuote ? "quotes" : "invoices" });
                  setSelectedItem({ ...selectedItem, color: null });
                  setShowColorPicker(false);
                }} className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-[10px] text-muted-foreground">✕</button>
              </div>
            )}

            <div className="text-sm text-muted-foreground space-y-1">
              <p>N° : {selectedItem.quote_number || selectedItem.invoice_number}</p>
              {getClientName(selectedItem) && <p>Client : {getClientName(selectedItem)}</p>}
              {selectedItem.clients?.siret && <p>SIRET : {selectedItem.clients.siret}</p>}
              {selectedItem.clients?.address && <p>Adresse : {selectedItem.clients.address}</p>}
              {selectedItem.amount_ht && <p>Montant HT : {fmtAmount(selectedItem.amount_ht)}</p>}
              {selectedItem.discount_type && (
                <p>Remise : {selectedItem.discount_type === "percent" ? `${selectedItem.discount_value}%` : fmtAmount(selectedItem.discount_value)}</p>
              )}
              {selectedItem.amount != null && <p className="font-semibold text-foreground">Total : {fmtAmount(selectedItem.amount)}</p>}
              {selectedItem.payment_method && <p>Encaissement : {selectedItem.payment_method}</p>}
              {selectedItem.tva_mention && <p className="italic text-xs">{selectedItem.tva_mention}</p>}
              {selectedItem.rib_details && (
                <div className="mt-2 p-2 bg-secondary rounded-lg text-xs space-y-0.5">
                  <p className="font-semibold text-foreground">RIB</p>
                  {selectedItem.rib_details.holder && <p>Titulaire : {selectedItem.rib_details.holder}</p>}
                  {selectedItem.rib_details.iban && <p>IBAN : {selectedItem.rib_details.iban}</p>}
                  {selectedItem.rib_details.bic && <p>BIC : {selectedItem.rib_details.bic}</p>}
                  {selectedItem.rib_details.bank && <p>Banque : {selectedItem.rib_details.bank}</p>}
                </div>
              )}
              <p>Créé le : {formatDate(selectedItem.created_at)}</p>
            </div>
          </div>

          {/* Status */}
          <div>
            <p className={`${labelCls} mb-2`}>Changer le statut</p>
            <div className="flex flex-wrap gap-1.5">
              {statuses.map(s => (
                <button key={s} onClick={() => {
                  if (!window.confirm(`Changer le statut en "${s}" ?`)) return;
                  updateStatus.mutate({ id: selectedItem.id, status: s, type: isQuote ? "quotes" : "invoices" });
                  setSelectedItem({ ...selectedItem, status: s });
                }} className={`text-xs px-3 py-1.5 rounded-full transition-colors ${selectedItem.status === s ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            {isQuote && !["Accepté", "Payé"].includes(selectedItem.status) && (
              <button onClick={() => { if (window.confirm("Convertir ce devis en facture ?")) convertToInvoice.mutate(selectedItem); }}
                className="w-full btn-primary-glow py-3 text-sm flex items-center justify-center gap-2">
                <ArrowRightLeft size={16} /> Convertir en facture
              </button>
            )}
            {!isQuote && selectedItem.status !== "Payé" && (
              <div className="space-y-2">
                <p className={`${labelCls}`}>Encaisser — choisir la modalité</p>
                <div className="flex flex-wrap gap-1.5">
                  {paymentMethods.map(m => (
                    <button key={m} onClick={() => setPayMethodPick(m)}
                      className={`text-xs px-3 py-1.5 rounded-full transition-colors ${payMethodPick === m ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                      {m}
                    </button>
                  ))}
                </div>
                {payMethodPick && (
                  <button onClick={() => { if (window.confirm(`Marquer comme payé par ${payMethodPick} ?`)) addPayment.mutate({ invoice: selectedItem, method: payMethodPick }); }}
                    className="w-full btn-primary-glow py-3 text-sm flex items-center justify-center gap-2">
                    <CreditCard size={16} /> Payé par {payMethodPick}
                  </button>
                )}
              </div>
            )}
            <button onClick={() => {
              if (window.confirm(`Supprimer ce ${isQuote ? "devis" : "cette facture"} définitivement ?`))
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
      <PageHeader title="Devis & Factures" subtitle="Facturation complète" back
        action={
          <div className="flex gap-1.5">
            <button onClick={() => setShowExport(!showExport)} className="p-2 rounded-xl bg-secondary text-muted-foreground"><Download size={18} /></button>
            <button onClick={() => setShowShare(!showShare)} className="p-2 rounded-xl bg-secondary text-muted-foreground"><Share2 size={18} /></button>
            <button onClick={() => { if (tab === "clients") setShowClientForm(!showClientForm); else if (tab !== "dashboard" && tab !== "settings") setShowForm(!showForm); }}
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
              <button onClick={() => handleExport("pdf")} className="flex-1 btn-primary-glow py-2 text-sm">PDF</button>
              <button onClick={() => handleExport("csv")} className="flex-1 py-2 text-sm rounded-xl bg-secondary text-foreground">Excel (CSV)</button>
            </div>
          </div>
        )}

        {/* Share modal */}
        {showShare && (
          <div className="glass-card p-4 mb-4 space-y-3 slide-up">
            <p className="text-sm font-semibold">Partager</p>
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
        <div className="flex gap-1 overflow-x-auto mb-3 pb-1">
          {([
            { id: "devis" as Tab, label: "Devis", icon: FileText },
            { id: "factures" as Tab, label: "Factures", icon: Receipt },
            { id: "paiements" as Tab, label: "Paiements", icon: CreditCard },
            { id: "clients" as Tab, label: "Clients", icon: Users },
            { id: "dashboard" as Tab, label: "Stats", icon: BarChart3 },
            { id: "settings" as Tab, label: "Réglages", icon: Settings },
          ]).map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setStatusFilter("all"); setSearch(""); }}
              className={`flex items-center gap-1 px-3 py-2 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${tab === t.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>

        {/* ═══ SETTINGS TAB ═══ */}
        {tab === "settings" && (
          <div className="space-y-4">
            {/* Numbering */}
            <div className="glass-card p-4 space-y-3">
              <p className="text-sm font-semibold">Numérotation</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className={labelCls}>Préfixe devis</p>
                  <input value={sQuotePrefix} onChange={e => setSQuotePrefix(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <p className={labelCls}>Prochain N°</p>
                  <input value={sQuoteCounter} onChange={e => setSQuoteCounter(e.target.value)} type="number" className={inputCls} />
                </div>
                <div>
                  <p className={labelCls}>Préfixe facture</p>
                  <input value={sInvoicePrefix} onChange={e => setSInvoicePrefix(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <p className={labelCls}>Prochain N°</p>
                  <input value={sInvoiceCounter} onChange={e => setSInvoiceCounter(e.target.value)} type="number" className={inputCls} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={sYearInNumber} onChange={e => setSYearInNumber(e.target.checked)} className="rounded" />
                Inclure l'année dans le numéro
              </label>
            </div>

            {/* RIB */}
            <div className="glass-card p-4 space-y-3">
              <p className="text-sm font-semibold">Coordonnées bancaires (RIB)</p>
              <input value={sHolder} onChange={e => setSHolder(e.target.value)} placeholder="Titulaire du compte" className={inputCls} />
              <input value={sIban} onChange={e => setSIban(e.target.value)} placeholder="IBAN" className={inputCls} />
              <input value={sBic} onChange={e => setSBic(e.target.value)} placeholder="BIC / SWIFT" className={inputCls} />
              <input value={sBank} onChange={e => setSBank(e.target.value)} placeholder="Nom de la banque" className={inputCls} />
            </div>

            {/* Defaults */}
            <div className="glass-card p-4 space-y-3">
              <p className="text-sm font-semibold">Valeurs par défaut</p>
              <div>
                <p className={labelCls}>Mention TVA</p>
                <select value={sDefaultTva} onChange={e => setSDefaultTva(e.target.value)} className={inputCls}>
                  <option value="">Aucune mention</option>
                  {tvaMentions.filter(Boolean).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <p className={labelCls}>Modalité d'encaissement</p>
                <select value={sDefaultPayment} onChange={e => setSDefaultPayment(e.target.value)} className={inputCls}>
                  <option value="">Non défini</option>
                  {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <button onClick={() => saveSettings.mutate()} className="w-full btn-primary-glow py-3 text-sm flex items-center justify-center gap-2">
              <Check size={16} /> Sauvegarder les réglages
            </button>
          </div>
        )}

        {/* ═══ DASHBOARD TAB ═══ */}
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
                { label: "Envoyées", value: stats.sent, color: "217 91% 60%" },
                { label: "En attente", value: stats.pending, color: "38 92% 50%" },
                { label: "Payées", value: stats.paid, color: "142 71% 45%" },
                { label: "Total", value: stats.total, color: "0 0% 70%" },
              ].map(s => (
                <div key={s.label} className="glass-card p-3">
                  <p className="text-[10px] text-muted-foreground uppercase">{s.label}</p>
                  <p className="text-xl font-bold font-heading" style={{ color: `hsl(${s.color})` }}>{s.value}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="glass-card p-3">
                <p className="text-[10px] text-muted-foreground uppercase">Encaissé</p>
                <p className="text-lg font-bold text-primary">{fmtAmount(stats.totalPaid)}</p>
              </div>
              <div className="glass-card p-3">
                <p className="text-[10px] text-muted-foreground uppercase">À encaisser</p>
                <p className="text-lg font-bold" style={{ color: "hsl(38 92% 50%)" }}>{fmtAmount(stats.totalPending)}</p>
              </div>
            </div>
            {Object.keys(stats.byClient).length > 0 && (
              <div className="glass-card p-4 space-y-2">
                <p className={labelCls}>Par client</p>
                {Object.entries(stats.byClient).sort((a, b) => b[1] - a[1]).map(([name, total]) => (
                  <div key={name} className="flex justify-between text-sm">
                    <span>{name}</span><span className="font-semibold">{fmtAmount(total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ CLIENTS TAB ═══ */}
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
                  <button onClick={() => addClient.mutate()} disabled={!cName.trim()} className="flex-1 btn-primary-glow py-2.5 text-sm disabled:opacity-40">{editingClient ? "Modifier" : "Ajouter"}</button>
                  <button onClick={resetClientForm} className="px-4 py-2.5 text-sm rounded-xl bg-secondary text-muted-foreground"><X size={16} /></button>
                </div>
              </div>
            )}
            {clients.length === 0 ? (
              <div className="glass-card p-8 text-center"><p className="text-sm text-muted-foreground">Aucun client</p></div>
            ) : clients.map((c: any) => (
              <div key={c.id} className="glass-card p-4 flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground">{[c.siret, c.email, c.phone].filter(Boolean).join(" · ") || "—"}</p>
                  {c.address && <p className="text-[10px] text-muted-foreground">{c.address}</p>}
                </div>
                <button onClick={() => editClient(c)} className="p-1.5 rounded-lg bg-secondary text-muted-foreground"><Edit2 size={14} /></button>
                <button onClick={() => { if (window.confirm(`Supprimer "${c.name}" ?`)) deleteClient.mutate(c.id); }}
                  className="p-1.5 rounded-lg bg-destructive/10 text-destructive"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}

        {/* ═══ DEVIS / FACTURES ═══ */}
        {(tab === "devis" || tab === "factures") && (
          <>
            {showForm && tab === "devis" && (
              <div className="glass-card p-4 mb-4 space-y-3 slide-up">
                <input value={fTitle} onChange={e => setFTitle(e.target.value)} placeholder="Titre du devis *" className={inputCls} />
                <select value={fClientId} onChange={e => setFClientId(e.target.value)} className={inputCls}>
                  <option value="">-- Client --</option>
                  {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input value={fAmountHt} onChange={e => setFAmountHt(e.target.value)} placeholder="Montant HT (€)" type="number" className={inputCls} />

                {/* Discount inline */}
                <div className="flex gap-2 items-center">
                  <select value={fDiscountType} onChange={e => setFDiscountType(e.target.value as any)} className={`${inputCls} flex-1`}>
                    <option value="">Pas de remise</option>
                    <option value="percent">Remise %</option>
                    <option value="fixed">Remise fixe (€)</option>
                  </select>
                  {fDiscountType && (
                    <input value={fDiscountValue} onChange={e => setFDiscountValue(e.target.value)} placeholder={fDiscountType === "percent" ? "%" : "€"} type="number" className={`${inputCls} w-24`} />
                  )}
                </div>

                {fAmountHt && (
                  <p className="text-xs text-muted-foreground">Total : <span className="font-semibold text-foreground">{fmtAmount(calcFinal())}</span></p>
                )}

                {/* Color */}
                <div>
                  <p className={`${labelCls} mb-1.5`}>Couleur</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {colorPalette.map(c => (
                      <button key={c} onClick={() => setFColor(fColor === c ? "" : c)}
                        className="w-6 h-6 rounded-full border-2 transition-all" style={{ backgroundColor: `hsl(${c})`, borderColor: fColor === c ? "hsl(var(--primary))" : "transparent" }} />
                    ))}
                  </div>
                </div>

                {/* More options toggle */}
                <button onClick={() => setFShowOptions(!fShowOptions)} className="text-xs text-primary">
                  {fShowOptions ? "Masquer les options" : "＋ Plus d'options"}
                </button>

                {fShowOptions && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <p className={labelCls}>Modalité d'encaissement</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {paymentMethods.map(m => (
                          <button key={m} onClick={() => setFPayment(fPayment === m ? "" : m)}
                            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${fPayment === m ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>{m}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className={labelCls}>Mention TVA</p>
                      <select value={fTva} onChange={e => setFTva(e.target.value)} className={inputCls}>
                        <option value="">Aucune</option>
                        {tvaMentions.filter(Boolean).map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={fShowRib} onChange={e => setFShowRib(e.target.checked)} className="rounded" />
                      Inclure le RIB sur la facture
                    </label>
                    {fShowRib && sIban && (
                      <p className="text-xs text-muted-foreground bg-secondary p-2 rounded-lg">
                        RIB : {sHolder} — IBAN {sIban} — BIC {sBic}
                      </p>
                    )}
                    {fShowRib && !sIban && (
                      <p className="text-xs text-destructive">Configurez votre RIB dans l'onglet Réglages</p>
                    )}
                  </div>
                )}

                <button onClick={() => addQuote.mutate()} disabled={!fTitle.trim()} className="w-full btn-primary-glow py-2.5 text-sm disabled:opacity-40">Créer le devis</button>
              </div>
            )}

            {/* Search + filters */}
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
                className="w-full bg-secondary border border-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
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
              </div>
            ) : (
              <div className="space-y-2.5">
                {filtered.map((item: any) => (
                  <button key={item.id} onClick={() => setSelectedItem(item)}
                    className="w-full glass-card p-4 flex items-center gap-3 text-left hover:border-primary/20 transition-all"
                    style={item.color ? { borderLeft: `3px solid hsl(${item.color})` } : {}}>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold">{item.title}</span>
                        <span className="text-[10px] text-muted-foreground">{item.quote_number || item.invoice_number}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {getClientName(item) && `${getClientName(item)} · `}{formatDate(item.created_at)}
                        {item.payment_method && ` · ${item.payment_method}`}
                      </div>
                    </div>
                    {item.amount != null && <span className="text-sm font-semibold">{fmtAmount(item.amount)}</span>}
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

        {/* ═══ PAYMENTS TAB ═══ */}
        {tab === "paiements" && (
          payments.length === 0 ? (
            <div className="glass-card p-8 text-center"><p className="text-sm text-muted-foreground">Aucun paiement</p></div>
          ) : (
            <div className="glass-card divide-y divide-border">
              {payments.map((p: any) => (
                <div key={p.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{p.invoices?.title || "—"}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {p.invoices?.invoice_number} · {p.invoices?.clients?.name || p.invoices?.client || "—"} · {p.method || "—"} · {p.paid_at ? formatDate(p.paid_at) : "—"}
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
