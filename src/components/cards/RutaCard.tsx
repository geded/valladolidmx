/**
 * RutaCard — Tarjeta reutilizable de Ruta sugerida.
 */
import { Clock, MapPin } from "lucide-react";
import { PlaceholderImage } from "@/components/common/PlaceholderImage";
import type { SuggestedRoute } from "@/types/entities";
import { useTranslation } from "@/i18n/context";

export function RutaCard({ route }: { route: SuggestedRoute }) {
  const { t } = useTranslation();
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:shadow-md">
      <PlaceholderImage palette={route.palette} label={route.name} aspect="video" className="rounded-none border-0" />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden />
            {route.duration_days} {t("common.days")}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" aria-hidden />
            {route.destination_slugs.length}
          </span>
        </div>
        <h3 className="text-lg font-semibold">{route.name}</h3>
        <p className="text-sm text-muted-foreground">{route.summary}</p>
      </div>
    </article>
  );
}
