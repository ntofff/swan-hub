import { useState, useMemo, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import {
  Plus, ChevronRight, ChevronLeft, FileText, Receipt, CreditCard,
  ArrowRightLeft, Users, BarChart3, Download, Share2, Copy, Mail,
  MessageSquare, Phone, Search, Trash2, Edit2, X, Settings, Palette, Check, Eye, Save, Send, Calendar
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
];
const colorPalette = [
  "217 91% 60%", "142 71% 45%", "38 50% 58%", "0 72% 51%",
  "262 83% 58%", "199 89% 48%", "45 93% 47%", "330 81% 60%",
  "173 80% 40%", "0 0% 50%"
];
const paymentTermsOptions = [15, 20, 30, 45, 60];
const tvaRateOptions = [{ label: "Sans TVA", value: 0 }, { label: "20%", value: 20 }, { label: "10%", value: 10 }, { label: "5.5%", value: 5.5 }];

type Tab = "devis" | "factures" | "paiements" | "clients" | "dashboard" | "settings";
type PeriodType = "week" | "month" | "year" | "custom";

const inputCls = "w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary";
const labelCls = "text-[11px] font-medium text-muted-foreground uppercase tracking-wider";

// ── Helpers ──
const fmtAmount = (n: number) => Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2 }) + " €";
const formatDate = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

const calcTtc = (ht: number, discountType: string, discountValue: number, tvaRate: number) => {
  let base = ht;
  if (discountType === "percent") base = ht * (1 - discountValue / 100);
  else if (discountType === "fixed") base = Math.max(0, ht - discountValue);
  const tva = base * (tvaRate / 100);
  return { htAfterDiscount: base, tvaAmount: tva, ttc: base + tva };
};

// ── Preview Component ──
const DocumentPreview = ({ item, settings, isQuote, onExportPdf, onShare }: any) => {
  const emitter = settings || {};
  const emitterName = [emitter.emitter_first_name, emitter.emitter_last_name].filter(Boolean).join(" ");
  const dueDate = item.payment_terms && item.issue_date
    ? new Date(new Date(item.issue_date).getTime() + item.payment_terms * 86400000).toLocaleDateString("fr-FR")
    : null;

  const ht = Number(item.amount_ht) || 0;
  const dType = item.discount_type || "";
  const dVal = Number(item.discount_value) || 0;
  const rate = Number(item.tva_rate) || 0;
  const { htAfterDiscount, tvaAmount, ttc } = calcTtc(ht, dType, dVal, rate);

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden relative" style={{ minHeight: 500 }}>
        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10" style={{ transform: "rotate(-35deg)" }}>
          <span className="text-[3rem] font-black tracking-widest uppercase select-none"
            style={{ color: `hsl(${statusColors[item.status] || "0 0% 50%"})`, opacity: 0.07, letterSpacing: "0.15em" }}>
            {item.status}
          </span>
        </div>

        <div className="p-5 text-gray-900 text-xs relative z-20 flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-start mb-5">
            <div className="space-y-0.5">
              {emitter.emitter_company && <p className="font-bold text-sm text-gray-800">{emitter.emitter_company}</p>}
              {emitterName && <p className="text-gray-600">{emitterName}</p>}
              {emitter.emitter_siret && <p className="text-gray-500">SIRET : {emitter.emitter_siret}</p>}
              {emitter.emitter_address && <p className="text-gray-500">{emitter.emitter_address}</p>}
              {emitter.emitter_email && <p className="text-gray-500">{emitter.emitter_email}</p>}
              {emitter.emitter_phone && <p className="text-gray-500">{emitter.emitter_phone}</p>}
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-800">{isQuote ? "DEVIS" : "FACTURE"}</p>
              <p className="text-gray-500 mt-0.5">{item.quote_number || item.invoice_number}</p>
              <p className="text-gray-400 text-[10px] mt-1">
                Émis le {new Date(item.issue_date || item.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </p>
              {item.period_description && <p className="text-gray-400 text-[10px]">Période : {item.period_description}</p>}
              <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `hsl(${statusColors[item.status] || "0 0% 50%"} / 0.12)`, color: `hsl(${statusColors[item.status] || "0 0% 50%"})` }}>
                {item.status}
              </span>
            </div>
          </div>

          {/* Client */}
          {(item.clients?.name || item.client) && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-[10px] uppercase text-gray-400 font-semibold tracking-wider mb-1">Destinataire</p>
              <p className="font-semibold text-sm text-gray-800">{item.clients?.name || item.client}</p>
              {item.clients?.siret && <p className="text-gray-500">SIRET : {item.clients.siret}</p>}
              {item.clients?.address && <p className="text-gray-500">{item.clients.address}</p>}
            </div>
          )}

          {/* Designation */}
          <div className="border-b border-gray-200 pb-1.5 mb-2 flex justify-between">
            <p className="text-[10px] uppercase text-gray-400 font-semibold tracking-wider">Désignation</p>
            <p className="text-[10px] uppercase text-gray-400 font-semibold tracking-wider">Montant</p>
          </div>
          <div className="flex justify-between items-start mb-1">
            <p className="font-medium text-sm text-gray-800 flex-1">{item.title}</p>
            {ht > 0 && <p className="text-gray-700 ml-4">{fmtAmount(ht)} HT</p>}
          </div>

          {dType && (
            <div className="flex justify-between text-gray-500 mb-1">
              <p>Remise ({dType === "percent" ? `${dVal}%` : "fixe"})</p>
              <p>-{dType === "percent" ? fmtAmount(ht * dVal / 100) : fmtAmount(dVal)}</p>
            </div>
          )}

          {/* Totals */}
          <div className="border-t border-gray-200 mt-3 pt-2 space-y-1">
            <div className="flex justify-between text-gray-600">
              <p>Total HT</p>
              <p>{fmtAmount(htAfterDiscount)}</p>
            </div>
            {rate > 0 ? (
              <div className="flex justify-between text-gray-600">
                <p>TVA ({rate}%)</p>
                <p>{fmtAmount(tvaAmount)}</p>
              </div>
            ) : item.tva_mention ? (
              <div className="flex justify-between text-gray-500 italic">
                <p className="text-[10px]">{item.tva_mention}</p>
                <p>0,00 €</p>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-gray-300 pt-2">
              <p className="font-bold text-sm text-gray-800">Total TTC</p>
              <p className="font-bold text-sm text-gray-800">{fmtAmount(ttc)}</p>
            </div>
          </div>

          {/* Notes */}
          {item.notes && (
            <div className="mt-3 p-2 bg-gray-50 rounded text-gray-600 text-[11px]">
              <p className="font-semibold text-gray-700 text-[10px] uppercase mb-0.5">Notes</p>
              {item.notes}
            </div>
          )}

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-gray-100 space-y-1.5 text-[10px] text-gray-500">
            {item.payment_method && <p>Modalité de paiement : <span className="font-medium text-gray-700">{item.payment_method}</span></p>}
            {item.payment_terms && <p>Délai de paiement : <span className="font-medium text-gray-700">{item.payment_terms} jours</span>{dueDate && ` (échéance : ${dueDate})`}</p>}
            {item.rib_details && (
              <div className="bg-gray-50 p-2 rounded mt-1">
                <p className="font-semibold text-gray-600 mb-0.5">Coordonnées bancaires</p>
                {item.rib_details.holder && <p>Titulaire : {item.rib_details.holder}</p>}
                {item.rib_details.iban && <p>IBAN : {item.rib_details.iban}</p>}
                {item.rib_details.bic && <p>BIC : {item.rib_details.bic}</p>}
                {item.rib_details.bank && <p>Banque : {item.rib_details.bank}</p>}
              </div>
            )}
            {emitter.default_legal_mentions && (
              <p className="text-[9px] text-gray-400 mt-2 leading-relaxed">{emitter.default_legal_mentions}</p>
            )}
            <p className="text-[9px] text-gray-300 text-center mt-2">Généré par SWAN</p>
          </div>
        </div>
      </div>

      {/* Actions under preview */}
      <div className="flex gap-2">
        <button onClick={onExportPdf} className="flex-1 btn-primary-glow py-2.5 text-sm flex items-center justify-center gap-2">
          <Download size={14} /> Enregistrer PDF
        </button>
        <button onClick={() => onShare("email")} className="p-2.5 rounded-xl bg-secondary text-muted-foreground"><Mail size={16} /></button>
        <button onClick={() => onShare("whatsapp")} className="p-2.5 rounded-xl bg-secondary text-muted-foreground"><Phone size={16} /></button>
        <button onClick={() => onShare("sms")} className="p-2.5 rounded-xl bg-secondary text-muted-foreground"><MessageSquare size={16} /></button>
        <button onClick={() => onShare("copy")} className="p-2.5 rounded-xl bg-secondary text-muted-foreground"><Copy size={16} /></button>
      </div>
    </div>
  );
};

const QuotesPlugin = () => {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("devis");
  const [showForm, setShowForm] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [period, setPeriod] = useState<PeriodType>("month");
  const [customStart, setCustomStart] = useState(new Date().toISOString().slice(0, 10));
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().slice(0, 10));

  // Form fields
  const [fTitle, setFTitle] = useState("");
  const [fClientId, setFClientId] = useState("");
  const [fAmountHt, setFAmountHt] = useState("");
  const [fPayment, setFPayment] = useState("");
  const [fTva, setFTva] = useState("");
  const [fTvaRate, setFTvaRate] = useState<number>(0);
  const [fTvaCustom, setFTvaCustom] = useState("");
  const [fColor, setFColor] = useState("");
  const [fDiscountType, setFDiscountType] = useState<"" | "percent" | "fixed">("");
  const [fDiscountValue, setFDiscountValue] = useState("");
  const [fShowRib, setFShowRib] = useState(false);
  const [fShowOptions, setFShowOptions] = useState(false);
  const [fNotes, setFNotes] = useState("");
  const [fIssueDate, setFIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [fPaymentTerms, setFPaymentTerms] = useState("");
  const [fPeriod, setFPeriod] = useState("");

  // Client form
  const [cName, setCName] = useState("");
  const [cSiret, setCSiret] = useState("");
  const [cAddr, setCAddr] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [editingClient, setEditingClient] = useState<any>(null);

  // UI states
  const [showExport, setShowExport] = useState(false);
  const [exportSections, setExportSections] = useState({ devis: true, factures: true, paiements: true, clients: false });
  const [showShare, setShowShare] = useState(false);
  const [payMethodPick, setPayMethodPick] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editingItem, setEditingItem] = useState(false);

  // Edit fields
  const [eNotes, setENotes] = useState("");
  const [ePayment, setEPayment] = useState("");
  const [eTva, setETva] = useState("");
  const [eTvaRate, setETvaRate] = useState<number>(0);
  const [eTvaCustom, setETvaCustom] = useState("");
  const [ePaymentTerms, setEPaymentTerms] = useState("");
  const [ePeriod, setEPeriod] = useState("");
  const [eIssueDate, setEIssueDate] = useState("");

  // Settings state
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
  const [sFirstName, setSFirstName] = useState("");
  const [sLastName, setSLastName] = useState("");
  const [sCompany, setSCompany] = useState("");
  const [sSiret, setSSiret] = useState("");
  const [sAddress, setSAddress] = useState("");
  const [sEmail, setSEmail] = useState("");
  const [sPhone, setSPhone] = useState("");
  const [sLegal, setSLegal] = useState("");

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

  useEffect(() => {
    if (settings) {
      setSQuotePrefix(settings.quote_prefix || "D");
      setSQuoteCounter(String(settings.quote_counter || 1));
      setSInvoicePrefix(settings.invoice_prefix || "F");
      setSInvoiceCounter(String(settings.invoice_counter || 1));
      setSYearInNumber(settings.year_in_number ?? true);
      setSIban(settings.rib_iban || ""); setSBic(settings.rib_bic || "");
      setSBank(settings.rib_bank || ""); setSHolder(settings.rib_holder || "");
      setSDefaultTva(settings.default_tva_mention || "");
      setSDefaultPayment(settings.default_payment_method || "");
      setSFirstName((settings as any).emitter_first_name || "");
      setSLastName((settings as any).emitter_last_name || "");
      setSCompany((settings as any).emitter_company || "");
      setSSiret((settings as any).emitter_siret || "");
      setSAddress((settings as any).emitter_address || "");
      setSEmail((settings as any).emitter_email || "");
      setSPhone((settings as any).emitter_phone || "");
      setSLegal((settings as any).default_legal_mentions || "");
    }
  }, [settings]);

  useEffect(() => {
    if (selectedItem) {
      setENotes(selectedItem.notes || "");
      setEPayment(selectedItem.payment_method || "");
      setETva(selectedItem.tva_mention || "");
      setETvaRate(Number(selectedItem.tva_rate) || 0);
      setETvaCustom("");
      setEPaymentTerms(String(selectedItem.payment_terms || ""));
      setEPeriod(selectedItem.period_description || "");
      setEIssueDate(selectedItem.issue_date || new Date().toISOString().slice(0, 10));
      setEditingItem(false);
      setShowPreview(false);
      setShowColorPicker(false);
    }
  }, [selectedItem]);

  // ── Mutations ──
  const saveSettings = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const payload: any = {
        user_id: user.id, quote_prefix: sQuotePrefix, quote_counter: parseInt(sQuoteCounter) || 1,
        invoice_prefix: sInvoicePrefix, invoice_counter: parseInt(sInvoiceCounter) || 1,
        year_in_number: sYearInNumber, rib_iban: sIban || null, rib_bic: sBic || null,
        rib_bank: sBank || null, rib_holder: sHolder || null,
        default_tva_mention: sDefaultTva || null, default_payment_method: sDefaultPayment || null,
        emitter_first_name: sFirstName || null, emitter_last_name: sLastName || null,
        emitter_company: sCompany || null, emitter_siret: sSiret || null,
        emitter_address: sAddress || null, emitter_email: sEmail || null,
        emitter_phone: sPhone || null, default_legal_mentions: sLegal || null,
      };
      if (settings?.id) {
        const { error } = await supabase.from("invoice_settings").update(payload).eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("invoice_settings").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoice_settings"] }); toast.success("Paramètres sauvegardés !"); },
    onError: (err: any) => { toast.error("Erreur : " + (err.message || "Impossible de sauvegarder")); },
  });

  const generateNumber = (type: "quote" | "invoice") => {
    const prefix = type === "quote" ? (settings?.quote_prefix || "D") : (settings?.invoice_prefix || "F");
    const counter = type === "quote" ? (settings?.quote_counter || quotes.length + 1) : (settings?.invoice_counter || invoices.length + 1);
    const year = (settings?.year_in_number ?? true) ? `-${new Date().getFullYear()}` : "";
    return `${prefix}${year}-${String(counter).padStart(3, "0")}`;
  };

  const getEffectiveTvaRate = (rateState: number, customState: string): number => {
    if (rateState === -1) return parseFloat(customState) || 0;
    return rateState;
  };

  const calcFinal = () => {
    const ht = parseFloat(fAmountHt) || 0;
    const rate = getEffectiveTvaRate(fTvaRate, fTvaCustom);
    const { ttc } = calcTtc(ht, fDiscountType, parseFloat(fDiscountValue) || 0, rate);
    return ttc;
  };

  const calcFinalHtAfterDiscount = () => {
    const ht = parseFloat(fAmountHt) || 0;
    const { htAfterDiscount } = calcTtc(ht, fDiscountType, parseFloat(fDiscountValue) || 0, 0);
    return htAfterDiscount;
  };

  const calcFinalTva = () => {
    const ht = parseFloat(fAmountHt) || 0;
    const rate = getEffectiveTvaRate(fTvaRate, fTvaCustom);
    const { tvaAmount } = calcTtc(ht, fDiscountType, parseFloat(fDiscountValue) || 0, rate);
    return tvaAmount;
  };

  const addQuote = useMutation({
    mutationFn: async () => {
      if (!user || !fTitle.trim()) return;
      const num = generateNumber("quote");
      const cl = clients.find((c: any) => c.id === fClientId);
      const rate = getEffectiveTvaRate(fTvaRate, fTvaCustom);
      const finalAmount = calcFinal();
      const { error } = await supabase.from("quotes").insert({
        user_id: user.id, quote_number: num, title: fTitle.trim(),
        client: cl?.name || null, client_id: fClientId || null,
        amount: finalAmount || null, amount_ht: parseFloat(fAmountHt) || null,
        payment_method: fPayment || null, tva_mention: fTva || null,
        tva_rate: rate || null,
        color: fColor || null,
        discount_type: fDiscountType || null, discount_value: parseFloat(fDiscountValue) || null,
        notes: fNotes || null, issue_date: fIssueDate || null,
        payment_terms: fPaymentTerms ? parseInt(fPaymentTerms) : null,
        period_description: fPeriod || null,
      });
      if (error) throw error;
      if (settings?.id) {
        await supabase.from("invoice_settings").update({ quote_counter: (settings.quote_counter || 1) + 1 }).eq("id", settings.id);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quotes"] }); qc.invalidateQueries({ queryKey: ["invoice_settings"] }); resetForm(); toast.success("Devis créé !"); },
    onError: (err: any) => { toast.error("Erreur : " + (err.message || "Impossible de créer le devis. Reconnectez-vous.")); },
  });

  const addClient = useMutation({
    mutationFn: async () => {
      if (!user || !cName.trim()) return;
      if (editingClient) {
        const { error } = await supabase.from("clients").update({ name: cName.trim(), siret: cSiret || null, address: cAddr || null, email: cEmail || null, phone: cPhone || null }).eq("id", editingClient.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clients").insert({ user_id: user.id, name: cName.trim(), siret: cSiret || null, address: cAddr || null, email: cEmail || null, phone: cPhone || null });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clients"] }); resetClientForm(); toast.success(editingClient ? "Client modifié !" : "Client ajouté !"); },
    onError: (err: any) => { toast.error("Erreur : " + (err.message || "Impossible d'enregistrer le client. Reconnectez-vous.")); },
  });

  const deleteClient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clients"] }); toast.success("Client supprimé"); },
    onError: (err: any) => { toast.error("Erreur : " + (err.message || "Impossible de supprimer")); },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, type }: { id: string; status: string; type: "quotes" | "invoices" }) => {
      const { error } = await supabase.from(type).update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quotes"] }); qc.invalidateQueries({ queryKey: ["invoices"] }); },
    onError: (err: any) => { toast.error("Erreur : " + (err.message || "Impossible de modifier le statut")); },
  });

  const updateColor = useMutation({
    mutationFn: async ({ id, color, type }: { id: string; color: string; type: "quotes" | "invoices" }) => {
      const { error } = await supabase.from(type).update({ color }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quotes"] }); qc.invalidateQueries({ queryKey: ["invoices"] }); },
    onError: (err: any) => { toast.error("Erreur : " + (err.message || "Impossible de modifier la couleur")); },
  });

  const updateItem = useMutation({
    mutationFn: async () => {
      if (!selectedItem) return;
      const type = selectedItem.quote_number ? "quotes" : "invoices";
      const rate = getEffectiveTvaRate(eTvaRate, eTvaCustom);
      const ht = Number(selectedItem.amount_ht) || 0;
      const dType = selectedItem.discount_type || "";
      const dVal = Number(selectedItem.discount_value) || 0;
      const { ttc } = calcTtc(ht, dType, dVal, rate);
      const { error } = await supabase.from(type).update({
        notes: eNotes || null, payment_method: ePayment || null,
        tva_mention: eTva || null, tva_rate: rate || null,
        amount: ttc || null,
        payment_terms: ePaymentTerms ? parseInt(ePaymentTerms) : null,
        period_description: ePeriod || null, issue_date: eIssueDate || null,
      }).eq("id", selectedItem.id);
      if (error) throw error;
    },
    onSuccess: () => {
      const rate = getEffectiveTvaRate(eTvaRate, eTvaCustom);
      const ht = Number(selectedItem.amount_ht) || 0;
      const dType = selectedItem.discount_type || "";
      const dVal = Number(selectedItem.discount_value) || 0;
      const { ttc } = calcTtc(ht, dType, dVal, rate);
      qc.invalidateQueries({ queryKey: ["quotes"] }); qc.invalidateQueries({ queryKey: ["invoices"] });
      setSelectedItem({ ...selectedItem, notes: eNotes, payment_method: ePayment, tva_mention: eTva, tva_rate: rate, amount: ttc, payment_terms: ePaymentTerms ? parseInt(ePaymentTerms) : null, period_description: ePeriod, issue_date: eIssueDate });
      setEditingItem(false);
      toast.success("Modifié !");
    },
    onError: (err: any) => { toast.error("Erreur : " + (err.message || "Impossible de modifier")); },
  });

  const convertToInvoice = useMutation({
    mutationFn: async (quote: any) => {
      if (!user) return;
      const num = generateNumber("invoice");
      const ribDetails = (sIban || sBic) ? { iban: sIban, bic: sBic, bank: sBank, holder: sHolder } : null;
      const { error } = await supabase.from("invoices").insert({
        user_id: user.id, invoice_number: num, title: quote.title,
        client: quote.client, client_id: quote.client_id, amount: quote.amount,
        amount_ht: quote.amount_ht, quote_id: quote.id, color: quote.color,
        payment_method: quote.payment_method, tva_mention: quote.tva_mention,
        tva_rate: quote.tva_rate,
        discount_type: quote.discount_type, discount_value: quote.discount_value,
        rib_details: ribDetails, notes: quote.notes, issue_date: new Date().toISOString().slice(0, 10),
        payment_terms: quote.payment_terms, period_description: quote.period_description,
      });
      if (error) throw error;
      await supabase.from("quotes").update({ status: "Accepté" }).eq("id", quote.id);
      if (settings?.id) {
        await supabase.from("invoice_settings").update({ invoice_counter: (settings.invoice_counter || 1) + 1 }).eq("id", settings.id);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quotes"] }); qc.invalidateQueries({ queryKey: ["invoices"] }); qc.invalidateQueries({ queryKey: ["invoice_settings"] }); setSelectedItem(null); toast.success("Converti en facture !"); },
    onError: (err: any) => { toast.error("Erreur : " + (err.message || "Impossible de convertir")); },
  });

  const addPayment = useMutation({
    mutationFn: async ({ invoice, method }: { invoice: any; method: string }) => {
      if (!user || !invoice.amount) return;
      const { error } = await supabase.from("payments").insert({ user_id: user.id, invoice_id: invoice.id, amount: invoice.amount, status: "Payé", method, paid_at: new Date().toISOString() });
      if (error) throw error;
      await supabase.from("invoices").update({ status: "Payé" }).eq("id", invoice.id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoices"] }); qc.invalidateQueries({ queryKey: ["payments"] }); setSelectedItem(null); setPayMethodPick(""); toast.success("Paiement enregistré !"); },
    onError: (err: any) => { toast.error("Erreur : " + (err.message || "Impossible d'enregistrer le paiement")); },
  });

  const deleteItem = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: "quotes" | "invoices" }) => {
      const { error } = await supabase.from(type).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quotes"] }); qc.invalidateQueries({ queryKey: ["invoices"] }); setSelectedItem(null); toast.success("Supprimé"); },
    onError: (err: any) => { toast.error("Erreur : " + (err.message || "Impossible de supprimer")); },
  });

  // ── Helpers ──
  const resetForm = () => { setFTitle(""); setFClientId(""); setFAmountHt(""); setFPayment(""); setFTva(""); setFTvaRate(0); setFTvaCustom(""); setFColor(""); setFDiscountType(""); setFDiscountValue(""); setFShowRib(false); setFShowOptions(false); setFNotes(""); setFIssueDate(new Date().toISOString().slice(0, 10)); setFPaymentTerms(""); setFPeriod(""); setShowForm(false); };
  const resetClientForm = () => { setCName(""); setCSiret(""); setCAddr(""); setCEmail(""); setCPhone(""); setEditingClient(null); setShowClientForm(false); };
  const editClientFn = (c: any) => { setCName(c.name); setCSiret(c.siret || ""); setCAddr(c.address || ""); setCEmail(c.email || ""); setCPhone(c.phone || ""); setEditingClient(c); setShowClientForm(true); };
  const getClientName = (item: any) => item.clients?.name || item.client || "";
  const profileName = profile?.full_name || [sFirstName, sLastName].filter(Boolean).join(" ") || "SWAN";

  // ── Single item export/share ──
  const generatePdfBlob = async (item: any): Promise<Blob | null> => {
    const isQ = !!item.quote_number;
    try {
      const { data, error } = await supabase.functions.invoke("export-quotes", {
        body: { items: [{ ...item, client_name: getClientName(item), siret: item.clients?.siret, address: item.clients?.address }], title: isQ ? "Devis" : "Facture", format: "pdf" },
      });
      if (error) throw error;
      return new Blob([Uint8Array.from(atob(data.pdf_base64), c => c.charCodeAt(0))], { type: "application/pdf" });
    } catch { return null; }
  };

  const handleSingleExportPdf = async () => {
    if (!selectedItem) return;
    const isQ = !!selectedItem.quote_number;
    toast.loading("Génération PDF...");
    const blob = await generatePdfBlob(selectedItem);
    toast.dismiss();
    if (!blob) { toast.error("Erreur export PDF"); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${isQ ? "devis" : "facture"}-${selectedItem.quote_number || selectedItem.invoice_number}.pdf`; a.click();
    URL.revokeObjectURL(url);
    toast.success("PDF téléchargé !");
  };

  const buildShareText = (item: any) => {
    const isQ = !!item.quote_number;
    const docType = isQ ? "devis" : "facture";
    const docNum = item.quote_number || item.invoice_number;
    const clientName = getClientName(item);
    const amount = item.amount != null ? fmtAmount(item.amount) : "";

    return `Bonjour,\n\nVeuillez trouver ci-joint ${isQ ? "le devis" : "la facture"} n° ${docNum}${clientName ? ` concernant ${item.title}` : ""}.\n\n${amount ? `Montant TTC : ${amount}\n` : ""}${item.payment_terms ? `Délai de paiement : ${item.payment_terms} jours\n` : ""}\nJe reste à votre disposition pour toute question.\n\nCordialement,\n${profileName}`;
  };

  const handleSingleShare = async (method: "copy" | "email" | "sms" | "whatsapp") => {
    if (!selectedItem) return;
    const isQ = !!selectedItem.quote_number;
    const docNum = selectedItem.quote_number || selectedItem.invoice_number;
    const text = buildShareText(selectedItem);

    if (method === "copy") {
      // Try to share PDF via native share API if available
      toast.loading("Préparation...");
      const blob = await generatePdfBlob(selectedItem);
      toast.dismiss();
      if (blob && navigator.share && navigator.canShare) {
        const file = new File([blob], `${isQ ? "devis" : "facture"}-${docNum}.pdf`, { type: "application/pdf" });
        if (navigator.canShare({ files: [file] })) {
          try { await navigator.share({ files: [file], text }); return; } catch { /* user cancelled */ }
        }
      }
      navigator.clipboard.writeText(text);
      toast.success("Texte copié !");
      return;
    }

    // For email/sms/whatsapp: generate PDF first, try native share with file
    toast.loading("Préparation du PDF...");
    const blob = await generatePdfBlob(selectedItem);
    toast.dismiss();

    if (blob && navigator.share && navigator.canShare) {
      const file = new File([blob], `${isQ ? "devis" : "facture"}-${docNum}.pdf`, { type: "application/pdf" });
      if (navigator.canShare({ files: [file] })) {
        try { await navigator.share({ title: `${isQ ? "Devis" : "Facture"} ${docNum}`, text, files: [file] }); return; } catch { /* fallback */ }
      }
    }

    // Fallback: open with text only
    const subject = encodeURIComponent(`${isQ ? "Devis" : "Facture"} ${docNum}`);
    const body = encodeURIComponent(text);
    if (method === "email") window.open(`mailto:?subject=${subject}&body=${body}`);
    else if (method === "sms") window.open(`sms:?body=${body}`);
    else if (method === "whatsapp") window.open(`https://wa.me/?text=${body}`);
  };

  // ── Batch export/share ──
  const handleExport = async (format: "pdf" | "csv") => {
    const exportItems: any[] = [];
    if (exportSections.devis) quotes.forEach((q: any) => exportItems.push({ ...q, client_name: getClientName(q), siret: q.clients?.siret, address: q.clients?.address }));
    if (exportSections.factures) invoices.forEach((i: any) => exportItems.push({ ...i, client_name: getClientName(i), siret: i.clients?.siret, address: i.clients?.address }));
    if (exportItems.length === 0) { toast.error("Aucune donnée"); return; }
    toast.loading("Export...");
    try {
      const { data, error } = await supabase.functions.invoke("export-quotes", { body: { items: exportItems, title: "Devis & Factures", format } });
      if (error) throw error;
      const b64 = format === "csv" ? data.csv_base64 : data.pdf_base64;
      const mime = format === "csv" ? "text/csv" : "application/pdf";
      const ext = format === "csv" ? "csv" : "pdf";
      const blob = new Blob([Uint8Array.from(atob(b64), c => c.charCodeAt(0))], { type: mime });
      const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `export.${ext}`; a.click(); URL.revokeObjectURL(url);
      toast.dismiss(); toast.success(`${ext.toUpperCase()} téléchargé !`);
    } catch { toast.dismiss(); toast.error("Erreur export"); }
    setShowExport(false);
  };

  const handleShare = (method: "copy" | "email" | "sms" | "whatsapp") => {
    const lines: string[] = [];
    if (exportSections.devis) quotes.forEach((q: any) => lines.push(`${q.quote_number} - ${q.title} - ${getClientName(q)} - ${q.amount ? fmtAmount(q.amount) : "-"} - ${q.status}`));
    if (exportSections.factures) invoices.forEach((i: any) => lines.push(`${i.invoice_number} - ${i.title} - ${getClientName(i)} - ${i.amount ? fmtAmount(i.amount) : "-"} - ${i.status}`));
    if (exportSections.paiements) payments.forEach((p: any) => lines.push(`Paiement ${p.invoices?.invoice_number || ""} - ${fmtAmount(p.amount)} - ${p.method || ""}`));
    const text = "SWAN — Devis & Factures\n\n" + lines.join("\n");
    if (method === "copy") { navigator.clipboard.writeText(text); toast.success("Copié !"); }
    else if (method === "email") window.open(`mailto:?subject=${encodeURIComponent("Devis & Factures")}&body=${encodeURIComponent(text)}`);
    else if (method === "sms") window.open(`sms:?body=${encodeURIComponent(text)}`);
    else if (method === "whatsapp") window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
    setShowShare(false);
  };

  // ── Stats ──
  const getDateRange = (): Date => {
    const now = new Date();
    if (period === "week") { const d = new Date(now); d.setDate(now.getDate() - 7); return d; }
    if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
    if (period === "year") return new Date(now.getFullYear(), 0, 1);
    return new Date(customStart);
  };

  const stats = useMemo(() => {
    const start = getDateRange();
    const end = period === "custom" ? new Date(new Date(customEnd).getTime() + 86400000) : new Date();
    const pi = invoices.filter((i: any) => { const d = new Date(i.created_at); return d >= start && d <= end; });
    const sent = pi.filter((i: any) => i.status === "Envoyé").length;
    const pending = pi.filter((i: any) => ["Envoyé", "En retard", "Accepté"].includes(i.status));
    const paid = pi.filter((i: any) => i.status === "Payé");
    const totalPaid = paid.reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0);
    const totalPending = pending.reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0);
    
    // TVA totals
    const totalTva = pi.reduce((s: number, i: any) => {
      const ht = Number(i.amount_ht) || 0;
      const rate = Number(i.tva_rate) || 0;
      const dType = i.discount_type || "";
      const dVal = Number(i.discount_value) || 0;
      const { tvaAmount } = calcTtc(ht, dType, dVal, rate);
      return s + tvaAmount;
    }, 0);

    // TVA by month
    const tvaByMonth: Record<string, number> = {};
    pi.forEach((i: any) => {
      const d = new Date(i.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const ht = Number(i.amount_ht) || 0;
      const rate = Number(i.tva_rate) || 0;
      const dType = i.discount_type || "";
      const dVal = Number(i.discount_value) || 0;
      const { tvaAmount } = calcTtc(ht, dType, dVal, rate);
      tvaByMonth[key] = (tvaByMonth[key] || 0) + tvaAmount;
    });

    const byClient: Record<string, number> = {};
    pi.forEach((i: any) => { const n = i.clients?.name || i.client || "Sans client"; byClient[n] = (byClient[n] || 0) + (Number(i.amount) || 0); });
    return { sent, pending: pending.length, paid: paid.length, totalPaid, totalPending, totalTva, tvaByMonth, byClient, total: pi.length };
  }, [invoices, period, customStart, customEnd]);

  const items = tab === "devis" ? quotes : tab === "factures" ? invoices : [];
  const filtered = useMemo(() => {
    let list = statusFilter === "all" ? items : items.filter((i: any) => i.status === statusFilter);
    if (search) { const s = search.toLowerCase(); list = list.filter((i: any) => (i.title?.toLowerCase().includes(s) || getClientName(i).toLowerCase().includes(s) || (i.quote_number || i.invoice_number || "").toLowerCase().includes(s))); }
    return list;
  }, [items, statusFilter, search]);

  // ── TVA Rate Selector Component ──
  const TvaRateSelector = ({ rate, setRate, custom, setCustom, mention, setMention }: any) => (
    <div className="space-y-2">
      <p className={labelCls}>TVA</p>
      <div className="flex flex-wrap gap-1.5">
        {tvaRateOptions.map(opt => (
          <button key={opt.value} onClick={() => { setRate(opt.value); if (opt.value > 0) setMention(""); }}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${rate === opt.value && rate !== -1 ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
            {opt.label}
          </button>
        ))}
        <button onClick={() => setRate(-1)}
          className={`text-xs px-3 py-1.5 rounded-full transition-colors ${rate === -1 ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
          Autre
        </button>
      </div>
      {rate === -1 && (
        <input value={custom} onChange={e => setCustom(e.target.value)} placeholder="Taux personnalisé (%)" type="number" className={`${inputCls} w-40`} />
      )}
      {rate === 0 && (
        <select value={mention} onChange={e => setMention(e.target.value)} className={inputCls}>
          <option value="">Mention d'exonération</option>
          {tvaMentions.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      )}
    </div>
  );

  // ══════════════════════ DETAIL VIEW ══════════════════════
  if (selectedItem) {
    const isQuote = !!selectedItem.quote_number;
    const itemRate = Number(selectedItem.tva_rate) || 0;
    const itemHt = Number(selectedItem.amount_ht) || 0;
    const itemDType = selectedItem.discount_type || "";
    const itemDVal = Number(selectedItem.discount_value) || 0;
    const { htAfterDiscount, tvaAmount: itemTva, ttc: itemTtc } = calcTtc(itemHt, itemDType, itemDVal, itemRate);

    return (
      <div className="fade-in">
        <PageHeader title={isQuote ? "Détail devis" : "Détail facture"} back
          action={
            <div className="flex gap-1.5">
              <button onClick={() => setShowPreview(!showPreview)} className={`p-2 rounded-xl transition-colors ${showPreview ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}><Eye size={18} /></button>
              <button onClick={() => setEditingItem(!editingItem)} className={`p-2 rounded-xl transition-colors ${editingItem ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}><Edit2 size={18} /></button>
              <button onClick={() => setSelectedItem(null)} className="p-2 rounded-xl bg-secondary text-muted-foreground"><ChevronLeft size={18} /></button>
            </div>
          } />
        <div className="px-4 md:px-0 space-y-4">

          {/* Preview */}
          {showPreview && (
            <DocumentPreview item={selectedItem} settings={settings} isQuote={isQuote}
              onExportPdf={handleSingleExportPdf} onShare={handleSingleShare} />
          )}

          {/* Edit mode */}
          {editingItem && (
            <div className="glass-card p-4 space-y-3 slide-up">
              <p className="text-sm font-semibold">Modifier les informations</p>
              <div>
                <p className={labelCls}>Date d'émission</p>
                <input type="date" value={eIssueDate} onChange={e => setEIssueDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <p className={labelCls}>Période / prestation</p>
                <input value={ePeriod} onChange={e => setEPeriod(e.target.value)} placeholder="Ex: Mars 2026, Q1 2026..." className={inputCls} />
              </div>
              <div>
                <p className={labelCls}>Délai de paiement</p>
                <div className="flex flex-wrap gap-1.5">
                  {paymentTermsOptions.map(d => (
                    <button key={d} onClick={() => setEPaymentTerms(String(d))}
                      className={`text-xs px-3 py-1.5 rounded-full transition-colors ${ePaymentTerms === String(d) ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                      {d}j
                    </button>
                  ))}
                  <input value={ePaymentTerms} onChange={e => setEPaymentTerms(e.target.value)} placeholder="Autre" type="number" className="w-16 bg-secondary border border-border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>
              <div>
                <p className={labelCls}>Modalité d'encaissement</p>
                <div className="flex flex-wrap gap-1.5">
                  {paymentMethods.map(m => (
                    <button key={m} onClick={() => setEPayment(ePayment === m ? "" : m)}
                      className={`text-xs px-3 py-1.5 rounded-full transition-colors ${ePayment === m ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>{m}</button>
                  ))}
                </div>
              </div>
              <TvaRateSelector rate={eTvaRate} setRate={setETvaRate} custom={eTvaCustom} setCustom={setETvaCustom} mention={eTva} setMention={setETva} />
              <div>
                <p className={labelCls}>Annotations / notes</p>
                <textarea value={eNotes} onChange={e => setENotes(e.target.value)} rows={3} placeholder="Notes libres..." className={inputCls} />
              </div>
              <button onClick={() => { if (window.confirm("Sauvegarder les modifications ?")) updateItem.mutate(); }}
                className="w-full btn-primary-glow py-2.5 text-sm flex items-center justify-center gap-2">
                <Save size={16} /> Sauvegarder
              </button>
            </div>
          )}

          {/* Info card */}
          {!showPreview && (
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
                    <button key={c} onClick={() => { updateColor.mutate({ id: selectedItem.id, color: c, type: isQuote ? "quotes" : "invoices" }); setSelectedItem({ ...selectedItem, color: c }); setShowColorPicker(false); }}
                      className="w-6 h-6 rounded-full border-2 transition-all" style={{ backgroundColor: `hsl(${c})`, borderColor: selectedItem.color === c ? "hsl(var(--primary))" : "transparent" }} />
                  ))}
                  <button onClick={() => { updateColor.mutate({ id: selectedItem.id, color: "", type: isQuote ? "quotes" : "invoices" }); setSelectedItem({ ...selectedItem, color: null }); setShowColorPicker(false); }}
                    className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-[10px] text-muted-foreground">✕</button>
                </div>
              )}

              <div className="text-sm text-muted-foreground space-y-1">
                <p>N° : {selectedItem.quote_number || selectedItem.invoice_number}</p>
                <p>Émis le : {new Date(selectedItem.issue_date || selectedItem.created_at).toLocaleDateString("fr-FR")}</p>
                {selectedItem.period_description && <p>Période : {selectedItem.period_description}</p>}
                {getClientName(selectedItem) && <p>Client : {getClientName(selectedItem)}</p>}
                {selectedItem.clients?.siret && <p>SIRET : {selectedItem.clients.siret}</p>}
                {itemHt > 0 && <p>Montant HT : {fmtAmount(itemHt)}</p>}
                {selectedItem.discount_type && <p>Remise : {selectedItem.discount_type === "percent" ? `${selectedItem.discount_value}%` : fmtAmount(selectedItem.discount_value)}</p>}
                {itemHt > 0 && htAfterDiscount !== itemHt && <p>HT après remise : {fmtAmount(htAfterDiscount)}</p>}
                {itemRate > 0 && <p>TVA ({itemRate}%) : {fmtAmount(itemTva)}</p>}
                <p className="font-semibold text-foreground">Total TTC : {fmtAmount(itemTtc)}</p>
                {selectedItem.payment_method && <p>Encaissement : {selectedItem.payment_method}</p>}
                {selectedItem.payment_terms && <p>Délai : {selectedItem.payment_terms} jours</p>}
                {selectedItem.tva_mention && <p className="italic text-xs">{selectedItem.tva_mention}</p>}
                {selectedItem.notes && <p className="text-xs mt-1 bg-secondary p-2 rounded-lg">{selectedItem.notes}</p>}
                {selectedItem.rib_details && (
                  <div className="mt-2 p-2 bg-secondary rounded-lg text-xs space-y-0.5">
                    <p className="font-semibold text-foreground">RIB</p>
                    {selectedItem.rib_details.holder && <p>Titulaire : {selectedItem.rib_details.holder}</p>}
                    {selectedItem.rib_details.iban && <p>IBAN : {selectedItem.rib_details.iban}</p>}
                    {selectedItem.rib_details.bic && <p>BIC : {selectedItem.rib_details.bic}</p>}
                    {selectedItem.rib_details.bank && <p>Banque : {selectedItem.rib_details.bank}</p>}
                  </div>
                )}
              </div>
            </div>
          )}

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
                <p className={labelCls}>Encaisser</p>
                <div className="flex flex-wrap gap-1.5">
                  {paymentMethods.map(m => (
                    <button key={m} onClick={() => setPayMethodPick(m)}
                      className={`text-xs px-3 py-1.5 rounded-full transition-colors ${payMethodPick === m ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>{m}</button>
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
            <button onClick={() => { if (window.confirm("Supprimer définitivement ?")) deleteItem.mutate({ id: selectedItem.id, type: isQuote ? "quotes" : "invoices" }); }}
              className="w-full py-2.5 text-sm rounded-xl bg-destructive/10 text-destructive flex items-center justify-center gap-2">
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
            <button onClick={() => { if (tab === "clients") setShowClientForm(!showClientForm); else if (!["dashboard", "settings"].includes(tab)) setShowForm(!showForm); }}
              className="p-2 rounded-xl bg-primary/10 text-primary"><Plus size={18} /></button>
          </div>
        } />
      <div className="px-4 md:px-0">

        {/* Export */}
        {showExport && (
          <div className="glass-card p-4 mb-4 space-y-3 slide-up">
            <p className="text-sm font-semibold">Exporter</p>
            {(["devis", "factures", "paiements", "clients"] as const).map(k => (
              <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={exportSections[k]} onChange={e => setExportSections({ ...exportSections, [k]: e.target.checked })} className="rounded" />{k.charAt(0).toUpperCase() + k.slice(1)}</label>
            ))}
            <div className="flex gap-2">
              <button onClick={() => handleExport("pdf")} className="flex-1 btn-primary-glow py-2 text-sm">PDF</button>
              <button onClick={() => handleExport("csv")} className="flex-1 py-2 text-sm rounded-xl bg-secondary text-foreground">Excel</button>
            </div>
          </div>
        )}

        {/* Share */}
        {showShare && (
          <div className="glass-card p-4 mb-4 space-y-3 slide-up">
            <p className="text-sm font-semibold">Partager</p>
            {(["devis", "factures", "paiements"] as const).map(k => (
              <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={exportSections[k]} onChange={e => setExportSections({ ...exportSections, [k]: e.target.checked })} className="rounded" />{k.charAt(0).toUpperCase() + k.slice(1)}</label>
            ))}
            <div className="grid grid-cols-4 gap-2">
              {[{ m: "copy" as const, icon: Copy, label: "Copier" }, { m: "email" as const, icon: Mail, label: "Email" }, { m: "sms" as const, icon: MessageSquare, label: "SMS" }, { m: "whatsapp" as const, icon: Phone, label: "WhatsApp" }].map(s => (
                <button key={s.m} onClick={() => handleShare(s.m)} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-secondary text-xs"><s.icon size={16} />{s.label}</button>
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

        {/* ═══ SETTINGS ═══ */}
        {tab === "settings" && (
          <div className="space-y-4">
            <div className="glass-card p-4 space-y-3">
              <p className="text-sm font-semibold">👤 Émetteur</p>
              <div className="grid grid-cols-2 gap-2">
                <div><p className={labelCls}>Prénom</p><input value={sFirstName} onChange={e => setSFirstName(e.target.value)} className={inputCls} /></div>
                <div><p className={labelCls}>Nom</p><input value={sLastName} onChange={e => setSLastName(e.target.value)} className={inputCls} /></div>
              </div>
              <div><p className={labelCls}>Raison sociale</p><input value={sCompany} onChange={e => setSCompany(e.target.value)} className={inputCls} /></div>
              <div><p className={labelCls}>SIRET / SIREN</p><input value={sSiret} onChange={e => setSSiret(e.target.value)} className={inputCls} /></div>
              <div><p className={labelCls}>Adresse</p><input value={sAddress} onChange={e => setSAddress(e.target.value)} className={inputCls} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><p className={labelCls}>Email</p><input value={sEmail} onChange={e => setSEmail(e.target.value)} type="email" className={inputCls} /></div>
                <div><p className={labelCls}>Téléphone</p><input value={sPhone} onChange={e => setSPhone(e.target.value)} type="tel" className={inputCls} /></div>
              </div>
            </div>

            <div className="glass-card p-4 space-y-3">
              <p className="text-sm font-semibold">🔢 Numérotation</p>
              <div className="grid grid-cols-2 gap-2">
                <div><p className={labelCls}>Préfixe devis</p><input value={sQuotePrefix} onChange={e => setSQuotePrefix(e.target.value)} className={inputCls} /></div>
                <div><p className={labelCls}>N° suivant</p><input value={sQuoteCounter} onChange={e => setSQuoteCounter(e.target.value)} type="number" className={inputCls} /></div>
                <div><p className={labelCls}>Préfixe facture</p><input value={sInvoicePrefix} onChange={e => setSInvoicePrefix(e.target.value)} className={inputCls} /></div>
                <div><p className={labelCls}>N° suivant</p><input value={sInvoiceCounter} onChange={e => setSInvoiceCounter(e.target.value)} type="number" className={inputCls} /></div>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sYearInNumber} onChange={e => setSYearInNumber(e.target.checked)} className="rounded" />Année dans le numéro</label>
            </div>

            <div className="glass-card p-4 space-y-3">
              <p className="text-sm font-semibold">🏦 Coordonnées bancaires</p>
              <input value={sHolder} onChange={e => setSHolder(e.target.value)} placeholder="Titulaire" className={inputCls} />
              <input value={sIban} onChange={e => setSIban(e.target.value)} placeholder="IBAN" className={inputCls} />
              <input value={sBic} onChange={e => setSBic(e.target.value)} placeholder="BIC" className={inputCls} />
              <input value={sBank} onChange={e => setSBank(e.target.value)} placeholder="Banque" className={inputCls} />
            </div>

            <div className="glass-card p-4 space-y-3">
              <p className="text-sm font-semibold">⚙️ Par défaut</p>
              <div><p className={labelCls}>Mention TVA (exonération)</p>
                <select value={sDefaultTva} onChange={e => setSDefaultTva(e.target.value)} className={inputCls}>
                  <option value="">Aucune</option>{tvaMentions.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div><p className={labelCls}>Modalité d'encaissement</p>
                <select value={sDefaultPayment} onChange={e => setSDefaultPayment(e.target.value)} className={inputCls}>
                  <option value="">Non défini</option>{paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div className="glass-card p-4 space-y-3">
              <p className="text-sm font-semibold">⚖️ Mentions légales</p>
              <textarea value={sLegal} onChange={e => setSLegal(e.target.value)} rows={3} placeholder="Mentions légales affichées sur devis/factures..." className={inputCls} />
            </div>

            <button onClick={() => saveSettings.mutate()} className="w-full btn-primary-glow py-3 text-sm flex items-center justify-center gap-2">
              <Check size={16} /> Sauvegarder les réglages
            </button>
          </div>
        )}

        {/* ═══ DASHBOARD ═══ */}
        {tab === "dashboard" && (
          <div className="space-y-3">
            <div className="flex gap-1.5 flex-wrap">
              {(["week", "month", "year", "custom"] as const).map(p => (
                <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 rounded-full text-xs ${period === p ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                  {p === "week" ? "Semaine" : p === "month" ? "Mois" : p === "year" ? "Année" : "Période"}
                </button>
              ))}
            </div>
            {period === "custom" && (
              <div className="flex gap-2 items-center">
                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className={`${inputCls} flex-1`} />
                <span className="text-xs text-muted-foreground">→</span>
                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className={`${inputCls} flex-1`} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2.5">
              {[{ l: "Envoyées", v: stats.sent, c: "217 91% 60%" }, { l: "En attente", v: stats.pending, c: "38 92% 50%" }, { l: "Payées", v: stats.paid, c: "142 71% 45%" }, { l: "Total", v: stats.total, c: "0 0% 70%" }].map(s => (
                <div key={s.l} className="glass-card p-3"><p className="text-[10px] text-muted-foreground uppercase">{s.l}</p><p className="text-xl font-bold font-heading" style={{ color: `hsl(${s.c})` }}>{s.v}</p></div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="glass-card p-3"><p className="text-[10px] text-muted-foreground uppercase">Encaissé</p><p className="text-lg font-bold text-primary">{fmtAmount(stats.totalPaid)}</p></div>
              <div className="glass-card p-3"><p className="text-[10px] text-muted-foreground uppercase">À encaisser</p><p className="text-lg font-bold" style={{ color: "hsl(38 92% 50%)" }}>{fmtAmount(stats.totalPending)}</p></div>
            </div>

            {/* TVA stats */}
            <div className="glass-card p-4 space-y-2">
              <p className={labelCls}>TVA facturée</p>
              <p className="text-lg font-bold text-primary">{fmtAmount(stats.totalTva)}</p>
              {Object.keys(stats.tvaByMonth).length > 0 && (
                <div className="space-y-1 pt-1">
                  {Object.entries(stats.tvaByMonth).sort().map(([month, amount]) => (
                    <div key={month} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{month}</span>
                      <span className="font-semibold">{fmtAmount(amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {Object.keys(stats.byClient).length > 0 && (
              <div className="glass-card p-4 space-y-2">
                <p className={labelCls}>Par client</p>
                {Object.entries(stats.byClient).sort((a, b) => b[1] - a[1]).map(([name, total]) => (
                  <div key={name} className="flex justify-between text-sm"><span>{name}</span><span className="font-semibold">{fmtAmount(total)}</span></div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ CLIENTS ═══ */}
        {tab === "clients" && (
          <div className="space-y-3">
            {showClientForm && (
              <div className="glass-card p-4 space-y-3 slide-up">
                <input value={cName} onChange={e => setCName(e.target.value)} placeholder="Nom *" className={inputCls} />
                <input value={cSiret} onChange={e => setCSiret(e.target.value)} placeholder="SIRET" className={inputCls} />
                <input value={cAddr} onChange={e => setCAddr(e.target.value)} placeholder="Adresse" className={inputCls} />
                <input value={cEmail} onChange={e => setCEmail(e.target.value)} placeholder="Email" type="email" className={inputCls} />
                <input value={cPhone} onChange={e => setCPhone(e.target.value)} placeholder="Téléphone" type="tel" className={inputCls} />
                <div className="flex gap-2">
                  <button onClick={() => addClient.mutate()} disabled={!cName.trim()} className="flex-1 btn-primary-glow py-2.5 text-sm disabled:opacity-40">{editingClient ? "Modifier" : "Ajouter"}</button>
                  <button onClick={resetClientForm} className="px-4 py-2.5 rounded-xl bg-secondary text-muted-foreground"><X size={16} /></button>
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
                <button onClick={() => editClientFn(c)} className="p-1.5 rounded-lg bg-secondary text-muted-foreground"><Edit2 size={14} /></button>
                <button onClick={() => { if (window.confirm(`Supprimer "${c.name}" ?`)) deleteClient.mutate(c.id); }} className="p-1.5 rounded-lg bg-destructive/10 text-destructive"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}

        {/* ═══ DEVIS / FACTURES ═══ */}
        {(tab === "devis" || tab === "factures") && (
          <>
            {showForm && tab === "devis" && (
              <div className="glass-card p-4 mb-4 space-y-3 slide-up">
                <input value={fTitle} onChange={e => setFTitle(e.target.value)} placeholder="Titre *" className={inputCls} />
                <select value={fClientId} onChange={e => setFClientId(e.target.value)} className={inputCls}>
                  <option value="">-- Client --</option>
                  {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input value={fAmountHt} onChange={e => setFAmountHt(e.target.value)} placeholder="Montant HT (€)" type="number" className={inputCls} />

                <div className="flex gap-2 items-center">
                  <select value={fDiscountType} onChange={e => setFDiscountType(e.target.value as any)} className={`${inputCls} flex-1`}>
                    <option value="">Pas de remise</option><option value="percent">Remise %</option><option value="fixed">Remise fixe €</option>
                  </select>
                  {fDiscountType && <input value={fDiscountValue} onChange={e => setFDiscountValue(e.target.value)} placeholder={fDiscountType === "percent" ? "%" : "€"} type="number" className={`${inputCls} w-24`} />}
                </div>

                {/* TVA Rate Selection */}
                <TvaRateSelector rate={fTvaRate} setRate={setFTvaRate} custom={fTvaCustom} setCustom={setFTvaCustom} mention={fTva} setMention={setFTva} />

                {fAmountHt && (
                  <div className="text-xs text-muted-foreground space-y-0.5 bg-secondary p-2 rounded-lg">
                    <p>HT après remise : <span className="font-semibold text-foreground">{fmtAmount(calcFinalHtAfterDiscount())}</span></p>
                    {getEffectiveTvaRate(fTvaRate, fTvaCustom) > 0 && (
                      <p>TVA ({getEffectiveTvaRate(fTvaRate, fTvaCustom)}%) : <span className="font-semibold text-foreground">{fmtAmount(calcFinalTva())}</span></p>
                    )}
                    <p>Total TTC : <span className="font-semibold text-foreground">{fmtAmount(calcFinal())}</span></p>
                  </div>
                )}

                <div><p className={`${labelCls} mb-1.5`}>Couleur</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {colorPalette.map(c => (<button key={c} onClick={() => setFColor(fColor === c ? "" : c)} className="w-6 h-6 rounded-full border-2 transition-all" style={{ backgroundColor: `hsl(${c})`, borderColor: fColor === c ? "hsl(var(--primary))" : "transparent" }} />))}
                  </div>
                </div>

                <button onClick={() => setFShowOptions(!fShowOptions)} className="text-xs text-primary">{fShowOptions ? "Masquer les options" : "＋ Plus d'options"}</button>

                {fShowOptions && (
                  <div className="space-y-3 pt-1">
                    <div><p className={labelCls}>Date d'émission</p><input type="date" value={fIssueDate} onChange={e => setFIssueDate(e.target.value)} className={inputCls} /></div>
                    <div><p className={labelCls}>Période</p><input value={fPeriod} onChange={e => setFPeriod(e.target.value)} placeholder="Ex: Mars 2026" className={inputCls} /></div>
                    <div>
                      <p className={labelCls}>Délai de paiement</p>
                      <div className="flex flex-wrap gap-1.5">
                        {paymentTermsOptions.map(d => (
                          <button key={d} onClick={() => setFPaymentTerms(fPaymentTerms === String(d) ? "" : String(d))}
                            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${fPaymentTerms === String(d) ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>{d}j</button>
                        ))}
                        <input value={fPaymentTerms} onChange={e => setFPaymentTerms(e.target.value)} placeholder="Autre" type="number" className="w-16 bg-secondary border border-border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                      </div>
                    </div>
                    <div><p className={labelCls}>Encaissement</p>
                      <div className="flex flex-wrap gap-1.5">{paymentMethods.map(m => (<button key={m} onClick={() => setFPayment(fPayment === m ? "" : m)} className={`text-xs px-3 py-1.5 rounded-full transition-colors ${fPayment === m ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>{m}</button>))}</div>
                    </div>
                    <div><p className={labelCls}>Notes</p><textarea value={fNotes} onChange={e => setFNotes(e.target.value)} rows={2} placeholder="Annotations libres..." className={inputCls} /></div>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={fShowRib} onChange={e => setFShowRib(e.target.checked)} className="rounded" />Inclure le RIB</label>
                    {fShowRib && sIban && <p className="text-xs text-muted-foreground bg-secondary p-2 rounded-lg">RIB : {sHolder} — {sIban}</p>}
                    {fShowRib && !sIban && <p className="text-xs text-destructive">Configurez votre RIB dans Réglages</p>}
                  </div>
                )}

                <button onClick={() => addQuote.mutate()} disabled={!fTitle.trim()} className="w-full btn-primary-glow py-2.5 text-sm disabled:opacity-40">Créer le devis</button>
              </div>
            )}

            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="w-full bg-secondary border border-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="flex gap-1 overflow-x-auto mb-4">
              {["all", ...statuses].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)} className={`px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors ${statusFilter === s ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>{s === "all" ? "Tout" : s}</button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className="glass-card p-8 text-center"><p className="text-sm text-muted-foreground">{tab === "devis" ? "Aucun devis" : "Aucune facture"}</p></div>
            ) : (
              <div className="space-y-2.5">
                {filtered.map((item: any) => {
                  const iRate = Number(item.tva_rate) || 0;
                  const iHt = Number(item.amount_ht) || 0;
                  const { ttc } = calcTtc(iHt, item.discount_type || "", Number(item.discount_value) || 0, iRate);
                  return (
                    <button key={item.id} onClick={() => setSelectedItem(item)}
                      className="w-full glass-card p-4 flex items-center gap-3 text-left hover:border-primary/20 transition-all"
                      style={item.color ? { borderLeft: `3px solid hsl(${item.color})` } : {}}>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-semibold">{item.title}</span>
                          <span className="text-[10px] text-muted-foreground">{item.quote_number || item.invoice_number}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {getClientName(item) && `${getClientName(item)} · `}{formatDate(item.issue_date || item.created_at)}
                          {iHt > 0 && ` · HT ${fmtAmount(iHt)}`}
                          {iRate > 0 && ` · TVA ${iRate}%`}
                        </div>
                      </div>
                      <span className="text-sm font-semibold">{fmtAmount(ttc)}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: `hsl(${statusColors[item.status] || "0 0% 50%"} / 0.12)`, color: `hsl(${statusColors[item.status] || "0 0% 50%"})` }}>{item.status}</span>
                      <ChevronRight size={16} className="text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ═══ PAYMENTS ═══ */}
        {tab === "paiements" && (
          payments.length === 0 ? (
            <div className="glass-card p-8 text-center"><p className="text-sm text-muted-foreground">Aucun paiement</p></div>
          ) : (
            <div className="glass-card divide-y divide-border">
              {payments.map((p: any) => (
                <div key={p.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{p.invoices?.title || "—"}</div>
                    <div className="text-[10px] text-muted-foreground">{p.invoices?.invoice_number} · {p.invoices?.clients?.name || p.invoices?.client || "—"} · {p.method || "—"} · {p.paid_at ? formatDate(p.paid_at) : "—"}</div>
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
