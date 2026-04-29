import { type CSSProperties, type MouseEvent, type ReactNode, useMemo, useRef, useState } from "react";
import {
  Calendar,
  CalendarDays,
  ChevronDown,
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
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import { TutorialButton } from "@/components/TutorialButton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

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

type ProfileDraft = {
  name: string;
  role: string;
  color: string;
};

type ProjectDraft = {
  name: string;
  client: string;
  color: string;
};

type CustomRange = {
  start: string;
  end: string;
};

type RangeTick = {
  date: Date;
  label: string;
  subLabel?: string;
};

type PlanningRange = {
  start: Date;
  end: Date;
  ticks: RangeTick[];
  title: string;
};

type ExportFormat = "calendar" | "pdf" | "excel" | "mail";

type ExportSelection = {
  start: string;
  end: string;
  profileIds: string[];
  projectIds: string[];
};

type ExportColumn = {
  id: string;
  label: string;
  subLabel: string;
  start: Date;
  end: Date;
};

type ExportProfileRow = {
  id: string;
  profileId: string | null;
  name: string;
  role: string | null;
  color: string;
};

type ExportProjectRow = {
  id: string;
  projectId: string | null;
  name: string;
  client: string | null;
  color: string;
};

type ExportPlanningData = {
  title: string;
  start: Date;
  end: Date;
  columns: ExportColumn[];
  profileRows: ExportProfileRow[];
  projectRows: ExportProjectRow[];
  events: PlanningEvent[];
};

const db = supabase as unknown as BusinessDb;
const NO_PROFILE_ID = "sans-profil";
const NO_PROJECT_ID = "sans-projet";
const ALL_PROJECTS = "all";
const EXPORT_SHEET_WIDTH = 1280;
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
const snapDate = (date: Date, view: PlanningView) => {
  const next = new Date(date);
  if (view === "day") {
    const minutes = Math.round(next.getMinutes() / 30) * 30;
    next.setMinutes(minutes, 0, 0);
    return next;
  }
  if (view === "week") {
    next.setMinutes(0, 0, 0);
    return next;
  }
  next.setHours(9, 0, 0, 0);
  return next;
};

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
const weekdayLabel = (date: Date) => date.toLocaleDateString("fr-FR", { weekday: "short" });
const timeLabel = (value: string) => new Date(value).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const eventDateLabel = (event: PlanningEvent) =>
  `${new Date(event.start_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} · ${timeLabel(event.start_at)}-${timeLabel(event.end_at)}`;

const dateTick = (date: Date): RangeTick => ({
  date,
  label: weekdayLabel(date),
  subLabel: dateLabel(date),
});

const buildRange = (view: PlanningView, cursor: Date): PlanningRange => {
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
    const ticks = Array.from({ length: 7 }, (_, index) => dateTick(addDays(start, index)));
    return { start, end, ticks, title: `${dateLabel(start)} - ${dateLabel(addDays(end, -1))}` };
  }

  if (view === "month") {
    const start = startOfMonth(cursor);
    const end = addMonths(start, 1);
    const days = Math.ceil((end.getTime() - start.getTime()) / 86_400_000);
    const step = days > 30 ? 5 : 4;
    const ticks = Array.from({ length: Math.ceil(days / step) + 1 }, (_, index) => {
      const date = addDays(start, index * step);
      return { date, label: date.toLocaleDateString("fr-FR", { day: "2-digit" }), subLabel: date.toLocaleDateString("fr-FR", { month: "short" }) };
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

const buildCustomRange = (range: CustomRange): PlanningRange => {
  const start = startOfDay(new Date(`${range.start}T00:00:00`));
  const requestedEnd = startOfDay(new Date(`${range.end}T00:00:00`));
  const end = addDays(requestedEnd.getTime() >= start.getTime() ? requestedEnd : start, 1);
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));
  const step = days <= 14 ? 1 : days <= 70 ? 7 : Math.max(14, Math.ceil(days / 10));
  const ticks = Array.from({ length: Math.ceil(days / step) + 1 }, (_, index) => {
    const date = addDays(start, index * step);
    if (days <= 14) return dateTick(date);
    return { date, label: date.toLocaleDateString("fr-FR", { day: "2-digit" }), subLabel: date.toLocaleDateString("fr-FR", { month: "short" }) };
  });
  return { start, end, ticks, title: `${dateLabel(start)} - ${dateLabel(addDays(end, -1))}` };
};

const parseExportRange = (selection: ExportSelection) => {
  if (!selection.start || !selection.end) return null;
  const start = startOfDay(new Date(`${selection.start}T00:00:00`));
  const requestedEnd = startOfDay(new Date(`${selection.end}T00:00:00`));
  if (Number.isNaN(start.getTime()) || Number.isNaN(requestedEnd.getTime())) return null;
  if (requestedEnd.getTime() < start.getTime()) return null;
  const end = addDays(requestedEnd, 1);
  return { start, end, title: `${dateLabel(start)} - ${dateLabel(addDays(end, -1))}` };
};

const buildExportColumns = (start: Date, end: Date): ExportColumn[] => {
  const dayCount = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));

  if (dayCount <= 14) {
    return Array.from({ length: dayCount }, (_, index) => {
      const columnStart = addDays(start, index);
      const columnEnd = addDays(columnStart, 1);
      return {
        id: columnStart.toISOString(),
        label: columnStart.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit" }),
        subLabel: columnStart.toLocaleDateString("fr-FR", { month: "short" }),
        start: columnStart,
        end: columnEnd,
      };
    });
  }

  if (dayCount <= 120) {
    const columns: ExportColumn[] = [];
    for (let columnStart = new Date(start); columnStart.getTime() < end.getTime(); columnStart = addDays(columnStart, 7)) {
      const columnEnd = new Date(Math.min(addDays(columnStart, 7).getTime(), end.getTime()));
      columns.push({
        id: columnStart.toISOString(),
        label: `Sem. ${dateLabel(columnStart)}`,
        subLabel: `${dateLabel(columnStart)} - ${dateLabel(addDays(columnEnd, -1))}`,
        start: columnStart,
        end: columnEnd,
      });
    }
    return columns;
  }

  const columns: ExportColumn[] = [];
  for (
    let monthCursor = new Date(start.getFullYear(), start.getMonth(), 1);
    monthCursor.getTime() < end.getTime();
    monthCursor = addMonths(monthCursor, 1)
  ) {
    const columnStart = new Date(Math.max(monthCursor.getTime(), start.getTime()));
    const columnEnd = new Date(Math.min(addMonths(monthCursor, 1).getTime(), end.getTime()));
    columns.push({
      id: monthCursor.toISOString(),
      label: monthCursor.toLocaleDateString("fr-FR", { month: "short" }),
      subLabel: String(monthCursor.getFullYear()),
      start: columnStart,
      end: columnEnd,
    });
  }
  return columns;
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

const escapeHtml = (value?: string | number | null) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const eventProfileKey = (event: PlanningEvent) => event.profile_id || NO_PROFILE_ID;
const eventProjectKey = (event: PlanningEvent) => event.project_id || NO_PROJECT_ID;

const rangesOverlap = (startA: Date, endA: Date, startB: Date, endB: Date) =>
  startA.getTime() < endB.getTime() && endA.getTime() > startB.getTime();

const eventOverlaps = (event: PlanningEvent, start: Date, end: Date) =>
  rangesOverlap(new Date(event.start_at), new Date(event.end_at), start, end);

const exportEventTime = (event: PlanningEvent) => {
  const start = new Date(event.start_at);
  const end = new Date(event.end_at);
  if (formatDateInput(start) === formatDateInput(end)) return `${formatTimeInput(start)}-${formatTimeInput(end)}`;
  return `${dateLabel(start)} ${formatTimeInput(start)} - ${dateLabel(end)} ${formatTimeInput(end)}`;
};

const hslToHex = (value: string) => {
  const match = value.match(/([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/);
  if (!match) return "#3b82f6";
  const hue = (Number(match[1]) % 360) / 360;
  const saturation = Number(match[2]) / 100;
  const lightness = Number(match[3]) / 100;
  const chroma = saturation * Math.min(lightness, 1 - lightness);
  const channel = (offset: number) => {
    const position = (offset + hue * 12) % 12;
    const color = lightness - chroma * Math.max(-1, Math.min(position - 3, Math.min(9 - position, 1)));
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
};

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
  const exportSheetRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<PlanningView>("week");
  const [cursor, setCursor] = useState(new Date());
  const [projectFilter, setProjectFilter] = useState(ALL_PROJECTS);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [form, setForm] = useState<PlanningForm>(() => defaultForm());
  const [profileName, setProfileName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("pdf");
  const [customRange, setCustomRange] = useState<CustomRange | null>(null);
  const [periodDraft, setPeriodDraft] = useState<CustomRange>(() => {
    const start = startOfWeek(new Date());
    return { start: formatDateInput(start), end: formatDateInput(addDays(start, 6)) };
  });
  const [exportDraft, setExportDraft] = useState<ExportSelection>(() => {
    const start = startOfWeek(new Date());
    return {
      start: formatDateInput(start),
      end: formatDateInput(addDays(start, 6)),
      profileIds: [],
      projectIds: [],
    };
  });

  const range = useMemo(() => customRange ? buildCustomRange(customRange) : buildRange(view, cursor), [cursor, customRange, view]);
  const profileColumnWidth = 112;
  const timelineBodyWidth = useMemo(() => {
    const tickWidth = view === "month" ? 96 : view === "year" ? 86 : 82;
    const minimum = view === "month" ? 820 : view === "year" ? 960 : 520;
    return Math.max(minimum, range.ticks.length * tickWidth);
  }, [range.ticks.length, view]);

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

  const timelineProfiles: TimelineProfile[] = useMemo(() => profiles, [profiles]);

  const exportProfileOptions: ExportProfileRow[] = useMemo(() => {
    const options: ExportProfileRow[] = profiles.map((profile) => ({
      id: profile.id,
      profileId: profile.id,
      name: profile.name,
      role: profile.role,
      color: profile.color,
    }));
    if (events.some((event) => !event.profile_id)) {
      options.push({
        id: NO_PROFILE_ID,
        profileId: null,
        name: "Non affecté",
        role: "Non assigné",
        color: "217 91% 60%",
      });
    }
    return options;
  }, [events, profiles]);

  const exportProjectOptions: ExportProjectRow[] = useMemo(() => {
    const options: ExportProjectRow[] = projects.map((project) => ({
      id: project.id,
      projectId: project.id,
      name: project.name,
      client: project.client,
      color: project.color,
    }));
    if (events.some((event) => !event.project_id)) {
      options.push({
        id: NO_PROJECT_ID,
        projectId: null,
        name: "Sans projet",
        client: "Non classé",
        color: "215 16% 47%",
      });
    }
    return options;
  }, [events, projects]);

  const exportRange = useMemo(() => parseExportRange(exportDraft), [exportDraft]);
  const exportProfileRows = useMemo(() => {
    const selected = new Set(exportDraft.profileIds);
    return exportProfileOptions.filter((profile) => selected.has(profile.id));
  }, [exportDraft.profileIds, exportProfileOptions]);
  const exportProjectRows = useMemo(() => {
    const selected = new Set(exportDraft.projectIds);
    return exportProjectOptions.filter((project) => selected.has(project.id));
  }, [exportDraft.projectIds, exportProjectOptions]);
  const exportEvents = useMemo(() => {
    if (!exportRange) return [];
    const profileIds = new Set(exportDraft.profileIds);
    const projectIds = new Set(exportDraft.projectIds);
    return events.filter((event) =>
      eventOverlaps(event, exportRange.start, exportRange.end) &&
      profileIds.has(eventProfileKey(event)) &&
      projectIds.has(eventProjectKey(event))
    );
  }, [events, exportDraft.profileIds, exportDraft.projectIds, exportRange]);
  const exportData = useMemo<ExportPlanningData | null>(() => {
    if (!exportRange) return null;
    return {
      title: exportRange.title,
      start: exportRange.start,
      end: exportRange.end,
      columns: buildExportColumns(exportRange.start, exportRange.end),
      profileRows: exportProfileRows,
      projectRows: exportProjectRows,
      events: exportEvents,
    };
  }, [exportEvents, exportProfileRows, exportProjectRows, exportRange]);

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

  const openNewFormAt = (profileId: string | null, start: Date) => {
    const snappedStart = snapDate(start, view);
    const end = new Date(snappedStart);
    end.setHours(snappedStart.getHours() + 1);
    setEditingEventId(null);
    setForm({
      ...defaultForm(),
      profile_id: profileId || "",
      project_id: projectFilter === ALL_PROJECTS ? "" : projectFilter,
      start_date: formatDateInput(snappedStart),
      start_time: formatTimeInput(snappedStart),
      end_date: formatDateInput(end),
      end_time: formatTimeInput(end),
    });
    setShowForm(true);
  };

  const openEditForm = (event: PlanningEvent) => {
    setEditingEventId(event.id);
    setForm(formFromEvent(event));
    setShowForm(true);
  };

  const openPeriodDialog = () => {
    const start = customRange?.start || formatDateInput(range.start);
    const end = customRange?.end || formatDateInput(addDays(range.end, -1));
    setPeriodDraft({ start, end });
    setPeriodOpen(true);
  };

  const applyPeriod = () => {
    if (!periodDraft.start || !periodDraft.end) return toast.error("Sélectionnez une date de départ et une date d'arrivée");
    const start = new Date(`${periodDraft.start}T00:00:00`);
    const end = new Date(`${periodDraft.end}T00:00:00`);
    if (end.getTime() < start.getTime()) return toast.error("La date d'arrivée doit être après le départ");
    setCustomRange(periodDraft);
    setPeriodOpen(false);
  };

  const openExportDialog = (format: ExportFormat) => {
    const profileIds = exportProfileOptions.map((profile) => profile.id);
    const projectIds = projectFilter === ALL_PROJECTS
      ? exportProjectOptions.map((project) => project.id)
      : exportProjectOptions.some((project) => project.id === projectFilter)
        ? [projectFilter]
        : exportProjectOptions.map((project) => project.id);

    setExportFormat(format);
    setExportDraft({
      start: formatDateInput(range.start),
      end: formatDateInput(addDays(range.end, -1)),
      profileIds,
      projectIds,
    });
    setExportOpen(true);
  };

  const toggleExportProfile = (profileId: string) => {
    setExportDraft((current) => ({
      ...current,
      profileIds: current.profileIds.includes(profileId)
        ? current.profileIds.filter((id) => id !== profileId)
        : [...current.profileIds, profileId],
    }));
  };

  const toggleExportProject = (projectId: string) => {
    setExportDraft((current) => ({
      ...current,
      projectIds: current.projectIds.includes(projectId)
        ? current.projectIds.filter((id) => id !== projectId)
        : [...current.projectIds, projectId],
    }));
  };

  const handleLaneClick = (event: MouseEvent<HTMLDivElement>, profileId: string | null) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 0.999);
    const startMs = range.start.getTime() + ratio * (range.end.getTime() - range.start.getTime());
    openNewFormAt(profileId, new Date(startMs));
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

  const updateProfile = useMutation({
    mutationFn: async ({ id, draft }: { id: string; draft: ProfileDraft }) => {
      if (!draft.name.trim()) throw new Error("Nom du profil requis");
      const { error } = await db.from("planning_profiles").update({
        name: draft.name.trim(),
        role: draft.role.trim() || null,
        color: draft.color,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planning_profiles"] });
      toast.success("Profil modifié");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Modification du profil impossible")),
  });

  const updateProject = useMutation({
    mutationFn: async ({ id, draft }: { id: string; draft: ProjectDraft }) => {
      if (!draft.name.trim()) throw new Error("Nom du projet requis");
      const { error } = await db.from("planning_projects").update({
        name: draft.name.trim(),
        client: draft.client.trim() || null,
        color: draft.color,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planning_projects"] });
      toast.success("Projet modifié");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Modification du projet impossible")),
  });

  const deleteProfile = useMutation({
    mutationFn: async (profile: PlanningProfile) => {
      const confirmed = window.confirm(`Supprimer le profil "${profile.name}" ? Les créneaux resteront dans "Sans profil".`);
      if (!confirmed) return;
      const { error } = await db.from("planning_profiles").delete().eq("id", profile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planning_profiles"] });
      queryClient.invalidateQueries({ queryKey: ["planning_events"] });
      toast.success("Profil supprimé");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Suppression du profil impossible")),
  });

  const deleteProject = useMutation({
    mutationFn: async (project: PlanningProject) => {
      const confirmed = window.confirm(`Supprimer le projet "${project.name}" ? Les créneaux resteront sans projet.`);
      if (!confirmed) return;
      const { error } = await db.from("planning_projects").delete().eq("id", project.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planning_projects"] });
      queryClient.invalidateQueries({ queryKey: ["planning_events"] });
      setProjectFilter(ALL_PROJECTS);
      toast.success("Projet supprimé");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Suppression du projet impossible")),
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

  const getReadyExportData = (format: ExportFormat) => {
    if (!exportData) {
      toast.error("Sélectionnez une période valide");
      return null;
    }
    if (exportData.profileRows.length === 0) {
      toast.error("Sélectionnez au moins un profil");
      return null;
    }
    if (exportProjectOptions.length > 0 && exportData.projectRows.length === 0) {
      toast.error("Sélectionnez au moins un projet");
      return null;
    }
    if ((format === "calendar" || format === "mail") && exportData.events.length === 0) {
      toast.info("Aucun élément à exporter sur cette sélection");
      return null;
    }
    return exportData;
  };

  const downloadCalendarExport = (data: ExportPlanningData) => {
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//SWAN HUB//Planning//FR",
      "CALSCALE:GREGORIAN",
      ...data.events.flatMap((event) => {
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
    downloadFile(`planning-swan-${formatDateInput(data.start)}-${formatDateInput(addDays(data.end, -1))}.ics`, lines.join("\r\n"), "text/calendar;charset=utf-8");
    toast.success("Calendrier exporté");
    return true;
  };

  const downloadExcelExport = (data: ExportPlanningData) => {
    const projectById = new Map(data.projectRows.map((project) => [project.id, project]));
    const headerCells = data.columns
      .map((column) => `<th class="date-col"><strong>${escapeHtml(column.label)}</strong><br><span>${escapeHtml(column.subLabel)}</span></th>`)
      .join("");
    const bodyRows = data.profileRows.map((profile) => {
      const cells = data.columns.map((column) => {
        const cellEvents = data.events.filter((event) =>
          eventProfileKey(event) === profile.id && eventOverlaps(event, column.start, column.end)
        );
        if (cellEvents.length === 0) return "<td class=\"empty\"></td>";
        const content = cellEvents.map((event) => {
          const project = projectById.get(eventProjectKey(event));
          const projectColor = hslToHex(project?.color || "217 91% 60%");
          return `
            <div class="event" style="border-left-color:${projectColor};">
              <strong>${escapeHtml(event.title)}</strong>
              <span>${escapeHtml(exportEventTime(event))}</span>
              <span>${escapeHtml(project?.name || "Sans projet")}${event.location ? ` · ${escapeHtml(event.location)}` : ""}</span>
            </div>
          `;
        }).join("");
        return `<td>${content}</td>`;
      }).join("");
      return `
        <tr>
          <th class="profile-cell">
            <span class="dot" style="background:${hslToHex(profile.color)};"></span>
            <strong>${escapeHtml(profile.name)}</strong>
            <small>${escapeHtml(profile.role || "Profil")}</small>
          </th>
          ${cells}
        </tr>
      `;
    }).join("");
    const legend = data.projectRows.map((project) => `
      <span class="legend-item">
        <span class="dot" style="background:${hslToHex(project.color)};"></span>
        ${escapeHtml(project.name)}
      </span>
    `).join("");
    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; color: #171512; background: #ffffff; }
            .title { background: #171512; color: #ffffff; padding: 18px 20px; border-radius: 10px; }
            .title h1 { margin: 0; font-size: 24px; }
            .title p { margin: 6px 0 0; color: #f3df9d; font-weight: 700; }
            .summary { margin: 16px 0; font-weight: 700; color: #4b473f; }
            .legend { margin: 10px 0 16px; }
            .legend-item { display: inline-block; margin-right: 16px; font-weight: 700; color: #312d27; }
            .dot { display: inline-block; width: 10px; height: 10px; border-radius: 10px; margin-right: 6px; vertical-align: middle; }
            table { border-collapse: collapse; width: 100%; table-layout: fixed; }
            th, td { border: 1px solid #ded8cb; padding: 8px; vertical-align: top; background: #ffffff; }
            thead th { background: #f7f2e8; color: #2b2925; font-size: 12px; }
            .profile-cell { width: 160px; text-align: left; background: #fbfaf7; color: #171512; }
            .profile-cell small { display: block; margin-top: 4px; color: #746c60; font-weight: 600; }
            .date-col span { color: #756d5f; font-weight: 700; }
            .empty { background: #fbfaf8; }
            .event { margin: 0 0 6px; padding: 7px 8px; border-left: 4px solid #3b82f6; background: #f8fafc; border-radius: 6px; }
            .event strong { display: block; color: #171512; font-size: 12px; }
            .event span { display: block; color: #5c554b; font-size: 11px; margin-top: 2px; }
          </style>
        </head>
        <body>
          <div class="title">
            <h1>Planning SWAN HUB</h1>
            <p>${escapeHtml(data.title)}</p>
          </div>
          <div class="summary">${data.events.length} créneau(x) · ${data.profileRows.length} profil(s) · ${data.projectRows.length} projet(s)</div>
          <div class="legend">${legend}</div>
          <table>
            <thead>
              <tr>
                <th>Profil</th>
                ${headerCells}
              </tr>
            </thead>
            <tbody>${bodyRows}</tbody>
          </table>
        </body>
      </html>
    `;
    downloadFile(
      `planning-swan-${formatDateInput(data.start)}-${formatDateInput(addDays(data.end, -1))}.xls`,
      html,
      "application/vnd.ms-excel;charset=utf-8"
    );
    toast.success("Export Excel généré");
    return true;
  };

  const downloadPdfExport = async (data: ExportPlanningData) => {
    if (!exportSheetRef.current) {
      toast.error("Tableau indisponible pour l'export PDF");
      return false;
    }

    setIsExportingPdf(true);
    try {
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
      const target = exportSheetRef.current;
      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: target.scrollWidth,
        height: target.scrollHeight,
        windowWidth: target.scrollWidth,
        windowHeight: target.scrollHeight,
      });
      const pdf = new jsPDF("l", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const imgData = canvas.toDataURL("image/png");
      let position = margin;
      let heightLeft = imgHeight;

      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");
      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;

      while (heightLeft > 0) {
        pdf.addPage();
        position = margin - (imgHeight - heightLeft);
        pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - margin * 2;
      }

      pdf.save(`planning-swan-${formatDateInput(data.start)}-${formatDateInput(addDays(data.end, -1))}.pdf`);
      toast.success("PDF généré");
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, "Export PDF impossible"));
      return false;
    } finally {
      setIsExportingPdf(false);
    }
  };

  const sendMailExport = (data: ExportPlanningData) => {
    const body = data.events
      .slice(0, 25)
      .map((event) => {
        const project = event.project_id ? projectMap.get(event.project_id)?.name : "Sans projet";
        const profile = event.profile_id ? profileMap.get(event.profile_id)?.name : "Sans profil";
        return `- ${eventDateLabel(event)} | ${event.title} | ${profile} | ${project}`;
      })
      .join("\n");
    window.open(
      `mailto:?subject=${encodeURIComponent(`Planning SWAN - ${data.title}`)}&body=${encodeURIComponent(body)}`,
      "_blank",
      "noopener,noreferrer"
    );
    return true;
  };

  const runExport = async (format: ExportFormat) => {
    const data = getReadyExportData(format);
    if (!data) return;
    const success =
      format === "calendar"
        ? downloadCalendarExport(data)
        : format === "excel"
          ? downloadExcelExport(data)
          : format === "mail"
            ? sendMailExport(data)
            : await downloadPdfExport(data);
    if (success) setExportOpen(false);
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
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setResourcesOpen(true)}
          aria-expanded={resourcesOpen}
        >
          <Users size={14} />
          Profils {profiles.length}
          <span style={{ color: "var(--color-text-3)" }}>·</span>
          <Folder size={14} />
          Projets {projects.length}
          <ChevronDown size={14} />
        </button>
      </section>

      <Dialog open={resourcesOpen} onOpenChange={setResourcesOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-[760px] max-h-[86dvh] overflow-y-auto overflow-x-hidden p-4 sm:p-6">
          <DialogHeader className="pr-8">
            <DialogTitle>Profils & projets</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
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

          {(profiles.length > 0 || projects.length > 0) && (
            <div className="grid gap-4 lg:grid-cols-2">
              <ResourcePanel title="Profils" icon={<Users size={15} />}>
                {profiles.map((profile) => (
                  <ProfileRow
                    key={profile.id}
                    profile={profile}
                    onSave={(draft) => updateProfile.mutate({ id: profile.id, draft })}
                    onDelete={() => deleteProfile.mutate(profile)}
                    saving={updateProfile.isPending}
                    deleting={deleteProfile.isPending}
                  />
                ))}
              </ResourcePanel>

              <ResourcePanel title="Projets" icon={<Folder size={15} />}>
                {projects.map((project) => (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    onSave={(draft) => updateProject.mutate({ id: project.id, draft })}
                    onDelete={() => deleteProject.mutate(project)}
                    saving={updateProject.isPending}
                    deleting={deleteProject.isPending}
                  />
                ))}
              </ResourcePanel>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={periodOpen} onOpenChange={setPeriodOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md max-h-[86dvh] overflow-y-auto overflow-x-hidden p-4 sm:p-6">
          <DialogHeader className="pr-8">
            <DialogTitle>Période du planning</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
            <div>
              <label className="field-label">Départ</label>
              <input
                className="field-input"
                type="date"
                value={periodDraft.start}
                onChange={(event) => setPeriodDraft((current) => ({ ...current, start: event.target.value }))}
              />
            </div>
            <div>
              <label className="field-label">Arrivée</label>
              <input
                className="field-input"
                type="date"
                value={periodDraft.end}
                onChange={(event) => setPeriodDraft((current) => ({ ...current, end: event.target.value }))}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            <button className="btn btn-ghost btn-sm" onClick={() => {
              setCustomRange(null);
              setPeriodOpen(false);
            }}>
              Réinitialiser
            </button>
            <button className="btn btn-primary btn-sm" onClick={applyPeriod}>
              Appliquer
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-[860px] max-h-[86dvh] overflow-y-auto overflow-x-hidden p-4 sm:p-6">
          <DialogHeader className="pr-8">
            <DialogTitle>Exporter le planning</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="field-label">Départ</label>
              <input
                className="field-input"
                type="date"
                value={exportDraft.start}
                onChange={(event) => setExportDraft((current) => ({ ...current, start: event.target.value }))}
              />
            </div>
            <div>
              <label className="field-label">Arrivée</label>
              <input
                className="field-input"
                type="date"
                value={exportDraft.end}
                onChange={(event) => setExportDraft((current) => ({ ...current, end: event.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ExportOptionPanel
              title="Profils"
              options={exportProfileOptions.map((profile) => ({
                id: profile.id,
                name: profile.name,
                meta: profile.role || "Profil",
                color: profile.color,
              }))}
              selectedIds={exportDraft.profileIds}
              onToggle={toggleExportProfile}
              onSelectAll={() => setExportDraft((current) => ({ ...current, profileIds: exportProfileOptions.map((profile) => profile.id) }))}
              onClear={() => setExportDraft((current) => ({ ...current, profileIds: [] }))}
            />
            <ExportOptionPanel
              title="Projets"
              options={exportProjectOptions.map((project) => ({
                id: project.id,
                name: project.name,
                meta: project.client || "Projet",
                color: project.color,
              }))}
              selectedIds={exportDraft.projectIds}
              onToggle={toggleExportProject}
              onSelectAll={() => setExportDraft((current) => ({ ...current, projectIds: exportProjectOptions.map((project) => project.id) }))}
              onClear={() => setExportDraft((current) => ({ ...current, projectIds: [] }))}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <ExportSummaryCard label="Période" value={exportData?.title || "Dates invalides"} />
            <ExportSummaryCard label="Créneaux" value={String(exportData?.events.length || 0)} />
            <ExportSummaryCard label="Colonnes PDF" value={String(exportData?.columns.length || 0)} />
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            <button className={`btn btn-sm ${exportFormat === "calendar" ? "btn-primary" : "btn-secondary"}`} onClick={() => runExport("calendar")}>
              <Calendar size={14} />
              Calendrier
            </button>
            <button className={`btn btn-sm ${exportFormat === "pdf" ? "btn-primary" : "btn-secondary"}`} onClick={() => runExport("pdf")} disabled={isExportingPdf}>
              <FileText size={14} />
              {isExportingPdf ? "PDF..." : "PDF"}
            </button>
            <button className={`btn btn-sm ${exportFormat === "excel" ? "btn-primary" : "btn-secondary"}`} onClick={() => runExport("excel")}>
              <FileSpreadsheet size={14} />
              Excel
            </button>
            <button className={`btn btn-sm ${exportFormat === "mail" ? "btn-primary" : "btn-secondary"}`} onClick={() => runExport("mail")}>
              <Mail size={14} />
              Mail
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <section className="px-4" style={{ marginBottom: "var(--space-4)" }}>
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <button className="btn btn-icon-sm btn-secondary" onClick={() => {
              setCustomRange(null);
              setCursor(shiftCursor(cursor, view, -1));
            }} aria-label="Période précédente">
              <ChevronLeft size={17} />
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => {
              setCustomRange(null);
              setCursor(new Date());
            }}>
              Aujourd'hui
            </button>
            <button className="btn btn-icon-sm btn-secondary" onClick={() => {
              setCustomRange(null);
              setCursor(shiftCursor(cursor, view, 1));
            }} aria-label="Période suivante">
              <ChevronRight size={17} />
            </button>
            <div style={{ fontWeight: 900, fontFamily: "var(--font-display)", flex: "1 1 120px", minWidth: 0 }}>{range.title}</div>
            <button className="btn btn-secondary btn-sm" onClick={openPeriodDialog}>
              <Calendar size={14} />
              Période
            </button>
          </div>

          <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-muted">
            {VIEWS.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setCustomRange(null);
                  setView(option.value);
                }}
                className={`btn btn-sm ${!customRange && view === option.value ? "btn-primary" : "btn-ghost"}`}
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
      </section>

      <section className="px-4" style={{ marginBottom: "var(--space-4)" }}>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-secondary btn-sm" onClick={() => openExportDialog("calendar")}>
            <Calendar size={14} />
            Calendrier
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => openExportDialog("pdf")} disabled={isExportingPdf}>
            <FileText size={14} />
            {isExportingPdf ? "PDF..." : "PDF"}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => openExportDialog("excel")}>
            <FileSpreadsheet size={14} />
            Excel
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => openExportDialog("mail")}>
            <Mail size={14} />
            Mail
          </button>
        </div>
      </section>

      <section className="px-4">
        <div className="card" style={{ padding: 0, overflow: "hidden", background: "var(--color-bg-elevated)" }}>
          <div
            className="grid"
            style={{
              gridTemplateColumns: `${profileColumnWidth}px minmax(${timelineBodyWidth}px, 1fr)`,
              overflowX: "auto",
            }}
          >
            <div className="bg-muted/40 border-r border-border">
              <div style={{ height: 44, borderBottom: "1px solid var(--color-border)" }} />
              {timelineProfiles.map((profile) => (
                <div key={profile.id || NO_PROFILE_ID} className="flex items-center gap-2" style={{ height: 92, borderBottom: "1px solid var(--color-border)", paddingInline: 10 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 99, background: `hsl(${profile.color})`, flexShrink: 0 }} />
                  <div className="min-w-0">
                    <div style={{ fontWeight: 800, fontSize: "clamp(14px, var(--text-sm), 16px)", lineHeight: 1.15 }} className="truncate">{profile.name}</div>
                    <div style={{ color: "var(--color-text-3)", fontSize: "clamp(12px, var(--text-xs), 14px)", lineHeight: 1.2 }} className="truncate">{profile.role || "Profil"}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ minWidth: timelineBodyWidth }}>
              <div className="relative" style={{ height: 44, borderBottom: "1px solid var(--color-border)" }}>
                {range.ticks.map((tick, index) => {
                  const left = ((tick.date.getTime() - range.start.getTime()) / (range.end.getTime() - range.start.getTime())) * 100;
                  if (left < 0 || left >= 100) return null;
                  const nextDate = range.ticks[index + 1]?.date || range.end;
                  const right = ((Math.min(nextDate.getTime(), range.end.getTime()) - range.start.getTime()) / (range.end.getTime() - range.start.getTime())) * 100;
                  return (
                    <div
                      key={`${tick.label}-${tick.date.toISOString()}`}
                      style={{
                        position: "absolute",
                        left: `${clamp(left, 0, 100)}%`,
                        top: 0,
                        bottom: 0,
                        width: `${Math.max(4, clamp(right, 0, 100) - clamp(left, 0, 100))}%`,
                        borderLeft: "1px solid var(--color-border)",
                        paddingLeft: 8,
                        paddingRight: 4,
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ fontSize: "clamp(12px, var(--text-xs), 14px)", color: "var(--color-text-2)", fontWeight: 900, lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {tick.label}
                      </div>
                      {tick.subLabel && (
                        <div style={{ fontSize: "clamp(12px, var(--text-xs), 14px)", color: "var(--color-text-3)", fontWeight: 800, lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {tick.subLabel}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {timelineProfiles.map((profile) => {
                const laneEvents = visibleEvents.filter((event) => (event.profile_id || NO_PROFILE_ID) === (profile.id || NO_PROFILE_ID));
                return (
                  <div
                    key={profile.id || NO_PROFILE_ID}
                    className="relative"
                    onClick={(event) => handleLaneClick(event, profile.id)}
                    style={{
                      height: 92,
                      borderBottom: "1px solid var(--color-border)",
                      cursor: "crosshair",
                      background: "linear-gradient(180deg, transparent, hsl(217 91% 60% / 0.025))",
                    }}
                  >
                    {range.ticks.map((tick) => {
                      const left = ((tick.date.getTime() - range.start.getTime()) / (range.end.getTime() - range.start.getTime())) * 100;
                      if (left < 0 || left >= 100) return null;
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
                          onClick={(clickEvent) => {
                            clickEvent.stopPropagation();
                            openEditForm(event);
                          }}
                          className="text-left"
                          style={{
                            position: "absolute",
                            left: `${left}%`,
                            top: 12 + (index % 3) * 24,
                            width: `${width}%`,
                            minWidth: 92,
                            maxWidth: "calc(100% - 8px)",
                            height: 28,
                            borderRadius: 7,
                            border: `1px solid hsl(${project?.color || "217 91% 60"} / 0.45)`,
                            background: `linear-gradient(135deg, hsl(${project?.color || "217 91% 60"} / 0.88), hsl(${project?.color || "217 91% 60"} / 0.68))`,
                            color: "white",
                            padding: "4px 8px",
                            fontSize: "clamp(12px, var(--text-xs), 14px)",
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

      <section className="px-4 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginTop: "var(--space-5)" }}>
        <StatCard label="Créneaux visibles" value={String(stats.active)} icon={<CalendarDays size={18} />} />
        <StatCard label="Profils mobilisés" value={String(stats.profilesUsed)} icon={<Users size={18} />} />
        <StatCard label="Projets visibles" value={String(stats.projectsUsed)} icon={<Folder size={18} />} />
      </section>

      {exportData && (
        <div
          ref={exportSheetRef}
          aria-hidden="true"
          style={{
            position: "fixed",
            left: -10000,
            top: 0,
            width: EXPORT_SHEET_WIDTH,
            background: "#ffffff",
            pointerEvents: "none",
          }}
        >
          <ExportPlanningSheet data={exportData} />
        </div>
      )}
    </div>
  );
}

function ExportSummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3" style={{ background: "var(--color-surface)" }}>
      <div style={{ color: "var(--color-text-3)", fontSize: "var(--text-xs)", fontWeight: 800 }}>{label}</div>
      <div style={{ color: "var(--color-text-1)", fontSize: "var(--text-lg)", fontWeight: 900 }}>{value}</div>
    </div>
  );
}

function ExportOptionPanel({
  title,
  options,
  selectedIds,
  onToggle,
  onSelectAll,
  onClear,
}: {
  title: string;
  options: Array<{ id: string; name: string; meta: string; color: string }>;
  selectedIds: string[];
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
}) {
  const selected = new Set(selectedIds);

  return (
    <div className="rounded-lg border border-border p-3" style={{ background: "var(--color-bg-elevated)" }}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div style={{ fontSize: "var(--text-sm)", fontWeight: 900 }}>{title}</div>
        <div className="flex gap-1">
          <button className="btn btn-ghost btn-sm" onClick={onSelectAll}>Tous</button>
          <button className="btn btn-ghost btn-sm" onClick={onClear}>Aucun</button>
        </div>
      </div>

      <div className="grid gap-2" style={{ maxHeight: 220, overflowY: "auto", paddingRight: 2 }}>
        {options.length === 0 && (
          <div style={{ color: "var(--color-text-3)", fontSize: "var(--text-sm)", fontWeight: 700 }}>Aucun élément</div>
        )}
        {options.map((option) => (
          <label
            key={option.id}
            className="flex min-w-0 items-center gap-2 rounded-lg border border-border p-2"
            style={{ background: selected.has(option.id) ? "hsl(42 54% 59% / 0.1)" : "var(--color-surface)" }}
          >
            <input
              type="checkbox"
              checked={selected.has(option.id)}
              onChange={() => onToggle(option.id)}
              style={{ width: 18, height: 18, flexShrink: 0 }}
            />
            <span style={{ width: 10, height: 10, borderRadius: 99, background: `hsl(${option.color})`, flexShrink: 0 }} />
            <span className="min-w-0">
              <span className="block truncate" style={{ fontWeight: 850 }}>{option.name}</span>
              <span className="block truncate" style={{ color: "var(--color-text-3)", fontSize: "var(--text-xs)", fontWeight: 700 }}>{option.meta}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function ExportPlanningSheet({ data }: { data: ExportPlanningData }) {
  const projectById = useMemo(() => new Map(data.projectRows.map((project) => [project.id, project])), [data.projectRows]);

  const sheetStyles: Record<string, CSSProperties> = {
    page: {
      width: EXPORT_SHEET_WIDTH,
      padding: 34,
      background: "#ffffff",
      color: "#191714",
      fontFamily: "Inter, Arial, sans-serif",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      gap: 24,
      padding: "24px 26px",
      borderRadius: 18,
      background: "linear-gradient(135deg, #171512 0%, #2b2620 100%)",
      color: "#ffffff",
      boxShadow: "0 18px 45px rgba(23, 21, 18, 0.16)",
    },
    badge: {
      display: "inline-flex",
      alignItems: "center",
      minHeight: 28,
      padding: "5px 11px",
      borderRadius: 999,
      background: "rgba(201, 169, 97, 0.18)",
      color: "#f2d88f",
      fontSize: 12,
      fontWeight: 900,
      letterSpacing: 0.4,
    },
    h1: {
      margin: "12px 0 0",
      fontSize: 34,
      lineHeight: 1,
      fontWeight: 950,
    },
    subtitle: {
      marginTop: 8,
      color: "#eadbb8",
      fontSize: 15,
      fontWeight: 800,
    },
    statGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(3, minmax(110px, 1fr))",
      gap: 10,
      minWidth: 390,
    },
    stat: {
      padding: "12px 14px",
      borderRadius: 14,
      background: "rgba(255,255,255,0.08)",
      border: "1px solid rgba(255,255,255,0.12)",
    },
    statLabel: {
      color: "#d7c7a6",
      fontSize: 11,
      fontWeight: 800,
      textTransform: "uppercase",
    },
    statValue: {
      marginTop: 4,
      fontSize: 24,
      fontWeight: 950,
    },
    legend: {
      display: "flex",
      flexWrap: "wrap",
      gap: 8,
      margin: "18px 0 16px",
    },
    legendItem: {
      display: "flex",
      alignItems: "center",
      gap: 7,
      padding: "7px 10px",
      borderRadius: 999,
      border: "1px solid #ded8cb",
      background: "#fbfaf7",
      fontSize: 12,
      fontWeight: 850,
      color: "#332f28",
    },
    table: {
      width: "100%",
      borderCollapse: "separate",
      borderSpacing: 0,
      tableLayout: "fixed",
      border: "1px solid #d9d2c5",
      borderRadius: 16,
      overflow: "hidden",
      boxShadow: "0 16px 36px rgba(31, 28, 23, 0.08)",
    },
    th: {
      padding: "12px 10px",
      background: "#f6efe0",
      borderRight: "1px solid #ddd3c2",
      borderBottom: "1px solid #d9d2c5",
      textAlign: "left",
      verticalAlign: "top",
      fontSize: 12,
      color: "#29251f",
      fontWeight: 950,
    },
    profileTh: {
      width: 168,
      padding: "14px 12px",
      background: "#fbfaf7",
      borderRight: "1px solid #d9d2c5",
      borderBottom: "1px solid #d9d2c5",
      textAlign: "left",
      verticalAlign: "top",
    },
    td: {
      minHeight: 92,
      padding: 8,
      borderRight: "1px solid #e8e1d4",
      borderBottom: "1px solid #e8e1d4",
      background: "#ffffff",
      verticalAlign: "top",
    },
  };

  return (
    <div style={sheetStyles.page}>
      <div style={sheetStyles.header}>
        <div>
          <div style={sheetStyles.badge}>SWAN HUB</div>
          <h1 style={sheetStyles.h1}>Planning</h1>
          <div style={sheetStyles.subtitle}>{data.title}</div>
        </div>
        <div style={sheetStyles.statGrid}>
          <div style={sheetStyles.stat}>
            <div style={sheetStyles.statLabel}>Créneaux</div>
            <div style={sheetStyles.statValue}>{data.events.length}</div>
          </div>
          <div style={sheetStyles.stat}>
            <div style={sheetStyles.statLabel}>Profils</div>
            <div style={sheetStyles.statValue}>{data.profileRows.length}</div>
          </div>
          <div style={sheetStyles.stat}>
            <div style={sheetStyles.statLabel}>Projets</div>
            <div style={sheetStyles.statValue}>{data.projectRows.length}</div>
          </div>
        </div>
      </div>

      <div style={sheetStyles.legend}>
        {data.projectRows.map((project) => (
          <div key={project.id} style={sheetStyles.legendItem}>
            <span style={{ width: 10, height: 10, borderRadius: 99, background: `hsl(${project.color})` }} />
            {project.name}
          </div>
        ))}
      </div>

      <table style={sheetStyles.table}>
        <thead>
          <tr>
            <th style={sheetStyles.th}>Profil</th>
            {data.columns.map((column) => (
              <th key={column.id} style={sheetStyles.th}>
                <div>{column.label}</div>
                <div style={{ marginTop: 3, color: "#776d5d", fontSize: 11, fontWeight: 800 }}>{column.subLabel}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.profileRows.map((profile) => (
            <tr key={profile.id}>
              <th style={sheetStyles.profileTh}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <span style={{ width: 11, height: 11, borderRadius: 99, background: `hsl(${profile.color})`, flexShrink: 0 }} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 14, fontWeight: 950, color: "#201d19" }}>{profile.name}</span>
                    <span style={{ display: "block", marginTop: 3, fontSize: 11, color: "#7a7062", fontWeight: 800 }}>{profile.role || "Profil"}</span>
                  </span>
                </div>
              </th>
              {data.columns.map((column) => {
                const cellEvents = data.events.filter((event) =>
                  eventProfileKey(event) === profile.id && eventOverlaps(event, column.start, column.end)
                );
                return (
                  <td key={column.id} style={sheetStyles.td}>
                    <div style={{ display: "grid", gap: 6 }}>
                      {cellEvents.map((event) => {
                        const project = projectById.get(eventProjectKey(event));
                        const color = project?.color || "217 91% 60%";
                        return (
                          <div
                            key={`${column.id}-${event.id}`}
                            style={{
                              padding: "7px 8px",
                              borderRadius: 9,
                              border: `1px solid hsl(${color} / 0.28)`,
                              borderLeft: `4px solid hsl(${color})`,
                              background: `linear-gradient(135deg, hsl(${color} / 0.12), #ffffff)`,
                              boxShadow: "0 5px 14px rgba(35, 31, 25, 0.06)",
                            }}
                          >
                            <div style={{ color: "#171512", fontSize: 12, fontWeight: 950, lineHeight: 1.15 }}>{event.title}</div>
                            <div style={{ marginTop: 3, color: "#6f6659", fontSize: 10.5, fontWeight: 800 }}>{exportEventTime(event)}</div>
                            <div style={{ marginTop: 2, color: "#6f6659", fontSize: 10.5, fontWeight: 750 }}>{project?.name || "Sans projet"}</div>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
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
    <div className="grid items-center gap-2" style={{ gridTemplateColumns: "40px minmax(0, 1fr) 40px" }}>
      <div
        className="plugin-icon-wrapper"
        style={{
          width: 40,
          height: 40,
          minWidth: 40,
          background: "hsl(199 89% 48% / 0.12)",
          color: "hsl(199 89% 48%)",
        }}
      >
        {icon}
      </div>
      <input
        className="field-input"
        style={{ minWidth: 0 }}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && onSubmit()}
        placeholder={placeholder}
      />
      <button
        className="btn btn-icon-sm btn-secondary"
        style={{ minWidth: 40, width: 40 }}
        onClick={onSubmit}
        disabled={disabled}
        aria-label={placeholder}
      >
        <Send size={16} />
      </button>
    </div>
  );
}

function ResourcePanel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "var(--space-3)" }}>
      <div className="flex items-center gap-2 mb-2" style={{ fontSize: "var(--text-sm)", fontWeight: 900 }}>
        {icon}
        {title}
      </div>
      <div className="grid gap-2">{children}</div>
    </div>
  );
}

function ProfileRow({
  profile,
  onSave,
  onDelete,
  saving,
  deleting,
}: {
  profile: PlanningProfile;
  onSave: (draft: ProfileDraft) => void;
  onDelete: () => void;
  saving?: boolean;
  deleting?: boolean;
}) {
  const [draft, setDraft] = useState<ProfileDraft>({
    name: profile.name,
    role: profile.role || "",
    color: profile.color,
  });

  return (
    <div className="grid min-w-0 gap-2 rounded-lg border border-border p-2" style={{ background: "var(--color-surface)" }}>
      <div className="flex min-w-0 items-center gap-2">
        <span style={{ width: 10, height: 10, borderRadius: 99, background: `hsl(${draft.color})`, flexShrink: 0 }} />
        <input className="field-input" style={{ minWidth: 0 }} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Nom du profil" />
      </div>
      <input className="field-input" style={{ minWidth: 0 }} value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value })} placeholder="Rôle / métier" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ColorPicker colors={PROFILE_COLORS} value={draft.color} onChange={(color) => setDraft({ ...draft, color })} />
        <div className="flex gap-1">
          <button className="btn btn-icon-sm btn-secondary" onClick={() => onSave(draft)} disabled={saving} aria-label="Enregistrer le profil">
            <Save size={15} />
          </button>
          <button className="btn btn-icon-sm btn-ghost" onClick={onDelete} disabled={deleting} aria-label="Supprimer le profil">
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectRow({
  project,
  onSave,
  onDelete,
  saving,
  deleting,
}: {
  project: PlanningProject;
  onSave: (draft: ProjectDraft) => void;
  onDelete: () => void;
  saving?: boolean;
  deleting?: boolean;
}) {
  const [draft, setDraft] = useState<ProjectDraft>({
    name: project.name,
    client: project.client || "",
    color: project.color,
  });

  return (
    <div className="grid min-w-0 gap-2 rounded-lg border border-border p-2" style={{ background: "var(--color-surface)" }}>
      <div className="flex min-w-0 items-center gap-2">
        <span style={{ width: 10, height: 10, borderRadius: 99, background: `hsl(${draft.color})`, flexShrink: 0 }} />
        <input className="field-input" style={{ minWidth: 0 }} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Nom du projet" />
      </div>
      <input className="field-input" style={{ minWidth: 0 }} value={draft.client} onChange={(event) => setDraft({ ...draft, client: event.target.value })} placeholder="Client / dossier" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ColorPicker colors={PROJECT_COLORS} value={draft.color} onChange={(color) => setDraft({ ...draft, color })} />
        <div className="flex gap-1">
          <button className="btn btn-icon-sm btn-secondary" onClick={() => onSave(draft)} disabled={saving} aria-label="Enregistrer le projet">
            <Save size={15} />
          </button>
          <button className="btn btn-icon-sm btn-ghost" onClick={onDelete} disabled={deleting} aria-label="Supprimer le projet">
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ColorPicker({ colors, value, onChange }: { colors: string[]; value: string; onChange: (color: string) => void }) {
  return (
    <div className="flex min-w-0 flex-wrap gap-1">
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          aria-label={`Couleur ${color}`}
          style={{
            width: 24,
            height: 24,
            borderRadius: 999,
            background: `hsl(${color})`,
            border: value === color ? "2px solid var(--color-text-1)" : "1px solid var(--color-border)",
            boxShadow: value === color ? "var(--shadow-sm)" : "none",
          }}
        />
      ))}
    </div>
  );
}
