import { useMemo, useState } from "react";
import { Bell, CheckCircle2, Inbox, Loader2, MessageSquare, Search, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type Feedback = {
  id: string;
  user_id: string;
  type: string;
  message: string;
  context: string | null;
  plugin: string | null;
  screen: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
};

const typeLabel: Record<string, string> = {
  bug: "Bug",
  suggestion: "Suggestion",
  ux: "Pb app",
  useful: "Utile",
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export default function Notifications() {
  const { isAdmin, user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("open");

  const { data: feedback = [], isLoading } = useQuery({
    queryKey: ["feedback_notifications", isAdmin ? "admin" : user?.id],
    enabled: !!user,
    queryFn: async () => {
      let query = supabase
        .from("feedback")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(isAdmin ? 200 : 50);

      if (!isAdmin && user) query = query.eq("user_id", user.id);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Feedback[];
    },
  });

  const openCount = useMemo(
    () => feedback.filter((item) => item.status === "open").length,
    [feedback]
  );

  const filteredFeedback = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return feedback.filter((item) => {
      const matchesSearch =
        !needle ||
        [item.type, item.message, item.context, item.plugin, item.screen, item.admin_note, item.user_id]
          .some((value) => String(value || "").toLowerCase().includes(needle));
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [feedback, search, statusFilter]);

  const updateFeedback = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Feedback> }) => {
      const { error } = await supabase.from("feedback").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback_notifications"] });
      queryClient.invalidateQueries({ queryKey: ["feedback_notifications_count"] });
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Mise à jour impossible")),
  });

  const deleteFeedback = useMutation({
    mutationFn: async (id: string) => {
      if (!window.confirm("Supprimer ce retour utilisateur ?")) return;
      const { error } = await supabase.from("feedback").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback_notifications"] });
      queryClient.invalidateQueries({ queryKey: ["feedback_notifications_count"] });
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Suppression impossible")),
  });

  return (
    <div className="fade-in" style={{ paddingBottom: "var(--space-8)" }}>
      <PageHeader
        title={isAdmin ? "Notifications admin" : "Mes retours"}
        subtitle={
          isAdmin
            ? `${openCount} retour${openCount > 1 ? "s" : ""} utilisateur à traiter`
            : "Suivi des retours que vous avez envoyés"
        }
        back
      />

      <section className="px-4" style={{ marginBottom: "var(--space-4)" }}>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <StatCard label="Non traités" value={String(openCount)} />
          <StatCard label="Total" value={String(feedback.length)} />
        </div>
      </section>

      <section className="px-4">
        <div className="flex flex-wrap gap-2 items-center justify-between" style={{ marginBottom: "var(--space-3)" }}>
          <div className="relative" style={{ flex: "1 1 260px" }}>
            <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-3)" }} />
            <input
              className="field-input w-full"
              style={{ paddingLeft: 36 }}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un retour..."
            />
          </div>
          <select className="field-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="open">Non traités</option>
            <option value="closed">Traités</option>
            <option value="all">Tous</option>
          </select>
        </div>

        <div className="grid gap-3">
          {isLoading && (
            <div className="card p-4 flex items-center gap-2">
              <Loader2 className="animate-spin" size={16} />
              Chargement des retours...
            </div>
          )}

          {!isLoading && filteredFeedback.length === 0 && (
            <div className="card p-6 text-center text-muted-foreground">
              <Inbox className="mx-auto mb-2" size={28} />
              Aucun retour à afficher.
            </div>
          )}

          {filteredFeedback.map((item) => (
            <article key={item.id} className="plugin-record">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div style={{ minWidth: 0 }}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={item.status === "open" ? "badge badge-warning" : "badge badge-success"}>
                      {item.status === "open" ? "Non traité" : "Traité"}
                    </span>
                    <span className="badge badge-info">{typeLabel[item.type] || item.type}</span>
                    {item.plugin && <span className="badge">{item.plugin}</span>}
                  </div>
                  <p className="plugin-record-meta mt-2">
                    {formatDateTime(item.created_at)} · {item.screen || "Écran inconnu"} · utilisateur {item.user_id.slice(0, 8)}
                  </p>
                </div>
                <Bell size={18} style={{ color: item.status === "open" ? "hsl(var(--primary))" : "var(--color-text-3)" }} />
              </div>

              <p className="mt-3" style={{ whiteSpace: "pre-wrap", lineHeight: 1.55 }}>
                {item.message}
              </p>

              {isAdmin && (
                <>
                  <textarea
                    className="field-input w-full mt-3"
                    rows={2}
                    value={item.admin_note || ""}
                    onChange={(event) => updateFeedback.mutate({ id: item.id, patch: { admin_note: event.target.value } })}
                    placeholder="Note admin interne..."
                  />
                  <div className="plugin-record-actions justify-start mt-3">
                    {item.status !== "closed" && (
                      <button className="btn btn-primary btn-sm" onClick={() => updateFeedback.mutate({ id: item.id, patch: { status: "closed" } })}>
                        <CheckCircle2 size={14} />
                        Marquer traité
                      </button>
                    )}
                    {item.status !== "open" && (
                      <button className="btn btn-secondary btn-sm" onClick={() => updateFeedback.mutate({ id: item.id, patch: { status: "open" } })}>
                        <MessageSquare size={14} />
                        Rouvrir
                      </button>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={() => deleteFeedback.mutate(item.id)}>
                      <Trash2 size={14} />
                      Supprimer
                    </button>
                  </div>
                </>
              )}
            </article>
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
