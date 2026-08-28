/**
 * G8-P2 · Vista previa interna de la plantilla premium de TOUR.
 *
 * Reutiliza el motor visual aprobado de Experiencia (primitivas premium),
 * pero declara la semántica propia de la familia Tour: itinerario,
 * paradas, punto de salida, idiomas, transporte, dificultad, capacidad y
 * política de cancelación. JSON-LD `TouristTrip`.
 *
 * Vista INTERNA, noindex, sin persistencia y sin datos reales nuevos.
 */
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Clock, Languages, MapPin, Bus, Users, ShieldCheck } from "lucide-react";
import { Container } from "@/components/layout/Container";
import {
  PremiumHero,
  PremiumSection,
  PremiumTerritorialBreadcrumb,
  PremiumPresentationControl,
} from "@/components/premium";
import type { PremiumPresentation } from "@/lib/omxds/presentation/presentation";
import {
  createTourSurfaceSemantics,
  TOUR_SURFACE_JSON_LD_TYPE,
} from "@/lib/omxds/surfaces/tour-surface.adapter";

export const Route = createFileRoute("/lovable/g8p2-tour-premium-preview")({
  head: () => ({
    meta: [
      { title: "G8-P2 · Vista previa plantilla Premium de Tour (interna)" },
      {
        name: "description",
        content:
          "Vista previa interna de la plantilla premium de tour de Valladolid.mx. No indexable.",
      },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: G8P2TourPremiumPreview,
});

const GOVERNED = "/api/public/studio-media/governed/v1p1c";

const TOUR = {
  name: "Recorrido del Oriente Maya",
  eyebrow: "Tour guiado (demo interna)",
  claim:
    "Recorrido demostrativo por la traza colonial de Valladolid y sus cenotes cercanos, con guía acreditado del Oriente Maya de Yucatán.",
} as const;

const SEMANTICS = createTourSurfaceSemantics({
  itinerary: [
    "Salida y encuadre histórico en la plaza principal",
    "Calzada de los Frailes y talleres de oficio",
    "Cenote urbano · pausa de nado opcional",
    "Cierre gastronómico y regreso al punto de salida",
  ],
  stops: ["Plaza principal", "Calzada de los Frailes", "Cenote urbano", "Mercado tradicional"],
  duration: "5 h aprox. (demo)",
  departurePoint: "Plaza principal de Valladolid · Portal de piedra (demo)",
  languages: ["Español", "Inglés"],
  transport: "Traslado terrestre incluido entre paradas (demo)",
  includes: ["Guía acreditado", "Traslados", "Acceso a cenote", "Agua"],
  excludes: ["Alimentos no señalados", "Propinas", "Equipo fotográfico"],
  difficulty: "Media · caminata en empedrado",
  accessibility: "Accesibilidad parcial: escalinatas y superficies húmedas",
  capacity: 12,
  cancellationPolicy: "Cancelación sin costo hasta 24 h antes (demo)",
});

function G8P2TourPremiumPreview() {
  const [presentation, setPresentation] = useState<PremiumPresentation>("cinematic");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": TOUR_SURFACE_JSON_LD_TYPE,
    name: TOUR.name,
    description: TOUR.claim,
    touristType: "Cultural",
    itinerary: SEMANTICS.stops.map((stop, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: stop,
    })),
  };

  return (
    <main className="min-h-svh bg-background">
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>

      <PremiumHero
        vm={{
          presentation,
          crumbs: [
            { label: "Oriente Maya" },
            { label: "Valladolid" },
            { label: "Tours" },
            { label: TOUR.name },
          ],
          eyebrow: TOUR.eyebrow,
          title: TOUR.name,
          description: TOUR.claim,
          media: {
            url: `${GOVERNED}/experience-cover.jpg`,
            alt: "Cenote abierto de aguas turquesa en una caverna de piedra caliza cerca de Valladolid, Yucatán",
          },
          primaryAction: { label: "Solicitar disponibilidad", href: "#solicitud" },
          secondaryAction: { label: "Ver itinerario", href: "#itinerario" },
        }}
      />

      <Container className="py-6">
        <PremiumTerritorialBreadcrumb
          crumbs={[{ label: "Oriente Maya" }, { label: "Valladolid" }, { label: TOUR.name }]}
        />
        <div className="mt-4">
          <PremiumPresentationControl value={presentation} onChange={setPresentation} />
        </div>
      </Container>

      <PremiumSection
        vm={{
          id: "practico",
          eyebrow: "Datos prácticos",
          title: "Lo que define este tour",
          description:
            "La familia Tour declara su propia semántica: itinerario, paradas, salida, idiomas y transporte.",
        }}
      >
        <dl className="grid gap-4 sm:grid-cols-2">
          {[
            { icon: Clock, label: "Duración", value: SEMANTICS.duration },
            { icon: MapPin, label: "Punto de salida", value: SEMANTICS.departurePoint },
            { icon: Languages, label: "Idiomas", value: SEMANTICS.languages.join(" · ") },
            { icon: Bus, label: "Transporte", value: SEMANTICS.transport },
            {
              icon: Users,
              label: "Capacidad",
              value: SEMANTICS.capacity ? `${SEMANTICS.capacity} personas` : null,
            },
            { icon: ShieldCheck, label: "Cancelación", value: SEMANTICS.cancellationPolicy },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-4">
              <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <Icon className="size-4" aria-hidden />
                {label}
              </dt>
              <dd className="mt-2 text-sm leading-6">{value ?? "Sin acreditar"}</dd>
            </div>
          ))}
        </dl>
      </PremiumSection>

      <PremiumSection
        vm={{
          id: "itinerario",
          eyebrow: "Itinerario",
          title: "Cómo transcurre el recorrido",
        }}
      >
        <ol className="space-y-3">
          {SEMANTICS.itinerary.map((step, index) => (
            <li key={step} className="flex gap-3 rounded-2xl border border-border bg-card p-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {index + 1}
              </span>
              <p className="text-sm leading-6">{step}</p>
            </li>
          ))}
        </ol>
      </PremiumSection>

      <PremiumSection
        vm={{ id: "incluye", eyebrow: "Incluye / no incluye", title: "Alcance del servicio" }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <ul className="space-y-2 rounded-2xl border border-border bg-card p-4 text-sm">
            {SEMANTICS.includes.map((item) => (
              <li key={item}>· {item}</li>
            ))}
          </ul>
          <ul className="space-y-2 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            {SEMANTICS.excludes.map((item) => (
              <li key={item}>· {item}</li>
            ))}
          </ul>
        </div>
      </PremiumSection>

      <PremiumSection
        vm={{ id: "solicitud", eyebrow: "Concierge", title: "Solicita este recorrido" }}
        compact
      >
        <a
          href="#solicitud"
          className="inline-flex min-h-11 items-center rounded-pill bg-primary px-6 text-sm font-semibold text-primary-foreground"
        >
          Solicitar disponibilidad
        </a>
        <p className="mt-3 text-xs text-muted-foreground">
          Vista interna de aceptación. Sin datos reales ni persistencia.
        </p>
      </PremiumSection>
    </main>
  );
}
