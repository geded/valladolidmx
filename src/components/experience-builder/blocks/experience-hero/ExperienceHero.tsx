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
import { type ReactNode } from "react";
import {
  BadgeCheck,
  Star,
  MapPin,
  Clock,
  Heart,
  MessageCircle,
  Calendar,
  Share2,
  ChevronRight,
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
  success: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
  warning: "bg-amber-500/15 text-amber-800 border-amber-500/30 dark:text-amber-200",
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
  const classes = cn(
    "inline-flex items-center justify-center gap-1.5 rounded-pill px-5 py-2.5 text-sm font-semibold transition min-h-11",
    "focus-visible:outline-none focus-visible:ring-focus",
    primary
      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft"
      : onDark
        ? "bg-white/15 text-white ring-1 ring-white/40 hover:bg-white/25 backdrop-blur-sm"
        : "bg-background text-foreground ring-1 ring-border hover:bg-muted",
  );
  const content = (
    <>
      {cta.label}
      {primary ? <ChevronRight className="h-4 w-4" aria-hidden="true" /> : null}
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
  className,
}: ExperienceHeroProps) {
  const Heading = headingLevel;
  const hasMedia = Boolean(dto.media);
  const useImmersive = dto.variant === "immersive" && hasMedia;
  const useCompact = dto.variant === "compact" && hasMedia;
  const onDark = useImmersive;

  const textStack = (
    <div className={cn("flex max-w-3xl flex-col gap-4", onDark ? "text-white" : "text-foreground")}>
      {dto.eyebrow ? (
        <p
          className={cn(
            "text-xs font-semibold uppercase tracking-[0.14em]",
            onDark ? "text-white/85" : "text-primary",
          )}
        >
          {dto.eyebrow}
        </p>
      ) : null}
      <Heading
        className={cn(
          "text-balance text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl",
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
      {dto.ctaPrimary || dto.ctaSecondary ? (
        <div className="mt-2 flex flex-wrap gap-3">
          {dto.ctaPrimary ? (
            <CtaButton cta={dto.ctaPrimary} primary onDark={onDark} onAction={onCtaAction} />
          ) : null}
          {dto.ctaSecondary ? (
            <CtaButton cta={dto.ctaSecondary} primary={false} onDark={onDark} onAction={onCtaAction} />
          ) : null}
        </div>
      ) : null}
      {extensionsSlot}
    </div>
  );

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
        <div className="relative flex min-h-[380px] items-end p-6 sm:min-h-[440px] sm:p-10 md:min-h-[520px] md:p-14">
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