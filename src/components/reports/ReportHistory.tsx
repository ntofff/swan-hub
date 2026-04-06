import { useState } from "react";
import {
  Clock, ChevronDown, ChevronUp, Trash2, AlertCircle, MapPin,
  Pencil, Share2, Copy, Mail, MessageSquare, Phone, FolderOpen
} from "lucide-react";

const buildReportText = (r: any) => {
  let text = `📋 Rapport : ${r.title}\n`;
  if (r.location) text += `📍 Lieu : ${r.location}\n`;
  if (r.priority && r.priority !== "normale") text += `⚠️ Priorité : ${r.priority}\n`;
  text += `📅 ${new Date(r.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}\n`;
  if (r.notes) text += `\n${r.notes}`;
  return text;
};

const shareActions = [
  { id: "copy", icon: Copy, label: "Copier" },
  { id: "email", icon: Mail, label: "Email" },
  { id: "sms", icon: Phone, label: "SMS" },
  { id: "whatsapp", icon: MessageSquare, label: "WhatsApp" },
];

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
  const [filterColor, setFilterColor] = useState<string | null>(null);
  const [filterFolderId, setFilterFolderId] = useState<string | null>(null);

  const filtered = reports.filter((r: any) => {
    if (filterColor && r.color !== filterColor) return false;
    if (filterFolderId && r.folder_id !== filterFolderId) return false;
    return true;
  });

  const handleShare = (r: any, method: string) => {
    const text = buildReportText(r);
    if (method === "copy") { navigator.clipboard.writeText(text); }
    else if (method === "email") window.open(`mailto:?subject=${encodeURIComponent(`Rapport : ${r.title}`)}&body=${encodeURIComponent(text)}`);
    else if (method === "sms") window.open(`sms:?body=${encodeURIComponent(text)}`);
    else if (method === "whatsapp") window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
    setShareOpenId(null);
  };

  const getFolderInfo = (folderId: string | null) => folders.find((f: any) => f.id === folderId);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="glass-card overflow-hidden">
      <button onClick={() => setShowHistory(!showHistory)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-secondary/50 transition-colors">
        <span className="flex items-center gap-2">
          <Clock size={14} className="text-muted-foreground" />
          Historique ({filtered.length})
        </span>
        {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {showHistory && (
        <>
          {/* Filters */}
          <div className="px-4 py-2 border-b border-border space-y-2">
            {/* Color filter */}
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
            {/* Folder filter */}
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

          <div className="divide-y divide-border">
            {filtered.length === 0 ? (
              <div className="p-6 text-center">
                <AlertCircle size={20} className="mx-auto text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">Aucun rapport</p>
              </div>
            ) : (
              filtered.map((r: any) => {
                const folder = getFolderInfo(r.folder_id);
                return (
                  <div key={r.id} className="px-4 py-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-3 h-3 rounded-full shrink-0 border border-border/50"
                          style={{ backgroundColor: `hsl(${r.color || "38 50% 58%"})` }} />
                        <span className="text-sm font-medium truncate">{r.title}</span>
                        {r.priority && r.priority !== "normale" && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${r.priority === "urgente" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}>
                            {r.priority}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button onClick={() => onEdit(r)} className="p-1.5 text-muted-foreground hover:text-primary" title="Modifier"><Pencil size={13} /></button>
                        <button onClick={() => setShareOpenId(shareOpenId === r.id ? null : r.id)} className="p-1.5 text-muted-foreground hover:text-primary" title="Partager"><Share2 size={13} /></button>
                        <button onClick={() => onDelete(r.id)} className="p-1.5 text-muted-foreground hover:text-destructive" title="Supprimer"><Trash2 size={13} /></button>
                      </div>
                    </div>

                    {shareOpenId === r.id && (
                      <div className="flex gap-1.5 py-1">
                        {shareActions.map((s) => (
                          <button key={s.id} onClick={() => handleShare(r, s.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-secondary text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                            <s.icon size={11} /> {s.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {folder && (
                      <div className="flex items-center gap-1 text-[10px]"
                        style={{ color: `hsl(${folder.color})` }}>
                        <span className="text-xs">{folder.icon}</span> {folder.name}
                      </div>
                    )}

                    {r.location && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1"><MapPin size={10} /> {r.location}</p>
                    )}
                    {r.notes && <p className="text-xs text-muted-foreground line-clamp-2">{r.notes}</p>}
                    {r.photo_url && <img src={r.photo_url} alt="Photo" className="w-16 h-12 object-cover rounded-md border border-border" />}
                    <p className="text-[10px] text-muted-foreground">{formatDate(r.created_at)}</p>
                  </div>
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
