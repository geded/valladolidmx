/**
 * Lote 3C · `RoutePremiumSurface` — perfil público de una Ruta / Itinerario.
 *
 * Reutiliza las piezas Premium aprobadas (hero editorial, encabezados de
 * sección, barra de Alux). Sin hero propio ni selector de presentación.
 * Todo el contenido proviene de `editorial_routes` / `editorial_route_stops`.
 */
import { useState } from "react";
import { Link } from "@tanstack/react-router";

import {
  PremiumAluxBar,
  PremiumEditorialHero,
  PremiumSectionHead,
} from "@/components/home-premium/shared/PremiumShowcase";
import { EditorialMediaFrame } from "@/components/omxds/EditorialMediaFrame";
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

  return (
    <div className="space-y-8">
      <PremiumEditorialHero
        eyebrow="Ruta sugerida"
        title={route.name}
        subtitle={route.summary || "Itinerario editorial del Oriente Maya."}
        media={route.coverUrl ? { url: route.coverUrl, alt: route.coverAlt ?? route.name } : null}
        caption={
          route.originDestinationLabel ? `Salida desde ${route.originDestinationLabel}` : undefined
        }
      />

      {chips.length ? (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span
              key={chip}
              className="rounded-pill border border-border bg-card px-3 py-1 text-xs text-muted-foreground"
            >
              {chip}
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <AddToTravelPlanButton
          kind="route"
          targetId={route.id}
          title={route.name}
          slug={route.slug}
          subtitle={route.originDestinationLabel}
          imageUrl={route.coverUrl}
          variant="full"
        />
        <span className="text-xs text-muted-foreground">
          Guardamos una referencia privada a esta ruta; el itinerario editorial no se modifica.
        </span>
      </div>

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
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                        {STOP_KIND_LABELS[stop.entityKind] ?? "Parada"}
                      </p>
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {route.gallery.map((media) => (
              <figure
                key={media.url}
                className="relative h-48 overflow-hidden rounded-2xl border border-border"
              >
                <EditorialMediaFrame
                  media={{ url: media.url, alt: media.alt ?? route.name }}
                  label={route.name}
                  className="absolute inset-0 size-full object-cover"
                />
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      <PremiumAluxBar
        question={`¿Quieres adaptar "${route.name}" a tus fechas?`}
        selectedParty={party}
        onSelectParty={(value) => {
          setParty(value);
          askAlux();
        }}
        onContinue={() => askAlux()}
      />
    </div>
  );
}
