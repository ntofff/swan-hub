export type ExpenseReceipt = {
  id: string;
  user_id: string;
  title: string;
  vendor: string | null;
  expense_date: string | null;
  category: string;
  status: string;
  amount_ht: number | null;
  amount_ttc: number | null;
  vat_amount: number | null;
  currency: string;
  annotation: string | null;
  document_path: string | null;
  document_name: string | null;
  document_mime_type: string | null;
  analysis_status: string;
  analysis_payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  signedUrl?: string | null;
};

export type InventoryItem = {
  id: string;
  user_id: string;
  name: string;
  category: string;
  reference: string | null;
  serial_number: string | null;
  assigned_to: string | null;
  location: string | null;
  status: string;
  last_maintenance_at: string | null;
  next_maintenance_at: string | null;
  notes: string | null;
  photo_path: string | null;
  photo_name: string | null;
  created_at: string;
  updated_at: string;
  signedUrl?: string | null;
};

export const EXPENSE_CATEGORIES = [
  "Repas",
  "Transport",
  "Hébergement",
  "Carburant",
  "Fournitures",
  "Abonnement",
  "Client",
  "Autre",
];

export const EXPENSE_STATUSES = ["A verifier", "Validee", "Exportee", "Archivee"];

export const INVENTORY_CATEGORIES = [
  "Informatique",
  "Outillage",
  "Vehicule",
  "EPI",
  "Bureau",
  "Stock",
  "Materiel",
];

export const INVENTORY_STATUSES = [
  { value: "operationnel", label: "Opérationnel", color: "142 71% 45%" },
  { value: "a_controler", label: "À contrôler", color: "38 92% 50%" },
  { value: "maintenance", label: "Maintenance", color: "25 95% 53%" },
  { value: "hors_service", label: "Hors service", color: "0 72% 51%" },
  { value: "stock", label: "En stock", color: "217 91% 60%" },
];

export const parseAmount = (value: string) => {
  const clean = value.trim().replace(",", ".").replace(/[^\d.-]/g, "");
  if (!clean) return null;
  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : null;
};

export const normalizeCurrency = (value?: string | null) => {
  const raw = String(value || "").trim();
  const normalized = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (!normalized || normalized === "€" || normalized === "eur" || normalized === "euro" || normalized === "euros") {
    return "EUR";
  }
  if (normalized === "$" || normalized === "usd" || normalized === "dollar" || normalized === "dollars") {
    return "USD";
  }
  if (normalized === "£" || normalized === "gbp" || normalized === "pound" || normalized === "pounds" || normalized === "livre") {
    return "GBP";
  }

  const candidate = raw.toUpperCase();
  try {
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: candidate }).format(1);
    return candidate;
  } catch {
    return "EUR";
  }
};

export const money = (value?: number | null, currency = "EUR") =>
  typeof value === "number"
    ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: normalizeCurrency(currency) }).format(value)
    : "—";

export const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("fr-FR") : "—";

export const buildCsv = (rows: Array<Record<string, unknown>>) => {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [headers.join(";"), ...rows.map((row) => headers.map((header) => escape(row[header])).join(";"))].join("\n");
};

export const downloadCsv = (filename: string, rows: Array<Record<string, unknown>>) => {
  const csv = buildCsv(rows);
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 500);
};
