import { useMemo, useRef, useState } from "react";
import {
  Camera,
  Download,
  MapPin,
  Package,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  Wrench,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import { TutorialButton } from "@/components/TutorialButton";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  INVENTORY_CATEGORIES,
  INVENTORY_STATUSES,
  InventoryItem,
  downloadCsv,
  formatDate,
} from "@/lib/businessTools";

const db = supabase as any;

const emptyForm = {
  name: "",
  category: "Materiel",
  reference: "",
  serial_number: "",
  assigned_to: "",
  location: "",
  status: "operationnel",
  last_maintenance_at: "",
  next_maintenance_at: "",
  notes: "",
};

export default function InventoryPlugin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(emptyForm);
  const [photo, setPhoto] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["inventory_items"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db
        .from("inventory_items")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const rows = (data || []) as InventoryItem[];
      return Promise.all(
        rows.map(async (item) => {
          if (!item.photo_path) return { ...item, signedUrl: null };
          const { data: signed } = await supabase.storage
            .from("business-documents")
            .createSignedUrl(item.photo_path, 3600);
          return { ...item, signedUrl: signed?.signedUrl || null };
        })
      );
    },
  });

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch =
        !query ||
        [item.name, item.category, item.reference, item.serial_number, item.assigned_to, item.location, item.notes]
          .some((value) => String(value || "").toLowerCase().includes(query));
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [items, search, statusFilter, categoryFilter]);

  const stats = useMemo(() => {
    const maintenance = items.filter((item) => item.status === "maintenance" || item.status === "a_controler").length;
    const assigned = items.filter((item) => item.assigned_to).length;
    const upcoming = items.filter((item) => {
      if (!item.next_maintenance_at) return false;
      const next = new Date(item.next_maintenance_at).getTime();
      return next <= Date.now() + 30 * 86_400_000;
    }).length;
    return { total: items.length, maintenance, assigned, upcoming };
  }, [items]);

  const uploadPhoto = async (file: File) => {
    if (!user) throw new Error("Non connecté");
    const extension = file.name.split(".").pop() || "jpg";
    const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "-").slice(-80);
    const path = `${user.id}/inventory/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}.${extension}`;
    const { error } = await supabase.storage.from("business-documents").upload(path, file, {
      contentType: file.type || "image/jpeg",
    });
    if (error) throw error;
    return path;
  };

  const saveItem = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Non connecté");
      if (!form.name.trim()) throw new Error("Le nom du matériel est obligatoire.");
      const photoPath = photo ? await uploadPhoto(photo) : null;
      const { error } = await db.from("inventory_items").insert({
        user_id: user.id,
        name: form.name.trim(),
        category: form.category,
        reference: form.reference.trim() || null,
        serial_number: form.serial_number.trim() || null,
        assigned_to: form.assigned_to.trim() || null,
        location: form.location.trim() || null,
        status: form.status,
        last_maintenance_at: form.last_maintenance_at || null,
        next_maintenance_at: form.next_maintenance_at || null,
        notes: form.notes.trim() || null,
        photo_path: photoPath,
        photo_name: photo?.name || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setForm(emptyForm);
      setPhoto(null);
      if (fileRef.current) fileRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["inventory_items"] });
      queryClient.invalidateQueries({ queryKey: ["home_activity"] });
      toast.success("Matériel ajouté à l'inventaire");
    },
    onError: (error: any) => toast.error(error.message || "Enregistrement impossible"),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<InventoryItem> }) => {
      const { error } = await db.from("inventory_items").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory_items"] }),
    onError: (error: any) => toast.error(error.message || "Modification impossible"),
  });

  const deleteItem = useMutation({
    mutationFn: async (item: InventoryItem) => {
      const confirmed = window.confirm(`Supprimer "${item.name}" de l'inventaire ?`);
      if (!confirmed) return;
      const { error } = await db.from("inventory_items").delete().eq("id", item.id);
      if (error) throw error;
      if (item.photo_path) await supabase.storage.from("business-documents").remove([item.photo_path]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory_items"] });
      toast.success("Matériel supprimé");
    },
  });

  const exportInventory = () => {
    downloadCsv(
      `inventaire-swan-${new Date().toISOString().slice(0, 10)}.csv`,
      filteredItems.map((item) => ({
        nom: item.name,
        categorie: item.category,
        reference: item.reference,
        numero_serie: item.serial_number,
        affecte_a: item.assigned_to,
        lieu: item.location,
        statut: statusLabel(item.status),
        entretien_passe: item.last_maintenance_at,
        entretien_futur: item.next_maintenance_at,
        notes: item.notes,
      }))
    );
  };

  return (
    <div className="fade-in" style={{ paddingBottom: "var(--space-8)" }}>
      <PageHeader
        title="Inventaire matériel"
        subtitle="Stock, affectations, localisation, état et entretiens"
        back
        action={
          <>
            <TutorialButton
              title="Mémento inventaire"
              intro="Gardez une trace claire du matériel, de son état et de ses affectations."
              simpleSteps={[
                { title: "Créer", text: "Ajoutez le matériel avec photo, référence et catégorie." },
                { title: "Affecter", text: "Renseignez la personne responsable et le lieu." },
                { title: "Suivre", text: "Mettez à jour le statut et les dates d'entretien." },
                { title: "Exporter", text: "Exportez le stock filtré en CSV pour archive ou contrôle." },
              ]}
              tips={["Les photos sont stockées dans un bucket privé.", "Les filtres permettent de retrouver vite un stock important."]}
            />
            <FeedbackButton context="inventory" />
          </>
        }
      />

      <section className="px-4 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", marginBottom: "var(--space-4)" }}>
        <StatCard label="Matériels" value={String(stats.total)} />
        <StatCard label="Affectés" value={String(stats.assigned)} />
        <StatCard label="À suivre" value={String(stats.maintenance)} />
        <StatCard label="Entretiens 30j" value={String(stats.upcoming)} />
      </section>

      <section className="px-4" style={{ marginBottom: "var(--space-5)" }}>
        <div className="card card-glow" style={{ padding: "var(--space-4)" }}>
          <div className="flex items-start gap-3">
            <div className="plugin-icon-wrapper" style={{ background: "hsl(199 89% 48% / 0.12)" }}>
              <ShieldCheck size={22} style={{ color: "hsl(199 89% 48%)" }} />
            </div>
            <div>
              <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 800 }}>Traçabilité matériel</h2>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-2)", lineHeight: 1.55 }}>
                Chaque ligne lie le matériel à une personne, un lieu, un statut et un calendrier d'entretien.
                Pratique pour les contrôles internes, la maintenance et la restitution.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4" style={{ marginBottom: "var(--space-5)" }}>
        <div className="card" style={{ padding: "var(--space-4)" }}>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => setPhoto(event.target.files?.[0] || null)} />
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <button className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
              <Camera size={16} />
              {photo ? photo.name : "Photo matériel"}
            </button>
            <input className="field-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nom matériel" />
            <select className="field-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {INVENTORY_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
            </select>
            <input className="field-input" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Référence" />
            <input className="field-input" value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} placeholder="N° série" />
            <input className="field-input" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} placeholder="Affecté à" />
            <input className="field-input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Lieu" />
            <select className="field-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {INVENTORY_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
            <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
              Dernier entretien
              <input className="field-input" type="date" value={form.last_maintenance_at} onChange={(e) => setForm({ ...form, last_maintenance_at: e.target.value })} />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
              Prochain entretien
              <input className="field-input" type="date" value={form.next_maintenance_at} onChange={(e) => setForm({ ...form, next_maintenance_at: e.target.value })} />
            </label>
          </div>
          <textarea className="field-input w-full mt-3" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes, état, accessoires, consignes..." />
          <div className="flex flex-wrap gap-2 mt-3">
            <button className="btn btn-primary" disabled={saveItem.isPending} onClick={() => saveItem.mutate()}>
              <Package size={16} />
              Ajouter au stock
            </button>
            <button className="btn btn-secondary" onClick={exportInventory}>
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>
      </section>

      <section className="px-4">
        <div className="flex flex-wrap gap-2 items-center justify-between" style={{ marginBottom: "var(--space-3)" }}>
          <div className="relative" style={{ flex: "1 1 240px" }}>
            <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-3)" }} />
            <input className="field-input w-full" style={{ paddingLeft: 36 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher matériel, personne, lieu..." />
          </div>
          <select className="field-input" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="all">Toutes catégories</option>
            {INVENTORY_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
          </select>
          <select className="field-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Tous statuts</option>
            {INVENTORY_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
        </div>

        <div className="grid gap-3">
          {isLoading && <div className="card p-4">Chargement...</div>}
          {!isLoading && filteredItems.length === 0 && <div className="card p-4">Aucun matériel pour le moment.</div>}
          {filteredItems.map((item) => (
            <InventoryCard
              key={item.id}
              item={item}
              onUpdate={(patch) => updateItem.mutate({ id: item.id, patch })}
              onDelete={() => deleteItem.mutate(item)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function statusLabel(statusValue: string) {
  return INVENTORY_STATUSES.find((status) => status.value === statusValue)?.label || statusValue;
}

function statusColor(statusValue: string) {
  return INVENTORY_STATUSES.find((status) => status.value === statusValue)?.color || "217 91% 60%";
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card" style={{ padding: "var(--space-4)" }}>
      <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-2)", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: "var(--text-2xl)", fontWeight: 900, fontFamily: "var(--font-display)" }}>{value}</div>
    </div>
  );
}

function InventoryCard({
  item,
  onUpdate,
  onDelete,
}: {
  item: InventoryItem;
  onUpdate: (patch: Partial<InventoryItem>) => void;
  onDelete: () => void;
}) {
  const color = statusColor(item.status);
  return (
    <article className="plugin-record" style={{ display: "grid", gridTemplateColumns: "92px minmax(0, 1fr)", gap: "var(--space-3)" }}>
      <div className="rounded-xl overflow-hidden border border-border bg-muted flex items-center justify-center" style={{ minHeight: 92 }}>
        {item.signedUrl ? (
          <img src={item.signedUrl} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <Package size={28} style={{ color: "var(--color-text-3)" }} />
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="flex flex-wrap gap-2 items-start justify-between">
          <div style={{ minWidth: 0 }}>
            <h3 className="plugin-record-title truncate">{item.name}</h3>
            <p className="plugin-record-meta mt-1">{item.category}{item.reference ? ` · ${item.reference}` : ""}{item.serial_number ? ` · SN ${item.serial_number}` : ""}</p>
          </div>
          <select className="field-input" style={{ width: 160, minHeight: 34 }} value={item.status} onChange={(e) => onUpdate({ status: e.target.value })}>
            {INVENTORY_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          <span className="badge" style={{ background: `hsl(${color} / 0.12)`, color: `hsl(${color})` }}>{statusLabel(item.status)}</span>
          <span className="badge badge-info"><UserRound size={11} /> {item.assigned_to || "Non affecté"}</span>
          <span className="badge badge-info"><MapPin size={11} /> {item.location || "Lieu non renseigné"}</span>
          <span className="badge badge-warning"><Wrench size={11} /> Entretien {formatDate(item.next_maintenance_at)}</span>
        </div>

        <textarea
          className="field-input w-full mt-3"
          rows={2}
          value={item.notes || ""}
          onChange={(event) => onUpdate({ notes: event.target.value })}
          placeholder="Notes matériel..."
        />

        <div className="plugin-record-actions justify-start mt-3">
          <button className="btn btn-secondary btn-sm" onClick={() => onUpdate({ assigned_to: window.prompt("Affecter à :", item.assigned_to || "") || item.assigned_to })}>
            <UserRound size={14} />
            Affecter
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => onUpdate({ location: window.prompt("Lieu :", item.location || "") || item.location })}>
            <MapPin size={14} />
            Déplacer
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
