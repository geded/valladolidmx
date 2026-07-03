import { SmartCard, SmartGrid, SmartEmpty } from "./SmartCard";

export interface SmartProductItem {
  id?: string;
  slug?: string;
  name?: string;
  short_description?: string | null;
  cover_image_url?: string | null;
  price?: number | null;
  currency?: string | null;
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

export function SmartProductsGrid({
  items,
  title,
}: {
  items: SmartProductItem[];
  title?: string;
}) {
  if (!items?.length) return <SmartEmpty message="Aún no hay productos para mostrar." />;
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
            href={p.slug ? `/producto/${p.slug}` : null}
            badge={formatPrice(p.price ?? null, p.currency ?? null)}
          />
        ))}
      </SmartGrid>
    </section>
  );
}