import { type CSSProperties, type ReactNode, useMemo, useState } from "react";
import {
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Folder,
  Mail,
  Plus,
  Save,
  Search,
  Send,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { jsPDF } from "jspdf";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import { TutorialButton } from "@/components/TutorialButton";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { downloadCsv } from "@/lib/businessTools";

type QueryResponse<T> = { data: T | null; error: { message: string } | null };
type DbQuery<T = unknown> = PromiseLike<QueryResponse<T>> & {
  select: (columns?: string) => DbQuery<T[]>;
  order: (column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) => DbQuery<T>;
  insert: (values: Record<string, unknown>) => DbQuery<T>;
  update: (values: Record<string, unknown>) => DbQuery<T>;
  delete: () => DbQuery<T>;
  eq: (column: string, value: unknown) => DbQuery<T>;
};
type BusinessDb = { from: (table: string) => DbQuery };
type PlanningView = "day" | "week" | "month" | "year";

type PlanningProfile = {
  id: string;
  user_id: string;
  name: string;
  role: string | null;
  color: string;
  created_at: string;
  updated_at: string;
};

type PlanningProject = {
  id: string;
  user_id: string;
  name: string;
  client: string | null;
  color: string;
  created_at: string;
  updated_at: string;
};

type PlanningEvent = {
  id: string;
  user_id: string;
  profile_id: string | null;
  project_id: string | null;
  title: string;
  start_at: string;
  end_at: string;
  location: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type PlanningForm = {
  title: string;
  profile_id: string;
  project_id: string;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  location: string;
  status: string;
  notes: string;
};

type TimelineProfile = {
  id: string | null;
  name: string;
  role: string | null;
  color: string;
};

const db = supabase as unknown as BusinessDb;
const NO_PROFILE_ID = "sans-profil";
const ALL_PROJECTS = "all";
const PROJECT_COLORS = ["217 91% 60%", "142 64% 38%", "38 92% 50%", "330 70% 55%", "270 50% 60%", "0 72% 51%"];
const PROFILE_COLORS = ["199 89% 48%", "38 50% 58%", "142 71% 45%", "25 95% 53%", "217 91% 60%", "330 70% 55%"];
const STATUSES = ["Planifié", "En cours", "Terminé", "Annulé"];
const VIEWS: Array<{ value: PlanningView; label: string }> = [
  { value: "day", label: "Jour" },
  { value: "week", label: "Semaine" },
  { value: "month", label: "Mois" },
  { value: "year", label: "Année" },
];

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const pad = (value: number) => String(value).padStart(2, "0");
const formatDateInput = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const formatTimeInput = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const addMonths = (date: Date, months: number) => new Date(date.getFullYear(), date.getMonth() + months, 1);
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const startOfYear = (date: Date) => new Date(date.getFullYear(), 0, 1);
const startOfWeek = (date: Date) => {
  const base = startOfDay(date);
  const day = base.getDay() || 7;
  return addDays(base, 1 - day);
};
const endOfLocalInput = (date: string, time: string) => new Date(`${date}T${time || "18:00"}`);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const defaultForm = (): PlanningForm => {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  if (start.getHours() < 8) start.setHours(9);
  const end = new Date(start);
  end.setHours(start.getHours() + 1);
  return {
    title: "",
    profile_id: "",
    project_id: "",
    start_date: formatDateInput(start),
    start_time: formatTimeInput(start),
    end_date: formatDateInput(end),
    end_time: formatTimeInput(end),
    location: "",
    status: "Planifié",
    notes: "",
  };
};

const formFromEvent = (event: PlanningEvent): PlanningForm => {
  const start = new Date(event.start_at);
  const end = new Date(event.end_at);
  return {
    title: event.title,
    profile_id: event.profile_id || "",
    project_id: event.project_id || "",
    start_date: formatDateInput(start),
    start_time: formatTimeInput(start),
    end_date: formatDateInput(end),
    end_time: formatTimeInput(end),
    location: event.location || "",
    status: event.status || "Planifié",
    notes: event.notes || "",
  };
};

const dateLabel = (date: Date) => date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
const fullDateLabel = (date: Date) => date.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" });
const timeLabel = (value: string) => new Date(value).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const eventDateLabel = (event: PlanningEvent) =>
  `${new Date(event.start_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} · ${timeLabel(event.start_at)}-${timeLabel(event.end_at)}`;

const buildRange = (view: PlanningView, cursor: Date) => {
  if (view === "day") {
    const start = startOfDay(cursor);
    const end = addDays(start, 1);
    const ticks = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setHours(index * 4);
      return { date, label: `${pad(date.getHours())}h` };
    });
    return { start, end, ticks, title: cursor.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" }) };
  }

  if (view === "week") {
    const start = startOfWeek(cursor);
    const end = addDays(start, 7);
    const ticks = Array.from({ length: 7 }, (_, index) => {
      const date = addDays(start, index);
      return { date, label: fullDateLabel(date) };
    });
    return { start, end, ticks, title: `${dateLabel(start)} - ${dateLabel(addDays(end, -1))}` };
  }

  if (view === "month") {
    const start = startOfMonth(cursor);
    const end = addMonths(start, 1);
    const days = Math.ceil((end.getTime() - start.getTime()) / 86_400_000);
    const step = days > 30 ? 5 : 4;
    const ticks = Array.from({ length: Math.ceil(days / step) + 1 }, (_, index) => {
      const date = addDays(start, index * step);
      return { date, label: date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) };
    });
    return { start, end, ticks, title: cursor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) };
  }

  const start = startOfYear(cursor);
  const end = new Date(cursor.getFullYear() + 1, 0, 1);
  const ticks = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(cursor.getFullYear(), index, 1);
    return { date, label: date.toLocaleDateString("fr-FR", { month: "short" }) };
  });
  return { start, end, ticks, title: String(cursor.getFullYear()) };
};

const shiftCursor = (cursor: Date, view: PlanningView, dir: -1 | 1) => {
  if (view === "day") return addDays(cursor, dir);
  if (view === "week") return addDays(cursor, dir * 7);
  if (view === "month") return new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1);
  return new Date(cursor.getFullYear() + dir, cursor.getMonth(), 1);
};

const makeIcsDate = (value: string) =>
  new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

const escapeIcs = (value?: string | null) =>
  String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");

const downloadFile = (filename: string, content: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 500);
};

export default function PlanningPlugin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [view, setView] = useState<PlanningView>("week");
  const [cursor, setCursor] = useState(new Date());
  const [projectFilter, setProjectFilter] = useState(ALL_PROJECTS);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [form, setForm] = useState<PlanningForm>(() => defaultForm());
  const [profileName, setProfileName] = useState("");
  const [projectName, setProjectName] = useState("");

  const range = useMemo(() => buildRange(view, cursor), [cursor, view]);

  const { data: profiles = [] } = useQuery({
    queryKey: ["planning_profiles"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db.from("planning_profiles").select("*").order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as PlanningProfile[];
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["planning_projects"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db.from("planning_projects").select("*").order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as PlanningProject[];
    },
  });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["planning_events"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db.from("planning_events").select("*").order("start_at", { ascending: true });
      if (error) throw error;
      return (data || []) as PlanningEvent[];
    },
  });

  const projectMap = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const profileMap = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles]);

  const timelineProfiles: TimelineProfile[] = useMemo(() => ([
    { id: null, name: "Sans profil", role: "Affectation libre", color: "217 91% 60%" },
    ...profiles,
  ]), [profiles]);

  const visibleEvents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return events.filter((event) => {
      const startsBeforeEnd = new Date(event.start_at).getTime() < range.end.getTime();
      const endsAfterStart = new Date(event.end_at).getTime() > range.start.getTime();
      const projectOk = projectFilter === ALL_PROJECTS || event.project_id === projectFilter;
      const project = event.project_id ? projectMap.get(event.project_id) : null;
      const profile = event.profile_id ? profileMap.get(event.profile_id) : null;
      const searchOk =
        !query ||
        [event.title, event.location, event.notes, event.status, project?.name, profile?.name]
          .some((value) => String(value || "").toLowerCase().includes(query));
      return startsBeforeEnd && endsAfterStart && projectOk && searchOk;
    });
  }, [events, profileMap, projectFilter, projectMap, range.end, range.start, search]);

  const stats = useMemo(() => {
    const active = visibleEvents.filter((event) => event.status !== "Annulé").length;
    const profilesUsed = new Set(visibleEvents.map((event) => event.profile_id || NO_PROFILE_ID)).size;
    const projectsUsed = new Set(visibleEvents.map((event) => event.project_id || "none")).size;
    return { active, profilesUsed, projectsUsed };
  }, [visibleEvents]);

  const openNewForm = () => {
    setEditingEventId(null);
    setForm(defaultForm());
    setShowForm(true);
  };

  const openEditForm = (event: PlanningEvent) => {
    setEditingEventId(event.id);
    setForm(formFromEvent(event));
    setShowForm(true);
  };

  const createProfile = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Non connecté");
      const name = profileName.trim();
      if (!name) throw new Error("Nom du profil requis");
      const color = PROFILE_COLORS[profiles.length % PROFILE_COLORS.length];
      const { error } = await db.from("planning_profiles").insert({ user_id: user.id, name, color });
      if (error) throw error;
    },
    onSuccess: () => {
      setProfileName("");
      queryClient.invalidateQueries({ queryKey: ["planning_profiles"] });
      toast.success("Profil ajouté");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Création du profil impossible")),
  });

  const createProject = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Non connecté");
      const name = projectName.trim();
      if (!name) throw new Error("Nom du projet requis");
      const color = PROJECT_COLORS[projects.length % PROJECT_COLORS.length];
      const { error } = await db.from("planning_projects").insert({ user_id: user.id, name, color });
      if (error) throw error;
    },
    onSuccess: () => {
      setProjectName("");
      queryClient.invalidateQueries({ queryKey: ["planning_projects"] });
      toast.success("Projet ajouté");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Création du projet impossible")),
  });

  const saveEvent = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Non connecté");
      if (!form.title.trim()) throw new Error("Titre requis");
      const start = endOfLocalInput(form.start_date, form.start_time);
      const end = endOfLocalInput(form.end_date, form.end_time);
      if (end.getTime() <= start.getTime()) throw new Error("La fin doit être après le début");

      const payload = {
        user_id: user.id,
        title: form.title.trim(),
        profile_id: form.profile_id || null,
        project_id: form.project_id || null,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        location: form.location.trim() || null,
        status: form.status,
        notes: form.notes.trim() || null,
      };

      if (editingEventId) {
        const { error } = await db.from("planning_events").update(payload).eq("id", editingEventId);
        if (error) throw error;
      } else {
        const { error } = await db.from("planning_events").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setShowForm(false);
      setEditingEventId(null);
      setForm(defaultForm());
      queryClient.invalidateQueries({ queryKey: ["planning_events"] });
      queryClient.invalidateQueries({ queryKey: ["home_activity"] });
      toast.success("Planning enregistré");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Enregistrement impossible")),
  });

  const deleteEvent = useMutation({
    mutationFn: async () => {
      if (!editingEventId) return;
      const confirmed = window.confirm("Supprimer cet élément du planning ?");
      if (!confirmed) return;
      const { error } = await db.from("planning_events").delete().eq("id", editingEventId);
      if (error) throw error;
    },
    onSuccess: () => {
      setShowForm(false);
      setEditingEventId(null);
      queryClient.invalidateQueries({ queryKey: ["planning_events"] });
      toast.success("Élément supprimé");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Suppression impossible")),
  });

  const exportCalendar = () => {
    if (visibleEvents.length === 0) return toast.info("Aucun élément à exporter");
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//SWAN HUB//Planning//FR",
      "CALSCALE:GREGORIAN",
      ...visibleEvents.flatMap((event) => {
        const project = event.project_id ? projectMap.get(event.project_id) : null;
        const profile = event.profile_id ? profileMap.get(event.profile_id) : null;
        return [
          "BEGIN:VEVENT",
          `UID:${event.id}@swan-hub`,
          `DTSTAMP:${makeIcsDate(new Date().toISOString())}`,
          `DTSTART:${makeIcsDate(event.start_at)}`,
          `DTEND:${makeIcsDate(event.end_at)}`,
          `SUMMARY:${escapeIcs(event.title)}`,
          `DESCRIPTION:${escapeIcs([project?.name, profile?.name, event.notes].filter(Boolean).join(" · "))}`,
          event.location ? `LOCATION:${escapeIcs(event.location)}` : "",
          "END:VEVENT",
        ].filter(Boolean);
      }),
      "END:VCALENDAR",
    ];
    downloadFile(`planning-swan-${formatDateInput(new Date())}.ics`, lines.join("\r\n"), "text/calendar;charset=utf-8");
    toast.success("Calendrier exporté");
  };

  const exportExcel = () => {
    if (visibleEvents.length === 0) return toast.info("Aucun élément à exporter");
    downloadCsv(
      `planning-swan-${formatDateInput(new Date())}.csv`,
      visibleEvents.map((event) => ({
        titre: event.title,
        profil: event.profile_id ? profileMap.get(event.profile_id)?.name : "",
        projet: event.project_id ? projectMap.get(event.project_id)?.name : "",
        debut: new Date(event.start_at).toLocaleString("fr-FR"),
        fin: new Date(event.end_at).toLocaleString("fr-FR"),
        lieu: event.location,
        statut: event.status,
        notes: event.notes,
      }))
    );
    toast.success("Export Excel généré");
  };

  const exportPdf = () => {
    if (visibleEvents.length === 0) return toast.info("Aucun élément à exporter");
    const pdf = new jsPDF("l", "mm", "a4");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text(`Planning SWAN - ${range.title}`, 14, 16);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    let y = 28;
    visibleEvents.slice(0, 42).forEach((event) => {
      const project = event.project_id ? projectMap.get(event.project_id)?.name : "Sans projet";
      const profile = event.profile_id ? profileMap.get(event.profile_id)?.name : "Sans profil";
      pdf.setFont("helvetica", "bold");
      pdf.text(event.title.slice(0, 55), 14, y);
      pdf.setFont("helvetica", "normal");
      pdf.text(`${eventDateLabel(event)} · ${profile} · ${project} · ${event.status}`, 82, y);
      y += 7;
      if (event.notes) {
        pdf.text(event.notes.slice(0, 130), 18, y);
        y += 6;
      }
      if (y > 190) {
        pdf.addPage();
        y = 18;
      }
    });
    pdf.save(`planning-swan-${formatDateInput(new Date())}.pdf`);
    toast.success("PDF généré");
  };

  const sendMail = () => {
    if (visibleEvents.length === 0) return toast.info("Aucun élément à envoyer");
    const body = visibleEvents
      .slice(0, 25)
      .map((event) => {
        const project = event.project_id ? projectMap.get(event.project_id)?.name : "Sans projet";
        const profile = event.profile_id ? profileMap.get(event.profile_id)?.name : "Sans profil";
        return `- ${eventDateLabel(event)} | ${event.title} | ${profile} | ${project}`;
      })
      .join("\n");
    window.open(
      `mailto:?subject=${encodeURIComponent(`Planning SWAN - ${range.title}`)}&body=${encodeURIComponent(body)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <div className="fade-in" style={{ paddingBottom: "var(--space-8)" }}>
      <PageHeader
        title="Plannings"
        subtitle="Profils, projets et timeline"
        back
        action={
          <div className="flex items-center gap-1.5">
            <TutorialButton
              title="Mémento plannings"
              intro="Construisez un planning lisible par profil, projet et période."
              simpleSteps={[
                { title: "Profils", text: "Ajoutez les personnes ou ressources à planifier." },
                { title: "Projets", text: "Créez des projets pour colorer la timeline." },
                { title: "Timeline", text: "Passez du jour à l'année selon le niveau de lecture." },
                { title: "Exporter", text: "Envoyez le planning vers calendrier, PDF, Excel ou email." },
              ]}
              tips={["Les couleurs de projet servent de repère visuel sur toutes les vues.", "L'export calendrier crée un fichier .ics compatible avec les calendriers standards."]}
            />
            <FeedbackButton context="planning" />
            <button onClick={openNewForm} className="btn btn-add" aria-label="Ajouter un élément de planning">
              <Plus size={24} />
            </button>
          </div>
        }
      />

      <section className="px-4 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: "var(--space-4)" }}>
        <StatCard label="Créneaux visibles" value={String(stats.active)} icon={<CalendarDays size={18} />} />
        <StatCard label="Profils mobilisés" value={String(stats.profilesUsed)} icon={<Users size={18} />} />
        <StatCard label="Projets visibles" value={String(stats.projectsUsed)} icon={<Folder size={18} />} />
      </section>

      {showForm && (
        <section className="px-4 slide-up" style={{ marginBottom: "var(--space-5)" }}>
          <div className="field-form-panel">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 800 }}>{editingEventId ? "Modifier le créneau" : "Nouveau créneau"}</h2>
              <button className="btn btn-icon-sm btn-ghost" onClick={() => setShowForm(false)} aria-label="Fermer">
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
              <input className="field-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Titre : Pose, réunion, visite..." />
              <select className="field-input" value={form.profile_id} onChange={(e) => setForm({ ...form, profile_id: e.target.value })}>
                <option value="">Sans profil</option>
                {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
              </select>
              <select className="field-input" value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
                <option value="">Sans projet</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
              <input className="field-input" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              <input className="field-input" type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
              <input className="field-input" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              <input className="field-input" type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
              <select className="field-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STATUSES.map((status) => <option key={status}>{status}</option>)}
              </select>
              <input className="field-input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Lieu" />
            </div>

            <textarea className="field-input w-full mt-3" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes internes..." />

            <div className="flex flex-wrap gap-2 mt-3">
              <button className="btn btn-primary" onClick={() => saveEvent.mutate()} disabled={saveEvent.isPending}>
                <Save size={16} />
                Enregistrer
              </button>
              {editingEventId && (
                <button className="btn btn-ghost" onClick={() => deleteEvent.mutate()} disabled={deleteEvent.isPending}>
                  <Trash2 size={16} />
                  Supprimer
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="px-4" style={{ marginBottom: "var(--space-4)" }}>
        <div className="card" style={{ padding: "var(--space-4)" }}>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            <QuickCreate
              icon={<Users size={16} />}
              placeholder="Nouveau profil"
              value={profileName}
              onChange={setProfileName}
              onSubmit={() => createProfile.mutate()}
              disabled={createProfile.isPending}
            />
            <QuickCreate
              icon={<Folder size={16} />}
              placeholder="Nouveau projet"
              value={projectName}
              onChange={setProjectName}
              onSubmit={() => createProject.mutate()}
              disabled={createProject.isPending}
            />
          </div>
        </div>
      </section>

      <section className="px-4" style={{ marginBottom: "var(--space-4)" }}>
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <button className="btn btn-icon-sm btn-secondary" onClick={() => setCursor(shiftCursor(cursor, view, -1))} aria-label="Période précédente">
              <ChevronLeft size={17} />
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setCursor(new Date())}>
              Aujourd'hui
            </button>
            <button className="btn btn-icon-sm btn-secondary" onClick={() => setCursor(shiftCursor(cursor, view, 1))} aria-label="Période suivante">
              <ChevronRight size={17} />
            </button>
            <div style={{ fontWeight: 900, fontFamily: "var(--font-display)", minWidth: 150 }}>{range.title}</div>
          </div>

          <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-muted">
            {VIEWS.map((option) => (
              <button
                key={option.value}
                onClick={() => setView(option.value)}
                className={`btn btn-sm ${view === option.value ? "btn-primary" : "btn-ghost"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center mt-3">
          <div className="relative" style={{ flex: "1 1 260px" }}>
            <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-3)" }} />
            <input className="field-input w-full" style={{ paddingLeft: 36 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher planning, lieu, profil, projet..." />
          </div>
          <select className="field-input" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            <option value={ALL_PROJECTS}>Tous les projets</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => setProjectFilter(projectFilter === project.id ? ALL_PROJECTS : project.id)}
              className={`badge ${projectFilter === project.id ? "ring-2 ring-primary/30" : ""}`}
              style={{ background: `hsl(${project.color} / 0.14)`, color: `hsl(${project.color})`, border: `1px solid hsl(${project.color} / 0.3)` }}
            >
              {project.name}
            </button>
          ))}
        </div>
      </section>

      <section className="px-4" style={{ marginBottom: "var(--space-4)" }}>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-secondary btn-sm" onClick={exportCalendar}>
            <Calendar size={14} />
            Calendrier
          </button>
          <button className="btn btn-secondary btn-sm" onClick={exportPdf}>
            <FileText size={14} />
            PDF
          </button>
          <button className="btn btn-secondary btn-sm" onClick={exportExcel}>
            <FileSpreadsheet size={14} />
            Excel
          </button>
          <button className="btn btn-primary btn-sm" onClick={sendMail}>
            <Mail size={14} />
            Mail
          </button>
        </div>
      </section>

      <section className="px-4">
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div
            className="grid"
            style={{
              gridTemplateColumns: "132px minmax(720px, 1fr)",
              overflowX: "auto",
            }}
          >
            <div className="bg-muted/40 border-r border-border">
              <div style={{ height: 44, borderBottom: "1px solid var(--color-border)" }} />
              {timelineProfiles.map((profile) => (
                <div key={profile.id || NO_PROFILE_ID} className="flex items-center gap-2 px-3" style={{ height: 92, borderBottom: "1px solid var(--color-border)" }}>
                  <span style={{ width: 9, height: 9, borderRadius: 99, background: `hsl(${profile.color})`, flexShrink: 0 }} />
                  <div className="min-w-0">
                    <div style={{ fontWeight: 800, fontSize: "var(--text-sm)" }} className="truncate">{profile.name}</div>
                    <div style={{ color: "var(--color-text-3)", fontSize: "var(--text-xs)" }} className="truncate">{profile.role || "Profil"}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ minWidth: 720 }}>
              <div className="relative" style={{ height: 44, borderBottom: "1px solid var(--color-border)" }}>
                {range.ticks.map((tick) => {
                  const left = ((tick.date.getTime() - range.start.getTime()) / (range.end.getTime() - range.start.getTime())) * 100;
                  return (
                    <div key={`${tick.label}-${tick.date.toISOString()}`} style={{ position: "absolute", left: `${clamp(left, 0, 100)}%`, top: 0, bottom: 0, borderLeft: "1px solid var(--color-border)", paddingLeft: 6 }}>
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-2)", fontWeight: 800 }}>{tick.label}</span>
                    </div>
                  );
                })}
              </div>

              {timelineProfiles.map((profile) => {
                const laneEvents = visibleEvents.filter((event) => (event.profile_id || NO_PROFILE_ID) === (profile.id || NO_PROFILE_ID));
                return (
                  <div key={profile.id || NO_PROFILE_ID} className="relative" style={{ height: 92, borderBottom: "1px solid var(--color-border)" }}>
                    {range.ticks.map((tick) => {
                      const left = ((tick.date.getTime() - range.start.getTime()) / (range.end.getTime() - range.start.getTime())) * 100;
                      return <div key={tick.date.toISOString()} style={{ position: "absolute", left: `${clamp(left, 0, 100)}%`, top: 0, bottom: 0, borderLeft: "1px solid var(--color-border)" }} />;
                    })}
                    {laneEvents.map((event, index) => {
                      const project = event.project_id ? projectMap.get(event.project_id) : null;
                      const eventStart = new Date(event.start_at).getTime();
                      const eventEnd = new Date(event.end_at).getTime();
                      const rangeStart = range.start.getTime();
                      const rangeEnd = range.end.getTime();
                      const left = clamp(((Math.max(eventStart, rangeStart) - rangeStart) / (rangeEnd - rangeStart)) * 100, 0, 100);
                      const right = clamp(((Math.min(eventEnd, rangeEnd) - rangeStart) / (rangeEnd - rangeStart)) * 100, 0, 100);
                      const width = Math.max(4, right - left);
                      return (
                        <button
                          key={event.id}
                          onClick={() => openEditForm(event)}
                          className="text-left"
                          style={{
                            position: "absolute",
                            left: `${left}%`,
                            top: 12 + (index % 3) * 24,
                            width: `${width}%`,
                            minWidth: 104,
                            maxWidth: "calc(100% - 8px)",
                            height: 28,
                            borderRadius: 7,
                            border: `1px solid hsl(${project?.color || "217 91% 60"} / 0.45)`,
                            background: `linear-gradient(135deg, hsl(${project?.color || "217 91% 60"} / 0.88), hsl(${project?.color || "217 91% 60"} / 0.68))`,
                            color: "white",
                            padding: "4px 8px",
                            fontSize: "var(--text-xs)",
                            fontWeight: 800,
                            boxShadow: "var(--shadow-sm)",
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                            textOverflow: "ellipsis",
                          }}
                          title={`${event.title} · ${eventDateLabel(event)}`}
                        >
                          {event.title}
                        </button>
                      );
                    })}
                  </div>
                );
              })}

              {!isLoading && visibleEvents.length === 0 && (
                <div className="p-4" style={{ color: "var(--color-text-2)", fontWeight: 700 }}>
                  Aucun créneau sur cette période.
                </div>
              )}
              {isLoading && <div className="p-4">Chargement...</div>}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="card" style={{ padding: "var(--space-4)" }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-2)", fontWeight: 700 }}>{label}</div>
          <div style={{ fontSize: "var(--text-2xl)", fontWeight: 900, fontFamily: "var(--font-display)" }}>{value}</div>
        </div>
        <div className="plugin-icon-wrapper" style={{ background: "hsl(217 91% 60% / 0.12)", color: "hsl(217 91% 60%)" }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function QuickCreate({
  icon,
  placeholder,
  value,
  onChange,
  onSubmit,
  disabled,
}: {
  icon: ReactNode;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="plugin-icon-wrapper" style={{ background: "hsl(199 89% 48% / 0.12)", color: "hsl(199 89% 48%)" }}>
        {icon}
      </div>
      <input
        className="field-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && onSubmit()}
        placeholder={placeholder}
      />
      <button className="btn btn-icon-sm btn-secondary" onClick={onSubmit} disabled={disabled} aria-label={placeholder}>
        <Send size={16} />
      </button>
    </div>
  );
}
