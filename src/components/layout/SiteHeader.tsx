/**
 * SiteHeader — Cabecera global del sitio.
 *
 * Propósito: navegación principal, acceso a Arma tu Viaje, selector
 * de idioma y slot de UserMenu. Persistente en todas las rutas.
 *
 * Dependencias: I18nProvider, LanguageSwitcher, UserMenu, Container.
 */
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X, Compass } from "lucide-react";
import { Container } from "./Container";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { UserMenu } from "./UserMenu";
import { useTranslation } from "@/i18n/context";
import { SITE } from "@/config/site";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const nav = [
    { to: "/oriente-maya" as const, label: t("nav.destinations") },
    { to: "/experiencias" as const, label: t("nav.experiences") },
    { to: "/hoteles" as const, label: t("nav.hotels") },
    { to: "/restaurantes" as const, label: t("nav.restaurants") },
    { to: "/eventos" as const, label: t("nav.events") },
    { to: "/empresas" as const, label: t("nav.for_business") },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
          <span
            aria-hidden
            className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground"
          >
            V
          </span>
          <span className="hidden sm:inline">{SITE.name}</span>
        </Link>

        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {nav.map((n) => (
              <li key={n.to}>
                <Link
                  to={n.to}
                  activeProps={{ className: "bg-accent text-accent-foreground" }}
                  className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
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
            className="hidden items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary hover:bg-primary/15 sm:inline-flex"
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
            className="lg:hidden inline-flex size-9 items-center justify-center rounded-full border border-border bg-card"
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
