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

/**
 * DestinoMedia — Renderiza fotografía real cuando hay `image_url`,
 * o el placeholder territorial si todavía no llegan los activos oficiales.
 * Aislado para que sustituir el banco de imágenes sea un cambio puntual.
 */
function DestinoMedia({ destination }: { destination: Destination }) {
  if (destination.image_url) {
    return (
      <div className="aspect-[4/3] w-full overflow-hidden">
        <img
          src={destination.image_url}
          alt={`${destination.name} — ${destination.tagline}`}
          loading="lazy"
          width={1280}
          height={960}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
        />
      </div>
    );
  }
  return (
    <PlaceholderImage
      palette={destination.hero_palette}
      label={destination.name}
      aspect="4/3"
      className="rounded-none border-0 transition group-hover:scale-[1.02]"
    />
  );
}

export function DestinoCard({ destination }: { destination: Destination }) {
  const { t } = useTranslation();
  const route = REGION_TO_ROUTE[destination.region_slug];

  const body = (
    <>
      <DestinoMedia destination={destination} />
      <div className="flex flex-1 flex-col gap-3 p-6">
        <div>
          <h3 className="text-2xl font-semibold tracking-tight">{destination.name}</h3>
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
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
            {t("common.explore")}
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
          <Link
            to="/arma-tu-viaje"
            search={{ destino: destination.slug }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
          >
            <Plus className="size-3.5" aria-hidden />
            {t("common.add_to_trip")}
          </Link>
        </div>
      </div>
    </>
  );

  if (!route) {
    return (
      <article className="group relative flex flex-col overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm">
        {body}
      </article>
    );
  }

  return (
    <Link
      to={route}
      params={{ destino: destination.slug }}
      aria-label={`${destination.name} — ${destination.tagline}`}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl"
    >
      {body}
    </Link>
  );
}
