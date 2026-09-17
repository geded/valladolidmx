/**
 * `ExperiencePremiumSurface` — ficha canónica de Experiencia (render-only).
 *
 * Autoridad visual: Home Premium aprobado. Reutiliza sin reinterpretar
 * `EditorialMediaFrame`, `PremiumSectionHead`,
 * `PremiumCompactRow`, `AddToTravelPlanButton` y el Alux oficial. No
 * renderiza chrome global: la ruta aporta `PublicShell` (con breadcrumb
 * territorial compacto en móvil).
 *
 * Separación comercial estricta (`resolveExperienceCommerce`):
 *  - "Agregar a Mi Viaje" siempre que la entidad sea elegible.
 *  - "Reservar" SÓLO con capacidad comercial real; jamás checkout simulado.
 */
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Heart, Share2, Star } from "lucide-react";

import {
  PremiumSectionHead,
} from "@/components/home-premium/shared/PremiumShowcase";
import { AddToCartButton } from "@/components/commerce/AddToCartButton";
import { AddToTravelPlanButton } from "@/components/traveler/AddToTravelPlanButton";
import { FavoriteButton } from "@/components/commerce/FavoriteButton";
import { ShareSheet } from "@/components/share/ShareSheet";
import { Button } from "@/components/ui/button";
import { ExperienceGallery } from "@/components/experience-builder/blocks/experience-gallery/ExperienceGallery";
import { ExperienceSubnav } from "@/components/experience-builder/blocks/experience-subnav/ExperienceSubnav";
import { ExperienceReviews } from "@/components/experience-builder/blocks/experience-reviews/ExperienceReviews";
import { BusinessLocationBlock } from "@/components/experience-builder/blocks/business-location/BusinessLocationBlock";
import { ExperienceRelatedCollection } from "@/components/experience-builder/blocks/experience-related-collection/ExperienceRelatedCollection";
import { EXPERIENCE_RELATED_ITEM_V11_DEFAULTS } from "@/lib/experience-builder/blocks/experience-related-collection/contract";
import type { ExperienceReviewsDTO } from "@/lib/experience-builder/blocks/experience-reviews/contract";
import { registerStickyCta } from "@/lib/alux/sticky-cta-presence";
import { evaluateTripEligibility } from "@/lib/traveler/trip-eligibility";
import { cn } from "@/lib/utils";
import type { ExperiencePremiumVM } from "./experience-premium-vm";

export interface ExperiencePremiumSurfaceProps {
  vm: ExperiencePremiumVM;
  /** Panel Alux contextual inyectado por la ruta (presencia única). */
  aluxSlot?: ReactNode;
  className?: string;
}

export function ExperiencePremiumSurface({
  vm,
  aluxSlot = null,
  className,
}: ExperiencePremiumSurfaceProps) {
  const { commerce } = vm;
  const tripEligibility = evaluateTripEligibility({
    kind: "product",
    targetId: vm.id,
    title: vm.name,
  });

  const [shareOpen, setShareOpen] = useState(false);
  useEffect(() => registerStickyCta(), []);
  const galleryItems = [vm.cover, ...vm.gallery]
    .filter((media): media is NonNullable<typeof media> => Boolean(media))
    .filter((media, index, all) => all.findIndex((candidate) => candidate.url === media.url) === index)
    .map((media) => ({ kind: "image" as const, url: media.url, alt: media.alt }));
  const anchors = [
    { id: "resumen", label: "Resumen", iconKey: "info" },
    ...(galleryItems.length > 1 ? [{ id: "galeria", label: "Galería", iconKey: "camera" }] : []),
    ...(vm.includes.length || vm.itinerary.length || vm.requirements.length ? [{ id: "detalles", label: "Detalles", iconKey: "badge-check" }] : []),
    ...(vm.location?.latitude != null && vm.location.longitude != null ? [{ id: "ubicacion", label: "Ubicación", iconKey: "map-pin" }] : []),
    ...(vm.reviews.length ? [{ id: "resenas", label: "Reseñas", iconKey: "star" }] : []),
  ];
  const reviewsDto: ExperienceReviewsDTO = {
    variant: "list", heading: "Reseñas de viajeros", subheading: null,
    emptyMessage: "Aún no hay reseñas publicadas.", columns: 2, groupBy: "none", sortBy: "recent",
    ariaLabel: "Reseñas de la experiencia",
    items: vm.reviews.map((review) => ({
      id: review.id, platform: "internal", externalUrl: null, rating: review.rating, ratingScale: 5,
      title: review.title, body: review.body, language: review.language, publishedAt: review.published_at,
      author: { displayName: review.author_display_name, avatarUrl: null, location: null, travelerType: review.visit_type, verified: review.verified_source !== null && review.verified_source !== "declared_visitor" },
      helpfulCount: null, travelerType: review.visit_type, tags: [],
      response: review.business_response ? { authorName: vm.operatorName, authorRole: null, body: review.business_response, publishedAt: review.business_response_at } : null,
      moderationStatus: "approved", featured: false, aluxRationale: null,
    })),
    aggregate: vm.reviewStats.count > 0 ? { average: vm.reviewStats.average, count: vm.reviewStats.count, distribution: { 1: vm.reviewStats.distribution["1"], 2: vm.reviewStats.distribution["2"], 3: vm.reviewStats.distribution["3"], 4: vm.reviewStats.distribution["4"], 5: vm.reviewStats.distribution["5"] }, byPlatform: [] } : null,
    capabilities: { showAggregate: true, showAggregateDistribution: true, showByPlatform: false, showBusinessResponse: true, showTravelerType: true, showLanguage: false, showHelpful: false, showTags: false, showPlatformBadge: false, showExternalLink: false, moderationAware: true, sourceMixed: false, seoJsonLd: true, compact: false, contextAware: false, aluxRecommended: false, translateOnDemand: false },
    contextRefs: { productSlug: vm.slug },
  };

  return (
    <div className={cn("space-y-10", className)}>
      {vm.demoNotice ? (
        <p className="rounded-pill border border-dashed border-border bg-muted/50 px-4 py-2 text-xs text-muted-foreground">
          {vm.demoNotice}
        </p>
      ) : null}

      <section aria-label={vm.name} className="space-y-5">
        {galleryItems.length ? (
          <ExperienceGallery dto={{ variant: "mosaic", heading: null, subheading: null, items: galleryItems, maxVisible: 5, aspect: "landscape", ariaLabel: `Galería de ${vm.name}`, capabilities: { lightbox: true, captions: false, video: false, panorama360: false, model3d: false, ar: false, ugc: false } }} />
        ) : (
          <div className="grid min-h-64 place-items-center rounded-3xl border border-dashed border-border bg-muted/40 px-6 text-center text-sm text-muted-foreground">Esta experiencia aún no tiene fotografías publicadas.</div>
        )}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            {[vm.eyebrow, vm.destinationLabel].filter(Boolean).join(" · ")}
          </p>
          <h1 className="mt-2 text-balance font-serif text-3xl leading-tight sm:text-4xl">
            {vm.name}
          </h1>
          {vm.tagline ? (
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">{vm.tagline}</p>
          ) : null}

          <p className="mt-4 text-sm">
            <span className="text-muted-foreground">Operada por </span>
            {vm.operatorHref ? (
              <Link to={vm.operatorHref} className="font-semibold hover:underline">
                {vm.operatorName}
              </Link>
            ) : (
              <span className="font-semibold">{vm.operatorName}</span>
            )}
          </p>
          {vm.rating ? (
            <p className="mt-2 flex items-center gap-1.5 text-sm">
              <Star className="size-4 fill-primary text-primary" aria-hidden />
              <span className="font-semibold">{vm.rating.value.toFixed(1)}</span>{" "}
              <span className="text-muted-foreground">
                · {vm.rating.count} {vm.rating.count === 1 ? "reseña" : "reseñas"} publicadas
              </span>
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <FavoriteButton entityKind="product" entityId={vm.id} entityTitle={vm.name} entitySlug={vm.slug} entityImageUrl={vm.cover?.url} className="min-h-11 rounded-pill px-4 text-sm" />
            <Button type="button" variant="outline" className="min-h-11 rounded-pill" onClick={() => setShareOpen(true)}><Share2 aria-hidden /> Compartir</Button>
          </div>
          </div>
          <aside className="rounded-2xl border border-border bg-card p-5 shadow-elevated lg:sticky lg:top-24">
            {commerce.priceLabel ? <p className="font-display text-2xl">Desde {commerce.priceLabel}</p> : <p className="text-sm font-semibold">Planea esta experiencia</p>}
            <div className="mt-4 flex flex-col gap-2">
            {tripEligibility.eligible ? (
              <AddToTravelPlanButton
                kind="product"
                targetId={vm.id}
                title={vm.name}
                slug={vm.slug}
                subtitle={vm.operatorName}
                imageUrl={vm.cover?.url ?? null}
                variant="full"
              />
            ) : null}
            {commerce.canBookOnline ? (
              <AddToCartButton
                productId={vm.id}
                className="min-h-11 rounded-pill bg-primary px-5 text-sm font-semibold text-primary-foreground"
              />
            ) : commerce.contactLabel && commerce.contactHref ? (
              <a
                href={commerce.contactHref}
                target={commerce.contactHref.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                className="inline-flex min-h-11 items-center justify-center rounded-pill border border-border bg-background px-5 text-sm font-semibold"
              >
                {commerce.contactLabel}
              </a>
            ) : null}
          </div>

          {commerce.saleGapNotice ? (
            <p className="mt-3 rounded-2xl border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              {commerce.saleGapNotice}
            </p>
          ) : null}
          <p className="mt-3 text-xs text-muted-foreground">{commerce.rationale}</p>
          </aside>
        </div>
      </section>

      <ExperienceSubnav dto={{ anchors, variant: "underline", sticky: true, scrollOffset: 88, ariaLabel: "Secciones de la experiencia", capabilities: { scrollSpy: true, showIcons: false, collapseMobile: false } }} />

      <section id="resumen" data-eb-anchor className="scroll-mt-24">
        {vm.facts.length > 0 ? (
            <dl className="mt-5 grid grid-cols-2 gap-2 border-t border-border pt-4 sm:grid-cols-3">
              {vm.facts.slice(0, 9).map((fact) => (
                <div key={fact.label} className="min-w-0">
                  <dt className="text-[11px] font-semibold uppercase text-muted-foreground">
                    {fact.label}
                  </dt>
                  <dd className="mt-0.5 text-sm leading-snug">{fact.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
      </section>

      {aluxSlot}

      {vm.description ? (
        <section aria-labelledby="experiencia-relato">
          <PremiumSectionHead
            id="experiencia-relato"
            kicker="El relato"
            title={`Qué vives en ${vm.name}`}
          />
          <p className="max-w-3xl whitespace-pre-line text-sm leading-relaxed text-muted-foreground lg:text-base">
            {vm.description}
          </p>
        </section>
      ) : null}

      {galleryItems.length > 1 ? <div id="galeria" data-eb-anchor className="scroll-mt-24" /> : null}

      {vm.includes.length > 0 || vm.excludes.length > 0 ? (
        <section id="detalles" data-eb-anchor aria-labelledby="experiencia-incluye" className="scroll-mt-24">
          <PremiumSectionHead
            id="experiencia-incluye"
            kicker="Qué contempla"
            title="Incluye y no incluye"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {vm.includes.length > 0 ? (
              <ul className="space-y-2 rounded-2xl border border-border bg-card p-4 text-sm">
                <li className="text-[11px] font-semibold uppercase text-primary">Incluye</li>
                {vm.includes.map((item) => (
                  <li key={item} className="text-muted-foreground">
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
            {vm.excludes.length > 0 ? (
              <ul className="space-y-2 rounded-2xl border border-border bg-card p-4 text-sm">
                <li className="text-[11px] font-semibold uppercase text-muted-foreground">
                  No incluye
                </li>
                {vm.excludes.map((item) => (
                  <li key={item} className="text-muted-foreground">
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      ) : null}

      {vm.itinerary.length > 0 ? (
        <section aria-labelledby="experiencia-itinerario">
          <PremiumSectionHead
            id="experiencia-itinerario"
            kicker="Paso a paso"
            title="Itinerario publicado"
          />
          <ol className="space-y-3">
            {vm.itinerary.map((step, index) => (
              <li
                key={step.title}
                className="flex gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-pill bg-primary/10 text-sm font-semibold text-primary">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-display text-base">{step.title}</p>
                  {step.detail ? (
                    <p className="mt-1 text-sm text-muted-foreground">{step.detail}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {vm.requirements.length > 0 || vm.languages.length > 0 || vm.accessibility.length > 0 ? (
        <section aria-labelledby="experiencia-condiciones">
          <PremiumSectionHead
            id="experiencia-condiciones"
            kicker="Antes de ir"
            title="Requisitos, idiomas y accesibilidad"
          />
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Requisitos", values: vm.requirements },
              { label: "Idiomas", values: vm.languages },
              { label: "Accesibilidad", values: vm.accessibility },
            ]
              .filter((group) => group.values.length > 0)
              .map((group) => (
                <div key={group.label} className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                    {group.label}
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {group.values.map((value) => (
                      <li
                        key={value}
                        className="rounded-pill border border-border px-3 py-1 text-xs"
                      >
                        {value}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        </section>
      ) : null}

      {vm.location ? (
        <section id="ubicacion" data-eb-anchor aria-labelledby="experiencia-ubicacion" className="scroll-mt-24">
          {vm.location.latitude != null && vm.location.longitude != null ? <BusinessLocationBlock lat={vm.location.latitude} lng={vm.location.longitude} name={vm.location.label} addressLine1={vm.location.address} presentation="premium" layout="stacked" /> : null}
        </section>
      ) : null}

      {vm.reviews.length > 0 ? <section id="resenas" data-eb-anchor className="scroll-mt-24"><ExperienceReviews dto={reviewsDto} /></section> : null}

      {vm.policies.length > 0 ? (
        <section aria-labelledby="experiencia-politicas">
          <PremiumSectionHead
            id="experiencia-politicas"
            kicker="Reglas"
            title="Políticas publicadas"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {vm.policies.map((policy) => (
              <div key={policy.title} className="rounded-2xl border border-border bg-card p-4">
                <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                  {policy.title}
                </p>
                {policy.items.map((item) => (
                  <p key={item} className="mt-1 text-sm text-muted-foreground">
                    {item}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {vm.faqs.length > 0 ? (
        <section aria-labelledby="experiencia-faq">
          <PremiumSectionHead id="experiencia-faq" kicker="Preguntas" title="Antes de reservar" />
          <div className="space-y-3">
            {vm.faqs.map((faq) => (
              <details
                key={faq.question}
                className="rounded-2xl border border-border bg-card p-4 text-sm"
              >
                <summary className="min-h-11 cursor-pointer font-semibold">{faq.question}</summary>
                <p className="mt-2 leading-relaxed text-muted-foreground">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      {vm.related.length > 0 ? (
        <section aria-labelledby="experiencia-relacionadas">
          <ExperienceRelatedCollection dto={{ variant: "carousel", entityKind: "experience", columns: 3, density: "compact", groupBy: "none", heading: "Experiencias cercanas", subheading: null, emptyMessage: "Aún no hay experiencias relacionadas.", ariaLabel: "Experiencias relacionadas", groups: [{ id: "relacionadas", entityKind: "experience", heading: null, subheading: null, emptyMessage: null, variant: "carousel", seeAllHref: null, seeAllLabel: null, items: vm.related.map((item) => ({ ...EXPERIENCE_RELATED_ITEM_V11_DEFAULTS, id: item.id, kind: "experience", title: item.name, subtitle: item.note, description: null, href: item.href, imageUrl: item.media?.url ?? null, imageAlt: item.media?.alt ?? null, meta: [], badges: [], tags: [], priceAmount: null, priceCurrency: null, dateStart: null, dateEnd: null, destinationSlug: vm.destinationSlug, categorySlug: null, rationale: null, sourceHint: "product", score: null })) }], capabilities: { showImage: true, showMeta: true, showBadges: true, showTags: false, showPrice: false, showDate: false, showRationale: false, showKindBadge: false, dedupe: true, compact: true, contextAware: false, aluxRecommended: false, aluxDynamicGroups: false, showRating: false, showDistance: false, showAvailability: false, showFavorite: true, showSecondaryAction: false, showTerritorialContext: true, showInstitutionalBadges: true, showHighlights: true }, contextRefs: { destinationSlug: vm.destinationSlug, productSlug: vm.slug } }} />
        </section>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 shadow-floating backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="min-w-0">{commerce.priceLabel ? <p className="truncate text-sm font-semibold">Desde {commerce.priceLabel}</p> : <p className="text-sm font-semibold">Mi Viaje</p>}</div>
          {commerce.canBookOnline ? <AddToCartButton productId={vm.id} /> : tripEligibility.eligible ? <AddToTravelPlanButton kind="product" targetId={vm.id} title={vm.name} slug={vm.slug} subtitle={vm.operatorName} imageUrl={vm.cover?.url ?? null} /> : null}
        </div>
      </div>
      <ShareSheet open={shareOpen} onOpenChange={setShareOpen} title={vm.name} url={typeof window !== "undefined" ? window.location.href : `/producto/${vm.slug}`} text="Descubre esta experiencia en el Oriente Maya." heading="Compartir experiencia" />
    </div>
  );
}
