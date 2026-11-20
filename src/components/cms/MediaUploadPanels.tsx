/**
 * MediaUploadPanels — Paneles compartidos de subida de imágenes del CMS
 * (imagen única y galería). Misma filosofía en empresas, destinos, zonas,
 * productos y lugares: encuadre manual, luz y color, Alux para buscar/crear,
 * aviso por foto chica y optimización automática al subir.
 */
import { useRef, useState } from "react";
import { toast } from "@/lib/toast";
import type { ImageRole } from "@/lib/cms/image-upload";
import { useAluxUpscale } from "@/lib/cms/use-alux-upscale";
import { AluxUpscaleCard } from "@/components/cms/AluxUpscaleCard";
import { AluxMediaSourceButtons } from "@/components/cms/AluxMediaSourceButtons";
import { ImageFramingDialog } from "@/components/cms/ImageFramingDialog";
import { MediaUploadRightsDialog } from "@/components/cms/MediaUploadRightsDialog";
import type { MediaRightsInput } from "@/lib/experience-builder/media-rights";
import type { AluxPickedPhoto } from "@/components/cms/AluxPhotoFinderDialog";

export interface MediaRow {
  id: string;
  previewUrl?: string | null;
  alt?: string | null;
}

export function SinglePanel(props: {
  title: string;
  subtitle: string;
  role: ImageRole;
  media: MediaRow | null;
  onUpload: (file: File, rights?: MediaRightsInput) => void;
  requireRights?: boolean;
  onRemove: (id: string) => void;
  uploading: boolean;
  error: unknown;
  aspect: string;
  emptyLabel?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const alux = useAluxUpscale(props.role);
  const [framing, setFraming] = useState<File | null>(null);
  const [rightsFile, setRightsFile] = useState<File | null>(null);
  const sourceRef = useRef<AluxPickedPhoto | undefined>(undefined);
  const submit = (file: File) => {
    if (props.requireRights) setRightsFile(file);
    else props.onUpload(file);
  };

  const afterFraming = async (f: File) => {
    setFraming(null);
    const undersized = await alux.evaluate(f);
    if (!undersized) {
      submit(f);
    }
  };
  // Toda foto nueva pasa primero por el encuadre manual.
  const handleFile = (f: File, source?: AluxPickedPhoto) => { sourceRef.current = source; setFraming(f); };

  const adjustCurrent = async () => {
    const url = props.media?.previewUrl;
    if (!url) return;
    sourceRef.current = undefined;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      setFraming(new File([blob], `${props.role}.${blob.type.split("/")[1] ?? "jpg"}`, { type: blob.type }));
    } catch {
      toast.error("No se pudo abrir la imagen actual para ajustarla.");
    }
  };


  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">{props.title}</h2>
          <p className="text-xs text-muted-foreground">{props.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AluxMediaSourceButtons
            hint=""
            slot={`single:${props.role}`}
            disabled={props.uploading || alux.upscaling}
            onFile={(f, source) => void handleFile(f, source)}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={props.uploading || alux.upscaling}
            className="h-9 rounded-md bg-primary px-3 text-xs font-semibold uppercase tracking-wider text-primary-foreground disabled:opacity-60"
          >
            {props.uploading ? "Subiendo…" : props.media ? "Reemplazar" : "Subir"}
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = "";
          }}
        />
      </header>
      {alux.pending && (
        <AluxUpscaleCard
          fit={alux.pending.fit}
          upscaling={alux.upscaling}
          busy={props.uploading}
          onUpscale={async () => {
            const enlarged = await alux.upscale();
            if (enlarged) submit(enlarged);
          }}
          onSkip={() => {
            const f = alux.proceedAsIs();
            if (f) submit(f);
          }}
        />
      )}
      {props.media?.previewUrl ? (
        <div className="relative overflow-hidden rounded-lg border border-border">
          <img
            src={props.media.previewUrl}
            alt={props.media.alt ?? props.title}
            className={props.aspect}
          />
          <div className="absolute right-2 top-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => void adjustCurrent()}
              disabled={props.uploading}
              className="rounded-md bg-black/60 px-2 py-1 text-[11px] font-medium text-white hover:bg-black/80"
            >
              Ajustar
            </button>
            <button
              type="button"
              onClick={() => props.media && props.onRemove(props.media.id)}
              className="rounded-md bg-black/60 px-2 py-1 text-[11px] font-medium text-white hover:bg-black/80"
            >
              Quitar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border bg-background text-xs text-muted-foreground">
          {props.emptyLabel ?? `Sin ${props.title.toLowerCase()}`}
        </div>
      )}
      {props.error instanceof Error && (
        <p className="mt-2 text-xs text-destructive">{props.error.message}</p>
      )}
      <ImageFramingDialog
        file={framing}
        role={props.role}
        onConfirm={(f) => void afterFraming(f)}
        onSkip={(f) => void afterFraming(f)}
        onCancel={() => setFraming(null)}
      />
      {rightsFile && <MediaUploadRightsDialog files={[rightsFile]} source={sourceRef.current}
        onCancel={() => setRightsFile(null)} onConfirm={(rights) => { props.onUpload(rightsFile, rights); setRightsFile(null); }} />}
    </section>
  );
}

export function GalleryPanel(props: {
  subtitle?: string;
  items: MediaRow[];
  onUpload: (files: File[], rights?: MediaRightsInput) => void;
  requireRights?: boolean;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  uploading: boolean;
  error: unknown;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  // Cola de encuadre: cada foto se acomoda sin perder el lote.
  const [queue, setQueue] = useState<File[]>([]);
  const [done, setDone] = useState<File[]>([]);
  const [total, setTotal] = useState(0);
  const [checking, setChecking] = useState(false);
  const [rightsFiles, setRightsFiles] = useState<File[]>([]);
  const [rightsSources, setRightsSources] = useState<(AluxPickedPhoto | undefined)[]>([]);
  const sourceQueueRef = useRef<(AluxPickedPhoto | undefined)[]>([]);
  const doneSourcesRef = useRef<(AluxPickedPhoto | undefined)[]>([]);
  const submit = (files: File[]) => {
    if (props.requireRights) {
      setRightsSources([...doneSourcesRef.current]);
      setRightsFiles(files);
    }
    else props.onUpload(files);
  };
  // Tras encuadrar, si la foto queda chica para galería se pregunta una por una.
  const alux = useAluxUpscale("gallery");
  const startQueue = (files: File[], sources?: AluxPickedPhoto[]) => {
    if (!files.length) return;
    sourceQueueRef.current = files.map((_, i) => sources?.[i]);
    doneSourcesRef.current = [];
    setQueue(files);
    setDone([]);
    setTotal(files.length);
  };
  const advance = async (f: File) => {
    setChecking(true);
    try {
      if (await alux.evaluate(f)) return;
    } finally {
      setChecking(false);
    }
    commit(f);
  };
  const commit = (f: File) => {
    doneSourcesRef.current.push(sourceQueueRef.current.shift());
    const nextDone = [...done, f];
    const rest = queue.slice(1);
    if (rest.length === 0) {
      setQueue([]);
      setDone([]);
      submit(nextDone);
    } else {
      setDone(nextDone);
      setQueue(rest);
    }
  };
  const skipAll = () => {
    const all = [...done, ...queue];
    doneSourcesRef.current.push(...sourceQueueRef.current);
    sourceQueueRef.current = [];
    setQueue([]);
    setDone([]);
    submit(all);
  };
  // Cerrar el visor (X, Esc o clic fuera) sólo descarta la foto actual;
  // el resto del lote continúa. Antes se perdían todas las pendientes.
  const cancelQueue = () => {
    sourceQueueRef.current.shift();
    const rest = queue.slice(1);
    if (rest.length === 0) {
      setQueue([]);
      setDone([]);
      if (done.length) submit(done);
      return;
    }
    toast.message(`Foto descartada. Quedan ${rest.length} por acomodar.`);
    setQueue(rest);
  };
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Galería</h2>
          <p className="text-xs text-muted-foreground">
            {props.subtitle ?? "Imágenes adicionales. Arrastra o selecciona varias."}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <AluxMediaSourceButtons
            hint=""
            slot="gallery"
            disabled={props.uploading}
            onFile={(f, source) => startQueue([f], source ? [source] : undefined)}
            onFiles={(files, sources) => startQueue(files, sources)}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={props.uploading}
            className="h-9 rounded-md bg-primary px-3 text-xs font-semibold uppercase tracking-wider text-primary-foreground disabled:opacity-60"
          >
            {props.uploading ? "Subiendo…" : "Añadir imágenes"}
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            startQueue(files);
            e.target.value = "";
          }}
        />
      </header>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const files = Array.from(e.dataTransfer.files ?? []).filter((f) =>
            f.type.startsWith("image/"),
          );
          startQueue(files);
        }}
        className={`rounded-lg border border-dashed p-3 ${
          dragOver ? "border-primary bg-primary/5" : "border-border bg-background"
        }`}
      >
        {props.items.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            Sin imágenes en galería. Arrastra archivos aquí o pulsa "Añadir".
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {props.items.map((m, idx) => (
              <li
                key={m.id}
                className="group relative overflow-hidden rounded-md border border-border bg-card"
              >
                {m.previewUrl ? (
                  <img src={m.previewUrl} alt={m.alt ?? ""} className="h-28 w-full object-cover" />
                ) : (
                  <div className="h-28 w-full bg-muted" />
                )}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/60 px-1.5 py-1 text-[11px] text-white opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => props.onMove(m.id, -1)}
                      disabled={idx === 0}
                      className="rounded px-1.5 py-0.5 hover:bg-white/20 disabled:opacity-40"
                      title="Mover a la izquierda"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={() => props.onMove(m.id, 1)}
                      disabled={idx === props.items.length - 1}
                      className="rounded px-1.5 py-0.5 hover:bg-white/20 disabled:opacity-40"
                      title="Mover a la derecha"
                    >
                      →
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => props.onRemove(m.id)}
                    className="rounded px-1.5 py-0.5 hover:bg-white/20"
                    title="Eliminar"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {props.error instanceof Error && (
        <p className="mt-2 text-xs text-destructive">{props.error.message}</p>
      )}
      {alux.pending && (
        <div className="mt-3">
          {total > 1 && (
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Foto {total - queue.length + 1} de {total} quedó chica para la galería
            </p>
          )}
          <AluxUpscaleCard
            fit={alux.pending.fit}
            upscaling={alux.upscaling}
            busy={props.uploading}
            onUpscale={async () => {
              const enlarged = await alux.upscale();
              if (enlarged) commit(enlarged);
              else toast.error("No se pudo ampliar. Puedes subirla así.");
            }}
            onSkip={() => {
              const f = alux.proceedAsIs();
              if (f) commit(f);
            }}
          />
        </div>
      )}
      <ImageFramingDialog
        file={alux.pending || checking ? null : (queue[0] ?? null)}
        role="gallery"
        progressLabel={total > 1 ? `Foto ${total - queue.length + 1} de ${total}` : undefined}
        onConfirm={(f) => void advance(f)}
        onSkip={(f) => void advance(f)}
        onCancel={cancelQueue}
        onSkipAll={total > 1 ? skipAll : undefined}
      />
      {rightsFiles.length > 0 && <MediaUploadRightsDialog key={rightsFiles[0]?.name}
        files={rightsSources.some(Boolean) ? rightsFiles.slice(0, 1) : rightsFiles} source={rightsSources[0]}
        onCancel={() => { setRightsFiles([]); setRightsSources([]); }} onConfirm={(rights) => {
          // Search results can have different authors/licenses: never share the first credit across the batch.
          if (rightsSources.some(Boolean)) {
            props.onUpload(rightsFiles.slice(0, 1), rights);
            setRightsFiles((files) => files.slice(1)); setRightsSources((sources) => sources.slice(1));
          } else { props.onUpload(rightsFiles, rights); setRightsFiles([]); }
        }} />}
    </section>
  );
}
