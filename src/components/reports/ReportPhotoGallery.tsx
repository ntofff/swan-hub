import { useState, useRef, useCallback, useEffect } from "react";
import {
  Camera, X, Download, ChevronUp, ChevronDown,
  ArrowUp, ArrowDown, Type, Eye, EyeOff, Pencil
} from "lucide-react";
import { toast } from "sonner";

interface PhotoItem {
  id: string;
  file?: File;
  url: string;
  caption?: string;
  captionPosition: string;
  captionRotation?: number;
  captionFont: string;
  captionSize: number;
  captionColor: string;
  captionOpacity: number;
  showDate?: boolean;
  takenAt: Date;
}

interface Props {
  photos: PhotoItem[];
  onChange: (photos: PhotoItem[]) => void;
}

const positionOptions = [
  { value: "center-diagonal", label: "Centre diagonale" },
  { value: "bottom-left", label: "Bas gauche" },
  { value: "bottom-center", label: "Bas centre" },
  { value: "bottom-right", label: "Bas droite" },
];

const fontOptions = [
  { value: "sans-serif", label: "Sans-serif" },
  { value: "serif", label: "Serif" },
  { value: "monospace", label: "Mono" },
  { value: "'Courier New', monospace", label: "Courier" },
  { value: "'Georgia', serif", label: "Georgia" },
];

function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

const ReportPhotoGallery = ({ photos, onChange }: Props) => {
  const [collapsed, setCollapsed] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addPhotos = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newPhotos: PhotoItem[] = [];
    let processed = 0;

    files.forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} dépasse 10 Mo`);
        processed++;
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        newPhotos.push({
          id: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file,
          url: ev.target?.result as string,
          caption: "",
          captionPosition: "bottom-center",
          captionFont: "sans-serif",
          captionSize: 24,
          captionColor: "#FFFFFF",
          captionOpacity: 0.8,
          showDate: false,
          takenAt: new Date(),
        });
        processed++;
        if (processed === files.length) {
          onChange([...photos, ...newPhotos]);
          toast.success(`${newPhotos.length} photo(s) ajoutée(s)`);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [photos, onChange]);

  const removePhoto = useCallback((idx: number) => {
    const updated = photos.filter((_, i) => i !== idx);
    onChange(updated);
    if (editingIdx === idx) setEditingIdx(null);
    else if (editingIdx !== null && editingIdx > idx) setEditingIdx(editingIdx - 1);
  }, [photos, onChange, editingIdx]);

  const movePhoto = useCallback((idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= photos.length) return;
    const updated = [...photos];
    [updated[idx], updated[target]] = [updated[target], updated[idx]];
    onChange(updated);
    if (editingIdx === idx) setEditingIdx(target);
    else if (editingIdx === target) setEditingIdx(idx);
  }, [photos, onChange, editingIdx]);

  const updatePhoto = useCallback((idx: number, patch: Partial<PhotoItem>) => {
    const updated = photos.map((p, i) => i === idx ? { ...p, ...patch } : p);
    onChange(updated);
  }, [photos, onChange]);

  const saveToDevice = useCallback(async (photo: PhotoItem) => {
    try {
      const canvas = await renderPhotoWithCaption(photo);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
          "image/jpeg",
          0.92
        );
      });

      if (navigator.share && navigator.canShare) {
        const file = new File([blob], `rapport-photo-${Date.now()}.jpg`, { type: "image/jpeg" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file] });
          toast.success("Photo partagée");
          return;
        }
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `rapport-photo-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success("Photo enregistrée");
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        toast.error("Erreur lors de l'enregistrement");
      }
    }
  }, []);

  return (
    <div className="space-y-2">
      <input ref={fileInputRef} type="file" accept="image/*" multiple capture="environment"
        onChange={addPhotos} className="hidden" />

      <div className="flex items-center justify-between">
        <button onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          {collapsed ? <EyeOff size={12} /> : <Eye size={12} />}
          Photos ({photos.length})
          {collapsed ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
        </button>
        <button onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary text-[10px] text-muted-foreground hover:text-foreground transition-colors">
          <Camera size={12} /> Ajouter
        </button>
      </div>

      {!collapsed && (
        <>
          {photos.length === 0 ? (
            <button onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-4 py-6 rounded-xl border border-dashed border-border text-xs text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors">
              <Camera size={16} /> Ajouter des photos
            </button>
          ) : (
            <div className="space-y-3">
              {photos.map((photo, idx) => (
                <div key={photo.id} className="space-y-1.5">
                  <div className="relative group rounded-lg overflow-hidden border border-border">
                    <PhotoCanvas photo={photo} />

                    <div className="absolute top-1.5 right-1.5 flex gap-1">
                      <button onClick={() => movePhoto(idx, -1)} disabled={idx === 0}
                        className="p-1.5 rounded-md bg-background/80 text-foreground disabled:opacity-30">
                        <ArrowUp size={12} />
                      </button>
                      <button onClick={() => movePhoto(idx, 1)} disabled={idx === photos.length - 1}
                        className="p-1.5 rounded-md bg-background/80 text-foreground disabled:opacity-30">
                        <ArrowDown size={12} />
                      </button>
                      <button onClick={() => setEditingIdx(editingIdx === idx ? null : idx)}
                        className={`p-1.5 rounded-md bg-background/80 ${editingIdx === idx ? "text-primary" : "text-foreground"}`}>
                        <Type size={12} />
                      </button>
                      <button onClick={() => saveToDevice(photo)}
                        className="p-1.5 rounded-md bg-background/80 text-foreground">
                        <Download size={12} />
                      </button>
                      <button onClick={() => removePhoto(idx)}
                        className="p-1.5 rounded-md bg-background/80 text-destructive">
                        <X size={12} />
                      </button>
                    </div>
                  </div>

                  <p className="text-[9px] text-muted-foreground text-center">
                    {photo.takenAt.toLocaleDateString("fr-FR", {
                      day: "numeric", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit"
                    })}
                  </p>

                  {editingIdx === idx && (
                    <CaptionEditor
                      photo={photo}
                      onUpdate={(patch) => updatePhoto(idx, patch)}
                      onClose={() => setEditingIdx(null)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

/* ─── Canvas renderer ─── */
const PhotoCanvas = ({ photo }: { photo: PhotoItem }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = imgRef.current;
    const aspect = img.naturalWidth / img.naturalHeight;
    const w = canvas.parentElement?.clientWidth || 200;
    const h = w / aspect;
    canvas.width = w * 2;
    canvas.height = h * 2;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(2, 2);

    ctx.drawImage(img, 0, 0, w, h);
    drawOverlay(ctx, photo, w, h);
  }, [photo]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <>
      <img
        ref={(el) => {
          imgRef.current = el;
          if (el && el.complete) draw();
        }}
        src={photo.url}
        alt=""
        onLoad={draw}
        className="hidden"
        crossOrigin="anonymous"
      />
      <canvas ref={canvasRef} className="w-full block" />
    </>
  );
};

function drawOverlay(ctx: CanvasRenderingContext2D, photo: PhotoItem, w: number, h: number) {
  const { caption, captionPosition, captionFont, captionSize, captionColor, captionOpacity, showDate, takenAt } = photo;

  const dateStr = showDate
    ? takenAt.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;

  const hasCaption = !!caption?.trim();
  if (!hasCaption && !dateStr) return;

  const scaledSize = Math.max(8, captionSize * (w / 300));
  const dateScaledSize = Math.max(6, scaledSize * 0.55);
  const fillColor = hexToRgba(captionColor, captionOpacity);

  ctx.save();

  if (captionPosition === "center-diagonal") {
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-Math.PI / 6);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 4;

    if (hasCaption) {
      ctx.font = `bold ${scaledSize}px ${captionFont}`;
      ctx.fillStyle = fillColor;
      ctx.fillText(caption!, 0, dateStr ? -dateScaledSize * 0.6 : 0);
    }
    if (dateStr) {
      ctx.font = `${dateScaledSize}px ${captionFont}`;
      ctx.fillStyle = fillColor;
      ctx.fillText(dateStr, 0, hasCaption ? scaledSize * 0.6 : 0);
    }
  } else {
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 3;
    const margin = 8;

    let x: number;
    if (captionPosition === "bottom-left") {
      ctx.textAlign = "left";
      x = margin;
    } else if (captionPosition === "bottom-right") {
      ctx.textAlign = "right";
      x = w - margin;
    } else {
      ctx.textAlign = "center";
      x = w / 2;
    }

    let y = h - margin;

    if (dateStr) {
      ctx.font = `${dateScaledSize}px ${captionFont}`;
      ctx.fillStyle = fillColor;
      ctx.textBaseline = "bottom";
      ctx.fillText(dateStr, x, y);
      y -= dateScaledSize + 4;
    }

    if (hasCaption) {
      ctx.font = `bold ${scaledSize}px ${captionFont}`;
      ctx.fillStyle = fillColor;
      ctx.textBaseline = "bottom";
      ctx.fillText(caption!, x, y);
    }
  }

  ctx.restore();
}

async function renderPhotoWithCaption(photo: PhotoItem): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      drawOverlay(ctx, photo, img.naturalWidth, img.naturalHeight);
      resolve(canvas);
    };
    img.onerror = reject;
    img.src = photo.url;
  });
}

/* ─── Caption editor ─── */
const CaptionEditor = ({
  photo,
  onUpdate,
  onClose,
}: {
  photo: PhotoItem;
  onUpdate: (patch: Partial<PhotoItem>) => void;
  onClose: () => void;
}) => {
  return (
    <div className="glass-card p-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-primary flex items-center gap-1.5"><Pencil size={12} /> Marquage photo</span>
        <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground"><X size={14} /></button>
      </div>

      <input
        value={photo.caption || ""}
        onChange={(e) => onUpdate({ caption: e.target.value })}
        placeholder="Texte à afficher sur la photo…"
        className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
      />

      {/* Show date checkbox */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={photo.showDate ?? false}
          onChange={(e) => onUpdate({ showDate: e.target.checked })}
          className="w-4 h-4 rounded border-border accent-primary"
        />
        <span className="text-[11px] text-foreground">Afficher la date sur la photo</span>
      </label>

      {/* Position */}
      <div>
        <label className="text-[10px] text-muted-foreground block mb-1.5">Position</label>
        <div className="grid grid-cols-2 gap-1.5">
          {positionOptions.map((p) => (
            <button key={p.value} onClick={() => onUpdate({ captionPosition: p.value })}
              className={`text-[10px] px-2 py-1.5 rounded-lg transition-colors ${
                photo.captionPosition === p.value ? "bg-primary/15 text-primary font-medium" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Font */}
      <div>
        <label className="text-[10px] text-muted-foreground block mb-1.5">Police</label>
        <div className="flex gap-1.5 flex-wrap">
          {fontOptions.map((f) => (
            <button key={f.value} onClick={() => onUpdate({ captionFont: f.value })}
              className={`text-[10px] px-2 py-1.5 rounded-lg transition-colors ${
                photo.captionFont === f.value ? "bg-primary/15 text-primary font-medium" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
              style={{ fontFamily: f.value }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Size */}
      <div>
        <label className="text-[10px] text-muted-foreground block mb-1.5">Taille ({photo.captionSize}px)</label>
        <input type="range" min={10} max={72} value={photo.captionSize}
          onChange={(e) => onUpdate({ captionSize: Number(e.target.value) })}
          className="w-full h-2 accent-primary" />
      </div>

      {/* Color + Opacity */}
      <div className="flex gap-4 items-end">
        <div>
          <label className="text-[10px] text-muted-foreground block mb-1.5">Couleur</label>
          <input type="color" value={photo.captionColor}
            onChange={(e) => onUpdate({ captionColor: e.target.value })}
            className="w-9 h-9 rounded-lg border border-border cursor-pointer" />
        </div>
        <div className="flex-1">
          <label className="text-[10px] text-muted-foreground block mb-1.5">Opacité ({Math.round(photo.captionOpacity * 100)}%)</label>
          <input type="range" min={10} max={100} value={photo.captionOpacity * 100}
            onChange={(e) => onUpdate({ captionOpacity: Number(e.target.value) / 100 })}
            className="w-full h-2 accent-primary" />
        </div>
      </div>
    </div>
  );
};

export default ReportPhotoGallery;
export type { PhotoItem };
