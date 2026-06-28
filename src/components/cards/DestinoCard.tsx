/**
 * DestinoCard — Tarjeta reutilizable de Destino para cualquier región.
 *
 * Propósito: presentar un Destino con imagen placeholder, nombre, tagline
 * y CTA "+ Arma tu Viaje" (deshabilitado en Fase 0).
 *
 * Reutilizable: recibe `destination` y `region_slug` por props. No hardcodea
 * Oriente Maya — sirve para cualquier región futura.
 *
 * Dependencias: types/territory, PlaceholderImage, @tanstack/react-router Link.
 */
import { Link } from "@tanstack/react-router";
import { Plus, ArrowUpRight } from "lucide-react";
import { PlaceholderImage } from "@/components/common/PlaceholderImage";
import type { Destination } from "@/types/territory";
import { useTranslation } from "@/i18n/context";

interface Props {
  destination: Destination;
  /** Permite preparar slots para múltiples regiones. */
  region_slug?: string;
}

export function DestinoCard({ destination, region_slug }: Props) {
  const { t } = useTranslation();
  const region = region_slug ?? destination.region_slug;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:shadow-lg">
      <Link
        to="/$region/$destino"
        params={{ region, destino: destination.slug }}
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
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="text-xl font-semibold tracking-tight">{destination.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{destination.tagline}</p>
        </div>
        <ul className="flex flex-wrap gap-1.5">
          {destination.highlights.slice(0, 3).map((h) => (
            <li
              key={h}
              className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
            >
              {h}
            </li>
          ))}
        </ul>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <Link
            to="/$region/$destino"
            params={{ region, destino: destination.slug }}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            {t("common.explore")}
            <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
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
