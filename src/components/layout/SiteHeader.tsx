/**
 * SiteHeader — Cabecera global del sitio.
 *
 * Propósito: navegación principal, acceso a Arma tu Viaje, selector
 * de idioma y slot de UserMenu. Persistente en todas las rutas.
 *
 * Dependencias: I18nProvider, LanguageSwitcher, UserMenu, Container.
 */
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X, Compass } from "lucide-react";
import { Container } from "./Container";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { UserMenu } from "./UserMenu";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useTranslation } from "@/i18n/context";
import { cn } from "@/lib/utils";

/**
 * variant="overlay" → cabecera transparente sobre el Hero fotográfico de Home.
 * Pasa a estado sólido (sticky, fondo blanco + sombra) tras hacer scroll.
 * variant="solid"   → cabecera sólida estándar en rutas interiores.
 */
interface Props {
  variant?: "solid" | "overlay";
}

export function SiteHeader({ variant = "solid" }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (variant !== "overlay") return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [variant]);

  const isOverlay = variant === "overlay" && !scrolled && !open;

  const nav = [
    { to: "/oriente-maya" as const, label: t("nav.destinations") },
    { to: "/experiencias" as const, label: t("nav.experiences") },
    { to: "/hoteles" as const, label: t("nav.hotels") },
    { to: "/restaurantes" as const, label: t("nav.restaurants") },
    { to: "/eventos" as const, label: t("nav.events") },
    { to: "/empresas" as const, label: t("nav.for_business") },
  ];

  return (
    <header
      className={cn(
        "sticky top-0 z-30 transition-colors duration-300",
        isOverlay
          ? "border-b border-transparent bg-transparent"
          : "border-b border-border/70 bg-background/90 backdrop-blur shadow-[0_1px_0_color-mix(in_oklab,var(--color-foreground)_4%,transparent)]",
      )}
    >
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link to="/" aria-label="Inicio" className="flex items-center">
          <BrandLogo tone={isOverlay ? "light" : "dark"} size="md" />
        </Link>

        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {nav.map((n) => (
              <li key={n.to}>
                <Link
                  to={n.to}
                  activeProps={{ className: "bg-accent text-accent-foreground" }}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-sm font-medium transition",
                    isOverlay
                      ? "text-white/90 hover:bg-white/15 hover:text-white"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/arma-tu-viaje"
            className={cn(
              "hidden items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition sm:inline-flex",
              isOverlay
                ? "bg-white text-foreground hover:bg-white/90"
                : "border border-primary/40 bg-primary/10 text-primary hover:bg-primary/15",
            )}
          >
            <Compass className="size-4" aria-hidden />
            {t("nav.plan_trip")}
          </Link>
          <LanguageSwitcher />
          <div className="hidden sm:block">
            <UserMenu />
          </div>
          <button
            type="button"
            className={cn(
              "lg:hidden inline-flex size-9 items-center justify-center rounded-full border transition",
              isOverlay
                ? "border-white/30 bg-white/10 text-white"
                : "border-border bg-card text-foreground",
            )}
            aria-label="Menú"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </Container>

      {/* Mobile drawer */}
      <div
        className={cn(
          "lg:hidden overflow-hidden border-t border-border/70 bg-background transition-[max-height] duration-300",
          open ? "max-h-[28rem]" : "max-h-0",
        )}
      >
        <Container className="flex flex-col gap-1 py-3">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              {n.label}
            </Link>
          ))}
          <Link
            to="/arma-tu-viaje"
            onClick={() => setOpen(false)}
            className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Compass className="size-4" aria-hidden />
            {t("nav.plan_trip")}
          </Link>
          <div className="mt-2 sm:hidden">
            <UserMenu />
          </div>
        </Container>
      </div>
    </header>
  );
}
