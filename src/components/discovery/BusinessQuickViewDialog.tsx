/**
 * BusinessQuickViewDialog — Modal Airbnb-style para la vista rápida de
 * un negocio dentro de listados turísticos (`/oriente-maya/:destino/:categoria`).
 *
 * Reutiliza infraestructura oficial:
 *  - `getMarketplaceBusinessBySlug` (server fn pública)
 *  - `Dialog` de shadcn
 *  - `FavoriteButton` (corazón Airbnb-style)
 *  - `AddToTravelPlanButton` ("Agregar a mi viaje")
 *
 * NO navega: se abre sobre la ficha de categoría para que el visitante
 * decida sin perder contexto de descubrimiento.
 */
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { MapPin, ExternalLink, Loader2, BadgeCheck, Navigation, Phone, MessageCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getMarketplaceBusinessBySlug } from "@/lib/catalog/marketplace-reads.functions";
import { FavoriteButton } from "@/components/commerce/FavoriteButton";
import { AddToTravelPlanButton } from "@/components/traveler/AddToTravelPlanButton";

export interface BusinessQuickViewDialogProps {
  slug: string | null;
  destinoSlug: string;
  categoriaSlug: string;
  onClose: () => void;
}

export function BusinessQuickViewDialog({
  slug,
  destinoSlug,
  categoriaSlug,
  onClose,
}: BusinessQuickViewDialogProps) {
  const fetchBiz = useServerFn(getMarketplaceBusinessBySlug);
  const open = Boolean(slug);
  const { data: biz, isLoading, isError } = useQuery({
    queryKey: ["marketplace", "business", slug],
    queryFn: () => fetchBiz({ data: { slug: slug as string } }),
    enabled: open,
    staleTime: 60_000,
  });

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto p-0">
        {isLoading ? (
          <div className="grid h-64 place-items-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
          </div>
        ) : isError || !biz ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No pudimos cargar esta empresa. Intenta de nuevo.
          </div>
        ) : (
          <>
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-t-2xl bg-muted">
              {biz.cover_url ? (
                <img
                  src={biz.cover_url}
                  alt={biz.display_name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="grid h-full place-items-center text-muted-foreground">
                  Sin foto por ahora
                </div>
              )}
              <div className="absolute right-3 top-3">
                <FavoriteButton entityKind="business" entityId={biz.id} />
              </div>
              {biz.verified ? (
                <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-pill bg-primary/90 px-2.5 py-1 text-[11px] font-semibold text-primary-foreground shadow-soft">
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                  Verificado
                </span>
              ) : null}
            </div>

            <div className="space-y-5 p-6">
              <DialogHeader className="space-y-1 text-left">
                <DialogTitle className="text-2xl font-semibold text-foreground">
                  {biz.display_name}
                </DialogTitle>
                {biz.tagline ? (
                  <DialogDescription className="text-sm text-muted-foreground">
                    {biz.tagline}
                  </DialogDescription>
                ) : null}
              </DialogHeader>

              {biz.description ? (
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/80">
                  {biz.description}
                </p>
              ) : null}

              {biz.primary_location ? (
                <section className="space-y-2 rounded-2xl border border-border bg-card/60 p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Cómo llegar
                  </h3>
                  <p className="inline-flex items-start gap-2 text-sm text-foreground/80">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <span>
                      {[
                        biz.primary_location.address_line1,
                        biz.primary_location.address_line2,
                        biz.primary_location.label,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Ubicación en el destino"}
                    </span>
                  </p>
                  {biz.primary_location.latitude != null &&
                  biz.primary_location.longitude != null ? (
                    <Button asChild size="sm" variant="secondary" className="rounded-pill">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${biz.primary_location.latitude},${biz.primary_location.longitude}`}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        <Navigation className="mr-2 h-4 w-4" aria-hidden />
                        Cómo llegar en Google Maps
                      </a>
                    </Button>
                  ) : null}
                </section>
              ) : null}

              {biz.primary_contact ? (
                <div className="flex flex-wrap gap-2">
                  {biz.primary_contact.type === "whatsapp" ? (
                    <Button asChild size="sm" variant="outline" className="rounded-pill">
                      <a
                        href={`https://wa.me/${biz.primary_contact.value.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        <MessageCircle className="mr-2 h-4 w-4" aria-hidden />
                        WhatsApp
                      </a>
                    </Button>
                  ) : biz.primary_contact.type === "phone" ? (
                    <Button asChild size="sm" variant="outline" className="rounded-pill">
                      <a href={`tel:${biz.primary_contact.value}`}>
                        <Phone className="mr-2 h-4 w-4" aria-hidden />
                        {biz.primary_contact.label ?? biz.primary_contact.value}
                      </a>
                    </Button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      {biz.primary_contact.label ?? biz.primary_contact.value}
                    </span>
                  )}
                </div>
              ) : null}

              {biz.products && biz.products.length > 0 ? (
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Productos destacados
                  </h3>
                  <ul className="divide-y divide-border rounded-2xl border border-border">
                    {biz.products.slice(0, 4).map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {p.name}
                          </p>
                          {p.tagline ? (
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {p.tagline}
                            </p>
                          ) : null}
                        </div>
                        {p.price_amount != null ? (
                          <span className="whitespace-nowrap text-sm font-semibold text-primary">
                            {new Intl.NumberFormat("es-MX", {
                              style: "currency",
                              currency: p.price_currency || "MXN",
                              maximumFractionDigits: 0,
                            }).format(p.price_amount)}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row">
                <AddToTravelPlanButton
                  kind="business"
                  targetId={biz.id}
                  title={biz.display_name}
                  slug={biz.slug}
                  imageUrl={biz.cover_url ?? null}
                  subtitle={biz.tagline ?? null}
                  variant="full"
                  className="flex-1"
                />
                <Button asChild variant="outline" className="flex-1">
                  <Link
                    to="/oriente-maya/$destino/$categoria/$empresa"
                    params={{
                      destino: destinoSlug,
                      categoria: categoriaSlug,
                      empresa: biz.slug,
                    }}
                    onClick={onClose}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
                    Ver ficha completa
                  </Link>
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}