import { SmartCard, SmartGrid, SmartEmpty } from "./SmartCard";
import { AddToTravelPlanButton } from "@/components/traveler/AddToTravelPlanButton";

export interface SmartProductItem {
  id?: string;
  slug?: string;
  name?: string;
  short_description?: string | null;
  cover_image_url?: string | null;
  price?: number | null;
  currency?: string | null;
  href?: string | null;
  [k: string]: unknown;
}

function formatPrice(price?: number | null, currency?: string | null): string | null {
  if (price == null) return null;
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: currency ?? "MXN",
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `${price} ${currency ?? ""}`.trim();
  }
}

export function SmartProductsGrid({ items, title }: { items: SmartProductItem[]; title?: string }) {
  // La sección conserva su título aunque no haya resultados: la ausencia
  // de datos es un estado editorial legible, no un bloque desaparecido.
  if (!items?.length) {
    return (
      <section className="space-y-4">
        {title ? <h2 className="text-xl font-semibold">{title}</h2> : null}
        <SmartEmpty message="Aún no hay productos para mostrar." />
      </section>
    );
  }
  return (
    <section className="space-y-4">
      {title ? <h2 className="text-xl font-semibold">{title}</h2> : null}
      <SmartGrid>
        {items.map((p, i) => (
          <SmartCard
            key={String(p.id ?? p.slug ?? i)}
            title={String(p.name ?? "Producto")}
            description={p.short_description ?? null}
            imageUrl={p.cover_image_url ?? null}
            href={p.href ?? null}
            badge={formatPrice(p.price ?? null, p.currency ?? null)}
            actions={
              p.id ? (
                <AddToTravelPlanButton
                  kind="product"
                  targetId={String(p.id)}
                  title={String(p.name ?? "Producto")}
                  slug={p.slug ?? null}
                  imageUrl={p.cover_image_url ?? null}
                  subtitle={p.short_description ?? null}
                />
              ) : null
            }
          />
        ))}
      </SmartGrid>
    </section>
  );
}
