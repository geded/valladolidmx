/**
 * /portal/galeria — Galería de empresa (Ola 3 · Etapa 5).
 *
 * Permite a los editores subir y eliminar logo, portada y galería.
 * Flujo de subida:
 *   1) createBusinessMediaUploadTicket → bucket + path + token + signed URL.
 *   2) supabase.storage.uploadToSignedUrl(path, token, file) directo a Storage.
 *   3) registerBusinessMedia → media_assets + business_media + auditoría.
 */
import { useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  createBusinessMediaUploadTicket,
  listBusinessMedia,
  registerBusinessMedia,
  removeBusinessMedia,
  updateBusinessMediaMeta,
  type PortalMediaItem,
  type PortalMediaRole,
} from "@/lib/portal/business-media.functions";
import { listMyBusinesses } from "@/lib/portal/portal-reads.functions";
import { supabase } from "@/integrations/supabase/client";
import { toPlanLimitMessage } from "@/lib/visibility/plan-limit-errors";
import { toast } from "@/lib/toast";

const STORAGE_KEY = "valladolidmx.portal.activeBusinessId";

const ROLE_LABELS: Record<PortalMediaRole, string> = {
  logo: "Logo",
  cover: "Portada",
  gallery: "Galería",
};

const ROLE_HINTS: Record<PortalMediaRole, string> = {
  logo: "Imagen principal de la marca (1 archivo, reemplaza el anterior).",
  cover: "Imagen de cabecera de la ficha pública (1 archivo).",
  gallery: "Fotografías adicionales de la empresa.",
};

export const Route = createFileRoute("/_authenticated/portal/galeria")({
  component: GaleriaPage,
});

function useActiveBusinessId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

function GaleriaPage() {
  const activeBusinessId = useActiveBusinessId();
  const fetchBusinesses = useServerFn(listMyBusinesses);
  const fetchMedia = useServerFn(listBusinessMedia);

  const { data: businesses = [] } = useQuery({
    queryKey: ["portal", "my-businesses"],
    queryFn: () => fetchBusinesses(),
    staleTime: 60_000,
  });

  const active = useMemo(
    () => businesses.find((b) => b.business_id === activeBusinessId) ?? null,
    [businesses, activeBusinessId],
  );

  const {
    data: media = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["portal", "media", activeBusinessId],
    queryFn: () => fetchMedia({ data: { businessId: activeBusinessId! } }),
    enabled: Boolean(activeBusinessId),
  });

  if (!activeBusinessId || !active) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold">Galería</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Selecciona una empresa activa en el panel lateral.
        </p>
        <Link to="/portal" className="mt-4 inline-block text-sm text-primary">
          Volver al resumen
        </Link>
      </div>
    );
  }

  const grouped: Record<PortalMediaRole, PortalMediaItem[]> = {
    logo: [],
    cover: [],
    gallery: [],
  };
  for (const item of media) grouped[item.role]?.push(item);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Portal Empresarial
        </p>
        <h1 className="mt-1 text-3xl font-semibold">Galería</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {active.display_name} · Logo, portada y fotografías de tu empresa.
        </p>
      </header>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Cargando galería…</p>
      )}
      {error && (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Error desconocido"}
        </p>
      )}

      <div className="grid gap-8">
        {(Object.keys(ROLE_LABELS) as PortalMediaRole[]).map((role) => (
          <MediaSection
            key={role}
            businessId={activeBusinessId}
            role={role}
            items={grouped[role]}
          />
        ))}
      </div>
    </div>
  );
}

function MediaSection({
  businessId,
  role,
  items,
}: {
  businessId: string;
  role: PortalMediaRole;
  items: PortalMediaItem[];
}) {
  const queryClient = useQueryClient();
  const ticketFn = useServerFn(createBusinessMediaUploadTicket);
  const registerFn = useServerFn(registerBusinessMedia);
  const removeFn = useServerFn(removeBusinessMedia);
  const updateFn = useServerFn(updateBusinessMediaMeta);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () =>
    queryClient.invalidateQueries({
      queryKey: ["portal", "media", businessId],
    });

  const handleUpload = async (file: File) => {
    setBusy(true);
    setStatus(null);
    try {
      const ticket = await ticketFn({
        data: {
          businessId,
          role,
          mime: file.type,
          sizeBytes: file.size,
          filename: file.name,
        },
      });

      const { error: upErr } = await supabase.storage
        .from(ticket.bucket)
        .uploadToSignedUrl(ticket.path, ticket.token, file, {
          contentType: file.type,
          upsert: false,
        });
      if (upErr) throw new Error(`upload_failed: ${upErr.message}`);

      const dims = await readImageDimensions(file);

      await registerFn({
        data: {
          businessId,
          role,
          bucket: ticket.bucket,
          path: ticket.path,
          mime: file.type,
          sizeBytes: file.size,
          width: dims?.width ?? null,
          height: dims?.height ?? null,
          altText: null,
          caption: null,
          sortOrder: items.length,
        },
      });
      setStatus("Archivo cargado.");
      await refresh();
    } catch (err) {
      const msg = toPlanLimitMessage(
        err,
        err instanceof Error ? err.message : "Error al subir",
      );
      setStatus(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeMutation = useMutation({
    mutationFn: (id: string) =>
      removeFn({ data: { businessMediaId: id } }).then(refresh),
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; alt: string; caption: string }) =>
      updateFn({
        data: {
          businessMediaId: vars.id,
          altText: vars.alt || null,
          caption: vars.caption || null,
        },
      }).then(refresh),
  });

  const singleSlot = role !== "gallery";
  const canUpload = !singleSlot || items.length === 0;

  return (
    <section className="rounded-xl border border-border bg-card/40 p-5">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{ROLE_LABELS[role]}</h2>
          <p className="text-xs text-muted-foreground">{ROLE_HINTS[role]}</p>
        </div>
        {canUpload && (
          <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent">
            {busy ? "Subiendo…" : "Subir imagen"}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleUpload(f);
              }}
            />
          </label>
        )}
      </header>

      {status && (
        <p className="mt-2 text-xs text-muted-foreground">{status}</p>
      )}

      {!items.length ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Aún no hay archivos cargados para esta sección.
        </p>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li
              key={item.business_media_id}
              className="overflow-hidden rounded-lg border border-border bg-background"
            >
              {item.signed_url ? (
                <img
                  src={item.signed_url}
                  alt={item.alt_text ?? ROLE_LABELS[role]}
                  className="aspect-video w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="aspect-video w-full bg-muted" />
              )}
              <div className="space-y-2 p-3">
                <p className="truncate text-[11px] text-muted-foreground">
                  {item.storage_bucket}/{item.storage_path}
                </p>
                <MediaMetaForm
                  initialAlt={item.alt_text ?? ""}
                  initialCaption={item.caption ?? ""}
                  onSave={(alt, caption) =>
                    updateMutation.mutate({
                      id: item.business_media_id,
                      alt,
                      caption,
                    })
                  }
                  saving={updateMutation.isPending}
                />
                <button
                  type="button"
                  className="w-full rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
                  disabled={removeMutation.isPending}
                  onClick={() => {
                    if (
                      confirm(
                        "¿Eliminar este archivo de la galería? Esta acción quedará registrada en la auditoría.",
                      )
                    ) {
                      removeMutation.mutate(item.business_media_id);
                    }
                  }}
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MediaMetaForm({
  initialAlt,
  initialCaption,
  onSave,
  saving,
}: {
  initialAlt: string;
  initialCaption: string;
  onSave: (alt: string, caption: string) => void;
  saving: boolean;
}) {
  const [alt, setAlt] = useState(initialAlt);
  const [caption, setCaption] = useState(initialCaption);
  const dirty = alt !== initialAlt || caption !== initialCaption;
  return (
    <div className="grid gap-2">
      <label className="grid gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
        Alt text
        <input
          type="text"
          value={alt}
          maxLength={300}
          onChange={(e) => setAlt(e.target.value)}
          className="rounded border border-border bg-background px-2 py-1 text-sm text-foreground"
        />
      </label>
      <label className="grid gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
        Caption
        <input
          type="text"
          value={caption}
          maxLength={500}
          onChange={(e) => setCaption(e.target.value)}
          className="rounded border border-border bg-background px-2 py-1 text-sm text-foreground"
        />
      </label>
      <button
        type="button"
        disabled={!dirty || saving}
        onClick={() => onSave(alt, caption)}
        className="rounded-md border border-border px-3 py-1 text-xs font-medium hover:bg-accent disabled:opacity-50"
      >
        {saving ? "Guardando…" : "Guardar metadatos"}
      </button>
    </div>
  );
}

async function readImageDimensions(
  file: File,
): Promise<{ width: number; height: number } | null> {
  if (typeof window === "undefined") return null;
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}