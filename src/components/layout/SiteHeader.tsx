/**
 * SiteHeader — Cabecera global del sitio.
 *
 * Propósito: navegación principal, acceso a Arma tu Viaje, selector
 * de idioma y slot de UserMenu. Persistente en todas las rutas.
 *
 * Dependencias: I18nProvider, LanguageSwitcher, UserMenu, Container.
 */
import { useEffect, useRef, useState } from "react";
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
  const drawerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (variant !== "overlay") return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [variant]);

  // Bloqueo de scroll del documento + cierre con Escape + focus trap básico
  // cuando el Mobile Drawer está abierto. Garantiza que el menú se comporte
  // como un panel modal y que el Hero quede completamente detrás (12C.1).
  useEffect(() => {
    if (!open) return;
    const { body, documentElement } = document;
    const prevBody = body.style.overflow;
    const prevHtml = documentElement.style.overflow;
    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);

    // Mover foco al panel para lectores de pantalla y navegación por teclado.
    const t = window.setTimeout(() => drawerRef.current?.focus(), 0);

    return () => {
      body.style.overflow = prevBody;
      documentElement.style.overflow = prevHtml;
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [open]);

  const isOverlay = variant === "overlay" && !scrolled && !open;

  // Navegación oficial 12C.1 — priorización breve:
  // Destinos · Experiencias · Arma tu Viaje · Alux · Empresas.
  const nav = [
    { to: "/oriente-maya" as const, label: t("nav.destinations") },
    { to: "/experiencias" as const, label: t("nav.experiences") },
    { to: "/arma-tu-viaje" as const, label: t("nav.plan_trip") },
    { to: "/alux" as const, label: t("nav.alux") },
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
      {/*
        Scrim editorial superior (12C.0/12C.1): garantiza que el logotipo
        oficial y la navegación sean siempre legibles sobre la fotografía
        del Hero, sin alterar la transparencia percibida del Header.
      */}
      {isOverlay && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-24 bg-[linear-gradient(180deg,rgba(0,0,0,0.45)_0%,rgba(0,0,0,0.18)_55%,rgba(0,0,0,0)_100%)]"
        />
      )}
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
                ? "border border-white/40 bg-white/10 text-white backdrop-blur hover:bg-white/20"
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
              "lg:hidden inline-flex h-11 w-11 items-center justify-center rounded-full border transition",
              isOverlay
                ? "border-white/30 bg-white/10 text-white"
                : "border-border bg-card text-foreground",
            )}
            aria-label="Menú"
            aria-expanded={open}
            aria-controls="mobile-drawer"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </Container>

      {/* Mobile drawer lateral (12C.1) */}
      <div
        aria-hidden={!open}
        className={cn(
          "lg:hidden fixed inset-0 z-[60] transition-opacity duration-200",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setOpen(false)}
      >
        <div className="absolute inset-0 bg-foreground/70 backdrop-blur-md" />
      </div>
      <aside
        ref={drawerRef}
        id="mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Navegación principal"
        tabIndex={-1}
        className={cn(
          "lg:hidden fixed inset-y-0 right-0 z-[70] w-[86%] max-w-sm bg-background shadow-2xl outline-none",
          "transition-transform duration-200 ease-out",
          // Fondo sólido garantizado: evita que el Hero atraviese el panel
          // en navegadores que interpretan `bg-background` como variable con
          // alfa. Mantiene el aspecto del Design System.
          "[background-color:var(--color-background,#ffffff)]",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border/70 px-5">
          <BrandLogo tone="dark" size="sm" />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>
        <nav aria-label="Menú móvil" className="flex flex-col gap-1 p-4">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className="rounded-xl px-4 py-3 text-base font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
            >
              {n.label}
            </Link>
          ))}
          <Link
            to="/arma-tu-viaje"
            onClick={() => setOpen(false)}
            className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-base font-semibold text-primary-foreground"
          >
            <Compass className="size-4" aria-hidden />
            {t("nav.plan_trip")}
          </Link>
          <div className="mt-4 border-t border-border/70 pt-4 sm:hidden">
            <UserMenu />
          </div>
        </nav>
      </aside>
    </header>
  );
}
