/**
 * MediaPickerDialog — Biblioteca visual de imágenes reutilizables
 * (G8-M1 · Safe Media Replacement MVP).
 *
 *  - Flujo único: seleccionar o subir dentro del mismo diálogo.
 *  - Subida segura: `signStudioMediaUpload` → bucket → `registerStudioMedia`.
 *    Cero `FileReader`, cero `data:` URI, cero base64 en la composición.
 *  - Metadata obligatoria de derechos y naturaleza (documental/conceptual/IA).
 *  - Todo activo nuevo nace `draft` + `unreviewed`; sólo un rol administrativo
 *    puede `Aprobar para uso público`.
 *  - Sólo los activos aprobados pueden seleccionarse para un slot.
 */
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  BadgeCheck,
  Crosshair,
  ImageIcon,
  Loader2,
  Search,
  ShieldAlert,
  Upload,
  X,
} from "lucide-react";
import {
  approveStudioMedia,
  listStudioMediaLibrary,
  registerStudioMedia,
  signStudioMediaUpload,
} from "@/lib/experience-builder/studio-media.functions";
import { validateMediaRights, type MediaNature } from "@/lib/experience-builder/media-rights";
import { supabase } from "@/integrations/supabase/client";
import { prepareImageForRole, validateImageFile, type ImageRole } from "@/lib/cms/image-upload";

export interface PickedMedia {
  url: string;
  alt: string | null;
  credit: string | null;
  nature: MediaNature | null;
  reviewState: string | null;
  focalX: number;
  focalY: number;
}

export interface MediaPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onPick: (media: PickedMedia) => void;
  /** Rol para el pipeline (define ratio + tamaño). Default: gallery. */
  role?: ImageRole;
}

interface Row {
  id: string;
  url: string;
  alt: string | null;
  credit: string | null;
  author: string | null;
  source: string | null;
  license: string | null;
  nature: string | null;
  aiGenerated: boolean;
  documentary: boolean;
  conceptual: boolean;
  reviewState: string;
  status: string;
  checksum: string | null;
  focalX: number;
  focalY: number;
  width: number | null;
  height: number | null;
  mime: string | null;
}

type Filter = "approved" | "pending" | "conceptual" | "all";

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "approved", label: "Aprobadas" },
  { value: "pending", label: "Pendientes" },
  { value: "conceptual", label: "Conceptuales" },
  { value: "all", label: "Todas" },
];

const NATURES: Array<{ value: MediaNature; label: string }> = [
  { value: "documentary", label: "Fotografía documental" },
  { value: "conceptual", label: "Imagen conceptual" },
  { value: "ai_generated", label: "Generada con IA" },
];

const emptyRights = {
  alt: "",
  author: "",
  credit: "",
  source: "",
  license: "",
  place: "",
  capturedOn: "",
  nature: "documentary" as MediaNature,
  rightsConfirmed: false,
  focalX: 0.5,
  focalY: 0.5,
};

const RIGHTS_ERRORS: Record<string, string> = {
  alt_required: "Escribe una descripción/ALT de al menos 3 caracteres.",
  nature_required: "Indica la naturaleza de la imagen.",
  rights_confirmation_required: "Confirma que cuentas con derechos de uso.",
  ai_cannot_be_documentary: "Una imagen generada con IA no puede declararse documental.",
  documentary_requires_source: "Una fotografía documental requiere fuente.",
  documentary_requires_author: "Una fotografía documental requiere autor o creador.",
  documentary_requires_license: "Una fotografía documental requiere tipo de licencia.",
  credit_without_author: "El crédito no puede acreditar a un fotógrafo no declarado como autor.",
  forbidden_requires_admin: "Sólo un rol administrativo puede aprobar para uso público.",
  self_approval_not_allowed: "No puedes aprobar un activo que tú mismo subiste.",
};

const humanize = (msg: string) => RIGHTS_ERRORS[msg] ?? msg;

export function MediaPickerDialog({
  open,
  onClose,
  onPick,
  role = "gallery",
}: MediaPickerDialogProps) {
  const list = useServerFn(listStudioMediaLibrary);
  const sign = useServerFn(signStudioMediaUpload);
  const register = useServerFn(registerStudioMedia);
  const approve = useServerFn(approveStudioMedia);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("approved");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [mode, setMode] = useState<"library" | "upload">("library");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [rights, setRights] = useState({ ...emptyRights });

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    return list({ data: { search: search.trim() || undefined, filter, limit: 80 } })
      .then((res) => setRows(res.rows as Row[]))
      .catch((err) =>
        setError(err instanceof Error ? humanize(err.message) : "Error al cargar la biblioteca."),
      )
      .finally(() => setLoading(false));
  }, [list, search, filter]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void refresh().then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [open, refresh]);

  useEffect(() => {
    if (open) return;
    setMode("library");
    setFile(null);
    setPreview(null);
    setRights({ ...emptyRights });
    setError(null);
    setNotice(null);
  }, [open]);

  function chooseFile(f: File) {
    const invalid = validateImageFile(f);
    if (invalid) {
      setError(invalid.reason);
      return;
    }
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleUpload() {
    if (!file || uploading) return;
    const invalid = validateMediaRights(rights);
    if (invalid) {
      setError(humanize(invalid));
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const prepared = await prepareImageForRole(file, role);
      const { path, token, bucket } = await sign({
        data: { filename: prepared.name, contentType: prepared.type },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const storage = (supabase.storage as any).from(bucket);
      const { error: upErr } = await storage.uploadToSignedUrl(path, token, prepared, {
        contentType: prepared.type,
        upsert: false,
      });
      if (upErr) throw upErr;
      await register({
        data: {
          storagePath: path,
          mime: prepared.type,
          sizeBytes: prepared.size,
          rights,
        },
      });
      setNotice(
        "Imagen subida como borrador. Queda pendiente de aprobación antes de poder usarse en un slot.",
      );
      setFile(null);
      setPreview(null);
      setRights({ ...emptyRights });
      setMode("library");
      setFilter("pending");
    } catch (err) {
      setError(err instanceof Error ? humanize(err.message) : "No se pudo subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  async function handleApprove(id: string) {
    setError(null);
    try {
      await approve({ data: { mediaId: id } });
      setNotice("Activo aprobado para uso público.");
      void refresh();
    } catch (err) {
      setError(err instanceof Error ? humanize(err.message) : "No se pudo aprobar.");
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Seleccionar o subir imagen"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Seleccionar o subir imagen</h2>
            <p className="text-[11px] text-muted-foreground">
              Sólo las imágenes aprobadas pueden usarse en un slot. Las subidas nacen como borrador
              y conservan sus derechos y crédito.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="inline-flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        </header>

        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/30 px-4 py-2">
          <div className="relative min-w-[180px] flex-1">
            <Search
              className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              placeholder="Buscar por texto alternativo…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-background pl-7 pr-2 text-xs"
            />
          </div>
          <div
            className="flex flex-wrap items-center gap-1"
            role="group"
            aria-label="Filtro de revisión"
          >
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                aria-pressed={filter === f.value}
                className={`h-9 rounded-full border px-3 text-[11px] font-medium ${
                  filter === f.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-accent"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setMode(mode === "upload" ? "library" : "upload")}
            className="inline-flex h-9 items-center gap-1 rounded-md border border-primary/40 bg-primary/5 px-3 text-xs font-medium text-primary hover:bg-primary/10"
          >
            <Upload className="size-3.5" aria-hidden />
            {mode === "upload" ? "Ver biblioteca" : "Subir nueva imagen"}
          </button>
        </div>

        {error ? (
          <div className="border-b border-destructive/40 bg-destructive/10 px-4 py-2 text-xs text-destructive">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="border-b border-border bg-muted/50 px-4 py-2 text-xs text-muted-foreground">
            {notice}
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto p-4">
          {mode === "upload" ? (
            <UploadForm
              file={file}
              preview={preview}
              rights={rights}
              uploading={uploading}
              onChooseFile={chooseFile}
              onRights={(patch) => setRights((r) => ({ ...r, ...patch }))}
              onSubmit={handleUpload}
            />
          ) : loading ? (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              Cargando…
            </div>
          ) : rows.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <ImageIcon className="size-8" aria-hidden />
              <p className="text-xs">
                No hay imágenes con este filtro. Prueba otro filtro o sube una imagen nueva.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {rows.map((r) => (
                <MediaCard
                  key={r.id}
                  row={r}
                  onPick={() => {
                    onPick({
                      url: r.url,
                      alt: r.alt,
                      credit: r.credit,
                      nature: (r.nature as MediaNature | null) ?? null,
                      reviewState: r.reviewState,
                      focalX: r.focalX,
                      focalY: r.focalY,
                    });
                    onClose();
                  }}
                  onApprove={() => handleApprove(r.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MediaCard({
  row,
  onPick,
  onApprove,
}: {
  row: Row;
  onPick: () => void;
  onApprove: () => void;
}) {
  const approved = row.reviewState === "approved";
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
        <img
          src={row.url}
          alt={row.alt ?? ""}
          loading="lazy"
          className="h-full w-full object-cover"
          style={{ objectPosition: `${row.focalX * 100}% ${row.focalY * 100}%` }}
        />
      </div>
      <div className="space-y-1 p-2">
        <p className="line-clamp-2 text-[11px] font-medium">{row.alt ?? "(sin ALT)"}</p>
        <div className="flex flex-wrap gap-1">
          <span
            className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
              approved ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            }`}
          >
            {approved ? "Aprobada" : "Pendiente"}
          </span>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] uppercase text-muted-foreground">
            {row.aiGenerated ? "IA" : row.documentary ? "Documental" : "Conceptual"}
          </span>
        </div>
        <p className="truncate text-[10px] text-muted-foreground">
          {row.credit ? `© ${row.credit}` : "Sin crédito"}
          {row.source ? ` · ${row.source}` : ""}
        </p>
        <div className="flex flex-wrap gap-1 pt-1">
          <button
            type="button"
            disabled={!approved}
            onClick={onPick}
            title={approved ? "Usar esta imagen" : "Requiere aprobación antes de usarse"}
            className="inline-flex h-9 flex-1 items-center justify-center rounded-md border border-primary/40 bg-primary/5 px-2 text-[11px] font-medium text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Usar imagen
          </button>
          {approved ? null : (
            <button
              type="button"
              onClick={onApprove}
              className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-border px-2 text-[11px] font-medium hover:bg-accent"
              title="Aprobar para uso público (rol administrativo)"
            >
              <BadgeCheck className="size-3.5" aria-hidden /> Aprobar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function UploadForm({
  file,
  preview,
  rights,
  uploading,
  onChooseFile,
  onRights,
  onSubmit,
}: {
  file: File | null;
  preview: string | null;
  rights: typeof emptyRights;
  uploading: boolean;
  onChooseFile: (f: File) => void;
  onRights: (patch: Partial<typeof emptyRights>) => void;
  onSubmit: () => void;
}) {
  const inputCls = "h-9 w-full rounded-md border border-border bg-background px-2 text-xs";
  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <label className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/30 text-xs font-medium hover:bg-accent">
        <Upload className="size-4" aria-hidden />
        {file ? `Archivo: ${file.name}` : "Elegir archivo del dispositivo"}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) onChooseFile(f);
          }}
        />
      </label>

      {preview ? (
        <FocalPicker
          preview={preview}
          focalX={rights.focalX}
          focalY={rights.focalY}
          onChange={(x, y) => onRights({ focalX: x, focalY: y })}
        />
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Descripción / ALT *" className="sm:col-span-2">
          <input
            className={inputCls}
            value={rights.alt}
            onChange={(e) => onRights({ alt: e.target.value })}
            placeholder="Qué muestra la imagen"
          />
        </Field>
        <Field label="Autor o creador">
          <input
            className={inputCls}
            value={rights.author}
            onChange={(e) => onRights({ author: e.target.value })}
          />
        </Field>
        <Field label="Crédito">
          <input
            className={inputCls}
            value={rights.credit}
            onChange={(e) => onRights({ credit: e.target.value })}
          />
        </Field>
        <Field label="Fuente">
          <input
            className={inputCls}
            value={rights.source}
            onChange={(e) => onRights({ source: e.target.value })}
          />
        </Field>
        <Field label="Tipo de licencia">
          <input
            className={inputCls}
            value={rights.license}
            onChange={(e) => onRights({ license: e.target.value })}
          />
        </Field>
        <Field label="Lugar representado">
          <input
            className={inputCls}
            value={rights.place}
            onChange={(e) => onRights({ place: e.target.value })}
          />
        </Field>
        <Field label="Fecha (si se conoce)">
          <input
            className={inputCls}
            value={rights.capturedOn}
            onChange={(e) => onRights({ capturedOn: e.target.value })}
            placeholder="2026-08-28"
          />
        </Field>
        <Field label="Naturaleza *" className="sm:col-span-2">
          <select
            className={inputCls}
            value={rights.nature}
            onChange={(e) => onRights({ nature: e.target.value as MediaNature })}
          >
            {NATURES.map((n) => (
              <option key={n.value} value={n.value}>
                {n.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <label className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-2 text-[11px]">
        <input
          type="checkbox"
          className="mt-0.5 size-4"
          checked={rights.rightsConfirmed}
          onChange={(e) => onRights({ rightsConfirmed: e.target.checked })}
        />
        <span>
          Confirmo que cuento con los derechos de uso de esta imagen y que la información de
          autoría, crédito y fuente es verídica.
        </span>
      </label>

      <p className="flex items-start gap-1 text-[10px] text-muted-foreground">
        <ShieldAlert className="mt-0.5 size-3" aria-hidden />
        La imagen se guarda como activo nuevo con checksum SHA-256, en estado borrador y sin
        reemplazar ningún archivo anterior.
      </p>

      <button
        type="button"
        disabled={!file || uploading}
        onClick={onSubmit}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-50"
      >
        {uploading ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Upload className="size-4" aria-hidden />
        )}
        {uploading ? "Subiendo…" : "Subir imagen"}
      </button>
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block space-y-1 ${className ?? ""}`}>
      <span className="text-[11px] font-medium">{label}</span>
      {children}
    </label>
  );
}

function FocalPicker({
  preview,
  focalX,
  focalY,
  onChange,
}: {
  preview: string;
  focalX: number;
  focalY: number;
  onChange: (x: number, y: number) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="flex items-center gap-1 text-[11px] font-medium">
        <Crosshair className="size-3.5" aria-hidden /> Punto focal (clic sobre la imagen)
      </p>
      <button
        type="button"
        className="relative block w-full overflow-hidden rounded-md border border-border"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
          const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
          onChange(Math.round(x * 100) / 100, Math.round(y * 100) / 100);
        }}
      >
        <img
          src={preview}
          alt="Vista previa de la imagen a subir"
          className="max-h-56 w-full object-contain"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-primary/30"
          style={{ left: `${focalX * 100}%`, top: `${focalY * 100}%` }}
        />
      </button>
      <p className="text-[10px] text-muted-foreground">
        focal_x {focalX.toFixed(2)} · focal_y {focalY.toFixed(2)}
      </p>
    </div>
  );
}
