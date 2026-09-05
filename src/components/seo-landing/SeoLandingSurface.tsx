/**
 * LOTE 3I.2 · Superficie pública ÚNICA de la familia `premium-seo-landing`.
 *
 * Arquitectura reconocible de la maqueta autorizada, en este orden:
 *   1 · Hero dividido premium (editorial + fotografía protagonista)
 *   2 · Franja de confianza (hasta cuatro señales administrables)
 *   3 · Cuerpo editorial modular (por qué · experiencias · visita · territorio)
 *   4 · Cierre Alux compacto y secundario
 *
 * Reglas: identidad Premium (tokens del Design System colonial), territorio y
 * entidad por encima de Alux y Mi Viaje, cero selectores de presentación
 * visibles, cero contenido inventado (slot sin dato ⇒ región omitida) y cero
 * degradados gigantes sustituyendo fotografía ausente.
 */
import { Link } from "@tanstack/react-router";
import {
  Award,
  BadgeCheck,
  Clock,
  Heart,
  ImageOff,
  Info,
  Leaf,
  MapPin,
  Shield,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { AluxMark } from "@/components/alux/AluxMark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  SeoLandingFeatureItem,
  SeoLandingMedia,
  SeoLandingSurfaceVM,
  SeoLandingTrustItem,
} from "@/lib/experience-builder/seo-landing/seo-landing-surface-vm";

const SHELL = "mx-auto w-full max-w-[1216px] px-4 sm:px-6";

const TRUST_ICONS = {
  award: Award,
  badge: BadgeCheck,
  star: Star,
  pin: MapPin,
  info: Info,
} as const;

const FEATURE_ICONS = {
  sparkles: Sparkles,
  leaf: Leaf,
  clock: Clock,
  users: Users,
  shield: Shield,
  heart: Heart,
} as const;

function TrustIcon({ icon }: { icon: SeoLandingTrustItem["icon"] }) {
  const Icon = TRUST_ICONS[icon] ?? BadgeCheck;
  return <Icon className="size-4 shrink-0 text-primary" aria-hidden />;
}

function FeatureIcon({ icon }: { icon: SeoLandingFeatureItem["icon"] }) {
  const Icon = FEATURE_ICONS[icon] ?? Sparkles;
  return <Icon className="size-4 shrink-0 text-primary" aria-hidden />;
}

function focalStyle(media: SeoLandingMedia | null) {
  return media?.focal ? { objectPosition: media.focal } : undefined;
}

function ActionLink({
  href,
  children,
  variant = "default",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "default" | "outline";
}) {
  const external = /^https?:/i.test(href);
  const cls = cn("min-h-11 rounded-pill", variant === "outline" && "bg-background/80");
  if (external)
    return (
      <Button asChild variant={variant} className={cls}>
        <a href={href} rel="noopener noreferrer">
          {children}
        </a>
      </Button>
    );
  return (
    <Button asChild variant={variant} className={cls}>
      <Link to={href}>{children}</Link>
    </Button>
  );
}

/** Estado editorial compacto y honesto cuando no hay fotografía acreditada. */
function MissingMediaNote({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-xl border border-dashed border-border bg-surface px-3 py-2.5",
        className,
      )}
    >
      <ImageOff className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <p className="text-xs leading-snug text-muted-foreground">
        Fotografía pendiente de acreditación editorial.
      </p>
    </div>
  );
}

function ModuleCard({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft",
        className,
      )}
    >
      <h2 className="px-5 pt-5 font-serif text-xl leading-tight">{title}</h2>
      {children}
    </section>
  );
}

export function SeoLandingSurface({ vm }: { vm: SeoLandingSurfaceVM }) {
  const { hero, trust, intro, features, offers, info, territory, gallery, alux } = vm;

  return (
    <div className="pb-8">
      {/* ── 1 · Hero dividido premium ─────────────────────────────── */}
      <section className={cn(SHELL, "pt-4 sm:pt-6")} aria-label="Portada">
        <div
          className={cn(
            "grid overflow-hidden rounded-3xl border border-border bg-card shadow-elevated",
            hero.media && "lg:grid-cols-2",
          )}
        >
          {/* Móvil/tablet: imagen primero, altura controlada. */}
          {hero.media ? (
            <div className="order-1 min-w-0 lg:order-2">
              <img
                src={hero.media.url}
                alt={hero.media.alt}
                loading="eager"
                fetchPriority="high"
                style={focalStyle(hero.media)}
                className="h-52 w-full object-cover sm:h-72 lg:h-full lg:min-h-[26rem]"
              />
            </div>
          ) : null}

          <div className="order-2 flex min-w-0 flex-col justify-center gap-4 p-5 sm:p-8 lg:order-1 lg:p-10">
            {hero.eyebrow ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary sm:text-xs">
                {hero.eyebrow}
              </p>
            ) : null}
            <h1 className="text-balance font-serif text-[clamp(1.75rem,5vw,3rem)] leading-[1.05]">
              {hero.title}
            </h1>
            {hero.typeLine ? (
              <p className="-mt-2 text-sm font-medium text-muted-foreground">{hero.typeLine}</p>
            ) : null}
            {hero.promise ? (
              <p className="text-pretty font-serif text-lg leading-snug text-foreground sm:text-xl">
                {hero.promise}
              </p>
            ) : null}
            {hero.description ? (
              <p className="text-pretty text-[15px] leading-7 text-muted-foreground">
                {hero.description}
              </p>
            ) : null}
            {!hero.media ? <MissingMediaNote /> : null}
            {hero.primary || hero.secondaryLabel || hero.saveLabel ? (
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                {hero.primary ? (
                  <ActionLink href={hero.primary.href}>{hero.primary.label}</ActionLink>
                ) : null}
                {hero.secondaryLabel ? (
                  <span className="inline-flex min-h-11 items-center justify-center rounded-pill border border-border bg-surface px-5 text-sm font-medium text-foreground">
                    {hero.secondaryLabel}
                  </span>
                ) : null}
                {hero.saveLabel ? (
                  <span className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-pill border border-border px-4 text-sm font-medium text-muted-foreground">
                    <Heart className="size-4" aria-hidden />
                    {hero.saveLabel}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* ── 2 · Franja de confianza ───────────────────────────────── */}
      {trust.length > 0 ? (
        <section className={cn(SHELL, "mt-4 sm:mt-5")} aria-label="Señales de confianza">
          <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-4">
            {trust.map((item) => (
              <li
                key={item.id}
                className="flex min-w-[74%] snap-start items-start gap-2.5 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft sm:min-w-0"
              >
                <TrustIcon icon={item.icon} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold leading-tight text-foreground">
                    {item.value ? `${item.value} · ${item.label}` : item.label}
                  </span>
                  {item.detail ? (
                    <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                      {item.detail}
                    </span>
                  ) : null}
                  {item.status === "pending" ? (
                    <span className="mt-1 inline-block rounded-pill border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Por verificar
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── 3 · Cuerpo editorial modular ──────────────────────────── */}
      <div className={cn(SHELL, "mt-8 space-y-8 sm:mt-12 sm:space-y-10")}>
        {intro || features.length > 0 ? (
          <section aria-labelledby="landing-intro" className="grid gap-6 lg:grid-cols-12">
            <div className="min-w-0 lg:col-span-7">
              <h2
                id="landing-intro"
                className="font-serif text-[clamp(1.5rem,3.4vw,2.25rem)] leading-tight"
              >
                {intro?.heading ?? "Por qué es extraordinario"}
              </h2>
              {intro ? (
                <div className="mt-4 space-y-4 text-pretty text-[15px] leading-7 text-muted-foreground sm:text-base sm:leading-8">
                  {intro.blocks.map((block, i) =>
                    block.kind === "heading" ? (
                      <h3
                        key={i}
                        className="pt-2 font-serif text-lg leading-snug text-foreground sm:text-xl"
                      >
                        {block.text}
                      </h3>
                    ) : (
                      <p key={i}>{block.text}</p>
                    ),
                  )}
                </div>
              ) : null}
            </div>
            {features.length > 0 ? (
              <ul className="grid min-w-0 gap-3 sm:grid-cols-2 lg:col-span-5 lg:content-start">
                {features.map((f) => (
                  <li
                    key={f.id}
                    className="flex min-w-0 items-start gap-2.5 rounded-2xl border border-border bg-surface px-4 py-3"
                  >
                    <FeatureIcon icon={f.icon} />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold leading-snug text-foreground">
                        {f.label}
                      </span>
                      {f.detail ? (
                        <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                          {f.detail}
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

        {gallery.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {gallery.slice(0, 4).map((img, i) => (
              <figure
                key={img.url}
                className={cn(
                  "overflow-hidden rounded-2xl border border-border bg-surface",
                  gallery.length === 1 && "col-span-2 lg:col-span-2 lg:col-start-2",
                  i === 0 && gallery.length > 2 && "col-span-2",
                )}
              >
                <img
                  src={img.url}
                  alt={img.alt}
                  loading="lazy"
                  style={focalStyle(img)}
                  className="aspect-[16/10] size-full object-cover"
                />
              </figure>
            ))}
          </div>
        ) : null}

        {/* Rejilla modular: escritorio 4 columnas · iPad 2×2 · móvil vertical */}
        {offers || info || territory ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {offers ? (
              <ModuleCard title={offers.heading} className="md:col-span-2">
                <ul className="flex snap-x snap-mandatory gap-4 overflow-x-auto p-5 sm:grid sm:grid-cols-2 sm:overflow-visible">
                  {offers.items.slice(0, 4).map((item) => {
                    const body = (
                      <>
                        {item.media ? (
                          <img
                            src={item.media.url}
                            alt={item.media.alt}
                            loading="lazy"
                            style={focalStyle(item.media)}
                            className="aspect-[4/3] w-full object-cover"
                          />
                        ) : null}
                        <div className="p-3.5">
                          <h3 className="font-serif text-base leading-snug">{item.title}</h3>
                          {item.subtitle ? (
                            <p className="mt-1 line-clamp-3 text-sm leading-6 text-muted-foreground">
                              {item.subtitle}
                            </p>
                          ) : null}
                          {item.tags.length > 0 ? (
                            <ul className="mt-2 flex flex-wrap gap-1.5">
                              {item.tags.slice(0, 3).map((tag) => (
                                <li
                                  key={tag}
                                  className="rounded-pill border border-border px-2 py-0.5 text-[11px] text-muted-foreground"
                                >
                                  {tag}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          {!item.media ? <MissingMediaNote className="mt-3" /> : null}
                        </div>
                      </>
                    );
                    const card =
                      "block h-full overflow-hidden rounded-2xl border border-border bg-background shadow-soft transition-shadow hover:shadow-elevated";
                    return (
                      <li key={item.id} className="min-w-[78%] snap-start sm:min-w-0">
                        {item.href ? (
                          <Link to={item.href} className={card}>
                            {body}
                          </Link>
                        ) : (
                          <article className={card}>{body}</article>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </ModuleCard>
            ) : null}

            {info ? (
              <ModuleCard title={info.heading}>
                <dl className="space-y-3 p-5">
                  {info.items.map((item) => (
                    <div key={item.id} className="min-w-0">
                      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {item.label}
                      </dt>
                      <dd className="mt-0.5 break-words text-sm text-foreground">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </ModuleCard>
            ) : null}

            {territory ? (
              <ModuleCard title={territory.heading}>
                {territory.media ? (
                  <img
                    src={territory.media.url}
                    alt={territory.media.alt}
                    loading="lazy"
                    style={focalStyle(territory.media)}
                    className="mt-4 aspect-[16/9] w-full object-cover"
                  />
                ) : null}
                <div className="flex flex-1 flex-col gap-2 p-5">
                  {territory.destinationName ? (
                    <p className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                      <MapPin className="size-4 text-primary" aria-hidden />
                      {territory.destinationName}
                    </p>
                  ) : null}
                  {territory.address ? (
                    <p className="text-sm leading-6 text-muted-foreground">{territory.address}</p>
                  ) : null}
                  {territory.distanceLabel ? (
                    <p className="text-sm text-muted-foreground">{territory.distanceLabel}</p>
                  ) : null}
                  {territory.coordinates ? (
                    <p className="text-xs text-muted-foreground">{territory.coordinates}</p>
                  ) : null}
                  {territory.body ? (
                    <p className="text-sm leading-6 text-muted-foreground">{territory.body}</p>
                  ) : null}
                  {territory.href ? (
                    <div className="mt-auto pt-3">
                      <ActionLink href={territory.href} variant="outline">
                        Explorar el destino
                      </ActionLink>
                    </div>
                  ) : null}
                </div>
              </ModuleCard>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* ── 4 · Cierre Alux (banda secundaria, compacta) ──────────── */}
      {alux ? (
        <div className={cn(SHELL, "mt-8 sm:mt-12")}>
          <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex min-w-0 items-start gap-3">
              <AluxMark family="avatar" size={32} decorative className="mt-0.5 size-8 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{alux.heading}</p>
                {alux.body ? (
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{alux.body}</p>
                ) : null}
              </div>
            </div>
            <span className="inline-flex min-h-11 shrink-0 items-center rounded-pill border border-border bg-card px-4 text-xs font-medium text-foreground">
              {alux.ctaLabel}
            </span>
          </section>
        </div>
      ) : null}
    </div>
  );
}
