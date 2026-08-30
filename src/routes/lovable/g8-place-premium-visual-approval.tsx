/**
 * G8-Q2D-0 · Vista interna noindex para la aprobación visual del Founder de
 * la futura ficha reusable `premium-entity-place` (variante
 * `zona-arqueologica`), usando Chichén Itzá (Tinum) como caso de diseño.
 *
 * Render-only y local:
 *  - no lee ni escribe contenido real;
 *  - no registra plantilla productiva ni `pageKind=place`;
 *  - no crea rutas públicas, redirects ni flags;
 *  - el selector Editorial/Cinematográfica es sólo local (useState).
 *
 * Header y Footer canónicos los aporta `__root` (esta ruta no es AppShell).
 */
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Container } from "@/components/layout/Container";
import { PremiumPresentationControl } from "@/components/premium";
import type { PremiumPresentation } from "@/lib/omxds/presentation/presentation";
import { PlacePremiumSurface } from "@/components/place-premium/PlacePremiumSurface";

export const Route = createFileRoute("/lovable/g8-place-premium-visual-approval")({
  head: () => ({
    meta: [
      { title: "G8-Q2D-0 · Aprobación visual · Ficha de Lugar Premium (interna)" },
      {
        name: "description",
        content:
          "Vista interna de aprobación visual de la ficha premium de Lugar/Atractivo. Demo visual, no publicable, no indexable.",
      },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: PlacePremiumVisualApproval,
});

function PlacePremiumVisualApproval() {
  const [presentation, setPresentation] = useState<PremiumPresentation>("editorial");

  return (
    <main className="min-h-screen bg-background">
      <Container className="pt-6">
        <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            G8-Q2D-0 · Vista interna de aprobación
          </p>
          <h1 className="mt-2 font-serif text-2xl sm:text-3xl">
            Ficha premium de Lugar y Atractivo · caso Chichén Itzá (Tinum)
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Propuesta visual nueva y acreditada para la familia
            <span className="font-medium"> premium-entity-place</span>, variante{" "}
            <span className="font-medium">zona-arqueológica</span>. Sin plantilla productiva, sin
            rutas públicas, sin datos y sin persistencia: el cambio de dirección visual es local y
            existe sólo para la decisión del Founder.
          </p>
          <div className="mt-5 max-w-md">
            <PremiumPresentationControl
              value={presentation}
              onChange={setPresentation}
              note="Cambia realmente la estructura del DOM: orden de secciones, jerarquía del hero y densidad de composición."
            />
          </div>
        </div>
      </Container>

      <PlacePremiumSurface presentation={presentation} className="mt-2" />
    </main>
  );
}
