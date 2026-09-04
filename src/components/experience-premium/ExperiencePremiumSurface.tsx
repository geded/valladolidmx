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
        {commerce.saleGapNotice ? (
          <p className="mt-3 rounded-2xl border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            {commerce.saleGapNotice}
          </p>
        ) : null}
        {vm.rating ? (
          <p className="mt-3 text-sm">
            <span className="font-semibold">{vm.rating.value.toFixed(1)}</span>{" "}
            <span className="text-muted-foreground">
              · {vm.rating.count} {vm.rating.count === 1 ? "reseña" : "reseñas"} publicadas
            </span>
          </p>
        ) : null}
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


      {vm.includes.length > 0 || vm.excludes.length > 0 ? (
        <section aria-labelledby="experiencia-incluye">
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
        <section aria-labelledby="experiencia-ubicacion">
          <PremiumSectionHead id="experiencia-ubicacion" kicker="Dónde" title="Ubicación y encuentro" />
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="font-display text-lg">{vm.location.label}</p>
            {vm.location.address ? (
              <p className="mt-1 text-sm text-muted-foreground">{vm.location.address}</p>
            ) : null}
            {vm.location.latitude != null && vm.location.longitude != null ? (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${vm.location.latitude},${vm.location.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex min-h-11 items-center rounded-pill border border-border px-4 text-sm font-semibold"
              >
                Cómo llegar
              </a>
            ) : null}
          </div>
        </section>
      ) : null}

      {vm.policies.length > 0 ? (
        <section aria-labelledby="experiencia-politicas">
          <PremiumSectionHead id="experiencia-politicas" kicker="Reglas" title="Políticas publicadas" />
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

      {relatedItems.length > 0 ? (
        <section aria-labelledby="experiencia-relacionadas">
          <PremiumSectionHead
            id="experiencia-relacionadas"
            kicker="Sigue explorando"
            title="Experiencias cercanas"
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
