import { useState, useMemo, useEffect } from "react";
import {
  Clock, ChevronDown, ChevronUp, Trash2, AlertCircle, MapPin,
  Pencil, Share2, Copy, Mail, MessageSquare, Phone, FolderOpen, Search, Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const buildReportText = (r: any) => {
  let text = `Rapport : ${r.title}\n`;
  if (r.location) text += `Lieu : ${r.location}\n`;
  if (r.priority && r.priority !== "normale") text += `Priorité : ${r.priority}\n`;
  const dateField = r.report_date || r.created_at;
  text += `${new Date(dateField).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}\n`;
  if (r.notes) text += `\n${r.notes}`;
  return text;
};

const buildShareText = (r: any, photoUrls: string[], maxPhotos = 5) => {
  const safeUrls = Array.from(new Set(photoUrls.filter(Boolean))).slice(0, maxPhotos);
  if (safeUrls.length === 0) return buildReportText(r);

  return `${buildReportText(r)}\n\nPhotos :\n${safeUrls.map((url, index) => `${index + 1}. ${url}`).join("\n")}`;
};

const shareActions = [
  { id: "copy", icon: Copy, label: "Copier" },
  { id: "email", icon: Mail, label: "Email" },
  { id: "sms", icon: Phone, label: "SMS" },
  { id: "whatsapp", icon: MessageSquare, label: "WhatsApp" },
];

const getReportPhotoStoragePath = (urlOrPath: string) => {
  const publicPrefix = "/storage/v1/object/public/report-photos/";
  const signedPrefix = "/storage/v1/object/sign/report-photos/";
  if (!urlOrPath.startsWith("http")) return urlOrPath;

  const publicIdx = urlOrPath.indexOf(publicPrefix);
  if (publicIdx !== -1) {
    return decodeURIComponent(urlOrPath.substring(publicIdx + publicPrefix.length).split("?")[0]);
  }

  const signedIdx = urlOrPath.indexOf(signedPrefix);
  if (signedIdx !== -1) {
    return decodeURIComponent(urlOrPath.substring(signedIdx + signedPrefix.length).split("?")[0]);
  }

  return urlOrPath;
};

interface Props {
  reports: any[];
  folders: any[];
  colorOptions: { value: string; label: string }[];
  onEdit: (r: any) => void;
  onDelete: (id: string) => void;
}

const ReportHistory = ({ reports, folders, colorOptions, onEdit, onDelete }: Props) => {
  const [showHistory, setShowHistory] = useState(false);
  const [shareOpenId, setShareOpenId] = useState<string | null>(null);
  const [sharePhotoUrls, setSharePhotoUrls] = useState<Record<string, string[]>>({});
  const [loadingShareId, setLoadingShareId] = useState<string | null>(null);
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});
  const [allPhotos, setAllPhotos] = useState<Record<string, string[]>>({});
  const [filterColor, setFilterColor] = useState<string | null>(null);
  const [filterFolderId, setFilterFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return reports.filter((r: any) => {
      if (filterColor && r.color !== filterColor) return false;
      if (filterFolderId && r.folder_id !== filterFolderId) return false;
      if (q) {
        const haystack = `${r.title} ${r.location || ""} ${r.notes || ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [reports, filterColor, filterFolderId, searchQuery]);

  // Load all photos for visible reports
  useEffect(() => {
    if (!showHistory || filtered.length === 0) return;
    const loadPhotos = async () => {
      const ids = filtered.map((r) => r.id);
      const missing = ids.filter((id) => !allPhotos[id]);
      if (missing.length === 0) return;

      const { data: photos } = await supabase
        .from("report_photos")
        .select("report_id, photo_url, sort_order")
        .in("report_id", missing)
        .order("sort_order", { ascending: true });

      const grouped: Record<string, string[]> = {};
      for (const id of missing) {
        const reportPhotos = photos?.filter((p) => p.report_id === id).map((p) => p.photo_url) ?? [];
        const report = filtered.find((r) => r.id === id);
        // Include legacy photo_url if not already in the list
        if (report?.photo_url && !reportPhotos.includes(report.photo_url)) {
          reportPhotos.unshift(report.photo_url);
        }
        grouped[id] = reportPhotos;
      }

      // Resolve signed URLs
      const resolved: Record<string, string[]> = {};
      for (const [id, urls] of Object.entries(grouped)) {
        resolved[id] = await Promise.all(urls.map(getSignedUrl));
      }
      setAllPhotos((prev) => ({ ...prev, ...resolved }));
    };
    loadPhotos();
  }, [filtered, showHistory]);

  const getSignedUrl = async (path: string): Promise<string> => {
    const storagePath = getReportPhotoStoragePath(path);
    if (storagePath.startsWith("http")) return storagePath;

    const { data } = await supabase.storage.from("report-photos").createSignedUrl(storagePath, 3600);
    return data?.signedUrl ?? path;
  };

  const loadSharePhotos = async (r: any) => {
    if (sharePhotoUrls[r.id]) return sharePhotoUrls[r.id];

    setLoadingShareId(r.id);
    try {
      const { data: photos } = await supabase
        .from("report_photos")
        .select("photo_url")
        .eq("report_id", r.id)
        .order("sort_order", { ascending: true });

      const rawUrls = Array.from(new Set([
        ...(photos?.map((p: any) => p.photo_url).filter(Boolean) ?? []),
        ...(r.photo_url ? [r.photo_url] : []),
      ]));

      const urls = await Promise.all(rawUrls.map(getSignedUrl));
      setSharePhotoUrls((prev) => ({ ...prev, [r.id]: urls }));
      return urls;
    } catch {
      const fallbackUrls = r.photo_url ? [r.photo_url] : [];
      setSharePhotoUrls((prev) => ({ ...prev, [r.id]: fallbackUrls }));
      return fallbackUrls;
    } finally {
      setLoadingShareId((current) => (current === r.id ? null : current));
    }
  };

  const handleShare = (r: any, method: string) => {
    const photoUrls = sharePhotoUrls[r.id] ?? (r.photo_url ? [r.photo_url] : []);
    const text = buildShareText(r, photoUrls, method === "sms" ? 3 : 5);

    if (method === "copy") {
      navigator.clipboard.writeText(text)
        .then(() => toast.success("Copié"))
        .catch(() => toast.error("Copie impossible"));
      setShareOpenId(null);
      return;
    }

    const shareUrl = method === "email"
      ? `mailto:?subject=${encodeURIComponent(`Rapport : ${r.title}`)}&body=${encodeURIComponent(text)}`
      : method === "sms"
        ? `sms:?body=${encodeURIComponent(text)}`
        : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.location.href = shareUrl;
    setShareOpenId(null);
  };

  const toggleShareMenu = (r: any) => {
    const nextId = shareOpenId === r.id ? null : r.id;
    setShareOpenId(nextId);
    if (nextId === r.id) void loadSharePhotos(r);
  };

  const getFolderInfo = (folderId: string | null) => folders.find((f: any) => f.id === folderId);

  const formatDateTime = (r: any) => {
    const d = r.report_date || r.created_at;
    const parsed = new Date(d);
    return {
      date: parsed.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }),
      time: parsed.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    };
  };

  return (
    <div className="glass-card overflow-hidden">
      <button onClick={() => setShowHistory(!showHistory)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-secondary/50 transition-colors">
        <span className="flex items-center gap-2">
          <Clock size={14} className="text-muted-foreground" />
          Historique ({reports.length})
        </span>
        {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {showHistory && (
        <>
          {/* Search bar */}
          <div className="px-4 pt-2 pb-1">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un rapport..."
                className="field-input field-input-compact pl-9"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="px-4 py-2 border-b border-border space-y-2">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              <button onClick={() => setFilterColor(null)}
                className={`text-[10px] px-2 py-1 rounded-md whitespace-nowrap shrink-0 ${!filterColor ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary"}`}>
                Toutes
              </button>
              {colorOptions.map((c) => (
                <button key={c.value} onClick={() => setFilterColor(filterColor === c.value ? null : c.value)}
                  className={`w-5 h-5 rounded-full border-2 shrink-0 transition-all ${filterColor === c.value ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: `hsl(${c.value})` }} title={c.label} />
              ))}
            </div>
            {folders.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                <button onClick={() => setFilterFolderId(null)}
                  className={`text-[10px] px-2 py-1 rounded-md whitespace-nowrap shrink-0 flex items-center gap-1 ${!filterFolderId ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary"}`}>
                  <FolderOpen size={10} /> Tous
                </button>
                {folders.map((f: any) => (
                  <button key={f.id} onClick={() => setFilterFolderId(filterFolderId === f.id ? null : f.id)}
                    className={`text-[10px] px-2 py-1 rounded-md whitespace-nowrap shrink-0 flex items-center gap-1 transition-colors ${filterFolderId === f.id ? "font-medium" : "text-muted-foreground hover:bg-secondary"}`}
                    style={filterFolderId === f.id ? { backgroundColor: `hsl(${f.color} / 0.15)`, color: `hsl(${f.color})` } : {}}>
                    <span className="text-xs">{f.icon}</span> {f.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 px-4 py-3">
            {filtered.length === 0 ? (
              <div className="p-6 text-center">
                <AlertCircle size={20} className="mx-auto text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">
                  {searchQuery ? "Aucun résultat" : "Aucun rapport"}
                </p>
              </div>
            ) : (
              filtered.map((r: any) => {
                const folder = getFolderInfo(r.folder_id);
                const reportDate = formatDateTime(r);
                return (
                  <article
                    key={r.id}
                    className="rounded-xl border border-border bg-background/55 p-3 space-y-2 shadow-sm"
                    style={{ borderLeft: `3px solid hsl(${r.color || "38 50% 58%"})` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <h3 className="text-base font-bold font-heading truncate">{r.title}</h3>
                          {r.priority && r.priority !== "normale" && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${r.priority === "urgente" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}>
                              {r.priority}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-primary">
                          <Clock size={11} />
                          <span>{reportDate.date}</span>
                          <span className="text-muted-foreground">à</span>
                          <span>{reportDate.time}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button onClick={() => onEdit(r)} className="btn btn-icon-xs btn-ghost"><Pencil size={13} /></button>
                        <button onClick={() => toggleShareMenu(r)} className="btn btn-icon-xs btn-ghost"><Share2 size={13} /></button>
                        <button onClick={() => { if (window.confirm("Supprimer ce rapport ?")) onDelete(r.id); }} className="btn btn-icon-xs btn-ghost"><Trash2 size={13} /></button>
                      </div>
                    </div>

                    {shareOpenId === r.id && (
                      <div className="flex gap-1.5 py-1 items-center flex-wrap">
                        {loadingShareId === r.id && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground px-2 py-1">
                            <Loader2 size={11} className="animate-spin" /> Préparation des photos…
                          </span>
                        )}
                        {shareActions.map((s) => (
                          <button key={s.id} onClick={() => handleShare(r, s.id)}
                            disabled={loadingShareId === r.id}
                            className="btn btn-secondary btn-xs">
                            <s.icon size={11} /> {s.label}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="h-px bg-border/70" />

                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                      {r.location && (
                        <span className="flex items-center gap-1"><MapPin size={10} /> {r.location}</span>
                      )}
                      {folder && (
                        <span className="flex items-center gap-1" style={{ color: `hsl(${folder.color})` }}>
                          <span className="text-xs">{folder.icon}</span> {folder.name}
                        </span>
                      )}
                    </div>

                    {r.notes && <p className="text-xs text-muted-foreground line-clamp-2">{r.notes}</p>}
                    {(allPhotos[r.id]?.length ?? 0) > 0 && (
                      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pt-1">
                        {allPhotos[r.id].map((url, i) => (
                          <img key={i} src={url} alt={`Photo ${i + 1}`} className="w-14 h-14 object-cover rounded-md border border-border shrink-0" />
                        ))}
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ReportHistory;
