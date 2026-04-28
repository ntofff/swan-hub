import { useMemo, useRef, useState } from "react";
import {
  Banknote,
  Camera,
  Download,
  FileText,
  Mail,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
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
  parseAmount,
} from "@/lib/businessTools";

const db = supabase as any;

const emptyForm = {
  title: "",
  vendor: "",
  expense_date: "",
  category: "Autre",
  amount_ht: "",
  amount_ttc: "",
  annotation: "",
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

export default function ExpensesPlugin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
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
          if (!receipt.document_path) return { ...receipt, signedUrl: null };
          const { data: signed } = await supabase.storage
            .from("business-documents")
            .createSignedUrl(receipt.document_path, 3600);
          return { ...receipt, signedUrl: signed?.signedUrl || null };
        })
      );
    },
  });

  const filteredReceipts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return receipts.filter((receipt) => {
      const matchesSearch =
        !query ||
        [receipt.title, receipt.vendor, receipt.category, receipt.annotation, receipt.status]
          .some((value) => String(value || "").toLowerCase().includes(query));
      const matchesStatus = statusFilter === "all" || receipt.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [receipts, search, statusFilter]);

  const totals = useMemo(() => {
    const ttc = receipts.reduce((sum, receipt) => sum + (Number(receipt.amount_ttc) || 0), 0);
    const ht = receipts.reduce((sum, receipt) => sum + (Number(receipt.amount_ht) || 0), 0);
    return { ht, ttc, count: receipts.length };
  }, [receipts]);

  const uploadDocument = async (document: File) => {
    if (!user) throw new Error("Non connecté");
    const extension = document.name.split(".").pop() || "jpg";
    const safeName = document.name.replace(/[^a-zA-Z0-9_.-]/g, "-").slice(-80);
    const path = `${user.id}/expenses/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}.${extension}`;
    const { error } = await supabase.storage.from("business-documents").upload(path, document, {
      contentType: document.type || "image/jpeg",
    });
    if (error) throw error;
    return path;
  };

  const saveReceipt = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Non connecté");
      if (!form.title.trim() && !file) throw new Error("Ajoutez au moins un titre ou une photo.");
      const documentPath = file ? await uploadDocument(file) : null;
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
        annotation: form.annotation.trim() || null,
        document_path: documentPath,
        document_name: file?.name || null,
        document_mime_type: file?.type || null,
        status: "A verifier",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setForm(emptyForm);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["expense_receipts"] });
      queryClient.invalidateQueries({ queryKey: ["home_activity"] });
      toast.success("Note de frais enregistrée");
    },
    onError: (error: any) => toast.error(error.message || "Enregistrement impossible"),
  });

  const updateReceipt = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<ExpenseReceipt> }) => {
      const { error } = await db.from("expense_receipts").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expense_receipts"] }),
    onError: (error: any) => toast.error(error.message || "Modification impossible"),
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
      if (error || (data as any)?.error) throw new Error(error?.message || (data as any)?.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense_receipts"] });
      toast.success("Analyse terminée. Vérifiez les montants avant export.");
    },
    onError: (error: any) => toast.error(error.message || "Analyse impossible"),
  });

  const exportReceipts = () => {
    downloadCsv(
      `notes-de-frais-swan-${new Date().toISOString().slice(0, 10)}.csv`,
      filteredReceipts.map((receipt) => ({
        titre: receipt.title,
        fournisseur: receipt.vendor,
        date: receipt.expense_date,
        categorie: receipt.category,
        statut: receipt.status,
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
        subtitle="Photo, classement, HT/TTC, annotation et export sécurisé"
        back
        action={
          <>
            <TutorialButton
              title="Mémento notes de frais"
              intro="Centralisez vos justificatifs et préparez un export comptable propre."
              simpleSteps={[
                { title: "Capturer", text: "Photographiez le ticket ou ajoutez un PDF." },
                { title: "Analyser", text: "Lancez Analyse auto pour extraire fournisseur, HT, TVA et TTC." },
                { title: "Vérifier", text: "Relisez toujours les montants avant validation ou export." },
                { title: "Annoter", text: "Ajoutez le contexte administratif ou juridique associé au justificatif." },
              ]}
              tips={["Le fichier reste privé : email et WhatsApp partagent uniquement un résumé.", "Une note exportée peut rester archivée dans SWAN pour traçabilité."]}
            />
            <FeedbackButton context="expenses" />
          </>
        }
      />

      <section className="px-4 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", marginBottom: "var(--space-4)" }}>
        <StatCard label="Justificatifs" value={String(totals.count)} />
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
                Le partage email/WhatsApp transmet un résumé, pas le fichier privé.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4" style={{ marginBottom: "var(--space-5)" }}>
        <div className="card" style={{ padding: "var(--space-4)" }}>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            className="hidden"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />

          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <button className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
              <Camera size={16} />
              {file ? file.name : "Photo facture / PDF"}
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

          <textarea className="field-input w-full mt-3" rows={3} value={form.annotation} onChange={(e) => setForm({ ...form, annotation: e.target.value })} placeholder="Annotation : contexte, client, motif, point juridique/administratif..." />

          <div className="flex flex-wrap gap-2 mt-3">
            <button className="btn btn-primary" disabled={saveReceipt.isPending} onClick={() => saveReceipt.mutate()}>
              <Banknote size={16} />
              Enregistrer
            </button>
            <button className="btn btn-secondary" onClick={exportReceipts}>
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>
      </section>

      <section className="px-4">
        <div className="flex flex-wrap gap-2 items-center justify-between" style={{ marginBottom: "var(--space-3)" }}>
          <div className="relative" style={{ flex: "1 1 260px" }}>
            <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-3)" }} />
            <input className="field-input w-full" style={{ paddingLeft: 36 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher fournisseur, catégorie, annotation..." />
          </div>
          <select className="field-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Tous les statuts</option>
            {EXPENSE_STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
        </div>

        <div className="grid gap-3">
          {isLoading && <div className="card p-4">Chargement...</div>}
          {!isLoading && filteredReceipts.length === 0 && <div className="card p-4">Aucune note de frais pour le moment.</div>}
          {filteredReceipts.map((receipt) => (
            <ExpenseCard
              key={receipt.id}
              receipt={receipt}
              onAnalyze={() => analyzeReceipt.mutate(receipt)}
              onUpdate={(patch) => updateReceipt.mutate({ id: receipt.id, patch })}
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

function ExpenseCard({
  receipt,
  onAnalyze,
  onUpdate,
  onDelete,
}: {
  receipt: ExpenseReceipt;
  onAnalyze: () => void;
  onUpdate: (patch: Partial<ExpenseReceipt>) => void;
  onDelete: () => void;
}) {
  const text = encodeURIComponent(buildShareText(receipt));
  const isImage = receipt.document_mime_type?.startsWith("image/");

  return (
    <article className="plugin-record" style={{ display: "grid", gridTemplateColumns: "96px minmax(0, 1fr)", gap: "var(--space-3)" }}>
      <div className="rounded-xl overflow-hidden border border-border bg-muted flex items-center justify-center" style={{ minHeight: 96 }}>
        {isImage && receipt.signedUrl ? (
          <img src={receipt.signedUrl} alt={receipt.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <FileText size={28} style={{ color: "var(--color-text-3)" }} />
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="flex flex-wrap gap-2 items-start justify-between">
          <div style={{ minWidth: 0 }}>
            <h3 className="plugin-record-title truncate">{receipt.title}</h3>
            <p className="plugin-record-meta mt-1">
              {receipt.vendor || "Fournisseur à renseigner"} · {formatDate(receipt.expense_date)} · {receipt.category}
            </p>
          </div>
          <select className="field-input" style={{ width: 145, minHeight: 34 }} value={receipt.status} onChange={(e) => onUpdate({ status: e.target.value })}>
            {EXPENSE_STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          <span className="badge badge-info">HT {money(receipt.amount_ht, receipt.currency)}</span>
          <span className="badge badge-success">TTC {money(receipt.amount_ttc, receipt.currency)}</span>
          <span className="badge badge-warning">{receipt.analysis_status}</span>
        </div>

        <textarea
          className="field-input w-full mt-3"
          rows={2}
          value={receipt.annotation || ""}
          onChange={(event) => onUpdate({ annotation: event.target.value })}
          placeholder="Annotation associée au justificatif..."
        />

        <div className="plugin-record-actions justify-start mt-3">
          <button className="btn btn-primary btn-sm" onClick={onAnalyze} disabled={!receipt.document_path}>
            <Sparkles size={14} />
            Analyse auto
          </button>
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
    </article>
  );
}
