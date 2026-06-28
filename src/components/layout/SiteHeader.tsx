/**
 * SiteHeader — Cabecera global del sitio.
 *
 * Propósito: navegación principal, acceso a Arma tu Viaje, selector
 * de idioma y slot de UserMenu. Persistente en todas las rutas.
 *
 * Dependencias: I18nProvider, LanguageSwitcher, UserMenu, Container.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const [mounted, setMounted] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLElement | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (variant !== "overlay") return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [variant]);

  // Bloqueo de scroll del documento + cierre con Escape + focus trap.
  // El drawer se porta al body para escapar del stacking context del Header:
  // así el Hero nunca atraviesa el panel móvil (12C.1).
  useEffect(() => {
    if (!open) return;
    const { body, documentElement } = document;
    const scrollY = window.scrollY;
    const prevBody = body.style.overflow;
    const prevBodyPosition = body.style.position;
    const prevBodyTop = body.style.top;
    const prevBodyWidth = body.style.width;
    const prevHtml = documentElement.style.overflow;
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    documentElement.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }

      if (e.key !== "Tab" || !drawerRef.current) return;
      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true");

      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);

    // Mover foco al panel para lectores de pantalla y navegación por teclado.
    const t = window.setTimeout(() => drawerRef.current?.focus(), 0);

    return () => {
      body.style.overflow = prevBody;
      body.style.position = prevBodyPosition;
      body.style.top = prevBodyTop;
      body.style.width = prevBodyWidth;
      documentElement.style.overflow = prevHtml;
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
      window.scrollTo(0, scrollY);
      menuButtonRef.current?.focus();
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

  const mobileDrawer = mounted && open
    ? createPortal(
        <>
          <div
            aria-hidden
            className="fixed inset-0 z-[998] bg-foreground/58 backdrop-blur-sm lg:hidden"
            onClick={() => setOpen(false)}
          />
          <aside
            ref={drawerRef}
            id="mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Navegación principal"
            tabIndex={-1}
            style={{ backgroundColor: "var(--background)" }}
            className="fixed right-3 top-3 z-[999] flex max-h-[calc(100dvh-1.5rem)] w-[min(76vw,21rem)] flex-col overflow-y-auto rounded-2xl border border-border/70 shadow-2xl outline-none lg:hidden"
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/70 px-4">
              <BrandLogo tone="dark" size="sm" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <nav aria-label="Menú móvil" className="flex flex-col gap-0.5 px-4 py-5">
              {nav.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-[0.95rem] font-medium leading-tight text-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  {n.label}
                </Link>
              ))}
              <Link
                to="/arma-tu-viaje"
                onClick={() => setOpen(false)}
                className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-[0.95rem] font-semibold text-primary-foreground"
              >
                <Compass className="size-4" aria-hidden />
                {t("nav.plan_trip")}
              </Link>
              <div className="mt-4 border-t border-border/70 pt-4 sm:hidden">
                <UserMenu />
              </div>
            </nav>
          </aside>
        </>,
        document.body,
      )
    : null;

  return (
    <>
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
                    activeProps={{
                      className: isOverlay
                        ? "bg-white/20 text-white"
                        : "bg-accent text-accent-foreground",
                    }}
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
              ref={menuButtonRef}
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
      </header>
      {mobileDrawer}
    </>
  );
}
