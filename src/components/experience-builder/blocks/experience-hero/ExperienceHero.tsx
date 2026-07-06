/**
 * H-03 · Ola I1.a — `vmx.experience.hero` (Capa 1: Presentación).
 *
 * Componente presentacional puro. NO hace fetching, NO lee router,
 * NO conoce Context Engine. Todo entra por props tipadas (DTO).
 *
 * Reutilizable en cualquier plantilla: business, product, event,
 * destination, region, landing. Variantes declarativas:
 *   - `immersive`  → media full-bleed con overlay y textos sobre fondo.
 *   - `compact`    → media a la izquierda, contenido a la derecha (md+).
 *   - `editorial`  → sin media dominante, tipografía protagonista.
 *
 * Accesibilidad: heading semántico h1 / h2 configurable, contraste AA,
 * botones ≥ 44px, focus visible.
 */
import { type ReactNode, useEffect, useState } from "react";
import {
  BadgeCheck,
  Star,
  MapPin,
  Clock,
  Heart,
  MessageCircle,
  Calendar,
  Share2,
  Search,
  Compass,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ExperienceHeroBadge,
  ExperienceHeroCta,
  ExperienceHeroDTO,
  ExperienceHeroMeta,
} from "@/lib/experience-builder/blocks/experience-hero/contract";

/* ------------------------------------------------------------------ *
 * Iconografía Lucide oficial. Set restringido — evolucionable sin
 * romper contrato: nuevas claves se añaden aquí, no en el schema.
 * ------------------------------------------------------------------ */
const ICONS: Record<string, LucideIcon> = {
  "badge-check": BadgeCheck,
  star: Star,
  "map-pin": MapPin,
  clock: Clock,
  heart: Heart,
  "message-circle": MessageCircle,
  calendar: Calendar,
  share: Share2,
  search: Search,
  compass: Compass,
  "arrow-right": ArrowRight,
};

function Icon({ name, className }: { name?: string; className?: string }) {
  if (!name) return null;
  const I = ICONS[name];
  if (!I) return null;
  return <I className={className} aria-hidden="true" />;
}

/* ------------------------------------------------------------------ *
 * Tokens de estilo por tono (badges).
 * ------------------------------------------------------------------ */
const BADGE_TONE_CLASSES: Record<ExperienceHeroBadge["tone"], string> = {
  neutral: "bg-background/85 text-foreground border-border/60",
  primary: "bg-primary/15 text-primary border-primary/30",
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/15 text-warning border-warning/30",
};

/* ------------------------------------------------------------------ *
 * Sub-componentes internos.
 * ------------------------------------------------------------------ */

function BadgeRow({ badges, onDark }: { badges: ExperienceHeroBadge[]; onDark: boolean }) {
  if (!badges.length) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {badges.map((b, i) => (
        <li
          key={`${b.label}-${i}`}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-xs font-medium backdrop-blur-sm",
            onDark ? "bg-white/90 text-foreground border-white/40" : BADGE_TONE_CLASSES[b.tone],
          )}
        >
          <Icon name={b.iconKey} className="h-3.5 w-3.5" />
          {b.label}
        </li>
      ))}
    </ul>
  );
}

function MetaRow({ items, onDark }: { items: ExperienceHeroMeta[]; onDark: boolean }) {
  if (!items.length) return null;
  return (
    <ul
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm",
        onDark ? "text-white/90" : "text-muted-foreground",
      )}
    >
      {items.map((m, i) => (
        <li key={`${m.label}-${i}`} className="inline-flex items-center gap-1.5">
          <Icon name={m.iconKey} className="h-4 w-4" />
          {m.label}
        </li>
      ))}
    </ul>
  );
}

function CtaButton({
  cta,
  primary,
  onDark,
  onAction,
}: {
  cta: ExperienceHeroCta;
  primary: boolean;
  onDark: boolean;
  onAction?: (cta: ExperienceHeroCta) => void;
}) {
  const emphasis = cta.emphasis ?? (primary ? "primary" : "secondary");
  const classes = cn(
    "inline-flex items-center justify-center gap-1.5 rounded-pill px-5 py-2.5 text-sm font-semibold transition min-h-11",
    "focus-visible:outline-none focus-visible:ring-focus",
    emphasis === "primary"
      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft"
      : emphasis === "ghost"
        ? onDark
          ? "text-white hover:bg-white/10"
          : "text-foreground hover:bg-muted"
        : onDark
          ? "bg-white/15 text-white ring-1 ring-white/40 hover:bg-white/25 backdrop-blur-sm"
          : "bg-background text-foreground ring-1 ring-border hover:bg-muted",
  );
  const content = (
    <>
      <Icon name={cta.iconKey} className="h-4 w-4" />
      {cta.label}
      {emphasis === "primary" && !cta.iconKey ? (
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      ) : null}
    </>
  );
  if (onAction) {
    return (
      <button type="button" className={classes} onClick={() => onAction(cta)}>
        {content}
      </button>
    );
  }
  if (cta.href) {
    return (
      <a className={classes} href={cta.href}>
        {content}
      </a>
    );
  }
  return (
    <button type="button" className={classes} disabled>
      {content}
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Props públicos.
 * ------------------------------------------------------------------ */
export interface ExperienceHeroProps {
  dto: ExperienceHeroDTO;
  /** Semántica del heading. Por defecto h1 (una sola instancia por página). */
  headingLevel?: "h1" | "h2";
  /** Handler opcional para CTAs con `action` semántica (Protected Actions). */
  onCtaAction?: (cta: ExperienceHeroCta) => void;
  /** Slot inferior para extensiones (booking widget, contador live, etc.). */
  extensionsSlot?: ReactNode;
  /**
   * v1.2.0 — Acciones que se superponen a la galería (variante `gallery`).
   * Típicamente favorito + compartir. Se ignoran en otras variantes.
   */
  headerActionsSlot?: ReactNode;
  /** v1.2.0 — Sobrescribe el back de la variante `gallery`. */
  onBack?: () => void;
  className?: string;
}

/* ------------------------------------------------------------------ *
 * Componente raíz.
 * ------------------------------------------------------------------ */
export function ExperienceHero({
  dto,
  headingLevel = "h1",
  onCtaAction,
  extensionsSlot,
  headerActionsSlot,
  onBack,
  className,
}: ExperienceHeroProps) {
  const Heading = headingLevel;
  const hasMedia = Boolean(dto.media);
  const hasSlides = (dto.mediaSlides?.length ?? 0) > 0;
  const useCinematic = dto.variant === "cinematic" && (hasSlides || hasMedia);
  const useImmersive = dto.variant === "immersive" && hasMedia;
  const useCompact = dto.variant === "compact" && hasMedia;
  const useGallery = dto.variant === "gallery" && (hasSlides || hasMedia);
  const onDark = useImmersive || useCinematic;

  const alignment = dto.alignment ?? "left";
  const alignTextCls =
    alignment === "center" ? "text-center" : alignment === "right" ? "text-right" : "text-left";
  const alignSelfCls =
    alignment === "center" ? "items-center" : alignment === "right" ? "items-end" : "items-start";
  const alignCtaCls =
    alignment === "center"
      ? "justify-center"
      : alignment === "right"
        ? "justify-end"
        : "justify-start";

  // v1.1.0 — `ctas[]` sobrescribe cuando viene poblado.
  const ctas: ExperienceHeroCta[] =
    dto.ctas && dto.ctas.length > 0
      ? dto.ctas
      : [dto.ctaPrimary, dto.ctaSecondary].filter(
          (c): c is ExperienceHeroCta => Boolean(c),
        );

  const textStack = (
    <div
      className={cn(
        "flex max-w-3xl flex-col gap-4",
        alignSelfCls,
        alignTextCls,
        onDark ? "text-white" : "text-foreground",
      )}
    >
      {dto.eyebrow ? (
        dto.eyebrowStyle === "script" ? (
          <p
            className={cn(
              "font-script text-[1.625rem] leading-tight drop-shadow-sm sm:text-3xl md:text-[2.5rem]",
              onDark ? "text-white/95" : "text-primary",
            )}
          >
            {dto.eyebrow}
          </p>
        ) : (
          <p
            className={cn(
              "text-xs font-semibold uppercase tracking-[0.14em]",
              onDark ? "text-white/85" : "text-primary",
            )}
          >
            {dto.eyebrow}
          </p>
        )
      ) : null}
      <Heading
        className={cn(
          "text-balance font-serif text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl",
          onDark ? "text-white" : "text-foreground",
        )}
      >
        {dto.title}
      </Heading>
      {dto.description ? (
        <p className={cn("text-pretty text-base sm:text-lg", onDark ? "text-white/90" : "text-muted-foreground")}>
          {dto.description}
        </p>
      ) : null}
      {dto.badges.length ? <BadgeRow badges={dto.badges} onDark={onDark} /> : null}
      {dto.meta.length ? <MetaRow items={dto.meta} onDark={onDark} /> : null}
      {ctas.length > 0 ? (
        <div className={cn("mt-2 flex flex-wrap gap-3", alignCtaCls)}>
          {ctas.map((cta, i) => (
            <CtaButton
              key={`${cta.label}-${i}`}
              cta={cta}
              primary={i === 0}
              onDark={onDark}
              onAction={onCtaAction}
            />
          ))}
        </div>
      ) : null}
      {extensionsSlot}
    </div>
  );

  if (useCinematic) {
    return (
      <CinematicHero
        dto={dto}
        className={className}
        textStack={textStack}
      />
    );
  }

  if (useGallery) {
    return (
      <GalleryHero
        dto={dto}
        className={className}
        textStack={textStack}
        headerActionsSlot={headerActionsSlot}
        onBack={onBack}
      />
    );
  }

  if (useImmersive) {
    return (
      <section
        className={cn(
          "relative isolate overflow-hidden rounded-3xl",
          "min-h-[380px] sm:min-h-[440px] md:min-h-[520px]",
          className,
        )}
      >
        <img
          src={dto.media!.url}
          alt={dto.media!.alt}
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/10"
          style={{ opacity: dto.media!.overlay }}
        />
        <div
          className={cn(
            "relative flex min-h-[380px] items-end p-6 sm:min-h-[440px] sm:p-10 md:min-h-[520px] md:p-14",
            alignment === "center" && "justify-center",
            alignment === "right" && "justify-end",
          )}
        >
          {textStack}
        </div>
      </section>
    );
  }

  if (useCompact) {
    return (
      <section
        className={cn(
          "grid gap-6 overflow-hidden rounded-3xl border border-border bg-card md:grid-cols-2",
          className,
        )}
      >
        <div className="relative aspect-[4/3] md:aspect-auto">
          <img
            src={dto.media!.url}
            alt={dto.media!.alt}
            className="h-full w-full object-cover"
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
        </div>
        <div className="flex items-center p-6 sm:p-10">{textStack}</div>
      </section>
    );
  }

  // editorial (o immersive/compact sin media) → sin fondo, tipografía primera.
  return (
    <section className={cn("rounded-3xl border border-border bg-card p-6 sm:p-10", className)}>
      {textStack}
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Cinematic — v1.1.0. Full-viewport, carrusel opcional, overlap header.
 * ------------------------------------------------------------------ */
function CinematicHero({
  dto,
  className,
  textStack,
}: {
  dto: ExperienceHeroDTO;
  className?: string;
  textStack: ReactNode;
}) {
  const slides =
    dto.mediaSlides && dto.mediaSlides.length > 0
      ? dto.mediaSlides
      : dto.media
        ? [{ url: dto.media.url, alt: dto.media.alt }]
        : [];
  const overlay = dto.media?.overlay ?? 0.55;
  const intervalMs = dto.slideIntervalMs ?? 7000;
  const autoplay = dto.autoplaySlides !== false;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!autoplay || slides.length < 2 || typeof window === "undefined") return;
    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % slides.length),
      Math.max(2000, intervalMs),
    );
    return () => window.clearInterval(id);
  }, [autoplay, slides.length, intervalMs]);

  return (
    <section
      className={cn(
        "@container relative isolate overflow-hidden text-white",
        className,
      )}
      style={dto.overlapHeader ? { marginTop: "-4rem" } : undefined}
    >
      <div aria-hidden className="absolute inset-0 -z-20 h-full w-full overflow-hidden bg-foreground">
        {slides.map((s, i) => (
          <img
            key={`${s.url}-${i}`}
            src={s.url}
            alt={s.alt}
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-[2000ms] ease-in-out",
              slides.length === 1 || i === index % slides.length ? "opacity-100" : "opacity-0",
            )}
            style={{ objectPosition: s.focalPoint ?? "center" }}
            loading={i === 0 ? "eager" : "lazy"}
            fetchPriority={i === 0 ? "high" : "auto"}
            decoding="async"
          />
        ))}
      </div>
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(0,0,0,0.62)_0%,rgba(0,0,0,0.30)_42%,rgba(0,0,0,0.50)_75%,rgba(0,0,0,0.80)_100%)]"
        style={{ opacity: overlay < 0.3 ? 0.6 : Math.min(1, overlay + 0.2) }}
      />
      <div className="relative mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-center gap-4 px-6 pb-10 pt-20 @3xl:min-h-[100dvh] @3xl:justify-end @3xl:gap-0 @3xl:pb-28 @3xl:pt-40">
        {textStack}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Gallery — v1.2.0. Airbnb-style: carrusel horizontal snap con
 * contador, back/share/favorite overlay y bloque de información
 * (título, meta, badges) inmediatamente debajo.
 * ------------------------------------------------------------------ */
function GalleryHero({
  dto,
  className,
  textStack,
  headerActionsSlot,
  onBack,
}: {
  dto: ExperienceHeroDTO;
  className?: string;
  textStack: ReactNode;
  headerActionsSlot?: ReactNode;
  onBack?: () => void;
}) {
  const slides =
    dto.mediaSlides && dto.mediaSlides.length > 0
      ? dto.mediaSlides
      : dto.media
        ? [{ url: dto.media.url, alt: dto.media.alt }]
        : [];
  const [index, setIndex] = useState(0);
  const total = slides.length;

  function handleBack() {
    if (onBack) return onBack();
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    }
  }

  function onScroll(e: React.UIEvent<HTMLUListElement>) {
    const el = e.currentTarget;
    const w = el.clientWidth || 1;
    const i = Math.round(el.scrollLeft / w);
    if (i !== index) setIndex(i);
  }

  function goTo(i: number) {
    const list = document.getElementById(`hero-gallery-${dto.title}`);
    if (!list) return;
    const w = list.clientWidth;
    list.scrollTo({ left: w * i, behavior: "smooth" });
  }

  return (
    <section className={cn("flex flex-col gap-5 sm:gap-6", className)}>
      <div className="relative isolate mx-3 overflow-hidden rounded-2xl shadow-soft sm:mx-0 sm:rounded-3xl">
        {total > 0 ? (
          <ul
            id={`hero-gallery-${dto.title}`}
            onScroll={onScroll}
            className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label={`Galería de ${dto.title}`}
          >
            {slides.map((s, i) => (
              <li
                key={`${s.url}-${i}`}
                className="relative w-full flex-shrink-0 snap-center"
                style={{ aspectRatio: "4 / 3" }}
              >
                <img
                  src={s.url}
                  alt={s.alt || `${dto.title} — foto ${i + 1}`}
                  className="h-full w-full object-cover"
                  style={{ objectPosition: s.focalPoint ?? "center" }}
                  loading={i === 0 ? "eager" : "lazy"}
                  fetchPriority={i === 0 ? "high" : "auto"}
                  decoding="async"
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className="aspect-[4/3] w-full bg-muted" />
        )}

        {/* Overlay top bar: back + actions */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3 sm:p-4">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Volver"
            className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-background/90 text-foreground shadow-soft backdrop-blur-sm transition hover:bg-background focus-visible:outline-none focus-visible:ring-focus"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          {headerActionsSlot ? (
            <div className="pointer-events-auto flex items-center gap-2">
              {headerActionsSlot}
            </div>
          ) : null}
        </div>

        {/* Counter */}
        {total > 1 ? (
          <div className="pointer-events-none absolute bottom-3 right-3 rounded-pill bg-black/65 px-2.5 py-1 text-xs font-medium text-white sm:bottom-4 sm:right-4">
            {index + 1} / {total}
          </div>
        ) : null}

        {/* Prev/Next chevrons on wider screens */}
        {total > 1 ? (
          <>
            <button
              type="button"
              aria-label="Foto anterior"
              onClick={() => goTo(Math.max(0, index - 1))}
              className="pointer-events-auto absolute left-3 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-background/85 p-2 text-foreground shadow-soft backdrop-blur-sm hover:bg-background sm:inline-flex"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Foto siguiente"
              onClick={() => goTo(Math.min(total - 1, index + 1))}
              className="pointer-events-auto absolute right-3 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-background/85 p-2 text-foreground shadow-soft backdrop-blur-sm hover:bg-background sm:inline-flex"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>

      <div className="px-5 sm:px-6">
        <div className="mx-auto max-w-3xl">{textStack}</div>
      </div>
    </section>
  );
}