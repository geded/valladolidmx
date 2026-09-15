/**
 * Lote 3C · `RoutePremiumSurface` — perfil público de una Ruta / Itinerario.
 *
 * Reutiliza las piezas Premium aprobadas (hero editorial, encabezados de
 * sección, barra de Alux). Sin hero propio ni selector de presentación.
 * Todo el contenido proviene de `editorial_routes` / `editorial_route_stops`.
 */
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Share2 } from "lucide-react";

import {
  PremiumAluxBar,
  PremiumSectionHead,
} from "@/components/home-premium/shared/PremiumShowcase";
import { PremiumHero } from "@/components/premium";
import { DEFAULT_PREMIUM_PRESENTATION } from "@/lib/omxds/presentation/presentation";
import { ExperienceSubnav } from "@/components/experience-builder/blocks/experience-subnav/ExperienceSubnav";
import { ExperienceGallery } from "@/components/experience-builder/blocks/experience-gallery/ExperienceGallery";
import { TourismChip, TourismChipRow } from "@/components/omxds/TourismChip";
import { Button } from "@/components/ui/button";
import { ShareSheet } from "@/components/share/ShareSheet";

import { AddToTravelPlanButton } from "@/components/traveler/AddToTravelPlanButton";
import { openAluxFloating } from "@/lib/alux/floating-bus";
import { buildAluxStageAwareHint } from "@/components/alux/TourismAluxPanel";
import type { PartyComposition } from "@/lib/traveler/party-composition";
import {
  routeDifficultyLabel,
  routeDurationLabel,
  routePaceLabel,
  type EditorialRouteDetailDTO,
  type EditorialRouteStopDTO,
} from "@/lib/routes-editorial/route-public-contract";
import { RouteMapSection, routeMapStops } from "./RouteMapSection";

const STOP_KIND_LABELS: Record<string, string> = {
  place: "Lugar",
  experience: "Experiencia",
  event: "Evento",
  business: "Empresa",
  product: "Producto",
  destination: "Destino",
  note: "Nota del editor",
};

function groupByDay(stops: readonly EditorialRouteStopDTO[]) {
  const days = new Map<number | null, EditorialRouteStopDTO[]>();
  for (const stop of stops) {
    const key = stop.dayNumber ?? null;
    const bucket = days.get(key);
    if (bucket) bucket.push(stop);
    else days.set(key, [stop]);
  }
  return Array.from(days.entries()).sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0));
}

export function RoutePremiumSurface({ route }: { route: EditorialRouteDetailDTO }) {
  const [party, setParty] = useState<PartyComposition | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const chips = [
    routeDurationLabel(route),
    routePaceLabel(route.pace),
    routeDifficultyLabel(route.difficulty),
    route.stopCount > 0 ? `${route.stopCount} paradas` : null,
  ].filter((v): v is string => Boolean(v));

  const askAlux = () =>
    openAluxFloating({
      reason: "manual",
      hint: buildAluxStageAwareHint(
        `Ayúdame a adaptar la ruta "${route.name}" a mi viaje.`,
        [
          route.originDestinationLabel ? `Salida desde ${route.originDestinationLabel}` : null,
          route.stops.length ? `Paradas: ${route.stops.map((s) => s.title).join(", ")}` : null,
          route.interests.length ? `Intereses: ${route.interests.join(", ")}` : null,
          party ? `Viajo ${party}` : null,
        ]
          .filter(Boolean)
          .join(" · ") || undefined,
      ),
    });

  const days = groupByDay(route.stops);
  const mapStops = routeMapStops(route.stops);
  const mapOrder = new Map(mapStops.map((stop, index) => [stop.id, index + 1]));

  // Navegación interna: sólo se declaran las secciones realmente presentes.
  const subnavAnchors = [
    ...(mapStops.length ? [{ id: "ruta-mapa", label: "Mapa", iconKey: "map-pin" }] : []),
    ...(route.stops.length ? [{ id: "ruta-itinerario", label: "Itinerario", iconKey: "info" }] : []),
    ...(route.gallery.length ? [{ id: "ruta-galeria", label: "Galería", iconKey: "camera" }] : []),
  ];

  return (
    <div className="space-y-8">
      <PremiumHero
        layout="entity"
        vm={{
          presentation: DEFAULT_PREMIUM_PRESENTATION,
          eyebrow: "Ruta sugerida",
          title: route.name,
          description: route.summary || "Itinerario editorial del Oriente Maya.",
          media: route.coverUrl
            ? { url: route.coverUrl, alt: route.coverAlt ?? route.name }
            : null,
          badges: [
            ...(route.originDestinationLabel
              ? [{ label: `Salida desde ${route.originDestinationLabel}` }]
              : []),
            ...chips.map((chip) => ({ label: chip })),
          ],
        }}
      />
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setShareOpen(true)}
          className="min-h-11 rounded-pill"
        >
          <Share2 className="size-4" aria-hidden />
          Compartir
        </Button>
        <AddToTravelPlanButton
          kind="route"
          targetId={route.id}
          title={route.name}
          slug={route.slug}
          subtitle={route.originDestinationLabel}
          imageUrl={route.coverUrl}
          variant="full"
        />
      </div>


      <ShareSheet
        open={shareOpen}
        onOpenChange={setShareOpen}
        title={route.name}
        url={typeof window !== "undefined" ? window.location.href : `/rutas/${route.slug}`}
        {...(route.summary ? { text: route.summary } : {})}
        heading="Compartir esta ruta"
      />

      <PremiumAluxBar
        question={`¿Quieres adaptar "${route.name}" a tus fechas?`}
        selectedParty={party}
        onSelectParty={(value) => {
          setParty(value);
          askAlux();
        }}
        onContinue={() => askAlux()}
      />

      {subnavAnchors.length > 1 ? (
        <ExperienceSubnav
          dto={{
            variant: "pill",
            sticky: true,
            scrollOffset: 88,
            ariaLabel: "Secciones de la ruta",
            anchors: subnavAnchors,
            capabilities: { scrollSpy: true, collapseOnMobile: true, showIcons: true },
          }}
        />
      ) : null}

      <RouteMapSection
        stops={mapStops}
        durationDays={route.durationDays}
        roadRoute={route.roadRoute}
      />

      <section aria-labelledby="ruta-itinerario">
        <PremiumSectionHead
          id="ruta-itinerario"
          kicker="Itinerario"
          title="Paradas de la ruta"
          description="Cada parada enlaza a la ficha publicada correspondiente."
        />
        {route.stops.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            El equipo editorial aún no publicó las paradas de esta ruta.
          </p>
        ) : (
          <div className="space-y-6">
            {days.map(([day, stops]) => (
              <div key={String(day)} className="space-y-3">
                {day != null ? <h3 className="font-display text-lg">Día {day}</h3> : null}
                <ol className="space-y-3">
                  {stops.map((stop) => (
                    <li
                      key={stop.id}
                      className="rounded-2xl border border-border bg-card p-4 shadow-soft"
                    >
                      <div className="flex items-center gap-2">
                        {mapOrder.get(stop.id) ? (
                          <a
                            href="#ruta-mapa"
                            aria-label={`Ver ${stop.title} en el mapa`}
                            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground"
                          >
                            {mapOrder.get(stop.id)}
                          </a>
                        ) : null}
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                          {STOP_KIND_LABELS[stop.entityKind] ?? "Parada"}
                        </p>
                      </div>
                      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
                        {stop.href ? (
                          <Link
                            to={stop.href}
                            className="font-display text-lg underline-offset-4 hover:underline"
                          >
                            {stop.title}
                          </Link>
                        ) : (
                          <span className="font-display text-lg">{stop.title}</span>
                        )}
                        {stop.durationMinutes ? (
                          <span className="text-xs text-muted-foreground">
                            {stop.durationMinutes} min
                          </span>
                        ) : null}
                      </div>
                      {stop.note ? (
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {stop.note}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </section>

      {route.gallery.length ? (
        <section aria-labelledby="ruta-galeria">
          <PremiumSectionHead id="ruta-galeria" kicker="Galería" title="Así se ve la ruta" />
          {/* Mosaico oficial de la Biblioteca (mismo bloque que hoteles y
              restaurantes). Sólo fotografías publicadas en el CMS. */}
          <ExperienceGallery
            dto={{
              variant: route.gallery.length >= 3 ? "mosaic" : "grid",
              items: route.gallery.map((media) => ({
                kind: "image" as const,
                url: media.url,
                alt: media.alt ?? route.name,
              })),
              maxVisible: 8,
              aspect: "landscape",
              heading: null,
              subheading: null,
              ariaLabel: `Galería de ${route.name}`,
              capabilities: {
                lightbox: true,
                captions: true,
                video: false,
                panorama360: false,
                model3d: false,
                ar: false,
                ugc: false,
              },
            }}
          />
        </section>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 rounded-3xl border border-border bg-card p-5 shadow-soft">
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg">¿Te llevas esta ruta?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Súmala a Mi Viaje y tu concierge la adapta a tus fechas.
          </p>
        </div>
        <AddToTravelPlanButton
          kind="route"
          targetId={route.id}
          title={route.name}
          slug={route.slug}
          subtitle={route.originDestinationLabel}
          imageUrl={route.coverUrl}
          variant="full"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => setShareOpen(true)}
          className="min-h-11 rounded-pill"
        >
          <Share2 className="size-4" aria-hidden />
          Compartir
        </Button>
      </div>
    </div>
  );
}
