/**
 * G5-S1 · Vista previa interna de Listing Readiness.
 *
 * G8-E · Esta vista ya no declara fixtures propios ni JSX de listado:
 * consume el contenido aprobado `LISTING_PREMIUM_G5_FAMILIES` y la
 * autoridad visual compartida `ListingPremiumSurface`
 * (`TourismListingSurface`), la misma que renderizan Studio y producción
 * vía el bloque compuesto `vmx.listing.premium-g5`.
 *
 * Vista INTERNA, no indexable, sin persistencia y sin lecturas al backend.
 *  - D-05 · hero sin medio gobernado usa el degradado cálido, nunca un
 *    rectángulo negro.
 *  - D-06 · la familia "casas de vacaciones" es visible y comparable de
 *    forma normalizada.
 */
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/button";
import { ListingPremiumSurface } from "@/components/listing-premium/ListingPremiumSurface";
import {
  LISTING_PREMIUM_G5_FAMILIES,
  listingFamily,
  type ListingFamilyId,
} from "@/components/listing-premium/listing-premium-content";

export const Route = createFileRoute("/lovable/g5-listing-readiness-preview")({
  head: () => ({
    meta: [
      { title: "G5-S1 · Vista previa interna de Listing Readiness" },
      {
        name: "description",
        content:
          "Vista previa interna de listados turísticos con fixtures locales. No indexable.",
      },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: G5ListingReadinessPreview,
});

function G5ListingReadinessPreview() {
  const [familyId, setFamilyId] = useState<ListingFamilyId>("hoteles");
  const [columns, setColumns] = useState<1 | 2 | 3>(3);
  const family = listingFamily(familyId);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="border-b border-amber-300/60 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
        Vista previa interna G5-S1 · Listing Readiness — fixtures locales, no indexable, sin
        persistencia. No modifica fichas reales, datos ni el CMS.
      </div>

      <Container className="pt-6">
        <div className="flex flex-wrap items-center gap-2">
          {LISTING_PREMIUM_G5_FAMILIES.map((f) => (
            <Button
              key={f.id}
              type="button"
              size="sm"
              variant={f.id === familyId ? "default" : "outline"}
              className="min-h-11 rounded-pill px-4"
              onClick={() => setFamilyId(f.id)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Layout</span>
          {([1, 2, 3] as const).map((c) => (
            <Button
              key={c}
              type="button"
              size="sm"
              variant={c === columns ? "default" : "outline"}
              className="min-h-11 rounded-pill px-4"
              onClick={() => setColumns(c)}
            >
              {c === 1 ? "Lista" : `${c} columnas`}
            </Button>
          ))}
        </div>
      </Container>

      <div className="mt-6">
        <ListingPremiumSurface
          hero={family.hero}
          items={family.items}
          columns={columns}
          emptyMessage="Sin entidades de demostración para esta familia."
        />
      </div>
    </div>
  );
}
