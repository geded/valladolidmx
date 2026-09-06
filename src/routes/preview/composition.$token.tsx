/**
 * /preview/composition/$token — Vista previa compartible del borrador
 * actual de una composición (US-16). El token se emite desde el Studio
 * y caduca según el TTL. Renderiza con el mismo `CompositionRenderer`
 * usado en producción, así la paridad visual es 1:1.
 */

import { createFileRoute, notFound } from "@tanstack/react-router";
import {
  resolveCompositionPreview,
  type CompositionPreviewPayload,
} from "@/lib/experience-builder/studio.functions";
import { CompositionRenderer } from "@/lib/experience-builder/composition-renderer";
import { BusinessSurfaceProvider } from "@/components/surfaces/BusinessSurface";
import { buildDemoContext } from "@/lib/experience-builder/dynamic-variables";
import { buildPublicHead } from "@/lib/discovery/seo";
import { PublicShell } from "@/components/discovery";

export const Route = createFileRoute("/preview/composition/$token")({
  loader: async ({ params }) => {
    try {
      const payload = await resolveCompositionPreview({ data: { token: params.token } });
      if (!payload) throw notFound();
      return { payload };
    } catch {
      throw notFound();
    }
  },
  head: ({ params }) =>
    buildPublicHead({
      title: "Vista previa · Borrador",
      description: "Vista previa del borrador — enlace privado, no indexable.",
      path: `/preview/composition/${params?.token ?? ""}`,
      noindex: true,
    }),
  component: PreviewCompositionView,
  notFoundComponent: PreviewUnavailable,
});

function PreviewCompositionView() {
  const { payload } = Route.useLoaderData() as { payload: CompositionPreviewPayload };

  // `timeZoneName` no puede combinarse con `dateStyle`/`timeStyle`:
  // hacerlo lanza `TypeError: Invalid option` y tumbaba toda la vista previa.
  const expiresLabel = new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Merida",
  }).format(new Date(payload.expires_at));

  // 18.51 · La identidad y los valores gobernados los resuelve el
  // servidor desde `page_type` y `slug` persistidos. Sin fuente válida
  // la vista previa falla en cerrado, nunca con datos ficticios.
  if (payload.requires_governed_source && !payload.governed_source) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <h1 className="text-xl font-semibold">Fuente gobernada no disponible</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta composición usa el binding gobernado <code>geography.location</code> y no resolvió
          una fuente publicada para <code>{payload.slug}</code>.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {payload.governed_source_error ?? "governed_source_unavailable"}
        </p>
      </div>
    );
  }

  /* 3I.1 · Paridad pública: la vista previa usa el mismo `PublicShell` que
     `/p/$slug`, de modo que header, navegación territorial, tipografía y
     espaciado sean idénticos a la superficie publicada. */
  const rendered = (
    <PublicShell>
      <CompositionRenderer
        tree={payload.tree}
        pageType={payload.page_type}
        variableContext={buildDemoContext()}
      />
    </PublicShell>
  );
  return (
    <div className="min-h-screen">
      <div className="border-b border-amber-300/60 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
        Vista previa del borrador · {payload.title} — enlace caduca el {expiresLabel}{" "}
        (America/Merida). Snapshot {payload.snapshot_hash.slice(0, 12)}…. No indexable.
        {payload.governed_source ? " Fuente gobernada: publicada." : ""}
      </div>
      {payload.governed_source ? (
        <BusinessSurfaceProvider business={payload.governed_source.business}>
          {rendered}
        </BusinessSurfaceProvider>
      ) : (
        rendered
      )}
    </div>
  );
}

function PreviewUnavailable() {
  return (
    <main className="mx-auto max-w-xl p-8 text-center">
      <h1 className="text-xl font-semibold">Vista previa no disponible</h1>
      <p className="mt-2 text-sm text-muted-foreground">Este enlace no es válido o ya caducó.</p>
    </main>
  );
}
