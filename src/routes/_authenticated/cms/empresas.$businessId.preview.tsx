/**
 * G8-R1-F1B-B3 · Preview Interno de borradores empresariales.
 *
 * `/cms/empresas/{id}/preview` — autoridad única de previsualización staff.
 *
 * Contrato:
 *  · Founder / Admin / Editor únicamente (server fn con rol verificado).
 *  · Renderiza la MISMA superficie productiva `BusinessSurface`, el mismo
 *    proveedor de contexto y el mismo resolutor canónico que la ruta
 *    pública `/oriente-maya/...`. Cero renderer paralelo, cero fixture.
 *  · URL no canónica · `noindex, nofollow`.
 *  · Sólo lectura: no publica, no aprueba, no activa flags.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getBusinessDraftPreview } from "@/lib/cms/business-draft-preview.functions";
import { ContextEngineProvider } from "@/lib/context-engine";
import { navigationContextToDeclaration } from "@/lib/navigation";
import {
  BusinessSurface,
  BusinessSurfaceContractBoundary,
  BusinessSurfaceProvider,
} from "@/components/surfaces/BusinessSurface";
import { bindBusinessRoute } from "@/lib/experience-builder/canonical-entity-binding";

export const Route = createFileRoute("/_authenticated/cms/empresas/$businessId/preview")({
  head: () => ({
    meta: [
      { title: "Preview interno de ficha · CMS Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: BusinessDraftPreviewRoute,
});

function BusinessDraftPreviewRoute() {
  const { businessId } = Route.useParams();
  const fetchPreview = useServerFn(getBusinessDraftPreview);
  const { data, isLoading, error } = useQuery({
    queryKey: ["cms", "business-draft-preview", businessId],
    queryFn: () => fetchPreview({ data: { businessId } }),
  });

  if (isLoading) {
    return <p className="p-6 text-sm text-muted-foreground">Cargando borrador…</p>;
  }
  if (error) {
    return (
      <p className="p-6 text-sm text-destructive">
        No fue posible abrir el preview: acceso restringido a Founder, Admin o Editor.
      </p>
    );
  }
  if (!data) {
    return <p className="p-6 text-sm text-muted-foreground">Ficha no encontrada.</p>;
  }

  const { business, review } = data;
  const declaration = navigationContextToDeclaration(
    {
      region: { kind: "region" as const, slug: "oriente-maya" },
      ...(business.destination_slug
        ? {
            destination: {
              kind: "destination" as const,
              slug: business.destination_slug,
              label: business.destination_slug,
              region: "oriente-maya",
            },
          }
        : {}),
      ...(business.category_slug
        ? {
            category: {
              kind: "category" as const,
              slug: business.category_slug,
              label: business.category_slug,
              destination: business.destination_slug,
            },
          }
        : {}),
      business: {
        kind: "business" as const,
        slug: business.slug,
        label: business.display_name,
        destination: business.destination_slug,
        category: business.category_slug,
      },
    },
    { currentLabel: business.display_name },
  );
  const binding = bindBusinessRoute({
    businessId: business.id,
    categorySlug: business.category_slug,
    premiumEligible: false,
  });

  return (
    <div className="min-h-screen">
      <div className="border-b border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Preview interno · no publicado</span> · estado{" "}
        <code>{review.status}</code> · revisión <code>{review.sourceReviewState ?? "—"}</code> ·
        coordenadas <code>{review.coordinatesState ?? "sin registro"}</code>
        {review.coordinatesPrecision ? ` (${review.coordinatesPrecision})` : ""}
        {review.coordinatesAttribution ? ` · ${review.coordinatesAttribution}` : ""} ·{" "}
        <code>noindex,nofollow</code>
      </div>
      <ContextEngineProvider declaration={declaration}>
        <BusinessSurfaceProvider business={business} related={null}>
          <BusinessSurfaceContractBoundary
            enabled={binding.surface === "premium"}
            business={business}
            related={null}
            premiumEligibility={null}
            legacy={<BusinessSurface />}
          />
        </BusinessSurfaceProvider>
      </ContextEngineProvider>
    </div>
  );
}
