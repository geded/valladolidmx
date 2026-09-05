/**
 * LOTE 3I.1 · Superficie pública ÚNICA de la familia `premium-seo-landing`.
 *
 * Implementación compartida por las tres landings piloto (y por cualquier
 * futura landing SEO). NO es un diseño por entidad: recibe el VM derivado de
 * la composición y compone las cuatro regiones de la maqueta autorizada.
 *
 * Reglas: identidad Premium (tokens del Design System colonial), territorio y
 * entidad por encima de Alux y Mi Viaje, cero selectores de presentación
 * visibles, cero contenido inventado (región sin dato ⇒ región omitida).
 */
import { Link } from "@tanstack/react-router";
import { Award, BadgeCheck, Info, MapPin, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
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

function TrustIcon({ icon }: { icon: SeoLandingTrustItem["icon"] }) {
  const Icon = TRUST_ICONS[icon] ?? BadgeCheck;
  return <Icon className="size-4 shrink-0 text-primary" aria-hidden />;
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
  const cls = cn("rounded-pill", variant === "outline" && "bg-background/80 backdrop-blur");
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

export function SeoLandingSurface({ vm }: { vm: SeoLandingSurfaceVM }) {
  const { hero, trust, intro, features, offers, info, territory, gallery, alux } = vm;
  const hasAside = Boolean(info || territory);

  return (
    <div className="pb-16">
      {/* ── 1 · Portada editorial ─────────────────────────────────── */}
      <section
        className={cn(
          "relative isolate flex items-end overflow-hidden",
          hero.media
            ? "min-h-[62vh] sm:min-h-[70vh]"
            : "min-h-[42vh] bg-[linear-gradient(140deg,var(--color-selva),var(--color-cenote))]",
        )}
      >
        {hero.media ? (
          <>
            <img
              src={hero.media.url}
              alt={hero.media.alt}
              className="absolute inset-0 -z-20 size-full object-cover"
              loading="eager"
            />
            <div
              className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,rgba(12,14,12,0.86),rgba(12,14,12,0.35)_55%,rgba(12,14,12,0.15))]"
              aria-hidden
            />
          </>
        ) : null}
        <div className={cn(SHELL, "relative pb-10 pt-24 text-white sm:pb-14 sm:pt-32")}>
          {hero.eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/85 sm:text-xs">
              {hero.eyebrow}
            </p>
          ) : null}
          <h1 className="mt-3 max-w-3xl text-balance font-serif text-[clamp(2rem,7vw,4rem)] leading-[1.03]">
            {hero.title}
          </h1>
          {hero.description ? (
            <p className="mt-4 max-w-2xl text-pretty text-sm leading-6 text-white/90 sm:text-lg sm:leading-8">
              {hero.description}
            </p>
          ) : null}
          {hero.primary || hero.secondaryLabel ? (
            <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center">
              {hero.primary ? (
                <ActionLink href={hero.primary.href}>{hero.primary.label}</ActionLink>
              ) : null}
              {hero.secondaryLabel ? (
                <span className="inline-flex items-center justify-center rounded-pill border border-white/45 bg-black/35 px-5 py-2 text-sm font-medium text-white backdrop-blur">
                  {hero.secondaryLabel}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {/* ── 2 · Franja de confianza ───────────────────────────────── */}
      {trust.length > 0 ? (
        <section className={cn(SHELL, "relative z-10 -mt-6 sm:-mt-8")} aria-label="Confianza">
          <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto rounded-2xl border border-border bg-card p-3 shadow-elevated sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4">
            {trust.map((item) => (
              <li
                key={item.id}
                className="flex min-w-[74%] snap-start items-start gap-2.5 rounded-xl px-3 py-2 sm:min-w-0"
              >
                <TrustIcon icon={item.icon} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold leading-tight text-foreground">
                    {item.label}
                  </span>
                  {item.detail ? (
                    <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                      {item.detail}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── 3 · Cuerpo editorial ──────────────────────────────────── */}
      <div className={cn(SHELL, "mt-10 sm:mt-14")}>
        <div className={cn("grid gap-8 lg:gap-12", hasAside && "lg:grid-cols-12")}>
          <div className={cn("min-w-0", hasAside && "lg:col-span-7")}>
            {intro ? (
              <section aria-labelledby="landing-intro">
                <h2
                  id="landing-intro"
                  className="font-serif text-[clamp(1.5rem,3.4vw,2.25rem)] leading-tight"
                >
                  {intro.heading}
                </h2>
                <div className="mt-4 space-y-4 text-pretty text-[15px] leading-7 text-muted-foreground sm:text-base sm:leading-8">
                  {intro.paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </section>
            ) : null}

            {features.length > 0 ? (
              <ul className="mt-6 flex flex-wrap gap-2" aria-label="Lo que distingue">
                {features.map((f) => (
                  <li
                    key={f.id}
                    className="rounded-pill border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground"
                  >
                    {f.label}
                  </li>
                ))}
              </ul>
            ) : null}

            {gallery.length > 0 ? (
              <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4">
                {gallery.slice(0, 4).map((img, i) => (
                  <figure
                    key={img.url}
                    className={cn(
                      "overflow-hidden rounded-2xl border border-border bg-surface",
                      gallery.length === 1 && "col-span-2",
                      i === 0 && gallery.length > 2 && "col-span-2",
                    )}
                  >
                    <img
                      src={img.url}
                      alt={img.alt}
                      loading="lazy"
                      className="aspect-[16/10] size-full object-cover"
                    />
                  </figure>
                ))}
              </div>
            ) : null}
          </div>

          {hasAside ? (
            <aside className="min-w-0 space-y-5 lg:col-span-5 lg:sticky lg:top-24 lg:self-start">
              {info ? (
                <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                  <h2 className="font-serif text-xl leading-tight">{info.heading}</h2>
                  <dl className="mt-4 space-y-3">
                    {info.items.map((item) => (
                      <div key={item.id} className="grid grid-cols-[auto_1fr] items-baseline gap-3">
                        <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          {item.label}
                        </dt>
                        <dd className="min-w-0 break-words text-sm text-foreground">
                          {item.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ) : null}

              {territory ? (
                <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
                  {territory.media ? (
                    <img
                      src={territory.media.url}
                      alt={territory.media.alt}
                      loading="lazy"
                      className="aspect-[16/9] w-full object-cover"
                    />
                  ) : null}
                  <div className="p-5">
                    <h2 className="font-serif text-xl leading-tight">{territory.heading}</h2>
                    {territory.destinationName ? (
                      <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                        <MapPin className="size-4 text-primary" aria-hidden />
                        {territory.destinationName}
                      </p>
                    ) : null}
                    {territory.address ? (
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {territory.address}
                      </p>
                    ) : null}
                    {territory.body ? (
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        {territory.body}
                      </p>
                    ) : null}
                    {territory.href ? (
                      <div className="mt-4">
                        <ActionLink href={territory.href} variant="outline">
                          Explorar el destino
                        </ActionLink>
                      </div>
                    ) : null}
                  </div>
                </section>
              ) : null}
            </aside>
          ) : null}
        </div>

        {/* Experiencias / oferta real */}
        {offers ? (
          <section className="mt-12 sm:mt-16" aria-labelledby="landing-offers">
            <h2
              id="landing-offers"
              className="font-serif text-[clamp(1.5rem,3.4vw,2.25rem)] leading-tight"
            >
              {offers.heading}
            </h2>
            <ul className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-3">
              {offers.items.map((item) => {
                const body = (
                  <>
                    {item.media ? (
                      <img
                        src={item.media.url}
                        alt={item.media.alt}
                        loading="lazy"
                        className="aspect-[4/3] w-full object-cover"
                      />
                    ) : null}
                    <div className="p-4">
                      <h3 className="font-serif text-lg leading-snug">{item.title}</h3>
                      {item.subtitle ? (
                        <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                          {item.subtitle}
                        </p>
                      ) : null}
                    </div>
                  </>
                );
                const card =
                  "block h-full min-w-[80%] snap-start overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-shadow hover:shadow-elevated sm:min-w-0";
                return (
                  <li key={item.id} className="min-w-[80%] snap-start sm:min-w-0">
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
          </section>
        ) : null}
      </div>

      {/* ── 4 · Banda Alux de cierre (secundaria, compacta) ───────── */}
      {alux ? (
        <div className={cn(SHELL, "mt-12 sm:mt-16")}>
          <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex min-w-0 items-start gap-3">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{alux.heading}</p>
                {alux.body ? (
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{alux.body}</p>
                ) : null}
              </div>
            </div>
            <span className="shrink-0 rounded-pill border border-border bg-card px-4 py-1.5 text-xs font-medium text-foreground">
              {alux.ctaLabel}
            </span>
          </section>
        </div>
      ) : null}
    </div>
  );
}
