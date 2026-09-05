/**
 * LOTE 3I.3 · Superficie pública ÚNICA de la familia `premium-seo-landing`.
 *
 * Geometría de la maqueta autorizada (Zazil Tunich), en este orden:
 *   1 · Hero dividido premium 42 / 58 (editorial + fotografía protagonista)
 *   2 · Franja horizontal de confianza (4 señales, divisores finos)
 *   3 · Composición editorial horizontal de 4 áreas simultáneas
 *       (22% · 31% · 20% · 22%) con alineación superior común
 *   4 · Banda Alux baja y horizontal con mascota oficial
 *
 * Reglas: identidad Premium (tokens del Design System colonial), territorio y
 * entidad por encima de Alux y Mi Viaje, cero selectores de presentación
 * visibles, cero contenido inventado (slot sin dato ⇒ región omitida) y cero
 * degradados gigantes sustituyendo fotografía ausente.
 */
import { Link } from "@tanstack/react-router";
import {
  Accessibility,
  ArrowRight,
  Award,
  BackpackIcon,
  BadgeCheck,
  CalendarDays,
  Clock,
  Heart,
  ImageOff,
  Info,
  Leaf,
  MapPin,
  Plus,
  Shield,
  Sparkles,
  Star,
  Ticket,
  Users,
} from "lucide-react";
import { AluxMark } from "@/components/alux/AluxMark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  SeoLandingFeatureItem,
  SeoLandingInfoItem,
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

const INFO_ICONS = {
  clock: Clock,
  calendar: CalendarDays,
  backpack: BackpackIcon,
  accessibility: Accessibility,
  leaf: Leaf,
  ticket: Ticket,
  info: Info,
} as const;

function TrustIcon({ icon }: { icon: SeoLandingTrustItem["icon"] }) {
  const Icon = TRUST_ICONS[icon] ?? BadgeCheck;
  return <Icon className="size-5 shrink-0 text-primary" aria-hidden />;
}

function FeatureIcon({ icon }: { icon: SeoLandingFeatureItem["icon"] }) {
  const Icon = FEATURE_ICONS[icon] ?? Sparkles;
  return <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />;
}

function InfoIcon({ icon }: { icon: SeoLandingInfoItem["icon"] }) {
  const Icon = INFO_ICONS[icon] ?? Info;
  return <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />;
}

function focalStyle(media: SeoLandingMedia | null) {
  return media?.focal ? { objectPosition: media.focal } : undefined;
}

function ActionLink({
  href,
  children,
  variant = "default",
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "default" | "outline";
  className?: string;
}) {
  const external = /^https?:/i.test(href);
  const cls = cn("min-h-11 rounded-pill", variant === "outline" && "bg-background/80", className);
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

/** Encabezado común de las cuatro áreas editoriales (alineación superior). */
function ColumnHeading({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h2 id={id} className="font-serif text-[clamp(1.25rem,1.7vw,1.6rem)] leading-tight">
      {children}
    </h2>
  );
}

export function SeoLandingSurface({ vm }: { vm: SeoLandingSurfaceVM }) {
  const { hero, trust, intro, features, offers, info, territory, gallery, alux, sections } = vm;
  const featured = offers?.items[0] ?? null;
  const restOffers = offers?.items.slice(1) ?? [];

  return (
    <div className="pb-8">
      {/* ── 1 · Hero dividido premium (42 / 58) ───────────────────── */}
      <section className={cn(SHELL, "pt-3 sm:pt-4")} aria-label="Portada">
        <div
          className={cn(
            "grid overflow-hidden rounded-3xl border border-border bg-card shadow-elevated",
            hero.media && "lg:grid-cols-[42fr_58fr]",
          )}
        >
          {hero.media ? (
            <div className="relative order-1 min-w-0 lg:order-2">
              <img
                src={hero.media.url}
                alt={hero.media.alt}
                loading="eager"
                fetchPriority="high"
                style={focalStyle(hero.media)}
                className="h-56 w-full object-cover sm:h-72 lg:h-full lg:min-h-[24rem]"
              />
              {hero.saveLabel ? (
                <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-pill bg-background/85 px-3 py-1.5 text-xs font-medium text-foreground shadow-soft backdrop-blur">
                  <Heart className="size-3.5" aria-hidden />
                  {hero.saveLabel}
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="order-2 flex min-w-0 flex-col justify-center gap-2.5 p-5 sm:p-7 lg:order-1 lg:p-9">
            {hero.eyebrow ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                {hero.eyebrow}
              </p>
            ) : null}
            <h1 className="text-balance font-serif text-[clamp(1.9rem,3.6vw,3.2rem)] leading-[1.02]">
              {hero.title}
            </h1>
            {hero.typeLine ? (
              <p className="font-serif text-lg leading-snug text-foreground/70 sm:text-xl">
                {hero.typeLine}
              </p>
            ) : null}
            <span aria-hidden className="mt-1 block h-px w-12 bg-primary/50" />
            {hero.promise ? (
              <p className="text-pretty font-serif text-xl leading-snug text-foreground sm:text-2xl">
                {hero.promise}
              </p>
            ) : null}
            {hero.description ? (
              <p className="text-pretty text-[15px] leading-6 text-muted-foreground">
                {hero.description}
              </p>
            ) : null}
            {!hero.media ? <MissingMediaNote /> : null}
            {hero.primary || hero.secondaryLabel ? (
              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                {hero.primary ? (
                  <ActionLink href={hero.primary.href} className="gap-2 px-6">
                    {hero.primary.label}
                    <ArrowRight className="size-4" aria-hidden />
                  </ActionLink>
                ) : null}
                {hero.secondaryLabel ? (
                  <span className="inline-flex min-h-11 items-center justify-center gap-2 rounded-pill border border-border bg-surface px-5 text-sm font-medium text-foreground">
                    {hero.secondaryLabel}
                    <Plus className="size-4" aria-hidden />
                  </span>
                ) : null}
                {!hero.media && hero.saveLabel ? (
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

      {/* ── 2 · Franja horizontal de confianza ────────────────────── */}
      {trust.length > 0 ? (
        <section className={cn(SHELL, "mt-3")} aria-label="Señales de confianza">
          <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:gap-0 sm:divide-x sm:divide-border sm:overflow-visible sm:rounded-2xl sm:border sm:border-border sm:bg-surface sm:pb-0 lg:grid-cols-4">
            {trust.map((item) => (
              <li
                key={item.id}
                className="flex min-w-[74%] snap-start items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 sm:min-w-0 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-5 sm:py-3.5"
              >
                <TrustIcon icon={item.icon} />
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold leading-tight text-foreground">
                    {item.value ? `${item.value} · ${item.label}` : item.label}
                  </span>
                  {item.detail ? (
                    <span className="mt-0.5 block text-[12px] leading-snug text-muted-foreground">
                      {item.detail}
                    </span>
                  ) : null}
                  {item.status === "pending" ? (
                    <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                      Por verificar
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── 3 · Composición editorial horizontal de cuatro áreas ──── */}
      {intro || features.length > 0 || offers || info || territory ? (
        <div className={cn(SHELL, "mt-6 sm:mt-8")}>
          <div className="grid items-start gap-6 sm:grid-cols-2 sm:gap-x-0 sm:divide-x sm:divide-border lg:grid-cols-[22fr_31fr_20fr_22fr]">
            {/* 3.1 · Por qué es extraordinario */}
            {intro || features.length > 0 ? (
              <section aria-labelledby="landing-intro" className="min-w-0 sm:px-5 sm:first:pl-0">
                <ColumnHeading id="landing-intro">
                  {intro?.heading ?? "Por qué es extraordinario"}
                </ColumnHeading>
                <span aria-hidden className="mt-2 block h-px w-10 bg-primary/50" />
                {intro ? (
                  <div className="mt-3 space-y-3 text-pretty text-[14px] leading-6 text-muted-foreground">
                    {intro.blocks.slice(0, 4).map((block, i) =>
                      block.kind === "heading" ? (
                        <h3 key={i} className="font-serif text-base leading-snug text-foreground">
                          {block.text}
                        </h3>
                      ) : (
                        <p key={i}>{block.text}</p>
                      ),
                    )}
                  </div>
                ) : null}
                {features.length > 0 ? (
                  <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-3">
                    {features.map((f) => (
                      <li key={f.id} className="flex min-w-0 items-start gap-2">
                        <FeatureIcon icon={f.icon} />
                        <span className="min-w-0">
                          <span className="block text-[13px] font-medium leading-snug text-foreground">
                            {f.label}
                          </span>
                          {f.detail ? (
                            <span className="mt-0.5 block text-[12px] leading-snug text-muted-foreground">
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

            {/* 3.2 · Experiencias destacadas */}
            {offers ? (
              <section aria-labelledby="landing-offers" className="min-w-0 sm:px-5">
                <ColumnHeading id="landing-offers">{offers.heading}</ColumnHeading>
                <span aria-hidden className="mt-2 block h-px w-10 bg-primary/50" />
                {featured ? <FeaturedOffer item={featured} /> : null}
                {restOffers.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {restOffers.slice(0, 3).map((item) => (
                      <li key={item.id} className="min-w-0">
                        {item.href ? (
                          <Link
                            to={item.href}
                            className="block text-[13px] font-medium text-foreground underline-offset-4 hover:underline"
                          >
                            {item.title}
                          </Link>
                        ) : (
                          <span className="block text-[13px] font-medium text-foreground">
                            {item.title}
                          </span>
                        )}
                        {item.subtitle ? (
                          <span className="mt-0.5 line-clamp-2 block text-[12px] leading-snug text-muted-foreground">
                            {item.subtitle}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ) : null}

            {/* 3.3 · Información para tu visita */}
            {info ? (
              <section aria-labelledby="landing-info" className="min-w-0 sm:px-5">
                <ColumnHeading id="landing-info">{info.heading}</ColumnHeading>
                <span aria-hidden className="mt-2 block h-px w-10 bg-primary/50" />
                <dl className="mt-3 divide-y divide-border">
                  {info.items.map((item) => (
                    <div key={item.id} className="flex min-w-0 items-start gap-2.5 py-2.5">
                      <InfoIcon icon={item.icon} />
                      <div className="min-w-0">
                        <dt className="text-[13px] font-semibold leading-snug text-foreground">
                          {item.label}
                        </dt>
                        <dd className="mt-0.5 break-words text-[12.5px] leading-snug text-muted-foreground">
                          {item.value}
                        </dd>
                      </div>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}

            {/* 3.4 · Contexto territorial */}
            {territory ? (
              <section aria-labelledby="landing-territory" className="min-w-0 sm:px-5 sm:last:pr-0">
                <ColumnHeading id="landing-territory">{territory.heading}</ColumnHeading>
                <span aria-hidden className="mt-2 block h-px w-10 bg-primary/50" />
                {territory.media ? (
                  <img
                    src={territory.media.url}
                    alt={territory.media.alt}
                    loading="lazy"
                    style={focalStyle(territory.media)}
                    className="mt-3 aspect-[4/3] w-full rounded-2xl border border-border object-cover"
                  />
                ) : (
                  <div className="mt-3 flex aspect-[4/3] w-full flex-col justify-end gap-1 rounded-2xl border border-dashed border-border bg-surface p-4">
                    <MapPin className="size-5 text-primary" aria-hidden />
                    {territory.destinationName ? (
                      <p className="text-sm font-semibold text-foreground">
                        {territory.destinationName}
                      </p>
                    ) : null}
                    {territory.distanceLabel ? (
                      <p className="text-xs text-muted-foreground">{territory.distanceLabel}</p>
                    ) : null}
                  </div>
                )}
                <div className="mt-3 space-y-1.5">
                  {territory.media && territory.destinationName ? (
                    <p className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
                      <MapPin className="size-4 text-primary" aria-hidden />
                      {territory.destinationName}
                    </p>
                  ) : null}
                  {territory.address ? (
                    <p className="text-[12.5px] leading-snug text-muted-foreground">
                      {territory.address}
                    </p>
                  ) : null}
                  {territory.media && territory.distanceLabel ? (
                    <p className="text-[12.5px] text-muted-foreground">{territory.distanceLabel}</p>
                  ) : null}
                  {territory.body ? (
                    <p className="text-[12.5px] leading-snug text-muted-foreground">
                      {territory.body}
                    </p>
                  ) : null}
                  {territory.coordinates ? (
                    <p className="text-[11px] text-muted-foreground">{territory.coordinates}</p>
                  ) : null}
                  {territory.href ? (
                    <Link
                      to={territory.href}
                      className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-semibold text-primary underline-offset-4 hover:underline"
                    >
                      Explora el destino
                      <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  ) : null}
                </div>
              </section>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* ── 4 · Banda Alux baja y horizontal ──────────────────────── */}
      {alux ? (
        <div className={cn(SHELL, "mt-6 sm:mt-8")}>
          <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 sm:flex-row sm:items-center sm:gap-5 sm:px-6">
            <AluxMark
              family="avatar"
              size={56}
              decorative
              className="size-12 shrink-0 sm:size-14"
            />
            <div className="min-w-0 flex-1">
              <p className="font-serif text-lg leading-tight text-foreground">{alux.heading}</p>
              {alux.body ? (
                <p className="mt-0.5 text-[12.5px] leading-snug text-muted-foreground">
                  {alux.body}
                </p>
              ) : null}
            </div>
            <span className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-pill border border-border bg-card px-5 text-[13px] font-semibold uppercase tracking-wide text-foreground">
              {alux.ctaLabel}
              <Sparkles className="size-4 text-primary" aria-hidden />
            </span>
          </section>
        </div>
      ) : null}

      {/* Galería complementaria (sólo si el CMS la pobló). */}
      {gallery.length > 0 ? (
        <div className={cn(SHELL, "mt-6")}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {gallery.slice(0, 4).map((img) => (
              <figure
                key={img.url}
                className="overflow-hidden rounded-2xl border border-border bg-surface"
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
        </div>
      ) : null}
    </div>
  );
}

/** Experiencia destacada: fotografía grande con overlay inferior y chips. */
function FeaturedOffer({ item }: { item: NonNullable<SeoLandingSurfaceVM["offers"]>["items"][0] }) {
  const body = (
    <>
      {item.media ? (
        <>
          <img
            src={item.media.url}
            alt={item.media.alt}
            loading="lazy"
            style={focalStyle(item.media)}
            className="aspect-[4/3] w-full object-cover"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/85 via-black/45 to-transparent"
          />
        </>
      ) : null}
      <div
        className={cn(
          "p-3.5",
          item.media && "absolute inset-x-0 bottom-0 text-[color:oklch(0.98_0_0)]",
        )}
      >
        <h3 className="font-serif text-lg leading-snug">{item.title}</h3>
        {item.subtitle ? (
          <p
            className={cn(
              "mt-1 line-clamp-2 text-[12.5px] leading-snug",
              item.media ? "opacity-90" : "text-muted-foreground",
            )}
          >
            {item.subtitle}
          </p>
        ) : null}
        {item.tags.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {item.tags.slice(0, 3).map((tag) => (
              <li
                key={tag}
                className={cn(
                  "rounded-pill border px-2 py-0.5 text-[11px]",
                  item.media
                    ? "border-white/40 bg-black/30 backdrop-blur"
                    : "border-border text-muted-foreground",
                )}
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
    "relative mt-3 block overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-shadow hover:shadow-elevated";
  return item.href ? (
    <Link to={item.href} className={card}>
      {body}
    </Link>
  ) : (
    <article className={card}>{body}</article>
  );
}
