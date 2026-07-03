/**
 * /preview/$token — Ruta retirada (Iniciativa 3 · Fase 3.3a.1).
 *
 * Antes resolvía tokens v2 (`eb_preview_tokens`) vía `ebResolvePreview`.
 * v2 quedó congelado en Fase 3.3a y no hay tokens activos ni mapeo posible
 * hacia v1 (`/preview/composition/$token`). La ruta se conserva sólo para
 * responder de forma amable a enlaces antiguos; permanece `noindex` y no
 * redirige a la ruta v1.
 */

import { createFileRoute } from "@tanstack/react-router";
import { buildPublicHead } from "@/lib/discovery/seo";

export const Route = createFileRoute("/preview/$token")({
  head: ({ params }) =>
    buildPublicHead({
      title: "Vista previa no disponible",
      description: "Este enlace de vista previa ya no está disponible.",
      path: `/preview/${params?.token ?? ""}`,
      noindex: true,
    }),
  component: PreviewRetired,
});

function PreviewRetired() {
  return (
    <main className="mx-auto max-w-xl p-12 text-center">
      <h1 className="text-2xl font-semibold">Vista previa no disponible</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Este enlace de vista previa ya no está disponible. Solicita uno nuevo
        desde el Studio.
      </p>
    </main>
  );
}