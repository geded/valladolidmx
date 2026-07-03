/**
 * ProductAdvancedPanel — Sub-ola 2.4a.
 *
 * Panel colapsable dentro de cada fila de producto en /portal/catalogo.
 * Cubre el ciclo: media, FAQs, checklist de publicación, preview y
 * publicar/ocultar. Sin duplicar lógica con Founder: consume server fns
 * del namespace `portal/*` y RPCs SECURITY DEFINER aprobadas.
 *
 * Mobile-first: layout en columna, botones grandes, contraste alto.
 */
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listPortalProductMedia,
  signPortalProductImageUpload,
  registerPortalProductMedia,
  removePortalProductMedia,
} from "@/lib/portal/portal-product-media.functions";
import {
  listPortalProductFaqs,
  createPortalProductFaq,
  deletePortalProductFaq,
  updatePortalProductFaq,
} from "@/lib/portal/portal-product-faqs.functions";
import {
  getPortalProductPublishSnapshot,
  publishPortalProduct,
  unpublishPortalProduct,
} from "@/lib/portal/portal-product-publish.functions";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  productId: string;
  productStatus: string;
  onStatusChanged: () => void;
};

export function ProductAdvancedPanel({
  productId,
  productStatus,
  onStatusChanged,
}: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 border-t border-border/60 pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-medium uppercase tracking-wider text-primary hover:underline"
      >
        {open ? "▾ Ocultar detalles avanzados" : "▸ Media, FAQs y publicación"}
      </button>
      {open && (
        <div className="mt-4 grid gap-4">
          <MediaSection productId={productId} />
          <FaqSection productId={productId} />
          <PublishSection
            productId={productId}
            productStatus={productStatus}
            onChanged={onStatusChanged}
          />
        </div>
      )}
    </div>
  );
}

/* ─────────────────────  Media  ────────────────────── */

function MediaSection({ productId }: { productId: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listPortalProductMedia);
  const signFn = useServerFn(signPortalProductImageUpload);
  const registerFn = useServerFn(registerPortalProductMedia);
  const removeFn = useServerFn(removePortalProductMedia);

  const { data: media = [], isLoading } = useQuery({
    queryKey: ["portal", "product-media", productId],
    queryFn: () => listFn({ data: { productId } }),
  });
  const refresh = () =>
    qc.invalidateQueries({ queryKey: ["portal", "product-media", productId] });

  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function upload(role: "cover" | "gallery", file: File) {
    setErr(null);
    setUploading(true);
    try {
      const { path, token, bucket } = await signFn({
        data: { productId, filename: file.name, contentType: file.type },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const st = supabase.storage as any;
      const { error: upErr } = await st
        .from(bucket)
        .uploadToSignedUrl(path, token, file, {
          contentType: file.type,
          upsert: false,
        });
      if (upErr) throw upErr;
      await registerFn({
        data: {
          productId,
          storagePath: path,
          role,
          mime: file.type || null,
          sizeBytes: file.size,
        },
      });
      refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error al subir");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="rounded-lg border border-border/60 bg-background/50 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">Media</h4>
        <div className="flex flex-wrap gap-2">
          <label className="cursor-pointer rounded-md border border-border bg-background px-3 py-1.5 text-[11px] font-medium hover:bg-accent">
            {uploading ? "Subiendo…" : "Portada"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload("cover", f);
                e.target.value = "";
              }}
            />
          </label>
          <label className="cursor-pointer rounded-md border border-border bg-background px-3 py-1.5 text-[11px] font-medium hover:bg-accent">
            {uploading ? "Subiendo…" : "Galería"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload("gallery", f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>
      {err && <p className="mb-2 text-xs text-destructive">{err}</p>}
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Cargando media…</p>
      ) : !media.length ? (
        <p className="text-xs text-muted-foreground">
          Aún no hay imágenes. Sube una portada para poder publicar.
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {media.map((m) => (
            <li
              key={m.id}
              className="group relative overflow-hidden rounded border border-border bg-muted"
            >
              {m.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.previewUrl}
                  alt={m.alt ?? ""}
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center text-[10px] text-muted-foreground">
                  sin preview
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/60 px-1 py-0.5 text-[10px] text-white">
                <span className="uppercase">{m.role}</span>
                <button
                  type="button"
                  onClick={() =>
                    removeFn({ data: { productMediaId: m.id } }).then(refresh)
                  }
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Eliminar"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ─────────────────────  FAQs  ────────────────────── */

function FaqSection({ productId }: { productId: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listPortalProductFaqs);
  const createFn = useServerFn(createPortalProductFaq);
  const updateFn = useServerFn(updatePortalProductFaq);
  const deleteFn = useServerFn(deletePortalProductFaq);
  const { data: faqs = [] } = useQuery({
    queryKey: ["portal", "product-faqs", productId],
    queryFn: () => listFn({ data: { productId } }),
  });
  const refresh = () =>
    qc.invalidateQueries({ queryKey: ["portal", "product-faqs", productId] });

  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const createMut = useMutation({
    mutationFn: () =>
      createFn({
        data: { productId, question: q, answer: a, publish: true },
      }),
    onSuccess: () => {
      setQ("");
      setA("");
      setErr(null);
      refresh();
    },
    onError: (e) => setErr(e instanceof Error ? e.message : "Error"),
  });

  return (
    <section className="rounded-lg border border-border/60 bg-background/50 p-3">
      <h4 className="mb-2 text-sm font-semibold">Preguntas frecuentes</h4>
      <ul className="mb-3 grid gap-2">
        {faqs.map((f) => (
          <li
            key={f.id}
            className="rounded border border-border/60 bg-card/30 p-2 text-xs"
          >
            <div className="mb-1 flex items-start justify-between gap-2">
              <strong className="text-foreground">{f.question}</strong>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateFn({
                      data: {
                        faqId: f.id,
                        publish: f.status !== "published",
                      },
                    }).then(refresh)
                  }
                  className="text-[10px] uppercase text-primary hover:underline"
                >
                  {f.status === "published" ? "Ocultar" : "Publicar"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    deleteFn({ data: { faqId: f.id } }).then(refresh)
                  }
                  className="text-[10px] uppercase text-destructive hover:underline"
                >
                  Borrar
                </button>
              </div>
            </div>
            <p className="text-muted-foreground">{f.answer}</p>
          </li>
        ))}
        {!faqs.length && (
          <li className="text-xs text-muted-foreground">
            Aún no hay FAQs. Agregar 2+ mejora la conversión.
          </li>
        )}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          createMut.mutate();
        }}
        className="grid gap-2"
      >
        <input
          required
          maxLength={300}
          placeholder="Pregunta"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="rounded border border-border bg-background px-2 py-1.5 text-sm"
        />
        <textarea
          required
          maxLength={4000}
          rows={2}
          placeholder="Respuesta"
          value={a}
          onChange={(e) => setA(e.target.value)}
          className="rounded border border-border bg-background px-2 py-1.5 text-sm"
        />
        {err && <p className="text-xs text-destructive">{err}</p>}
        <button
          type="submit"
          disabled={createMut.isPending || !q || !a}
          className="justify-self-end rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          {createMut.isPending ? "Agregando…" : "Agregar FAQ"}
        </button>
      </form>
    </section>
  );
}

/* ─────────────────────  Publish + Checklist  ───────────────── */

function PublishSection({
  productId,
  productStatus,
  onChanged,
}: {
  productId: string;
  productStatus: string;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const snapshotFn = useServerFn(getPortalProductPublishSnapshot);
  const publishFn = useServerFn(publishPortalProduct);
  const unpublishFn = useServerFn(unpublishPortalProduct);
  const { data, isLoading } = useQuery({
    queryKey: ["portal", "product-publish-snapshot", productId],
    queryFn: () => snapshotFn({ data: { productId } }),
  });
  const refresh = () => {
    qc.invalidateQueries({
      queryKey: ["portal", "product-publish-snapshot", productId],
    });
    onChanged();
  };

  const [feedback, setFeedback] = useState<string | null>(null);
  const publishMut = useMutation({
    mutationFn: () => publishFn({ data: { productId } }),
    onSuccess: (r) => {
      if (r.published) setFeedback("✅ Producto publicado.");
      else if (r.reason === "not_authorized_to_self_publish")
        setFeedback(
          "⚠️ Empresa no autorizada para autopublicar. Solicita revisión Founder.",
        );
      else if (r.reason === "validation_failed")
        setFeedback(`⚠️ Faltan requisitos: ${(r.errors ?? []).join(", ")}`);
      else setFeedback(r.message ?? r.reason ?? "No se pudo publicar.");
      refresh();
    },
    onError: (e) => setFeedback(e instanceof Error ? e.message : "Error"),
  });
  const unpublishMut = useMutation({
    mutationFn: () => unpublishFn({ data: { productId } }),
    onSuccess: () => {
      setFeedback("Producto retirado. Vuelve a borrador.");
      refresh();
    },
    onError: (e) => setFeedback(e instanceof Error ? e.message : "Error"),
  });

  const check = data?.check;
  const canPublish = useMemo(() => Boolean(check?.ok), [check]);

  return (
    <section className="rounded-lg border border-border/60 bg-background/50 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">Publicación</h4>
        <Link
          to="/portal/productos/$productId/preview"
          params={{ productId }}
          target="_blank"
          className="rounded-md border border-border bg-background px-3 py-1.5 text-[11px] font-medium hover:bg-accent"
        >
          Vista previa ↗
        </Link>
      </div>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Analizando…</p>
      ) : check ? (
        <ul className="mb-3 grid gap-1 text-xs">
          {[...check.blocking, ...check.warnings, ...check.info].map((i) => (
            <li
              key={i.code}
              className={
                i.severity === "block"
                  ? "text-destructive"
                  : i.severity === "warn"
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground"
              }
            >
              {i.severity === "block" ? "✕" : i.severity === "warn" ? "!" : "·"}{" "}
              {i.message}
              {i.fixHint && (
                <span className="ml-1 opacity-70">— {i.fixHint}</span>
              )}
            </li>
          ))}
          {check.ok && check.warnings.length === 0 && (
            <li className="text-emerald-600 dark:text-emerald-400">
              ✓ Listo para publicar.
            </li>
          )}
        </ul>
      ) : null}
      {feedback && (
        <p className="mb-2 text-xs text-muted-foreground">{feedback}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!canPublish || publishMut.isPending}
          onClick={() => publishMut.mutate()}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          {publishMut.isPending ? "Publicando…" : "Publicar producto"}
        </button>
        {productStatus === "published" && (
          <button
            type="button"
            disabled={unpublishMut.isPending}
            onClick={() => unpublishMut.mutate()}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
          >
            {unpublishMut.isPending ? "Retirando…" : "Retirar (ocultar)"}
          </button>
        )}
      </div>
    </section>
  );
}