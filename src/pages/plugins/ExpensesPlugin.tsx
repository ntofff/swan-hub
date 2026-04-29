import { type CSSProperties, type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  Banknote,
  Camera,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  FileText,
  ImageIcon,
  Mail,
  MessageSquare,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import { TutorialButton } from "@/components/TutorialButton";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_STATUSES,
  ExpenseReceipt,
  downloadCsv,
  formatDate,
  money,
  normalizeCurrency,
  parseAmount,
} from "@/lib/businessTools";

type QueryResponse<T> = { data: T | null; error: { message: string } | null };
type DbQuery<T = unknown> = PromiseLike<QueryResponse<T>> & {
  select: (columns?: string) => DbQuery<T[]>;
  order: (column: string, options?: { ascending?: boolean }) => DbQuery<T>;
  insert: (values: Record<string, unknown>) => DbQuery<T>;
  update: (values: Record<string, unknown>) => DbQuery<T>;
  delete: () => DbQuery<T>;
  eq: (column: string, value: unknown) => DbQuery<T>;
};
type BusinessDb = { from: (table: string) => DbQuery };
type PendingDocument = { path: string; name: string; mimeType: string; signedUrl: string | null };
type ExpenseTab = "active" | "archived";
type ReceiptDraft = {
  title: string;
  vendor: string;
  expense_date: string;
  category: string;
  amount_ht: string;
  amount_ttc: string;
  annotation: string;
  status: string;
};
type AnalysisPatch = {
  title?: unknown;
  vendor?: unknown;
  expense_date?: unknown;
  category?: unknown;
  amount_ht?: unknown;
  amount_ttc?: unknown;
  annotation?: unknown;
};

const db = supabase as unknown as BusinessDb;

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const emptyForm = {
  title: "",
  vendor: "",
  expense_date: "",
  category: "Autre",
  amount_ht: "",
  amount_ttc: "",
  annotation: "",
};

const STATUS_META: Record<string, { label: string; color: string; bg: string; text: string }> = {
  "A verifier": {
    label: "A vérifier",
    color: "hsl(28 45% 38%)",
    bg: "hsl(28 45% 38% / 0.13)",
    text: "hsl(28 48% 28%)",
  },
  Validee: {
    label: "Validée",
    color: "hsl(142 64% 38%)",
    bg: "hsl(142 64% 38% / 0.13)",
    text: "hsl(142 58% 28%)",
  },
  Exportee: {
    label: "Exportée",
    color: "hsl(214 82% 48%)",
    bg: "hsl(214 82% 48% / 0.13)",
    text: "hsl(214 68% 35%)",
  },
  Archivee: {
    label: "Archivée",
    color: "hsl(217 20% 46%)",
    bg: "hsl(217 20% 46% / 0.13)",
    text: "hsl(217 22% 32%)",
  },
};

const statusLabel = (status: string) => STATUS_META[status]?.label || status;
const statusMeta = (status: string) => STATUS_META[status] || STATUS_META["A verifier"];
const amountInput = (value: number | null) => (typeof value === "number" ? String(value).replace(".", ",") : "");
const plainFileName = (name: string) => name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
const asText = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const asAmountText = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return String(value).replace(".", ",");
  if (typeof value === "string") return value.trim();
  return "";
};

const buildShareText = (receipt: ExpenseReceipt) =>
  [
    `Note de frais SWAN: ${receipt.title}`,
    `Fournisseur: ${receipt.vendor || "Non renseigné"}`,
    `Date: ${formatDate(receipt.expense_date)}`,
    `HT: ${money(receipt.amount_ht, receipt.currency)}`,
    `TTC: ${money(receipt.amount_ttc, receipt.currency)}`,
    receipt.annotation ? `Annotation: ${receipt.annotation}` : "",
  ]
    .filter(Boolean)
    .join("\n");

const toDraft = (receipt: ExpenseReceipt): ReceiptDraft => ({
  title: receipt.title || "",
  vendor: receipt.vendor || "",
  expense_date: receipt.expense_date || "",
  category: receipt.category || "Autre",
  amount_ht: amountInput(receipt.amount_ht),
  amount_ttc: amountInput(receipt.amount_ttc),
  annotation: receipt.annotation || "",
  status: receipt.status || "A verifier",
});

const draftToPatch = (draft: ReceiptDraft): Partial<ExpenseReceipt> => {
  const amountHt = parseAmount(draft.amount_ht);
  const amountTtc = parseAmount(draft.amount_ttc);
  const vat = amountHt !== null && amountTtc !== null ? Number((amountTtc - amountHt).toFixed(2)) : null;
  return {
    title: draft.title.trim() || "Note de frais",
    vendor: draft.vendor.trim() || null,
    expense_date: draft.expense_date || null,
    category: draft.category,
    amount_ht: amountHt,
    amount_ttc: amountTtc,
    vat_amount: vat,
    annotation: draft.annotation.trim() || null,
    status: draft.status,
  };
};

export default function ExpensesPlugin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [pendingDocument, setPendingDocument] = useState<PendingDocument | null>(null);
  const [isPhotoAnalyzing, setIsPhotoAnalyzing] = useState(false);
  const [hasPhotoAnalysis, setHasPhotoAnalysis] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<ExpenseTab>("active");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ["expense_receipts"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db
        .from("expense_receipts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data || []) as ExpenseReceipt[];
      return Promise.all(
        rows.map(async (receipt) => {
          const normalizedReceipt = { ...receipt, currency: normalizeCurrency(receipt.currency) };
          if (!receipt.document_path) return { ...normalizedReceipt, signedUrl: null };
          const { data: signed } = await supabase.storage
            .from("business-documents")
            .createSignedUrl(receipt.document_path, 3600);
          return { ...normalizedReceipt, signedUrl: signed?.signedUrl || null };
        })
      );
    },
  });

  const activeReceipts = useMemo(() => receipts.filter((receipt) => receipt.status !== "Archivee"), [receipts]);
  const archivedReceipts = useMemo(() => receipts.filter((receipt) => receipt.status === "Archivee"), [receipts]);

  const visibleReceipts = useMemo(() => {
    const source = tab === "archived" ? archivedReceipts : activeReceipts;
    const query = search.trim().toLowerCase();
    return source.filter((receipt) => {
      const matchesSearch =
        !query ||
        [receipt.title, receipt.vendor, receipt.category, receipt.annotation, receipt.status]
          .some((value) => String(value || "").toLowerCase().includes(query));
      const matchesStatus = statusFilter === "all" || receipt.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [activeReceipts, archivedReceipts, search, statusFilter, tab]);

  const totals = useMemo(() => {
    const ttc = activeReceipts.reduce((sum, receipt) => sum + (Number(receipt.amount_ttc) || 0), 0);
    const ht = activeReceipts.reduce((sum, receipt) => sum + (Number(receipt.amount_ht) || 0), 0);
    return { ht, ttc, count: activeReceipts.length };
  }, [activeReceipts]);

  const uploadDocument = async (document: File) => {
    if (!user) throw new Error("Non connecté");
    const sourceExtension = document.name.split(".").pop() || "jpg";
    const extension = sourceExtension.toLowerCase();
    const safeName = document.name.replace(/[^a-zA-Z0-9_.-]/g, "-").slice(-80);
    const path = `${user.id}/expenses/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}.${extension}`;
    const { error } = await supabase.storage.from("business-documents").upload(path, document, {
      contentType: document.type || "image/jpeg",
    });
    if (error) throw error;
    return path;
  };

  const resetNewForm = () => {
    setForm(emptyForm);
    setFile(null);
    setPendingDocument(null);
    setIsPhotoAnalyzing(false);
    setHasPhotoAnalysis(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const applyAnalysisToForm = (patch: AnalysisPatch, selectedFile: File) => {
    const vendor = asText(patch.vendor);
    const date = asText(patch.expense_date);
    const category = asText(patch.category);
    const amountHt = asAmountText(patch.amount_ht);
    const amountTtc = asAmountText(patch.amount_ttc);
    const annotation = asText(patch.annotation);
    setForm((current) => ({
      ...current,
      title: current.title || (vendor ? `Frais ${vendor}` : plainFileName(selectedFile.name) || "Note de frais"),
      vendor: vendor || current.vendor,
      expense_date: date || current.expense_date,
      category: EXPENSE_CATEGORIES.includes(category) ? category : current.category,
      amount_ht: amountHt || current.amount_ht,
      amount_ttc: amountTtc || current.amount_ttc,
      annotation: annotation || current.annotation,
    }));
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;
    setFile(selectedFile);
    setPendingDocument(null);
    setHasPhotoAnalysis(false);
    if (!selectedFile) return;

    try {
      const documentPath = await uploadDocument(selectedFile);
      const { data: signed } = await supabase.storage
        .from("business-documents")
        .createSignedUrl(documentPath, 3600);
      setPendingDocument({
        path: documentPath,
        name: selectedFile.name,
        mimeType: selectedFile.type || "image/jpeg",
        signedUrl: signed?.signedUrl || null,
      });

      if (!selectedFile.type.startsWith("image/")) {
        toast.info("PDF ajouté. L'analyse automatique est disponible sur les photos.");
        return;
      }

      setIsPhotoAnalyzing(true);
      const { data, error } = await supabase.functions.invoke("analyze-expense-receipt", {
        body: {
          document_path: documentPath,
          document_name: selectedFile.name,
          document_mime_type: selectedFile.type || "image/jpeg",
        },
      });
      const result = data as { error?: string; patch?: AnalysisPatch; extracted?: AnalysisPatch } | null;
      if (error || result?.error) throw new Error(error?.message || result?.error);
      applyAnalysisToForm(result?.patch || result?.extracted || {}, selectedFile);
      setHasPhotoAnalysis(true);
      toast.success("Photo analysée. Vérifiez puis enregistrez.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Analyse de la photo impossible"));
    } finally {
      setIsPhotoAnalyzing(false);
    }
  };

  const saveReceipt = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Non connecté");
      if (!form.title.trim() && !file) throw new Error("Ajoutez au moins un titre ou une photo.");
      const documentPath = pendingDocument?.path || (file ? await uploadDocument(file) : null);
      const amountHt = parseAmount(form.amount_ht);
      const amountTtc = parseAmount(form.amount_ttc);
      const vat = amountHt !== null && amountTtc !== null ? Number((amountTtc - amountHt).toFixed(2)) : null;
      const { error } = await db.from("expense_receipts").insert({
        user_id: user.id,
        title: form.title.trim() || file?.name || "Note de frais",
        vendor: form.vendor.trim() || null,
        expense_date: form.expense_date || null,
        category: form.category,
        amount_ht: amountHt,
        amount_ttc: amountTtc,
        vat_amount: vat,
        currency: "EUR",
        annotation: form.annotation.trim() || null,
        document_path: documentPath,
        document_name: pendingDocument?.name || file?.name || null,
        document_mime_type: pendingDocument?.mimeType || file?.type || null,
        analysis_status: hasPhotoAnalysis ? "analyse_ok" : "manuel",
        status: "A verifier",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      resetNewForm();
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["expense_receipts"] });
      queryClient.invalidateQueries({ queryKey: ["home_activity"] });
      toast.success("Note de frais enregistrée");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Enregistrement impossible")),
  });

  const updateReceipt = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<ExpenseReceipt> }) => {
      const nextPatch = patch.currency ? { ...patch, currency: normalizeCurrency(patch.currency) } : patch;
      const { error } = await db.from("expense_receipts").update(nextPatch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense_receipts"] });
      toast.success("Note mise à jour");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Modification impossible")),
  });

  const deleteReceipt = useMutation({
    mutationFn: async (receipt: ExpenseReceipt) => {
      const confirmed = window.confirm(`Supprimer "${receipt.title}" ?`);
      if (!confirmed) return;
      const { error } = await db.from("expense_receipts").delete().eq("id", receipt.id);
      if (error) throw error;
      if (receipt.document_path) {
        await supabase.storage.from("business-documents").remove([receipt.document_path]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense_receipts"] });
      toast.success("Note supprimée");
    },
  });

  const analyzeReceipt = useMutation({
    mutationFn: async (receipt: ExpenseReceipt) => {
      const { data, error } = await supabase.functions.invoke("analyze-expense-receipt", {
        body: { receipt_id: receipt.id },
      });
      const result = data as { error?: string } | null;
      if (error || result?.error) throw new Error(error?.message || result?.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense_receipts"] });
      toast.success("Analyse terminée. Vérifiez les montants avant export.");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Analyse impossible")),
  });

  const exportReceipts = () => {
    downloadCsv(
      `notes-de-frais-swan-${new Date().toISOString().slice(0, 10)}.csv`,
      visibleReceipts.map((receipt) => ({
        titre: receipt.title,
        fournisseur: receipt.vendor,
        date: receipt.expense_date,
        categorie: receipt.category,
        statut: statusLabel(receipt.status),
        ht: receipt.amount_ht,
        ttc: receipt.amount_ttc,
        tva: receipt.vat_amount,
        annotation: receipt.annotation,
        document: receipt.document_name,
      }))
    );
  };

  return (
    <div className="fade-in" style={{ paddingBottom: "var(--space-8)" }}>
      <PageHeader
        title="Notes de frais"
        subtitle="Photo, IA, validation et archive"
        back
        action={
          <div className="flex items-center gap-1.5">
            <TutorialButton
              title="Mémento notes de frais"
              intro="Centralisez vos justificatifs et préparez un export comptable propre."
              simpleSteps={[
                { title: "Capturer", text: "Photographiez le ticket ou ajoutez un PDF." },
                { title: "Analyser", text: "La photo est lue automatiquement avant l'enregistrement." },
                { title: "Vérifier", text: "Relisez toujours les montants avant validation ou export." },
                { title: "Archiver", text: "Le statut Archivée range la note dans l'onglet Archives." },
              ]}
              tips={["Le fichier reste privé : email et WhatsApp partagent uniquement un résumé.", "Une note exportée peut rester archivée dans SWAN pour traçabilité."]}
            />
            <FeedbackButton context="expenses" />
            <button
              onClick={() => setShowForm((current) => !current)}
              className={`btn btn-add ${showForm ? "btn-add-active" : ""}`}
              aria-label={showForm ? "Fermer le formulaire" : "Ajouter une note de frais"}
            >
              {showForm ? <X size={22} /> : <Plus size={24} />}
            </button>
          </div>
        }
      />

      <section className="px-4 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", marginBottom: "var(--space-4)" }}>
        <StatCard label="A traiter" value={String(totals.count)} />
        <StatCard label="Total H.T" value={money(totals.ht)} />
        <StatCard label="Total T.T.C" value={money(totals.ttc)} />
      </section>

      <section className="px-4" style={{ marginBottom: "var(--space-5)" }}>
        <div className="card card-glow" style={{ padding: "var(--space-4)" }}>
          <div className="flex items-start gap-3">
            <div className="plugin-icon-wrapper" style={{ background: "hsl(330 70% 55% / 0.12)" }}>
              <ShieldCheck size={22} style={{ color: "hsl(330 70% 55%)" }} />
            </div>
            <div>
              <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 800 }}>Coffre justificatifs</h2>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-2)", lineHeight: 1.55 }}>
                Les documents sont stockés dans un bucket privé Supabase, isolés par utilisateur via RLS.
                Le statut Archivée les sort de la vue active et les range dans l'onglet Archives.
              </p>
            </div>
          </div>
        </div>
      </section>

      {showForm && (
        <section className="px-4 slide-up" style={{ marginBottom: "var(--space-5)" }}>
          <div className="field-form-panel">
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
              <button
                className="btn btn-primary"
                style={{ minHeight: 48, boxShadow: "var(--shadow-glow-sm)" }}
                onClick={() => fileRef.current?.click()}
                disabled={isPhotoAnalyzing}
              >
                <Camera size={18} />
                {isPhotoAnalyzing ? "Analyse IA..." : file ? file.name : "Photo facture"}
              </button>
              <input className="field-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Objet : Déjeuner client" />
              <input className="field-input" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="Fournisseur" />
              <input className="field-input" type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
              <select className="field-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {EXPENSE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              </select>
              <input className="field-input" inputMode="decimal" value={form.amount_ht} onChange={(e) => setForm({ ...form, amount_ht: e.target.value })} placeholder="Montant H.T" />
              <input className="field-input" inputMode="decimal" value={form.amount_ttc} onChange={(e) => setForm({ ...form, amount_ttc: e.target.value })} placeholder="Montant T.T.C" />
            </div>

            {pendingDocument?.signedUrl && pendingDocument.mimeType.startsWith("image/") && (
              <div className="mt-3 rounded-lg overflow-hidden border border-border bg-muted" style={{ maxWidth: 360 }}>
                <img src={pendingDocument.signedUrl} alt="Aperçu justificatif" style={{ width: "100%", maxHeight: 220, objectFit: "cover" }} />
              </div>
            )}

            <textarea className="field-input w-full mt-3" rows={3} value={form.annotation} onChange={(e) => setForm({ ...form, annotation: e.target.value })} placeholder="Annotation : contexte, client, motif, point juridique/administratif..." />

            <div className="flex flex-wrap gap-2 mt-3">
              <button className="btn btn-primary" disabled={saveReceipt.isPending || isPhotoAnalyzing} onClick={() => saveReceipt.mutate()}>
                <Banknote size={16} />
                Enregistrer
              </button>
              <button className="btn btn-secondary" onClick={resetNewForm} disabled={saveReceipt.isPending || isPhotoAnalyzing}>
                <X size={16} />
                Effacer
              </button>
              <button className="btn btn-secondary" onClick={exportReceipts}>
                <Download size={16} />
                Export CSV
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="px-4">
        <div className="flex flex-wrap gap-2 items-center justify-between" style={{ marginBottom: "var(--space-3)" }}>
          <div className="flex gap-2 p-1 rounded-lg bg-muted" style={{ flex: "0 0 auto" }}>
            <button
              onClick={() => setTab("active")}
              className={`btn btn-sm ${tab === "active" ? "btn-primary" : "btn-ghost"}`}
            >
              <FileText size={14} />
              Actives ({activeReceipts.length})
            </button>
            <button
              onClick={() => setTab("archived")}
              className={`btn btn-sm ${tab === "archived" ? "btn-primary" : "btn-ghost"}`}
            >
              <Archive size={14} />
              Archives ({archivedReceipts.length})
            </button>
          </div>
          <div className="relative" style={{ flex: "1 1 260px" }}>
            <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-3)" }} />
            <input className="field-input w-full" style={{ paddingLeft: 36 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher fournisseur, catégorie, annotation..." />
          </div>
          <select className="field-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Tous les statuts</option>
            {EXPENSE_STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
          </select>
        </div>

        <div className="grid gap-2">
          {isLoading && <div className="card p-4">Chargement...</div>}
          {!isLoading && visibleReceipts.length === 0 && (
            <div className="card p-4">{tab === "archived" ? "Aucune note archivée." : "Aucune note de frais active."}</div>
          )}
          {visibleReceipts.map((receipt) => (
            <ExpenseRow
              key={receipt.id}
              receipt={receipt}
              expanded={expandedId === receipt.id}
              onToggle={() => setExpandedId((current) => (current === receipt.id ? null : receipt.id))}
              onAnalyze={() => analyzeReceipt.mutate(receipt)}
              onSave={(patch) => updateReceipt.mutate({ id: receipt.id, patch })}
              onDelete={() => deleteReceipt.mutate(receipt)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card" style={{ padding: "var(--space-4)" }}>
      <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-2)", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: "var(--text-2xl)", fontWeight: 900, fontFamily: "var(--font-display)" }}>{value}</div>
    </div>
  );
}

function ExpenseRow({
  receipt,
  expanded,
  onToggle,
  onAnalyze,
  onSave,
  onDelete,
}: {
  receipt: ExpenseReceipt;
  expanded: boolean;
  onToggle: () => void;
  onAnalyze: () => void;
  onSave: (patch: Partial<ExpenseReceipt>) => void;
  onDelete: () => void;
}) {
  const text = encodeURIComponent(buildShareText(receipt));
  const isImage = receipt.document_mime_type?.startsWith("image/");
  const meta = statusMeta(receipt.status);
  const [draft, setDraft] = useState<ReceiptDraft>(() => toDraft(receipt));

  useEffect(() => {
    setDraft(toDraft(receipt));
  }, [receipt]);

  const saveDraft = () => onSave(draftToPatch(draft));

  return (
    <article
      className="plugin-record"
      style={{
        "--record-color": meta.color,
        background: `linear-gradient(145deg, ${meta.bg}, var(--color-surface))`,
      } as CSSProperties}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggle}
          className="btn btn-icon-sm btn-ghost shrink-0"
          aria-label={expanded ? "Replier la note" : "Déplier la note"}
        >
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        <div className="rounded-lg border border-border bg-background flex items-center justify-center shrink-0" style={{ width: 42, height: 42 }}>
          {isImage && receipt.signedUrl ? (
            <img src={receipt.signedUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }} />
          ) : (
            <FileText size={20} style={{ color: "var(--color-text-3)" }} />
          )}
        </div>

        <button type="button" onClick={onToggle} className="min-w-0 text-left" style={{ flex: "1 1 auto" }}>
          <h3 className="plugin-record-title truncate" style={{ fontSize: "var(--text-base)" }}>{receipt.title}</h3>
          <p className="plugin-record-meta mt-1">
            <span>{receipt.vendor || "Fournisseur à renseigner"}</span>
            <span>{formatDate(receipt.expense_date)}</span>
            <span>{money(receipt.amount_ttc, receipt.currency)}</span>
          </p>
        </button>

        <span
          className="badge shrink-0"
          style={{ backgroundColor: meta.bg, color: meta.text, border: `1px solid ${meta.color}` }}
        >
          {statusLabel(receipt.status)}
        </span>
      </div>

      {expanded && (
        <div className="mt-4 grid gap-4">
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <div className="rounded-xl overflow-hidden border border-border bg-muted flex items-center justify-center" style={{ minHeight: 160 }}>
              {isImage && receipt.signedUrl ? (
                <img src={receipt.signedUrl} alt={receipt.title} style={{ width: "100%", height: "100%", maxHeight: 260, objectFit: "cover" }} />
              ) : (
                <div className="grid place-items-center gap-2 text-muted-foreground">
                  <ImageIcon size={30} />
                  <span className="text-xs">{receipt.document_name || "Aucun aperçu"}</span>
                </div>
              )}
            </div>

            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
              <input className="field-input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Objet" />
              <input className="field-input" value={draft.vendor} onChange={(e) => setDraft({ ...draft, vendor: e.target.value })} placeholder="Fournisseur" />
              <input className="field-input" type="date" value={draft.expense_date} onChange={(e) => setDraft({ ...draft, expense_date: e.target.value })} />
              <select className="field-input" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                {EXPENSE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              </select>
              <input className="field-input" inputMode="decimal" value={draft.amount_ht} onChange={(e) => setDraft({ ...draft, amount_ht: e.target.value })} placeholder="Montant H.T" />
              <input className="field-input" inputMode="decimal" value={draft.amount_ttc} onChange={(e) => setDraft({ ...draft, amount_ttc: e.target.value })} placeholder="Montant T.T.C" />
              <select className="field-input" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
                {EXPENSE_STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
              </select>
              <div className="flex flex-wrap gap-2 items-center">
                <span className="badge badge-info">HT {money(receipt.amount_ht, receipt.currency)}</span>
                <span className="badge badge-success">TTC {money(receipt.amount_ttc, receipt.currency)}</span>
              </div>
            </div>
          </div>

          <textarea
            className="field-input w-full"
            rows={3}
            value={draft.annotation}
            onChange={(event) => setDraft({ ...draft, annotation: event.target.value })}
            placeholder="Annotation associée au justificatif..."
          />

          <div className="plugin-record-actions justify-start">
            <button className="btn btn-primary btn-sm" onClick={saveDraft}>
              <Save size={14} />
              Enregistrer les modifs
            </button>
            <button className="btn btn-secondary btn-sm" onClick={onAnalyze} disabled={!receipt.document_path}>
              <Sparkles size={14} />
              Analyse auto
            </button>
            {receipt.signedUrl && (
              <button className="btn btn-secondary btn-sm" onClick={() => window.open(receipt.signedUrl || "", "_blank", "noopener,noreferrer")}>
                <ExternalLink size={14} />
                Aperçu
              </button>
            )}
            <button className="btn btn-secondary btn-sm" onClick={() => window.open(`mailto:?subject=${encodeURIComponent(receipt.title)}&body=${text}`)}>
              <Mail size={14} />
              Email
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer")}>
              <MessageSquare size={14} />
              WhatsApp
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onDelete}>
              <Trash2 size={14} />
              Supprimer
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
