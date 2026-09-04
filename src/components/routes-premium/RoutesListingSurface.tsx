/**
 * Lote 3C · `RoutesListingSurface` — listado maestro de Rutas / Itinerarios.
 *
 * Autoridad visual: Home Premium aprobado. Reutiliza EXACTAMENTE las piezas
 * compartidas (`PremiumEditorialHero`, `PremiumSectionHead`,
 * `PremiumShowcaseGrid`, `PremiumCompactRow`, `PremiumAluxBar`). No introduce
 * hero propio, ni selector Editorial/Cinematográfico, ni tokens nuevos.
 *
 * Datos: exclusivamente `editorial_routes` publicadas (CMS-first). Si un eje
 * no tiene valores publicados, no se muestra. Estado vacío honesto.
 */
import { useMemo, useState } from "react";

import {
  PremiumAluxBar,
  PremiumCompactRow,
  PremiumEditorialHero,
  PremiumSectionHead,
  PremiumShowcaseGrid,
  type PremiumShowcaseItem,
} from "@/components/home-premium/shared/PremiumShowcase";
import {
  ExperienceFiltersBar,
  type FilterSelection,
} from "@/components/experience-premium/ExperienceFiltersBar";
import { openAluxFloating } from "@/lib/alux/floating-bus";
import { buildAluxStageAwareHint } from "@/components/alux/TourismAluxPanel";
import type { PartyComposition } from "@/lib/traveler/party-composition";
import {
  routeDifficultyLabel,
  routeDurationLabel,
  routePaceLabel,
  routePublicPath,
  type EditorialRouteCardDTO,
} from "@/lib/routes-editorial/route-public-contract";
import { cn } from "@/lib/utils";

function humanize(value: string): string {
  const text = value.replace(/-/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function toShowcaseItem(route: EditorialRouteCardDTO): PremiumShowcaseItem {
  const duration = routeDurationLabel(route);
  return {
    key: route.id,
    name: route.name,
    note: route.summary || "Ruta sugerida del Oriente Maya",
    media: route.coverUrl ? { url: route.coverUrl, alt: route.coverAlt ?? route.name } : null,
    to: routePublicPath(route.slug),
    kicker: "Ruta",
    meta: [route.originDestinationLabel, duration].filter(Boolean).join(" · ") || null,
  };
}

interface Axis {
  id: string;
  label: string;
  valuesOf: (route: EditorialRouteCardDTO) => string[];
  labelOf?: (value: string) => string;
}

const AXES: Axis[] = [
  { id: "duracion", label: "Duración", valuesOf: (r) => (routeDurationLabel(r) ? [routeDurationLabel(r)!] : []) },
  { id: "ritmo", label: "Ritmo", valuesOf: (r) => (r.pace ? [r.pace] : []), labelOf: (v) => routePaceLabel(v) ?? humanize(v) },
  {
    id: "dificultad",
    label: "Dificultad",
    valuesOf: (r) => (r.difficulty ? [r.difficulty] : []),
    labelOf: (v) => routeDifficultyLabel(v) ?? humanize(v),
  },
  { id: "intereses", label: "Intereses", valuesOf: (r) => r.interests },
  { id: "audiencias", label: "Ideal para", valuesOf: (r) => r.audiences },
  { id: "temporada", label: "Temporada", valuesOf: (r) => r.seasons },
];

export function RoutesListingSurface({
  routes,
  destinationLabel,
  lockedDestinationLabel,
  className,
}: {
  routes: readonly EditorialRouteCardDTO[];
  /** Etiqueta real del destino (CMS) para el subtítulo territorial. */
  destinationLabel?: string | null;
  /** Cuando el listado vive dentro de un micrositio de destino. */
  lockedDestinationLabel?: string | null;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<FilterSelection>({});
  const [party, setParty] = useState<PartyComposition | null>(null);

  const facets = useMemo(
    () =>
      AXES.map((axis) => {
        const counts = new Map<string, number>();
        for (const route of routes)
          for (const value of axis.valuesOf(route))
            counts.set(value, (counts.get(value) ?? 0) + 1);
        return {
          id: axis.id,
          label: axis.label,
          options: Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([value, count]) => ({
              value,
              label: axis.labelOf ? axis.labelOf(value) : humanize(value),
              count,
            })),
        };
      }).filter((facet) => facet.options.length > 1),
    [routes],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return routes.filter((route) => {
      if (
        needle &&
        ![route.name, route.summary, route.originDestinationLabel ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(needle)
      )
        return false;
      for (const axis of AXES) {
        const selected = active[axis.id];
        if (!selected?.length) continue;
        const values = axis.valuesOf(route);
        if (!selected.some((value) => values.includes(value))) return false;
      }
      return true;
    });
  }, [routes, query, active]);

  const toggleFacet = (axisId: string, value: string) =>
    setActive((prev) => {
      const current = prev[axisId] ?? [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [axisId]: next };
    });

  const featured = filtered.slice(0, 4).map(toShowcaseItem);
  const rest = filtered.slice(4);
  const heroRoute = filtered.find((route) => route.coverUrl) ?? filtered[0] ?? null;
  const territory = lockedDestinationLabel ?? destinationLabel ?? null;

  const askAlux = (preference?: string) =>
    openAluxFloating({
      reason: "manual",
      hint: buildAluxStageAwareHint(
        "Ayúdame a elegir una ruta publicada del Oriente Maya.",
        [preference, territory, party ? `Viajo ${party}` : null].filter(Boolean).join(" · ") ||
          undefined,
      ),
    });

  return (
    <div className={cn("space-y-8", className)}>
      <PremiumEditorialHero
        eyebrow="Itinerarios del Oriente Maya"
        title={territory ? `Rutas desde ${territory}` : "Rutas sugeridas"}
        subtitle="Itinerarios editoriales con paradas reales: destinos, lugares, eventos y empresas publicadas."
        media={
          heroRoute?.coverUrl
            ? { url: heroRoute.coverUrl, alt: heroRoute.coverAlt ?? heroRoute.name }
            : null
        }
        caption={territory ? `Rutas que pasan por ${territory}` : undefined}
        searchSlot={
          <label className="block">
            <span className="sr-only">¿Qué ruta quieres recorrer?</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="¿Qué ruta quieres recorrer?"
              className="min-h-11 w-full rounded-pill border border-border bg-background px-5 text-sm"
            />
          </label>
        }
      />

      {facets.length ? (
        <ExperienceFiltersBar
          groups={facets}
          selection={active}
          onToggle={toggleFacet}
          onClear={() => setActive({})}
          resultCount={filtered.length}
        />
      ) : null}

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          {query || Object.values(active).some((v) => v?.length)
            ? "Ninguna ruta publicada coincide con esos filtros."
            : territory
              ? `Todavía no hay rutas publicadas que pasen por ${territory}.`
              : "Aún no hay rutas publicadas. Estamos armando los primeros itinerarios del Oriente Maya."}
        </p>
      ) : (
        <>
          <section aria-labelledby="rutas-destacadas">
            <PremiumSectionHead
              id="rutas-destacadas"
              kicker="Empieza por aquí"
              title="Rutas publicadas del Oriente Maya"
              description="Itinerarios armados por el equipo editorial con paradas verificadas."
            />
            <PremiumShowcaseGrid items={featured} featuredKicker="Ruta" detailLabel="Ver ruta" />
          </section>

          {rest.length > 0 ? (
            <section aria-labelledby="rutas-todas">
              <PremiumSectionHead
                id="rutas-todas"
                kicker="Todas las rutas"
                title={`${filtered.length} rutas publicadas`}
              />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((route) => (
                  <div key={route.id} className="flex flex-col gap-2">
                    <PremiumCompactRow item={toShowcaseItem(route)} />
                    <div className="flex flex-wrap items-center gap-2 px-1">
                      {route.stopCount > 0 ? (
                        <span className="rounded-pill border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                          {route.stopCount} paradas
                        </span>
                      ) : null}
                      {routeDifficultyLabel(route.difficulty) ? (
                        <span className="text-xs text-muted-foreground">
                          {routeDifficultyLabel(route.difficulty)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}

      <PremiumAluxBar
        question="¿Cuántos días tienes para recorrer el Oriente Maya?"
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
