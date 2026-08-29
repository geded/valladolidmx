/**
 * G8-R1-F1C-0 · Preview interno · RUTA / ITINERARIO.
 *
 * Etapas ordenadas sobre territorio, con recomendaciones prácticas,
 * accesibilidad, origen editorial y "Agregar ruta a Mi Viaje".
 * JSON-LD `TouristTrip` con `itinerary` — sin declarar reservas ni
 * precios que no existan.
 *
 * Vista INTERNA, noindex, sin datos publicados.
 */
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Clock, Map, Footprints, Accessibility, BookOpen } from "lucide-react";
import { Container } from "@/components/layout/Container";
import {
  PremiumHero,
  PremiumSection,
  PremiumTerritorialBreadcrumb,
  PremiumPresentationControl,
} from "@/components/premium";
import type { PremiumPresentation } from "@/lib/omxds/presentation/presentation";

export const Route = createFileRoute("/lovable/g8-r1f1c-route-preview")({
  head: () => ({
    meta: [
      { title: "G8-R1-F1C · Preview interno · Ruta / itinerario" },
      {
        name: "description",
        content: "Vista previa interna de la familia ruta/itinerario editorial. No indexable.",
      },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: RoutePreview,
});

const TRIP = {
  name: "Un día colonial en Valladolid (demo interna)",
  eyebrow: "Ruta editorial · Valladolid (demo interna)",
  claim:
    "Itinerario editorial de un día: traza colonial, cenote urbano y cocina yucateca. Origen editorial de la plataforma.",
  duration: "1 día · aprox. 6 horas",
  territory: "Valladolid · Oriente Maya",
  stages: [
    { title: "Plaza principal y catedral", note: "Inicio a pie · 45 min" },
    { title: "Calzada de los Frailes", note: "Caminata y comercios · 1 h" },
    { title: "Cenote urbano", note: "Baño y descanso · 1.5 h" },
    { title: "Comida yucateca", note: "Cocina tradicional · 1.5 h" },
    { title: "Atardecer en el convento", note: "Cierre editorial · 1 h" },
  ],
  practical: [
    "Llevar agua, calzado cómodo y protección solar.",
    "El tramo a pie tiene banquetas irregulares de piedra.",
    "Horarios sujetos a los establecimientos: se verifica en cada ficha.",
  ],
  accessibility: "Parcialmente accesible: banquetas irregulares y escalones en el cenote.",
};

function RoutePreview() {
  const [presentation, setPresentation] = useState<PremiumPresentation>("editorial");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: TRIP.name,
    description: TRIP.claim,
    itinerary: {
      "@type": "ItemList",
      itemListElement: TRIP.stages.map((s, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: s.title,
      })),
    },
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
            { label: "Valladolid" },
            { label: "Rutas" },
            { label: TRIP.name },
          ],
          eyebrow: TRIP.eyebrow,
          title: TRIP.name,
          description: TRIP.claim,
          media: null,
          primaryAction: { label: "Agregar ruta a Mi Viaje", href: "#mi-viaje" },
          secondaryAction: { label: "Ver etapas", href: "#etapas" },
        }}
      />

      <Container className="py-6">
        <PremiumTerritorialBreadcrumb
          crumbs={[
            { label: "Oriente Maya" },
            { label: "Valladolid" },
            { label: "Rutas" },
            { label: TRIP.name },
          ]}
        />
        <div className="mt-4">
          <PremiumPresentationControl value={presentation} onChange={setPresentation} />
        </div>
        <p className="mt-4 rounded-xl border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          Preview interna G8-R1-F1C-0 · sin fotografía aprobada. Pendiente de aprobación visual del
          Founder.
        </p>
      </Container>

      <PremiumSection vm={{ id: "resumen", eyebrow: "Resumen", title: "Territorio y duración" }}>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-4">
            <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <Map className="size-4" aria-hidden /> Territorio
            </dt>
            <dd className="mt-2 text-sm">{TRIP.territory}</dd>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <Clock className="size-4" aria-hidden /> Duración
            </dt>
            <dd className="mt-2 text-sm">{TRIP.duration}</dd>
          </div>
        </dl>
      </PremiumSection>

      <PremiumSection vm={{ id: "etapas", eyebrow: "Itinerario", title: "Etapas ordenadas" }}>
        <ol className="space-y-3">
          {TRIP.stages.map((s, i) => (
            <li key={s.title} className="flex gap-4 rounded-2xl border border-border bg-card p-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-pill border border-border text-sm font-semibold">
                {i + 1}
              </span>
              <span>
                <span className="block text-sm font-medium">{s.title}</span>
                <span className="block text-xs text-muted-foreground">{s.note}</span>
              </span>
            </li>
          ))}
        </ol>
      </PremiumSection>

      <PremiumSection vm={{ id: "practico", eyebrow: "Práctico", title: "Recomendaciones" }}>
        <ul className="space-y-2 rounded-2xl border border-border bg-card p-4 text-sm">
          {TRIP.practical.map((p) => (
            <li key={p} className="flex gap-2">
              <Footprints className="mt-0.5 size-4 shrink-0" aria-hidden />
              {p}
            </li>
          ))}
          <li className="flex gap-2 pt-2 text-muted-foreground">
            <Accessibility className="mt-0.5 size-4 shrink-0" aria-hidden />
            {TRIP.accessibility}
          </li>
          <li className="flex gap-2 text-muted-foreground">
            <BookOpen className="mt-0.5 size-4 shrink-0" aria-hidden />
            Origen editorial: redacción propia de Valladolid.mx.
          </li>
        </ul>
      </PremiumSection>
    </main>
  );
}
