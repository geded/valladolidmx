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
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, ArrowRight, Compass } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { useTranslation } from "@/i18n/context";
import heroBg01 from "@/assets/brand/hero/bg01.jpg";
import heroBg02 from "@/assets/brand/hero/bg02.jpg";

const HERO_SLIDES = [heroBg01, heroBg02] as const;
const SLIDE_INTERVAL_MS = 7000;

export function Hero() {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (HERO_SLIDES.length < 2) return;
    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % HERO_SLIDES.length),
      SLIDE_INTERVAL_MS,
    );
    return () => window.clearInterval(id);
  }, []);

  return (
    <section
      className="relative isolate overflow-hidden text-white"
      // Compensar la cabecera overlay (h-16) para que la foto arranque desde el top.
      style={{ marginTop: "-4rem" }}
    >
      {/* Carrusel cinematográfico con las fotografías oficiales del Hero. */}
      <div data-hero-media aria-hidden className="absolute inset-0 -z-20 h-full w-full overflow-hidden bg-foreground">
        {HERO_SLIDES.map((src, i) => (
          <img
            key={src}
            src={src}
            alt=""
            aria-hidden
            className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-[2000ms] ease-in-out ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
            loading={i === 0 ? "eager" : "lazy"}
            fetchPriority={i === 0 ? "high" : "auto"}
            decoding="async"
          />
        ))}
      </div>
      {/* Degradado editorial para legibilidad sin enturbiar la foto. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.15)_38%,rgba(0,0,0,0.45)_72%,rgba(0,0,0,0.78)_100%)]"
      />

      <Container className="relative flex min-h-[88dvh] flex-col justify-end pb-14 pt-36 md:min-h-[100dvh] md:pb-24 md:pt-40">
        <p className="font-script text-3xl text-white/95 drop-shadow-sm sm:text-4xl md:text-5xl">
          {t("hero.eyebrow")}
        </p>
        <h1 className="mt-2 max-w-4xl text-balance text-[2.5rem] leading-[1.05] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] sm:text-5xl md:text-6xl lg:text-[4.25rem]">
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
