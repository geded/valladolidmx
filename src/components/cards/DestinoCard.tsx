/**
 * DestinoCard — Tarjeta reutilizable de Destino.
 *
 * Propósito: presentar un Destino con placeholder visual, nombre, tagline,
 * highlights y CTA "+ Arma tu Viaje" (deshabilitado en Fase 0).
 *
 * Reutilizable: recibe `destination` por props. Hoy enruta a
 * /oriente-maya/$destino; cuando se sume otra región se ampliará con
 * un mapa region_slug → ruta sin tocar el resto del componente.
 */
import { Link } from "@tanstack/react-router";
import { Plus, ArrowUpRight } from "lucide-react";
import { PlaceholderImage } from "@/components/common/PlaceholderImage";
import type { Destination } from "@/types/territory";
import { useTranslation } from "@/i18n/context";

// Multi-región ready: añadir aquí nuevas regiones cuando existan.
const REGION_TO_ROUTE: Record<string, "/oriente-maya/$destino"> = {
  "oriente-maya": "/oriente-maya/$destino",
};

export function DestinoCard({ destination }: { destination: Destination }) {
  const { t } = useTranslation();
  const route = REGION_TO_ROUTE[destination.region_slug];

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:shadow-lg">
      {route ? (
        <Link
          to={route}
          params={{ destino: destination.slug }}
          className="block focus:outline-none"
          aria-label={`${destination.name} — ${destination.tagline}`}
        >
          <PlaceholderImage
            palette={destination.hero_palette}
            label={destination.name}
            aspect="4/3"
            className="rounded-none border-0 transition group-hover:scale-[1.02]"
          />
        </Link>
      ) : (
        <PlaceholderImage
          palette={destination.hero_palette}
          label={destination.name}
          aspect="4/3"
          className="rounded-none border-0"
        />
      )}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="text-xl font-semibold tracking-tight">{destination.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{destination.tagline}</p>
        </div>
        <ul className="flex flex-wrap gap-1.5">
          {destination.highlights.slice(0, 3).map((h) => (
            <li key={h} className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
              {h}
            </li>
          ))}
        </ul>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          {route ? (
            <Link
              to={route}
              params={{ destino: destination.slug }}
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              {t("common.explore")} <ArrowUpRight className="size-3.5" aria-hidden />
            </Link>
          ) : (
            <span className="text-xs text-muted-foreground">{t("common.coming_soon")}</span>
          )}
          <button
            type="button"
            disabled
            aria-disabled
            title={t("common.coming_soon")}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground"
          >
            <Plus className="size-3.5" aria-hidden />
            {t("common.add_to_trip")}
          </button>
        </div>
      </div>
    </article>
  );
}
