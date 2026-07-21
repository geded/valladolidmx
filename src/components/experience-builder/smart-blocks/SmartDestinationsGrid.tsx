import { SmartCard, SmartGrid, SmartEmpty } from "./SmartCard";
import { AddToTravelPlanButton } from "@/components/traveler/AddToTravelPlanButton";

export interface SmartDestinationItem {
  id?: string;
  slug?: string;
  name?: string;
  short_description?: string | null;
  hero_image_url?: string | null;
  [k: string]: unknown;
}

export function SmartDestinationsGrid({
  items,
  title,
}: {
  items: SmartDestinationItem[];
  title?: string;
}) {
  if (!items?.length) return <SmartEmpty message="Aún no hay destinos para mostrar." />;
  return (
    <section className="space-y-4">
      {title ? <h2 className="text-xl font-semibold">{title}</h2> : null}
      <SmartGrid>
        {items.map((d, i) => (
          <SmartCard
            key={String(d.id ?? d.slug ?? i)}
            title={String(d.name ?? "Destino")}
            description={d.short_description ?? null}
            imageUrl={d.hero_image_url ?? null}
            href={d.slug ? `/destino/${d.slug}` : null}
            actions={
              d.id ? (
                <AddToTravelPlanButton
                  kind="destination"
                  targetId={String(d.id)}
                  title={String(d.name ?? "Destino")}
                  slug={d.slug ?? null}
                  imageUrl={d.hero_image_url ?? null}
                  subtitle={d.short_description ?? null}
                  eligibilityMode="legacy"
                />
              ) : null
            }
          />
        ))}
      </SmartGrid>
    </section>
  );
}