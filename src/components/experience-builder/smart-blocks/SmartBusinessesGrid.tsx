import { SmartCard, SmartGrid, SmartEmpty } from "./SmartCard";
import { AddToTravelPlanButton } from "@/components/traveler/AddToTravelPlanButton";

export interface SmartBusinessItem {
  id?: string;
  slug?: string;
  name?: string;
  short_description?: string | null;
  cover_image_url?: string | null;
  logo_url?: string | null;
  href?: string | null;
  [k: string]: unknown;
}

export function SmartBusinessesGrid({
  items,
  title,
}: {
  items: SmartBusinessItem[];
  title?: string;
}) {
  // La sección conserva su título aunque no haya resultados: la ausencia
  // de datos es un estado editorial legible, no un bloque desaparecido.
  if (!items?.length) {
    return (
      <section className="space-y-4">
        {title ? <h2 className="text-xl font-semibold">{title}</h2> : null}
        <SmartEmpty message="Aún no hay empresas para mostrar." />
      </section>
    );
  }
  return (
    <section className="space-y-4">
      {title ? <h2 className="text-xl font-semibold">{title}</h2> : null}
      <SmartGrid>
        {items.map((b, i) => (
          <SmartCard
            key={String(b.id ?? b.slug ?? i)}
            title={String(b.name ?? "Empresa")}
            description={b.short_description ?? null}
            imageUrl={b.cover_image_url ?? b.logo_url ?? null}
            href={b.href ?? null}
            actions={
              b.id ? (
                <AddToTravelPlanButton
                  kind="business"
                  targetId={String(b.id)}
                  title={String(b.name ?? "Empresa")}
                  slug={b.slug ?? null}
                  imageUrl={b.cover_image_url ?? b.logo_url ?? null}
                  subtitle={b.short_description ?? null}
                />
              ) : null
            }
          />
        ))}
      </SmartGrid>
    </section>
  );
}
