/**
 * Hero — Sección 1 de Home (Doc 12).
 *
 * Propósito: INSPIRAR antes de vender.
 * Imagen de gran formato (placeholder territorial), título display,
 * subtítulo breve, dos CTAs primarios (Destinos + Arma tu Viaje) y un
 * buscador DISCRETO debajo (no domina visualmente).
 */
/**
 * Hero — Sección 1 de Home (Doc 12 + Doc 12A-v2).
 *
 * Pieza cinematográfica: fotografía protagonista del Oriente Maya,
 * degradado para legibilidad, eslogan en script + titular display + dos CTAs
 * y buscador discreto. Empuja la cabecera a modo overlay transparente.
 *
 * Imagen actual: render generado de Calzada de los Frailes (placeholder
 * fotográfico). Sustituible por el activo oficial cambiando `HERO_IMAGE`.
 */
import { Link } from "@tanstack/react-router";
import { Search, ArrowRight, Compass } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { useTranslation } from "@/i18n/context";
import heroValladolid from "@/assets/hero-valladolid.jpg";

const HERO_IMAGE = heroValladolid;

export function Hero() {
  const { t } = useTranslation();

  return (
    <section
      className="relative isolate overflow-hidden text-white"
      // Compensar la cabecera overlay (h-16) para que la foto arranque desde el top.
      style={{ marginTop: "-4rem" }}
    >
      <img
        src={HERO_IMAGE}
        alt="Calle colonial del Oriente Maya al atardecer"
        width={1920}
        height={1280}
        fetchPriority="high"
        className="absolute inset-0 -z-20 h-full w-full object-cover"
      />
      {/* Degradado editorial para legibilidad sin enturbiar la foto. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.15)_38%,rgba(0,0,0,0.45)_72%,rgba(0,0,0,0.78)_100%)]"
      />

      <Container className="relative flex min-h-[92vh] flex-col justify-end pb-14 pt-36 md:min-h-screen md:pb-24 md:pt-40">
        <p className="font-script text-3xl text-white/95 drop-shadow-sm sm:text-4xl md:text-5xl">
          {t("hero.eyebrow")}
        </p>
        <h1 className="mt-2 max-w-4xl text-balance text-5xl leading-[1.02] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] sm:text-6xl md:text-7xl lg:text-[5.25rem]">
          {t("hero.title")}
        </h1>
        <p className="mt-5 max-w-2xl text-pretty text-lg text-white/90 drop-shadow md:text-xl">
          {t("hero.subtitle")}
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Link
            to="/oriente-maya"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-black/20 transition hover:scale-[1.02] hover:opacity-95"
          >
            {t("hero.cta_primary")}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link
            to="/arma-tu-viaje"
            className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
          >
            <Compass className="size-4" aria-hidden />
            {t("hero.cta_secondary")}
          </Link>
        </div>

        {/* Buscador discreto, secundario al mensaje inspirador. */}
        <form
          role="search"
          aria-label="Búsqueda rápida"
          onSubmit={(e) => e.preventDefault()}
          className="mt-10 flex max-w-xl items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-2 shadow-sm backdrop-blur-md"
        >
          <Search className="size-4 shrink-0 text-white/80" aria-hidden />
          <input
            type="search"
            placeholder={t("hero.search_placeholder")}
            className="w-full bg-transparent text-sm text-white placeholder:text-white/70 focus:outline-none"
            aria-label={t("hero.search_placeholder")}
          />
          <span className="hidden text-xs text-white/70 sm:inline">{t("hero.search_helper")}</span>
        </form>
      </Container>
    </section>
  );
}
