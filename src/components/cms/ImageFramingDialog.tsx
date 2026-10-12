/**
 * ImageFramingDialog — Encuadre y luz antes de subir (logo, portada, galería).
 *
 * El editor ve exactamente el área que se usará, mueve la foto con el dedo
 * o el ratón, hace zoom (control, rueda o pellizco) y afina la luz.
 * Al aceptar se entrega un archivo ya encuadrado; la subida sigue pasando
 * por la optimización oficial (`prepareImageForRole`), sin recortes extra.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { ROLE_SPECS, type ImageRole } from "@/lib/cms/image-upload";
import {
  applyAdjust,
  isNeutral,
  NEUTRAL_ADJUST,
  suggestAutoAdjust,
  type LightAdjust,
} from "@/lib/cms/image-adjust";

type FitMode = "fill" | "contain";

interface Props {
  file: File | null;
  role: ImageRole;
  /** Texto pequeño arriba, p.ej. "Foto 2 de 5". */
  progressLabel?: string;
  onConfirm: (file: File) => void;
  /** Usar el archivo sin ajustes. */
  onSkip: (file: File) => void;
  onCancel: () => void;
  /** Sólo en lotes: subir el resto sin ajustar. */
  onSkipAll?: () => void;
}

const PREVIEW_MAX = 1000;
const MAX_ZOOM = 5;

function loadBitmap(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo leer la imagen."));
    img.src = url;
  });
}

function scaledCanvas(img: HTMLImageElement, maxSide: number): HTMLCanvasElement {
  const s = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(img.naturalWidth * s));
  c.height = Math.max(1, Math.round(img.naturalHeight * s));
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

function adjustedCopy(src: HTMLCanvasElement, a: LightAdjust): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(src, 0, 0);
  if (!isNeutral(a)) {
    const data = ctx.getImageData(0, 0, c.width, c.height);
    applyAdjust(data.data, a);
    ctx.putImageData(data, 0, 0);
  }
  return c;
}

const ADJUST_LABELS: { key: keyof LightAdjust; label: string }[] = [
  { key: "exposure", label: "Luz" },
  { key: "shadows", label: "Sombras" },
  { key: "contrast", label: "Contraste" },
  { key: "saturation", label: "Color" },
  { key: "warmth", label: "Calidez" },
];

export function ImageFramingDialog(props: Props) {
  const { file, role } = props;
  const ratio = ROLE_SPECS[role].ratio ?? 4 / 3;
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const previewSrcRef = useRef<HTMLCanvasElement | null>(null);
  const previewAdjRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);
  const [frameW, setFrameW] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [adjust, setAdjust] = useState<LightAdjust>(NEUTRAL_ADJUST);
  const [compare, setCompare] = useState(false);
  const [fit, setFit] = useState<FitMode>(role === "logo" ? "contain" : "fill");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"frame" | "light">("frame");
  const frameH = frameW / ratio;

  // Carga del archivo.
  useEffect(() => {
    if (!file) return;
    let alive = true;
    setReady(false);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setAdjust(NEUTRAL_ADJUST);
    setFit(role === "logo" ? "contain" : "fill");
    setTab("frame");
    void loadBitmap(file).then((img) => {
      if (!alive) return;
      imgRef.current = img;
      previewSrcRef.current = scaledCanvas(img, PREVIEW_MAX);
      previewAdjRef.current = previewSrcRef.current;
      setReady(true);
    });
    return () => {
      alive = false;
      if (imgRef.current) URL.revokeObjectURL(imgRef.current.src);
    };
  }, [file, role]);

  // Ancho del marco.
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setFrameW(el.clientWidth));
    ro.observe(el);
    setFrameW(el.clientWidth);
    return () => ro.disconnect();
  }, [ready]);

  const geometry = useCallback(
    (W: number, H: number, z: number) => {
      const src = previewSrcRef.current;
      if (!src) return { base: 1, s: 1, sw: 1, sh: 1 };
      const sw = src.width;
      const sh = src.height;
      const base = fit === "fill" ? Math.max(W / sw, H / sh) : Math.min(W / sw, H / sh);
      return { base, s: base * z, sw, sh };
    },
    [fit],
  );

  const clampOffset = useCallback(
    (o: { x: number; y: number }, z: number) => {
      if (fit === "contain" && z <= 1) return { x: 0, y: 0 };
      const { s, sw, sh } = geometry(frameW, frameH, z);
      const maxX = Math.abs(sw * s - frameW) / 2;
      const maxY = Math.abs(sh * s - frameH) / 2;
      return {
        x: Math.max(-maxX, Math.min(maxX, o.x)),
        y: Math.max(-maxY, Math.min(maxY, o.y)),
      };
    },
    [fit, frameW, frameH, geometry],
  );

  // Recalcula la versión ajustada (sólo cuando cambia la luz).
  useEffect(() => {
    if (!ready || !previewSrcRef.current) return;
    const id = requestAnimationFrame(() => {
      previewAdjRef.current = adjustedCopy(previewSrcRef.current!, adjust);
      draw();
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adjust, ready]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const src = compare ? previewSrcRef.current : previewAdjRef.current;
    if (!canvas || !src || !frameW) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(frameW * dpr);
    canvas.height = Math.round(frameH * dpr);
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, frameW, frameH);
    const { s, sw, sh } = geometry(frameW, frameH, zoom);
    const dw = sw * s;
    const dh = sh * s;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(src, frameW / 2 + offset.x - dw / 2, frameH / 2 + offset.y - dh / 2, dw, dh);
  }, [compare, frameW, frameH, geometry, zoom, offset]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Zoom anclado a un punto del marco.
  const zoomAt = useCallback(
    (next: number, px: number, py: number) => {
      const minZ = 1;
      const z2 = Math.max(minZ, Math.min(MAX_ZOOM, next));
      setZoom((z) => {
        const k = z2 / z;
        const cx = px - frameW / 2;
        const cy = py - frameH / 2;
        setOffset((o) => clampOffset({ x: cx - (cx - o.x) * k, y: cy - (cy - o.y) * k }, z2));
        return z2;
      });
    },
    [frameW, frameH, clampOffset],
  );

  const zoomAtRef = useRef(zoomAt);
  zoomAtRef.current = zoomAt;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  // Rueda / pellizco de trackpad (listener no pasivo).
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const rect = el.getBoundingClientRect();
      zoomAtRef.current(
        zoomRef.current * Math.exp(-dy * 0.002),
        e.clientX - rect.left,
        e.clientY - rect.top,
      );
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [ready]);

  // Arrastre y pellizco táctil.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchRef.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
    }
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, cur);
    if (pointers.current.size === 2 && pinchRef.current) {
      const [a, b] = [...pointers.current.values()];
      const rect = e.currentTarget.getBoundingClientRect();
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      zoomAt(
        pinchRef.current.zoom * (d / pinchRef.current.dist),
        (a.x + b.x) / 2 - rect.left,
        (a.y + b.y) / 2 - rect.top,
      );
      return;
    }
    setOffset((o) => clampOffset({ x: o.x + cur.x - prev.x, y: o.y + cur.y - prev.y }, zoom));
  };
  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchRef.current = null;
  };

  useEffect(() => {
    setOffset((o) => clampOffset(o, zoom));
  }, [fit, frameW, clampOffset, zoom]);

  const exportFile = async () => {
    const img = imgRef.current;
    if (!img || !file || !frameW) return;
    setBusy(true);
    try {
      const spec = ROLE_SPECS[role];
      // Salida con margen sobre el tamaño final; la optimización oficial
      // reduce después al tamaño y peso del rol.
      const outLong = Math.min(Math.round(spec.maxLongSide * 1.25), 3000);
      const outW = ratio >= 1 ? outLong : Math.round(outLong * ratio);
      const outH = Math.round(outW / ratio);
      const full = scaledCanvas(img, 4000);
      const adj = adjustedCopy(full, adjust);
      const c = document.createElement("canvas");
      c.width = outW;
      c.height = outH;
      const ctx = c.getContext("2d")!;
      const k = outW / frameW;
      const { s } = geometry(frameW, frameH, zoom);
      const sFull = (s * previewSrcRef.current!.width) / full.width;
      const dw = full.width * sFull * k;
      const dh = full.height * sFull * k;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        adj,
        outW / 2 + offset.x * k - dw / 2,
        outH / 2 + offset.y * k - dh / 2,
        dw,
        dh,
      );
      const keepAlpha = file.type === "image/png" || role === "logo";
      const type = keepAlpha ? "image/png" : "image/jpeg";
      const blob = await new Promise<Blob>((res, rej) =>
        c.toBlob((b) => (b ? res(b) : rej(new Error("No se pudo procesar."))), type, 0.95),
      );
      const base = file.name.replace(/\.[^.]+$/, "") || "imagen";
      props.onConfirm(
        new File([blob], `${base}.${keepAlpha ? "png" : "jpg"}`, {
          type,
          lastModified: Date.now(),
        }),
      );
    } finally {
      setBusy(false);
    }
  };

  const autoEnhance = () => {
    const src = previewSrcRef.current;
    if (!src) return;
    const data = src.getContext("2d")!.getImageData(0, 0, src.width, src.height).data;
    setAdjust(suggestAutoAdjust(data));
    setTab("light");
  };

  const title =
    role === "logo" ? "Acomoda el logo" : role === "cover" ? "Acomoda la portada" : "Acomoda la foto";

  return (
    <Dialog open={!!file} onOpenChange={(o) => !o && props.onCancel()}>
      <DialogContent className="max-h-[95dvh] w-[calc(100vw-1rem)] max-w-3xl overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          {props.progressLabel && (
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {props.progressLabel}
            </p>
          )}
          <DialogTitle>{title}</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Arrastra para mover y usa el zoom. Lo que ves dentro del marco es lo que se publica.
          </p>
        </DialogHeader>

        <div
          ref={frameRef}
          className={`relative w-full overflow-hidden rounded-lg border border-border ${
            role === "logo" ? "mx-auto max-w-sm bg-muted" : "bg-muted"
          }`}
          style={{ aspectRatio: String(ratio) }}
        >
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
              Cargando foto…
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full cursor-grab touch-none select-none active:cursor-grabbing"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
          {/* Guías de tercios */}
          <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="border border-background/25" />
            ))}
          </div>
          {compare && (
            <span className="absolute left-2 top-2 rounded-md bg-foreground/70 px-2 py-0.5 text-[11px] font-medium text-background">
              Original
            </span>
          )}
        </div>

        <div className="flex gap-1 rounded-lg bg-muted p-1 text-xs font-medium">
          {(
            [
              ["frame", "Encuadre"],
              ["light", "Luz y color"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`h-9 flex-1 rounded-md transition ${
                tab === k ? "bg-background text-foreground shadow-soft" : "text-muted-foreground"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {tab === "frame" ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-14 text-xs text-muted-foreground">Zoom</span>
              <Slider
                value={[zoom]}
                min={1}
                max={MAX_ZOOM}
                step={0.01}
                onValueChange={([v]) => zoomAt(v, frameW / 2, frameH / 2)}
                className="flex-1"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {role === "logo" && (
                <>
                  <ChipButton active={fit === "contain"} onClick={() => setFit("contain")}>
                    Logo completo
                  </ChipButton>
                  <ChipButton active={fit === "fill"} onClick={() => setFit("fill")}>
                    Llenar el marco
                  </ChipButton>
                </>
              )}
              <ChipButton
                onClick={() => {
                  setZoom(1);
                  setOffset({ x: 0, y: 0 });
                }}
              >
                Centrar
              </ChipButton>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {ADJUST_LABELS.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3">
                <span className="w-20 text-xs text-muted-foreground">{label}</span>
                <Slider
                  value={[adjust[key]]}
                  min={-100}
                  max={100}
                  step={1}
                  onValueChange={([v]) => setAdjust((a) => ({ ...a, [key]: v }))}
                  className="flex-1"
                />
                <span className="w-8 text-right text-[11px] tabular-nums text-muted-foreground">
                  {adjust[key]}
                </span>
              </div>
            ))}
            <div className="flex flex-wrap gap-2 pt-1">
              <ChipButton onClick={() => setAdjust(NEUTRAL_ADJUST)}>Quitar ajustes</ChipButton>
              <ChipButton
                active={compare}
                onPointerDown={() => setCompare(true)}
                onPointerUp={() => setCompare(false)}
                onPointerLeave={() => setCompare(false)}
              >
                Mantén para ver original
              </ChipButton>
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => file && props.onSkip(file)}
              className="h-10 rounded-md px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Usar sin ajustes
            </button>
            {props.onSkipAll && (
              <button
                type="button"
                onClick={props.onSkipAll}
                className="h-10 rounded-md px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Subir las demás sin ajustar
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={autoEnhance}
              disabled={!ready || busy}
              className="h-10 flex-1 rounded-md border border-border px-3 text-xs font-semibold disabled:opacity-60 sm:flex-none"
            >
              ✦ Mejorar con Alux
            </button>
            <button
              type="button"
              onClick={() => void exportFile()}
              disabled={!ready || busy}
              className="h-10 flex-1 rounded-md bg-primary px-4 text-xs font-semibold uppercase tracking-wider text-primary-foreground disabled:opacity-60 sm:flex-none"
            >
              {busy ? "Preparando…" : "Guardar encuadre"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChipButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean },
) {
  const { active, className, ...rest } = props;
  return (
    <button
      type="button"
      {...rest}
      className={`h-9 rounded-pill border px-3 text-xs font-medium transition ${
        active
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border text-muted-foreground hover:text-foreground"
      } ${className ?? ""}`}
    />
  );
}
