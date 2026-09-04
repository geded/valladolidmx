/**
 * `ExperiencePremiumSurface` — ficha canónica de Experiencia (render-only).
 *
 * Autoridad visual: Home Premium aprobado. Reutiliza sin reinterpretar
 * `PremiumHero`, `EditorialMediaFrame`, `PremiumSectionHead`,
 * `PremiumCompactRow`, `AddToTravelPlanButton` y el Alux oficial. No
 * renderiza chrome global: la ruta aporta `PublicShell` (con breadcrumb
 * territorial compacto en móvil).
 *
 * Separación comercial estricta (`resolveExperienceCommerce`):
 *  - "Agregar a Mi Viaje" siempre que la entidad sea elegible.
 *  - "Reservar" SÓLO con capacidad comercial real; jamás checkout simulado.
 */
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

import { PremiumHero } from "@/components/premium";
import { EditorialMediaFrame } from "@/components/omxds/EditorialMediaFrame";
import {
  PremiumSectionHead,
  PremiumCompactRow,
  type PremiumShowcaseItem,
} from "@/components/home-premium/shared/PremiumShowcase";
import { AddToCartButton } from "@/components/commerce/AddToCartButton";
import { AddToTravelPlanButton } from "@/components/traveler/AddToTravelPlanButton";
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

  const relatedItems: PremiumShowcaseItem[] = vm.related.map((item) => ({
    key: item.id,
    name: item.name,
    note: item.note,
    media: item.media,
    to: item.href,
    kicker: "Experiencia",
  }));

  return (
    <div className={cn("space-y-8", className)}>
      {vm.demoNotice ? (
        <p className="rounded-pill border border-dashed border-border bg-muted/50 px-4 py-2 text-xs text-muted-foreground">
          {vm.demoNotice}
        </p>
      ) : null}

      <PremiumHero
        vm={{
          presentation: vm.cover ? "cinematic" : "editorial",
          eyebrow: [vm.eyebrow, vm.destinationLabel].filter(Boolean).join(" · "),
          title: vm.name,
          description: vm.tagline ?? vm.description.slice(0, 220) ?? undefined,
          media: vm.cover ? { url: vm.cover.url, alt: vm.cover.alt } : null,
        }}
      />

      {/* Acciones — Mi Viaje y comercio real, nunca mezclados. */}
      <section
        aria-label="Acciones de la experiencia"
        className="rounded-2xl border border-border bg-card p-4 shadow-soft"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-primary">Operada por</p>
            {vm.operatorHref ? (
              <Link to={vm.operatorHref} className="font-display text-lg hover:underline">
                {vm.operatorName}
              </Link>
            ) : (
              <p className="font-display text-lg">{vm.operatorName}</p>
            )}
            {commerce.priceLabel ? (
              <p className="mt-1 text-sm text-muted-foreground">Desde {commerce.priceLabel}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
                className="inline-flex min-h-11 items-center rounded-pill border border-border bg-background px-5 text-sm font-semibold"
              >
                {commerce.contactLabel}
              </a>
            ) : null}
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{commerce.rationale}</p>
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

      {vm.facts.length > 0 ? (
        <section aria-labelledby="experiencia-datos">
          <PremiumSectionHead
            id="experiencia-datos"
            kicker="Lo esencial"
            title="Datos prácticos publicados"
          />
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {vm.facts.map((fact) => (
              <div key={fact.label} className="rounded-2xl border border-border bg-card p-4">
                <dt className="text-[11px] font-semibold uppercase text-muted-foreground">
                  {fact.label}
                </dt>
                <dd className="mt-1 font-display text-lg">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {vm.gallery.length > 0 ? (
        <section aria-labelledby="experiencia-galeria">
          <PremiumSectionHead id="experiencia-galeria" kicker="Galería" title="Cómo se ve" />
          <div className="flex snap-x gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible">
            {vm.gallery.slice(0, 6).map((media) => (
              <EditorialMediaFrame
                key={media.url}
                media={media}
                label={vm.name}
                className="h-48 w-[82%] shrink-0 snap-center rounded-2xl object-cover sm:w-full"
              />
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

      {relatedItems.length > 0 ? (
        <section aria-labelledby="experiencia-relacionadas">
          <PremiumSectionHead
            id="experiencia-relacionadas"
            kicker="Sigue explorando"
            title="Otras experiencias del operador"
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {relatedItems.map((item) => (
              <PremiumCompactRow key={item.key} item={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
