/**
 * Hero — Sección 1 de Home (Doc 12).
 *
 * Propósito: INSPIRAR antes de vender.
 * Imagen de gran formato (placeholder territorial), título display,
 * subtítulo breve, dos CTAs primarios (Destinos + Arma tu Viaje) y un
 * buscador DISCRETO debajo (no domina visualmente).
 */
import { Link } from "@tanstack/react-router";
import { Search, ArrowRight, Compass } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { useTranslation } from "@/i18n/context";

export function Hero() {
  const { t } = useTranslation();

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="placeholder-atardecer absolute inset-0 -z-10"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-background/30 via-background/60 to-background"
      />

      <Container className="relative flex min-h-[78vh] flex-col justify-end pb-12 pt-24 md:min-h-[88vh] md:pb-20 md:pt-32">
        <p className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-foreground/80 backdrop-blur">
          <span className="size-1.5 rounded-full bg-primary" aria-hidden />
          {t("hero.eyebrow")}
        </p>
        <h1 className="max-w-4xl text-balance text-4xl leading-[1.05] sm:text-5xl md:text-6xl lg:text-7xl">
          {t("hero.title")}
        </h1>
        <p className="mt-4 max-w-2xl text-pretty text-lg text-foreground/80 md:text-xl">
          {t("hero.subtitle")}
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            to="/oriente-maya"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-md hover:opacity-95"
          >
            {t("hero.cta_primary")}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link
            to="/arma-tu-viaje"
            className="inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-background/70 px-5 py-3 text-sm font-semibold text-foreground backdrop-blur hover:bg-background"
          >
            <Compass className="size-4" aria-hidden />
            {t("hero.cta_secondary")}
          </Link>
        </div>

        {/* Buscador DISCRETO: presente pero no domina. */}
        <form
          role="search"
          aria-label="Búsqueda rápida"
          onSubmit={(e) => e.preventDefault()}
          className="mt-10 flex max-w-xl items-center gap-2 rounded-full border border-border/70 bg-background/85 px-4 py-2 shadow-sm backdrop-blur"
        >
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            type="search"
            placeholder={t("hero.search_placeholder")}
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            aria-label={t("hero.search_placeholder")}
          />
          <span className="hidden text-xs text-muted-foreground sm:inline">{t("hero.search_helper")}</span>
        </form>
      </Container>
    </section>
  );
}
