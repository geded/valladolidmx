/**
 * /preview/composition/$token — Vista previa compartible del borrador
 * actual de una composición (US-16). El token se emite desde el Studio
 * y caduca según el TTL. Renderiza con el mismo `CompositionRenderer`
 * usado en producción, así la paridad visual es 1:1.
 */

import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  resolveCompositionPreview,
  type CompositionPreviewPayload,
} from "@/lib/experience-builder/studio.functions";
import { CompositionRenderer } from "@/lib/experience-builder/composition-renderer";
import { buildDemoContext } from "@/lib/experience-builder/dynamic-variables";
import { buildPublicHead } from "@/lib/discovery/seo";

export const Route = createFileRoute("/preview/composition/$token")({
  head: ({ params }) =>
    buildPublicHead({
      title: "Vista previa · Borrador",
      description: "Vista previa del borrador — enlace privado, no indexable.",
      path: `/preview/composition/${params?.token ?? ""}`,
      noindex: true,
    }),
  component: PreviewCompositionView,
});

function PreviewCompositionView() {
  const { token } = useParams({ from: "/preview/composition/$token" });
  const resolve = useServerFn(resolveCompositionPreview);
  const [payload, setPayload] = useState<CompositionPreviewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const p = await resolve({ data: { token } });
        if (!p) setError("Este enlace no es válido o ya caducó.");
        else setPayload(p);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [token, resolve]);

  if (error) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <h1 className="text-xl font-semibold">Vista previa no disponible</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }
  if (!payload) {
    return <div className="p-8 text-sm text-muted-foreground">Cargando vista previa…</div>;
  }

  const expiresLabel = new Date(payload.expires_at).toLocaleString();
  return (
    <div className="min-h-screen">
      <div className="border-b border-amber-300/60 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
        Vista previa del borrador · {payload.title} — enlace caduca el {expiresLabel}. No indexable.
      </div>
      <CompositionRenderer tree={payload.tree} variableContext={buildDemoContext()} />
    </div>
  );
}