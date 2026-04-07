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
  { value: "center", label: "Centre" },
  { value: "bottom-left", label: "Bas gauche" },
  { value: "bottom-center", label: "Bas centre" },
  { value: "bottom-right", label: "Bas droite" },
];

const rotationOptions = [
  { value: 0, label: "0°" },
  { value: -15, label: "-15°" },
  { value: -30, label: "-30°" },
  { value: -45, label: "-45°" },
  { value: 15, label: "15°" },
  { value: 30, label: "30°" },
  { value: 45, label: "45°" },
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
          captionRotation: 0,
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
      const blob = await renderPhotoToBlob(photo);
      const fileName = `rapport-photo-${Date.now()}.jpg`;

      // iOS/mobile: use Web Share API to trigger native "Save Image"
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], fileName, { type: "image/jpeg" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file] });
          toast.success("Photo partagée");
          return;
        }
      }

      // Desktop fallback: download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
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

                    <div className="absolute top-2 right-2 flex flex-col gap-1.5">
                      <button onClick={() => movePhoto(idx, -1)} disabled={idx === 0}
                        className="w-9 h-9 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-md text-white/90 disabled:opacity-30 active:scale-95 transition-all">
                        <ArrowUp size={16} />
                      </button>
                      <button onClick={() => movePhoto(idx, 1)} disabled={idx === photos.length - 1}
                        className="w-9 h-9 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-md text-white/90 disabled:opacity-30 active:scale-95 transition-all">
                        <ArrowDown size={16} />
                      </button>
                      <button onClick={() => setEditingIdx(editingIdx === idx ? null : idx)}
                        className={`w-9 h-9 flex items-center justify-center rounded-full backdrop-blur-md active:scale-95 transition-all ${editingIdx === idx ? "bg-primary/40 text-white" : "bg-black/30 text-white/90"}`}>
                        <Type size={16} />
                      </button>
                      <button onClick={() => saveToDevice(photo)}
                        className="w-9 h-9 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-md text-white/90 active:scale-95 transition-all">
                        <Download size={16} />
                      </button>
                      <button onClick={() => removePhoto(idx)}
                        className="w-9 h-9 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-md text-red-400 active:scale-95 transition-all">
                        <X size={16} />
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
  const { caption, captionPosition, captionFont, captionSize, captionColor, captionOpacity, captionRotation = 0, showDate, takenAt } = photo;

  const dateStr = showDate
    ? takenAt.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;

  const hasCaption = !!caption?.trim();
  if (!hasCaption && !dateStr) return;

  const scaledSize = Math.max(8, captionSize * (w / 300));
  const dateScaledSize = Math.max(6, scaledSize * 0.55);
  const fillColor = hexToRgba(captionColor, captionOpacity);

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 4;

  const margin = 8;
  let anchorX: number;
  let anchorY: number;

  if (captionPosition === "center") {
    ctx.textAlign = "center";
    anchorX = w / 2;
    anchorY = h / 2;
  } else if (captionPosition === "bottom-left") {
    ctx.textAlign = "left";
    anchorX = margin;
    anchorY = h - margin;
  } else if (captionPosition === "bottom-right") {
    ctx.textAlign = "right";
    anchorX = w - margin;
    anchorY = h - margin;
  } else {
    ctx.textAlign = "center";
    anchorX = w / 2;
    anchorY = h - margin;
  }

  // Apply rotation around the anchor point
  if (captionRotation !== 0) {
    ctx.translate(anchorX, anchorY);
    ctx.rotate((captionRotation * Math.PI) / 180);
    ctx.translate(-anchorX, -anchorY);
  }

  if (captionPosition === "center") {
    ctx.textBaseline = "middle";
    if (hasCaption) {
      ctx.font = `bold ${scaledSize}px ${captionFont}`;
      ctx.fillStyle = fillColor;
      ctx.fillText(caption!, anchorX, dateStr ? anchorY - dateScaledSize * 0.6 : anchorY);
    }
    if (dateStr) {
      ctx.font = `${dateScaledSize}px ${captionFont}`;
      ctx.fillStyle = fillColor;
      ctx.fillText(dateStr, anchorX, hasCaption ? anchorY + scaledSize * 0.6 : anchorY);
    }
  } else {
    ctx.textBaseline = "bottom";
    let y = anchorY;

    if (dateStr) {
      ctx.font = `${dateScaledSize}px ${captionFont}`;
      ctx.fillStyle = fillColor;
      ctx.fillText(dateStr, anchorX, y);
      y -= dateScaledSize + 4;
    }

    if (hasCaption) {
      ctx.font = `bold ${scaledSize}px ${captionFont}`;
      ctx.fillStyle = fillColor;
      ctx.fillText(caption!, anchorX, y);
    }
  }

  ctx.restore();
}

// Load image via fetch to avoid CORS canvas tainting (fixes iOS save)
async function loadImageAsBlob(url: string): Promise<HTMLImageElement> {
  return new Promise(async (resolve, reject) => {
    try {
      const resp = await fetch(url, { mode: "cors" });
      const blob = await resp.blob();
      const objectUrl = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        // Fallback: try direct load
        const img2 = new Image();
        img2.crossOrigin = "anonymous";
        img2.onload = () => resolve(img2);
        img2.onerror = reject;
        img2.src = url;
      };
      img.src = objectUrl;
    } catch {
      // Fallback for data URLs or local files
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    }
  });
}

async function renderPhotoToBlob(photo: PhotoItem): Promise<Blob> {
  const img = await loadImageAsBlob(photo.url);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  drawOverlay(ctx, photo, img.naturalWidth, img.naturalHeight);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/jpeg",
      0.92
    );
  });
}

async function renderPhotoWithCaption(photo: PhotoItem): Promise<HTMLCanvasElement> {
  const img = await loadImageAsBlob(photo.url);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  drawOverlay(ctx, photo, img.naturalWidth, img.naturalHeight);
  return canvas;
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
    <div className="glass-card p-2.5 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-primary flex items-center gap-1"><Pencil size={11} /> Marquage</span>
        <button onClick={onClose} className="p-0.5 text-muted-foreground hover:text-foreground"><X size={13} /></button>
      </div>

      <input
        value={photo.caption || ""}
        onChange={(e) => onUpdate({ caption: e.target.value })}
        placeholder="Texte sur la photo…"
        className="w-full bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
      />

      {/* Row: Date + Position */}
      <div className="flex gap-2 items-start">
        <label className="flex items-center gap-1.5 cursor-pointer shrink-0 pt-0.5">
          <input type="checkbox" checked={photo.showDate ?? false}
            onChange={(e) => onUpdate({ showDate: e.target.checked })}
            className="w-3.5 h-3.5 rounded border-border accent-primary" />
          <span className="text-[10px] text-foreground">Date</span>
        </label>
        <div className="flex gap-1 flex-wrap flex-1">
          {positionOptions.map((p) => (
            <button key={p.value} onClick={() => onUpdate({ captionPosition: p.value })}
              className={`text-[9px] px-1.5 py-1 rounded-md transition-colors ${
                photo.captionPosition === p.value ? "bg-primary/15 text-primary font-medium" : "bg-secondary text-muted-foreground"
              }`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orientation */}
      <div className="flex gap-1 items-center flex-wrap">
        <span className="text-[9px] text-muted-foreground shrink-0">{photo.captionRotation ?? 0}°</span>
        {rotationOptions.map((r) => (
          <button key={r.value} onClick={() => onUpdate({ captionRotation: r.value })}
            className={`text-[9px] px-1.5 py-0.5 rounded-md transition-colors ${
              (photo.captionRotation ?? 0) === r.value ? "bg-primary/15 text-primary font-medium" : "bg-secondary text-muted-foreground"
            }`}>
            {r.label}
          </button>
        ))}
      </div>

      {/* Font */}
      <div className="flex gap-1 flex-wrap">
        {fontOptions.map((f) => (
          <button key={f.value} onClick={() => onUpdate({ captionFont: f.value })}
            className={`text-[9px] px-1.5 py-0.5 rounded-md transition-colors ${
              photo.captionFont === f.value ? "bg-primary/15 text-primary font-medium" : "bg-secondary text-muted-foreground"
            }`}
            style={{ fontFamily: f.value }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Size + Color + Opacity in one row */}
      <div className="flex gap-2 items-center">
        <input type="color" value={photo.captionColor}
          onChange={(e) => onUpdate({ captionColor: e.target.value })}
          className="w-7 h-7 rounded-md border border-border cursor-pointer shrink-0" />
        <div className="flex-1 space-y-0.5">
          <input type="range" min={10} max={72} value={photo.captionSize}
            onChange={(e) => onUpdate({ captionSize: Number(e.target.value) })}
            className="w-full h-1.5 accent-primary" />
          <span className="text-[8px] text-muted-foreground">{photo.captionSize}px</span>
        </div>
        <div className="flex-1 space-y-0.5">
          <input type="range" min={10} max={100} value={photo.captionOpacity * 100}
            onChange={(e) => onUpdate({ captionOpacity: Number(e.target.value) / 100 })}
            className="w-full h-1.5 accent-primary" />
          <span className="text-[8px] text-muted-foreground">{Math.round(photo.captionOpacity * 100)}%</span>
        </div>
      </div>
    </div>
  );
};

export default ReportPhotoGallery;
export { renderPhotoToBlob, loadImageAsBlob };
export type { PhotoItem };
