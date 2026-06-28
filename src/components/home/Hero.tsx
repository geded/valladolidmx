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
        <p className="font-script text-[1.625rem] leading-tight text-white/95 drop-shadow-sm sm:text-3xl md:text-[2.5rem]">
          {t("hero.eyebrow")}
        </p>
        <h1 className="max-w-4xl text-balance text-[1.875rem] leading-[1.1] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)] sm:text-[2.75rem] sm:leading-[1.05] md:mt-3 md:text-[3.5rem] lg:text-[4rem]">
          {t("hero.title")}
        </h1>
        <p className="max-w-2xl text-pretty text-base text-white/90 drop-shadow sm:text-lg md:mt-5 md:text-lg lg:text-xl">
          {t("hero.subtitle")}
        </p>

        <div className="flex flex-wrap items-center gap-3 md:mt-8">
          <Link
            to="/oriente-maya"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_10px_30px_-10px_rgba(0,0,0,0.55)] ring-1 ring-black/5 transition hover:scale-[1.02] hover:opacity-95 sm:px-6 sm:py-3"
          >
            {t("hero.cta_primary")}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link
            to="/arma-tu-viaje"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/35 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/95 backdrop-blur transition hover:bg-white/15 sm:px-6 sm:py-3"
          >
            <Compass className="size-4" aria-hidden />
            {t("hero.cta_secondary")}
          </Link>
        </div>

        {/* Buscador discreto (12C.1): secundario al mensaje inspirador. */}
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
      </Container>
    </section>
  );
}
