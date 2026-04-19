import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import {
  Plus, Search, Trash2, Pencil, X, Check, Clock, MapPin,
  ChevronDown, ChevronUp, Archive, CalendarPlus, User,
  Phone, Euro, MessageSquare, Calendar
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const statusOptions = [
  { value: "Actif", cls: "bg-blue-500/15 text-blue-500", color: "217 91% 60%" },
  { value: "En cours", cls: "bg-warning/15 text-warning", color: "38 92% 50%" },
  { value: "Terminé", cls: "bg-green-500/15 text-green-500", color: "142 71% 45%" },
];

type Tab = "active" | "archived";

const inputCls = "w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary";
const inputSmCls = "w-full bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary";

const MissionsPlugin = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("active");
  const [showForm, setShowForm] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // New mission
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [status, setStatus] = useState("Actif");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [collaborator, setCollaborator] = useState("");
  const [contact, setContact] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [eTitle, setETitle] = useState("");
  const [eClient, setEClient] = useState("");
  const [eStatus, setEStatus] = useState("Actif");
  const [eLocation, setELocation] = useState("");
  const [eNotes, setENotes] = useState("");
  const [eStartDate, setEStartDate] = useState("");
  const [eStartTime, setEStartTime] = useState("");
  const [eEndDate, setEEndDate] = useState("");
  const [eCollaborator, setECollaborator] = useState("");
  const [eContact, setEContact] = useState("");
  const [eQuoteAmount, setEQuoteAmount] = useState("");

  const { data: missions = [], isLoading } = useQuery({
    queryKey: ["missions"],
    queryFn: async () => {
      const { data } = await supabase.from("missions").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const activeMissions = useMemo(() => missions.filter((m: any) => !(m as any).archived), [missions]);
  const archivedMissions = useMemo(() => missions.filter((m: any) => (m as any).archived), [missions]);

  const filtered = useMemo(() => {
    const source = tab === "active" ? activeMissions : archivedMissions;
    const q = search.toLowerCase().trim();
    if (!q) return source;
    return source.filter((m: any) =>
      `${m.title} ${m.client || ""} ${m.location || ""} ${(m as any).collaborator || ""} ${m.notes || ""}`.toLowerCase().includes(q)
    );
  }, [activeMissions, archivedMissions, tab, search]);

  const resetForm = () => {
    setTitle(""); setClient(""); setStatus("Actif"); setLocation(""); setNotes("");
    setStartDate(""); setStartTime(""); setEndDate(""); setCollaborator(""); setContact(""); setQuoteAmount("");
    setShowForm(false); setShowOptions(false);
  };

  const addMission = useMutation({
    mutationFn: async () => {
      if (!user || !title.trim()) return;
      const sd = startDate ? (startTime ? `${startDate}` : startDate) : null;
      const { error } = await supabase.from("missions").insert({
        user_id: user.id, title: title.trim(), client: client.trim() || null,
        status, location: location.trim() || null, notes: notes.trim() || null,
        start_date: sd, end_date: endDate || null,
        collaborator: collaborator.trim() || null, contact: contact.trim() || null,
        quote_amount: quoteAmount ? parseFloat(quoteAmount) : null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["missions"] }); resetForm(); toast.success("Mission créée"); },
    onError: (err: any) => { toast.error("Erreur : " + (err.message || "Impossible de créer. Reconnectez-vous.")); },
  });

  const deleteMission = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("missions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["missions"] }); toast.success("Mission supprimée"); },
  });

  const archiveMission = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("missions").update({ archived: true, status: "Terminé" } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["missions"] }); toast.success("Mission archivée"); },
    onError: (err: any) => { toast.error("Erreur : " + (err.message || "Action impossible")); },
  });

  const unarchiveMission = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("missions").update({ archived: false, status: "Actif" } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["missions"] }); toast.success("Mission restaurée"); },
    onError: (err: any) => { toast.error("Erreur : " + (err.message || "Action impossible")); },
  });

  const updateMission = useMutation({
    mutationFn: async (payload: any) => {
      const { id, ...rest } = payload;
      const { error } = await supabase.from("missions").update(rest as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["missions"] }); setEditingId(null); toast.success("Mission modifiée"); },
  });

  const startEdit = (m: any) => {
    setEditingId(m.id);
    setETitle(m.title);
    setEClient(m.client || "");
    setEStatus(m.status);
    setELocation(m.location || "");
    setENotes(m.notes || "");
    setEStartDate(m.start_date || "");
    setEStartTime("");
    setEEndDate(m.end_date || "");
    setECollaborator((m as any).collaborator || "");
    setEContact((m as any).contact || "");
    setEQuoteAmount((m as any).quote_amount ? String((m as any).quote_amount) : "");
  };

  const confirmEdit = () => {
    if (!editingId || !eTitle.trim()) return;
    if (!window.confirm("Confirmer la modification ?")) return;
    updateMission.mutate({
      id: editingId, title: eTitle.trim(), client: eClient.trim() || null,
      status: eStatus, location: eLocation.trim() || null, notes: eNotes.trim() || null,
      start_date: eStartDate || null, end_date: eEndDate || null,
      collaborator: eCollaborator.trim() || null, contact: eContact.trim() || null,
      quote_amount: eQuoteAmount ? parseFloat(eQuoteAmount) : null,
    });
  };

  const handleComplete = (m: any) => {
    const choice = window.confirm("Mission terminée ! Archiver ? (Annuler = garder active)");
    if (choice) archiveMission.mutate(m.id);
    else updateMission.mutate({ id: m.id, status: "Terminé" });
  };

  const exportToCalendar = (m: any) => {
    const start = new Date(m.start_date || m.created_at);
    const end = m.end_date ? new Date(m.end_date) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
    const desc = [
      m.client ? `Client: ${m.client}` : "",
      (m as any).collaborator ? `Collaborateur: ${(m as any).collaborator}` : "",
      (m as any).contact ? `Contact: ${(m as any).contact}` : "",
      (m as any).quote_amount ? `Devis: ${(m as any).quote_amount} EUR` : "",
      m.notes ? `Notes: ${m.notes}` : "",
    ].filter(Boolean).join("\\n");
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//SWAN//Mission//FR",
      "BEGIN:VEVENT",
      `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`,
      `SUMMARY:${m.title}`,
      m.location ? `LOCATION:${m.location}` : "",
      `DESCRIPTION:${desc}`,
      `UID:${m.id}@swan`,
      "END:VEVENT", "END:VCALENDAR",
    ].filter(Boolean).join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `mission-${m.id.slice(0, 6)}.ics`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Fichier calendrier téléchargé");
  };

  const formatDate = (date: string) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  };

  const getStatusInfo = (s: string) => statusOptions.find(o => o.value === s) || statusOptions[0];

  return (
    <div className="fade-in">
      <PageHeader title="Missions" subtitle="Gérer les affectations" back
        action={
          <button onClick={() => setShowForm(!showForm)}
            className={`btn btn-icon-sm ${showForm ? "btn-danger" : "btn-ghost"}`}>
            {showForm ? <X size={18} /> : <Plus size={18} />}
          </button>
        } />

      <div className="px-4 md:px-0 space-y-3">
        {/* Form */}
        {showForm && (
          <div className="glass-card p-4 space-y-3 slide-up">
            {/* Status */}
            <div>
              <label className="text-[10px] text-muted-foreground mb-1.5 block">Statut</label>
              <div className="flex gap-1.5">
                {statusOptions.map(s => (
                  <button key={s.value} onClick={() => setStatus(s.value)}
                    className={`flex-1 text-[10px] py-2 rounded-lg border transition-all ${status === s.value ? s.cls + " border-transparent font-medium" : "border-border text-muted-foreground"}`}>
                    {s.value}
                  </button>
                ))}
              </div>
            </div>

            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre de la mission..."
              className={inputCls} />
            <input value={client} onChange={e => setClient(e.target.value)} placeholder="Client (optionnel)"
              className={inputCls} />

            {/* Options */}
            <button onClick={() => setShowOptions(!showOptions)} className="btn btn-secondary btn-xs">
              {showOptions ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              Plus d'options
            </button>

            {showOptions && (
              <div className="space-y-3 pt-1">
                <div className="relative">
                  <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Lieu..."
                    className="w-full bg-secondary border border-border rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Date début</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputSmCls} />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Heure</label>
                    <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={inputSmCls} />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Date fin</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputSmCls} />
                </div>

                <div className="relative">
                  <Euro size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input type="number" step="0.01" value={quoteAmount} onChange={e => setQuoteAmount(e.target.value)}
                    placeholder="Montant devis (€)" className="w-full bg-secondary border border-border rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>

                <div className="relative">
                  <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input value={collaborator} onChange={e => setCollaborator(e.target.value)} placeholder="Collaborateur..."
                    className="w-full bg-secondary border border-border rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>

                <div className="relative">
                  <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input value={contact} onChange={e => setContact(e.target.value)} placeholder="Contact (tél, email...)"
                    className="w-full bg-secondary border border-border rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>

                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Commentaires..."
                  rows={2} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            )}

            <button onClick={() => addMission.mutate()} disabled={!title.trim() || addMission.isPending}
              className="btn btn-primary btn-full">Créer la mission</button>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
            className="w-full bg-secondary border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-colors" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary/50 rounded-xl p-1">
          <button onClick={() => setTab("active")}
            className={`flex-1 text-xs py-2 rounded-lg transition-all font-medium ${tab === "active" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
            Actives ({activeMissions.length})
          </button>
          <button onClick={() => setTab("archived")}
            className={`flex-1 text-xs py-2 rounded-lg transition-all font-medium flex items-center justify-center gap-1 ${tab === "archived" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
            <Archive size={12} /> Archives ({archivedMissions.length})
          </button>
        </div>

        {!isLoading && filtered.length > 0 && (
          <div className="text-[10px] text-muted-foreground px-1">
            {filtered.length} mission{filtered.length > 1 ? "s" : ""}
          </div>
        )}

        {/* Missions list */}
        {isLoading ? (
          <div className="glass-card p-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-sm text-muted-foreground">{search ? "Aucun résultat" : tab === "archived" ? "Aucune archive" : "Aucune mission"}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((m: any) => {
              const sInfo = getStatusInfo(m.status);
              const isExpanded = expandedId === m.id;

              if (editingId === m.id) {
                return (
                  <div key={m.id} className="glass-card p-4 space-y-3">
                    <div className="flex gap-1.5">
                      {statusOptions.map(s => (
                        <button key={s.value} onClick={() => setEStatus(s.value)}
                          className={`flex-1 text-[10px] py-1.5 rounded-lg border transition-all ${eStatus === s.value ? s.cls + " border-transparent font-medium" : "border-border text-muted-foreground"}`}>
                          {s.value}
                        </button>
                      ))}
                    </div>
                    <input value={eTitle} onChange={e => setETitle(e.target.value)} placeholder="Titre..." className={inputCls} />
                    <input value={eClient} onChange={e => setEClient(e.target.value)} placeholder="Client..." className={inputCls} />
                    <div className="relative">
                      <MapPin size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input value={eLocation} onChange={e => setELocation(e.target.value)} placeholder="Lieu..."
                        className="w-full bg-secondary border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] text-muted-foreground mb-0.5 block">Date début</label>
                        <input type="date" value={eStartDate} onChange={e => setEStartDate(e.target.value)} className={inputSmCls} />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted-foreground mb-0.5 block">Date fin</label>
                        <input type="date" value={eEndDate} onChange={e => setEEndDate(e.target.value)} className={inputSmCls} />
                      </div>
                    </div>
                    <div className="relative">
                      <Euro size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input type="number" step="0.01" value={eQuoteAmount} onChange={e => setEQuoteAmount(e.target.value)}
                        placeholder="Montant devis (€)" className="w-full bg-secondary border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                    <div className="relative">
                      <User size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input value={eCollaborator} onChange={e => setECollaborator(e.target.value)} placeholder="Collaborateur..."
                        className="w-full bg-secondary border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                    <div className="relative">
                      <Phone size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input value={eContact} onChange={e => setEContact(e.target.value)} placeholder="Contact..."
                        className="w-full bg-secondary border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                    <textarea value={eNotes} onChange={e => setENotes(e.target.value)} placeholder="Commentaires..."
                      rows={2} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
                    <div className="flex gap-2">
                      <button onClick={confirmEdit} disabled={!eTitle.trim()}
                        className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                        <Check size={12} /> Confirmer
                      </button>
                      <button onClick={() => setEditingId(null)}
                        className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                        <X size={12} /> Annuler
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={m.id} className="glass-card overflow-hidden">
                  {/* Main row */}
                  <button onClick={() => setExpandedId(isExpanded ? null : m.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{m.title}</div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {m.client && <span className="text-[10px] text-muted-foreground">{m.client}</span>}
                        {m.start_date && (
                          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                            <Calendar size={9} /> {formatDate(m.start_date)}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${sInfo.cls}`}>{m.status}</span>
                    {isExpanded ? <ChevronUp size={14} className="text-muted-foreground shrink-0" /> : <ChevronDown size={14} className="text-muted-foreground shrink-0" />}
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-3 space-y-2 border-t border-border pt-2">
                      <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground">
                        {m.location && <span className="flex items-center gap-0.5"><MapPin size={10} /> {m.location}</span>}
                        {m.start_date && <span className="flex items-center gap-0.5"><Clock size={10} /> {formatDate(m.start_date)}{m.end_date ? ` → ${formatDate(m.end_date)}` : ""}</span>}
                        {(m as any).quote_amount && (
                          <span className="flex items-center gap-0.5 text-primary font-medium"><Euro size={10} /> {Number((m as any).quote_amount).toLocaleString("fr-FR")} €</span>
                        )}
                      </div>

                      {(m as any).collaborator && (
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <User size={10} /> {(m as any).collaborator}
                        </div>
                      )}
                      {(m as any).contact && (
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <Phone size={10} /> {(m as any).contact}
                        </div>
                      )}
                      {m.notes && (
                        <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                          <MessageSquare size={10} className="mt-0.5 shrink-0" /> <span className="line-clamp-3">{m.notes}</span>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-1 pt-1 border-t border-border/50">
                        {tab === "active" && (
                          <>
                            <button onClick={() => exportToCalendar(m)}
                              className="btn btn-secondary btn-sm">
                              <CalendarPlus size={12} /> Calendrier
                            </button>
                            {m.status !== "Terminé" && (
                              <button onClick={() => handleComplete(m)}
                                className="btn btn-secondary btn-sm">
                                <Check size={12} /> Terminer
                              </button>
                            )}
                            {m.status === "Terminé" && (
                              <button onClick={() => { if (window.confirm("Archiver cette mission ?")) archiveMission.mutate(m.id); }}
                                className="btn btn-secondary btn-sm">
                                <Archive size={12} /> Archiver
                              </button>
                            )}
                            <button onClick={() => startEdit(m)}
                              className="btn btn-secondary btn-sm">
                              <Pencil size={12} /> Modifier
                            </button>
                            <button onClick={() => { if (window.confirm("Supprimer cette mission ?")) deleteMission.mutate(m.id); }}
                              className="btn btn-icon-sm btn-ghost">
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                        {tab === "archived" && (
                          <>
                            <button onClick={() => unarchiveMission.mutate(m.id)}
                              className="btn btn-secondary btn-sm">
                              <Archive size={12} /> Restaurer
                            </button>
                            <button onClick={() => { if (window.confirm("Supprimer définitivement ?")) deleteMission.mutate(m.id); }}
                              className="btn btn-icon-sm btn-ghost">
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <FeedbackButton context="missions" />
    </div>
  );
};

export default MissionsPlugin;
