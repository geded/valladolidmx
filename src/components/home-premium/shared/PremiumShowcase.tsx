/**
 * Piezas premium compartidas — EXTRAÍDAS del Home Premium aprobado.
 *
 * Autoridad visual: `HomePremiumSurface`. Este módulo no introduce diseño
 * nuevo: mueve el hero editorial, el encabezado de sección, la barra de Alux
 * y el bloque de Destinos/Experiencias tal cual están aprobados, para que el
 * Home y el Atlas de Destinos consuman EXACTAMENTE el mismo markup, las
 * mismas proporciones y los mismos tokens. Prohibido reinterpretarlo.
 */
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EditorialMediaFrame, type EditorialMedia } from "@/components/omxds/EditorialMediaFrame";
import { useBrand } from "@/lib/brand/brand-context";
import { PARTY_OPTIONS, type PartyComposition } from "@/lib/traveler/party-composition";

/* ------------------------------------------------------------------ *
 * Encabezado de sección
 * ------------------------------------------------------------------ */

export function PremiumSectionHead({
  kicker,
  title,
  description,
  action,
  id,
}: {
  kicker: string;
  title: string;
  description?: string;
  action?: string;
  id?: string;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase text-primary">{kicker}</p>
        <h2 id={id} className="mt-1.5 text-balance font-display text-2xl sm:text-3xl lg:text-4xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-relaxed text-muted-foreground lg:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {action ? (
        <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
          {action}
          <ChevronRight className="size-4" aria-hidden />
        </span>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Hero editorial (misma altura y composición del Home)
 * ------------------------------------------------------------------ */

export function PremiumEditorialHero({
  eyebrow,
  title,
  subtitle,
  media,
  caption,
  searchSlot,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  media?: EditorialMedia | null;
  caption?: string;
  searchSlot?: ReactNode;
}) {
  const brand = useBrand();
  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
      <div className="grid lg:grid-cols-[minmax(0,43%)_minmax(0,57%)]">
        <div className="flex flex-col justify-center bg-card p-5 sm:p-7 lg:p-10">
          <p className="text-xs font-semibold uppercase text-primary">{eyebrow}</p>
          <h1 className="mt-2.5 text-balance font-display text-3xl leading-[1.02] sm:text-4xl lg:text-[3.35rem]">
            {title}
          </h1>
          <p className="mt-3 line-clamp-3 max-w-xl text-sm leading-5 text-muted-foreground lg:mt-4 lg:text-[0.95rem] lg:leading-6">
            {subtitle}
          </p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-selva">
            {brand.discoveryPromise}
          </p>
          {searchSlot ? <div className="mt-5">{searchSlot}</div> : null}
        </div>
        <figure className="relative min-h-[16rem] overflow-hidden sm:min-h-[20rem] lg:min-h-[32rem]">
          <EditorialMediaFrame
            media={media}
            label={title}
            loading="eager"
            className="absolute inset-0 size-full object-cover"
          />
          {caption ? (
            <figcaption className="absolute bottom-4 left-4 rounded-md bg-foreground/85 px-3 py-2 text-xs text-background">
              {caption}
            </figcaption>
          ) : null}
        </figure>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Barra de Alux (concierge oficial, un solo personaje)
 * ------------------------------------------------------------------ */

export function PremiumAluxBar({
  question,
  selectedParty,
  onSelectParty,
  onContinue,
  continueLabel,
}: {
  question: string;
  selectedParty: PartyComposition | null;
  onSelectParty: (value: PartyComposition) => void;
  onContinue: () => void;
  continueLabel?: string;
}) {
  const brand = useBrand();
  const resolvedContinueLabel = continueLabel ?? `Continuar con ${brand.conciergeName}`;
  return (

    <section
      aria-labelledby="alux-title"
      className="overflow-hidden rounded-2xl bg-selva text-selva-foreground shadow-soft"
    >
      <div className="grid min-w-0 items-center gap-3 px-4 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-4">
        <div className="flex min-w-0 items-center gap-2 sm:border-r sm:border-white/20 sm:pr-4">
          <img
            src="/brand/alux/master/alux-ia-avatar-master-transparent.png"
            alt={brand.conciergeName}
            className="size-12 shrink-0 object-contain lg:size-16"
          />
          <div className="min-w-0">
            <h2 id="alux-title" className="truncate font-display text-lg lg:text-xl">
              {brand.conciergeName}
            </h2>
            <p className="text-xs text-white/70">Tu concierge IA</p>
          </div>
        </div>
        <div className="min-w-0">
          <p className="font-display text-base leading-snug lg:text-xl">{question}</p>
          <div
            className="mt-2 flex snap-x gap-2 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible"
            role="group"
            aria-label="Composición del viaje"
          >
            {PARTY_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={selectedParty === option.value ? "default" : "secondary"}
                onClick={() => onSelectParty(option.value)}
                className="min-h-11 shrink-0 snap-start rounded-pill"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
        <Button
          type="button"
          onClick={onContinue}
          className="size-11 shrink-0 self-center rounded-full p-0"
          aria-label={resolvedContinueLabel}
        >
          <ChevronRight className="size-5" />
        </Button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Bloque Destinos / Experiencias (tarjeta protagonista + 3 compactas)
 * ------------------------------------------------------------------ */

export interface PremiumShowcaseItem {
  key: string;
  name: string;
  note: string;
  media?: EditorialMedia | null;
  /** Destino de navegación TanStack (`to` + `params` opcionales). */
  to: string;
  params?: Record<string, string>;
  /** Rótulo del kicker en las tarjetas secundarias. Por defecto "Destino". */
  kicker?: string;
  /** Metadato corto opcional (p. ej. distancia administrada). */
  meta?: string | null;
}

export function PremiumShowcaseGrid({
  items,
  featuredKicker = "Punto de partida",
  detailLabel = "Ver destino",
  onOpen,
}: {
  items: readonly PremiumShowcaseItem[];
  featuredKicker?: string;
  detailLabel?: string;
  onOpen?: (key: string) => void;
}) {
  const featured = items[0];
  if (!featured) return null;
  const companions = items.slice(1, 4);
  return (
    <>
      <div className="flex snap-x gap-3 overflow-x-auto pb-2 lg:hidden">
        {items.slice(0, 4).map((item, index) => (
          <Link
            key={item.key}
            to={item.to}
            params={item.params as never}
            onClick={() => onOpen?.(item.key)}
            className="group relative h-[15rem] w-[82%] shrink-0 snap-center overflow-hidden rounded-2xl bg-[#071814] text-white shadow-soft sm:w-[46%]"
          >
            {/* Tarjeta con título superpuesto: el marcador neutral F1L no
                repite el nombre para evitar el doble rótulo sin fotografía. */}
            <EditorialMediaFrame
              media={item.media}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 z-10 p-4">
              <p className="text-[10px] font-semibold uppercase text-primary">
                {index === 0 ? featuredKicker : (item.kicker ?? "Destino")}
              </p>
              <h3 className="mt-1 font-display text-2xl">{item.name}</h3>
              <p className="mt-1 line-clamp-1 text-xs text-white/75">{item.note}</p>
            </div>
          </Link>
        ))}
      </div>
      <div className="hidden gap-4 lg:grid lg:h-[30rem] lg:grid-cols-[1.2fr_1fr]">
        <article className="group relative min-h-0 overflow-hidden rounded-2xl bg-[#071814] text-white shadow-elevated">
          <EditorialMediaFrame
            media={featured.media}
            label={featured.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"
            aria-hidden
          />
          <div className="absolute inset-x-0 bottom-0 z-10 p-5">
            <h3 className="font-display text-3xl">{featured.name}</h3>
            <p className="mt-2 text-sm text-white/80">{featured.note}</p>
            <Link
              to={featured.to}
              params={featured.params as never}
              onClick={() => onOpen?.(featured.key)}
              className="mt-3 inline-flex text-sm font-semibold"
            >
              {detailLabel} <ChevronRight className="size-4" />
            </Link>
          </div>
        </article>
        <div className="grid grid-rows-3 gap-3">
          {companions.map((item) => (
            <Link
              key={item.key}
              to={item.to}
              params={item.params as never}
              onClick={() => onOpen?.(item.key)}
              className="grid min-h-0 grid-cols-[42%_1fr] overflow-hidden rounded-2xl border border-border bg-card"
            >
              <EditorialMediaFrame
                media={item.media}
                label={item.name}
                className="h-full w-full object-cover"
              />
              <div className="flex min-w-0 flex-col justify-center p-4">
                <p className="text-[10px] font-semibold uppercase text-primary">
                  {item.kicker ?? "Destino"}
                </p>
                <h3 className="mt-1 font-display text-xl">{item.name}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.note}</p>
                <span className="mt-2 inline-flex items-center text-xs font-semibold">
                  {detailLabel} <ChevronRight className="size-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

/**
 * Tarjeta horizontal compacta del Home (fila imagen + texto), reutilizada por
 * el Atlas en móvil y en el explorador territorial.
 */
export function PremiumCompactRow({
  item,
  active = false,
  onFocus,
  className,
}: {
  item: PremiumShowcaseItem;
  active?: boolean;
  onFocus?: () => void;
  className?: string;
}) {
  return (
    <Link
      to={item.to}
      params={item.params as never}
      onMouseEnter={onFocus}
      onFocus={onFocus}
      onClick={onFocus}
      className={[
        "grid h-full min-h-36 grid-cols-[7rem_1fr] overflow-hidden rounded-2xl border bg-card sm:grid-cols-[10rem_1fr] lg:min-h-0",
        active ? "border-primary shadow-elevated" : "border-border",
        className ?? "",
      ].join(" ")}
    >
      <EditorialMediaFrame
        media={item.media}
        label={item.name}
        className="h-full w-full object-cover"
      />
      <div className="flex min-w-0 flex-col justify-center p-4">
        <p className="text-[10px] font-semibold uppercase text-primary">
          {item.kicker ?? "Destino"}
        </p>
        <h3 className="mt-1 font-display text-xl">{item.name}</h3>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {item.note}
        </p>
        {item.meta ? <p className="mt-1 text-xs text-muted-foreground">{item.meta}</p> : null}
        <span className="mt-2 inline-flex items-center text-xs font-semibold">
          Descubrir <ChevronRight className="size-3" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
