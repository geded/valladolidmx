/**
 * G8-R1-F1C-0 · Preview interno · ZONA TERRITORIAL DE DESTINO.
 *
 * La zona es PARTE del destino: breadcrumb Inicio → Oriente Maya →
 * Destino → Zona, canónico dependiente del destino padre y sin competir
 * SEO con él (self-canonical con `noindex` mientras no haya contenido
 * territorial propio suficiente).
 *
 * Vista INTERNA, noindex, sin datos publicados.
 */
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Map, Landmark, Store, ShoppingBag, CalendarDays, Route as RouteIcon } from "lucide-react";
import { Container } from "@/components/layout/Container";
import {
  PremiumHero,
  PremiumSection,
  PremiumTerritorialBreadcrumb,
  PremiumPresentationControl,
} from "@/components/premium";
import type { PremiumPresentation } from "@/lib/omxds/presentation/presentation";

export const Route = createFileRoute("/lovable/g8-r1f1c-zone-preview")({
  head: () => ({
    meta: [
      { title: "G8-R1-F1C · Preview interno · Zona territorial" },
      {
        name: "description",
        content: "Vista previa interna de la familia zona territorial de destino. No indexable.",
      },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: ZonePreview,
});

const ZONE = {
  name: "Centro histórico (demo interna)",
  destination: "Valladolid",
  eyebrow: "Zona del destino · Valladolid (demo interna)",
  claim:
    "La traza colonial alrededor de la plaza principal: calzada de piedra, templos, mercados y calles con vida nocturna.",
};

const COLLECTIONS = [
  { icon: Landmark, label: "Lugares", note: "Se omite si la zona no tiene lugares acreditados" },
  { icon: Store, label: "Empresas", note: "Hoteles, restaurantes y comercios dentro del polígono" },
  {
    icon: ShoppingBag,
    label: "Productos",
    note: "Experiencias y productos con operador en la zona",
  },
  { icon: CalendarDays, label: "Eventos", note: "Agenda vigente dentro de la zona" },
  { icon: RouteIcon, label: "Rutas", note: "Itinerarios que atraviesan la zona" },
];

function ZonePreview() {
  const [presentation, setPresentation] = useState<PremiumPresentation>("editorial");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    name: `${ZONE.name} · ${ZONE.destination}`,
    description: ZONE.claim,
    containedInPlace: { "@type": "City", name: ZONE.destination },
  };

  return (
    <main className="min-h-svh bg-background">
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>

      <PremiumHero
        vm={{
          presentation,
          crumbs: [
            { label: "Inicio" },
            { label: "Oriente Maya" },
            { label: ZONE.destination },
            { label: ZONE.name },
          ],
          eyebrow: ZONE.eyebrow,
          title: ZONE.name,
          description: ZONE.claim,
          media: null,
          primaryAction: { label: "Ver en el mapa", href: "#mapa" },
          secondaryAction: { label: "Explorar destinos del Oriente Maya", href: "/oriente-maya" },
        }}
      />

      <Container className="py-6">
        <PremiumTerritorialBreadcrumb
          crumbs={[
            { label: "Inicio" },
            { label: "Oriente Maya" },
            { label: ZONE.destination },
            { label: ZONE.name },
          ]}
        />
        <div className="mt-4">
          <PremiumPresentationControl value={presentation} onChange={setPresentation} />
        </div>
        <p className="mt-4 rounded-xl border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          Preview interna G8-R1-F1C-0 · la zona no compite SEO con el destino padre: canónico
          propio, sin duplicar la narrativa del destino. Pendiente de aprobación visual del Founder.
        </p>
      </Container>

      <PremiumSection vm={{ id: "mapa", eyebrow: "Territorio", title: "Mapa del polígono" }}>
        <div className="flex aspect-[16/9] items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 text-sm text-muted-foreground">
          <Map className="mr-2 size-4" aria-hidden />
          Mapa territorial (marcador neutral: sin medio gobernado)
        </div>
      </PremiumSection>

      <PremiumSection
        vm={{
          id: "colecciones",
          eyebrow: "Dentro de la zona",
          title: "Qué contiene esta zona",
          description: "Cada colección se omite cuando está vacía.",
        }}
      >
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {COLLECTIONS.map(({ icon: Icon, label, note }) => (
            <li key={label} className="rounded-2xl border border-border bg-card p-4">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Icon className="size-4" aria-hidden />
                {label}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{note}</p>
            </li>
          ))}
        </ul>
      </PremiumSection>
    </main>
  );
}
