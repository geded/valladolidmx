/**
 * Hero — Sección 1 de Home (Doc 12 + Doc 12A-v2 + Doc 12B).
 *
 * Pieza cinematográfica: fondo placeholder territorial (tonos selva/cenote
 * del Design System) listo para recibir la fotografía oficial, degradado
 * editorial para legibilidad, eslogan en script + titular display + dos
 * CTAs y buscador discreto. Empuja la cabecera a modo overlay transparente.
 *
 * Reemplazo futuro (Doc 12B): cuando llegue el banco fotográfico oficial,
 * sustituir el bloque `<div data-hero-media>` por un `<img src={…} />`
 * sin tocar layout, copy, CTAs ni degradados.
 */
import { useEffect, useState, type ReactNode } from "react";
import { Search, ArrowRight, Compass } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { useTranslation } from "@/i18n/context";
import { readFieldTypography, typographyToStyle, type FieldTypography } from "@/lib/experience-builder/typography";
import heroBg01 from "@/assets/brand/hero/bg01.jpg";
import heroBg02 from "@/assets/brand/hero/bg02.jpg";

const DEFAULT_SLIDES = [heroBg01, heroBg02] as const;
const DEFAULT_SLIDE_INTERVAL_MS = 7000;

/**
 * Configuración editable del Hero (15.10.4d · US-01).
 * Todos los campos son opcionales; cuando no vienen del Experience Builder
 * se recurre a las cadenas i18n existentes (fallback sin regresión).
 */
export interface HeroCta {
  label?: string;
  href?: string;
  /** "primary" | "secondary" | "ghost" */
  variant?: string;
}

export interface HeroConfig {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  background_image?: string;
  /**
   * Lista de imágenes para carrusel. Cuando está definida (incluso vacía),
   * anula al `background_image` legado y a los defaults.
   */
  background_images?: string[];
  slide_interval_seconds?: number;
  background_position?: string;
  /** Lista de botones. Cuando está definida (incluso []), anula los CTAs legados. */
  ctas?: HeroCta[];
  /** Legacy — se conservan como fallback. */
  cta_label?: string;
  cta_href?: string;
  cta_secondary_label?: string;
  cta_secondary_href?: string;
  cta_alignment?: string;
  /** Mostrar u ocultar el buscador rápido del hero. Default: true. */
  show_search?: boolean;
  /** Overrides tipográficos por campo, guardados por el Experience Builder. */
  __typography?: Record<string, FieldTypography>;
}

export interface HeroProps {
  config?: HeroConfig;
}

export function Hero({ config }: HeroProps = {}) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);

  // Determinar galería (soporta lista nueva, fallback al legacy o defaults).
  const configSlides = Array.isArray(config?.background_images)
    ? config!.background_images!.map((s) => (s ?? "").trim()).filter(Boolean)
    : null;
  const legacyBg = config?.background_image?.trim();
  const slides: readonly string[] =
    configSlides && configSlides.length > 0
      ? configSlides
      : legacyBg
        ? [legacyBg]
        : DEFAULT_SLIDES;

  const intervalMs = Math.max(
    2000,
    (config?.slide_interval_seconds ?? DEFAULT_SLIDE_INTERVAL_MS / 1000) * 1000,
  );

  useEffect(() => {
    if (slides.length < 2) return;
    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % slides.length),
      intervalMs,
    );
    return () => window.clearInterval(id);
  }, [slides.length, intervalMs]);

  // Textos: undefined → default i18n; string (incluso "") → respeta al editor.
  const pickText = (value: string | undefined, fallback: string) =>
    value === undefined ? fallback : value;
  const eyebrow = pickText(config?.eyebrow, t("hero.eyebrow"));
  const title = pickText(config?.title, t("hero.title"));
  const subtitle = pickText(config?.subtitle, t("hero.subtitle"));

  const backgroundPosition = config?.background_position?.trim() || "center";
  const ctaAlignment = config?.cta_alignment?.trim() || "left";
  const ctaAlignmentClass =
    ctaAlignment === "center"
      ? "justify-center"
      : ctaAlignment === "right"
        ? "justify-end"
        : "justify-start";

  // Botones: si viene `ctas` (aun vacío), respeta al editor. Si no, usa legacy/defaults.
  const ctas: HeroCta[] = Array.isArray(config?.ctas)
    ? config!.ctas!
    : [
        {
          label: config?.cta_label ?? t("hero.cta_primary"),
          href: config?.cta_href || "/oriente-maya",
          variant: "primary",
        },
        {
          label: config?.cta_secondary_label ?? t("hero.cta_secondary"),
          href: config?.cta_secondary_href || "/arma-tu-viaje",
          variant: "secondary",
        },
      ];
  const showSearch = config?.show_search !== false;

  // Typography por campo (config.__typography[fieldKey]).
  const cfgRecord = (config ?? {}) as unknown as Record<string, unknown>;
  const eyebrowStyle = typographyToStyle(readFieldTypography(cfgRecord, "eyebrow"));
  const titleStyle = typographyToStyle(readFieldTypography(cfgRecord, "title"));
  const subtitleStyle = typographyToStyle(readFieldTypography(cfgRecord, "subtitle"));

  return (
    <section
      className="relative isolate overflow-hidden text-white"
      // Compensar la cabecera overlay (h-16) para que la foto arranque desde el top.
      style={{ marginTop: "-4rem" }}
    >
      {/* Carrusel cinematográfico con las fotografías oficiales del Hero. */}
      <div data-hero-media aria-hidden className="absolute inset-0 -z-20 h-full w-full overflow-hidden bg-foreground">
        {slides.map((src, i) => (
          <img
            key={`${src}-${i}`}
            src={src}
            alt=""
            aria-hidden
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[2000ms] ease-in-out ${
              slides.length === 1 || i === index % slides.length ? "opacity-100" : "opacity-0"
            }`}
            style={{ objectPosition: backgroundPosition }}
            loading={i === 0 ? "eager" : "lazy"}
            fetchPriority={i === 0 ? "high" : "auto"}
            decoding="async"
          />
        ))}
      </div>
      {/* Degradado editorial para legibilidad sin enturbiar la foto. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(0,0,0,0.62)_0%,rgba(0,0,0,0.30)_42%,rgba(0,0,0,0.50)_75%,rgba(0,0,0,0.80)_100%)]"
      />

      {/*
        Composición Hero (12C.0 / 12C.2):
        — Mobile: el bloque (eyebrow + H1 + subtítulo + CTAs) se centra
          verticalmente entre la base del Header (h-16) y el borde inferior
          del viewport, asegurando que TODO sea visible sin scroll en una
          ventana 100svh (incluye barra de direcciones del navegador).
        — Desktop/tablet: se mantiene la composición editorial anclada
          en la parte baja, como referencia Airbnb/Apple/Booking.
      */}
      <Container
        className="relative flex min-h-[100svh] flex-col justify-center gap-4 pb-10 pt-20 md:min-h-[100dvh] md:justify-end md:gap-0 md:pb-28 md:pt-40"
      >
        {eyebrow ? (
          <p
            suppressHydrationWarning
            className="font-script text-[1.625rem] leading-tight text-white/95 drop-shadow-sm sm:text-3xl md:text-[2.5rem]"
            style={eyebrowStyle}
          >
            {eyebrow}
          </p>
        ) : null}
        {title ? (
          <h1
            suppressHydrationWarning
            className="max-w-4xl text-balance text-[1.875rem] leading-[1.1] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)] sm:text-[2.75rem] sm:leading-[1.05] md:mt-3 md:text-[3.5rem] lg:text-[4rem]"
            style={titleStyle}
          >
            {title}
          </h1>
        ) : null}
        {subtitle ? (
          <p
            suppressHydrationWarning
            className="max-w-2xl text-pretty text-base text-white/90 drop-shadow sm:text-lg md:mt-5 md:text-lg lg:text-xl"
            style={subtitleStyle}
          >
            {subtitle}
          </p>
        ) : null}

        {ctas.length > 0 ? (
          <div className={`flex flex-wrap items-center gap-3 md:mt-8 ${ctaAlignmentClass}`}>
            {ctas.map((cta, i) => (
              <HeroButton key={i} cta={cta} isPrimary={i === 0} />
            ))}
          </div>
        ) : null}

        {/* Buscador discreto (12C.1): secundario al mensaje inspirador. */}
        {showSearch ? (
          <form
            role="search"
            aria-label="Búsqueda rápida"
            onSubmit={(e) => e.preventDefault()}
            className="mt-4 flex max-w-md items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 shadow-sm backdrop-blur-md sm:mt-6 md:mt-10"
          >
            <Search className="size-4 shrink-0 text-white/80" aria-hidden />
            <input
              type="search"
              placeholder={t("hero.search_placeholder")}
              className="w-full bg-transparent text-sm text-white placeholder:text-white/70 focus:outline-none"
              aria-label={t("hero.search_placeholder")}
            />
            <span className="hidden text-[11px] text-white/60 lg:inline">{t("hero.search_helper")}</span>
          </form>
        ) : null}
      </Container>
    </section>
  );
}

function HeroButton({ cta, isPrimary }: { cta: HeroCta; isPrimary: boolean }) {
  const label = cta.label ?? "";
  const href = cta.href || "#";
  const variant = cta.variant ?? (isPrimary ? "primary" : "secondary");
  if (!label) return null;
  let cls =
    "inline-flex min-h-11 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition sm:px-6 sm:py-3";
  let icon: ReactNode = null;
  if (variant === "primary") {
    cls +=
      " bg-primary text-primary-foreground shadow-[0_10px_30px_-10px_rgba(0,0,0,0.55)] ring-1 ring-black/5 hover:scale-[1.02] hover:opacity-95";
    icon = <ArrowRight className="size-4" aria-hidden />;
  } else if (variant === "secondary") {
    cls +=
      " border border-white/35 bg-white/5 font-medium text-white/95 backdrop-blur hover:bg-white/15";
    icon = <Compass className="size-4" aria-hidden />;
  } else {
    cls += " bg-transparent font-medium text-white/95 hover:text-white";
  }
  return (
    <a href={href} className={cls}>
      {variant === "secondary" ? icon : null}
      {label}
      {variant === "primary" ? icon : null}
    </a>
  );
}
