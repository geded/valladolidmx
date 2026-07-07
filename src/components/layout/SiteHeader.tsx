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
import {
  Menu,
  X,
  Compass,
  Globe,
  User,
  MapPin,
  Phone,
  Mail,
  ShoppingBag,
  Heart,
  Sparkles,
  Calendar,
  Search,
  Info,
  type LucideIcon,
} from "lucide-react";
import { Container } from "./Container";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { UserMenu } from "./UserMenu";
import { PrimaryMegaMenu } from "./PrimaryMegaMenu";
import { SiteTopBar } from "./SiteTopBar";
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
  config?: Record<string, unknown>;
}

interface HeaderNavItem {
  label: string;
  href: string;
}

type ButtonKind = "cta" | "custom_link" | "language" | "user_menu" | "menu_toggle";
type ButtonVariant = "primary" | "secondary" | "ghost" | "light";

interface HeaderButton {
  kind: ButtonKind;
  label: string;
  href: string;
  icon: string;
  variant: ButtonVariant;
  visible: boolean;
  size?: string;
}

const ICON_MAP: Record<string, LucideIcon> = {
  Compass,
  Globe,
  User,
  Menu,
  MapPin,
  Phone,
  Mail,
  ShoppingBag,
  Heart,
  Sparkles,
  Calendar,
  Search,
  Info,
};

function parseButtons(value: unknown): HeaderButton[] | null {
  if (!Array.isArray(value)) return null;
  const kinds: ButtonKind[] = ["cta", "custom_link", "language", "user_menu", "menu_toggle"];
  const variants: ButtonVariant[] = ["primary", "secondary", "ghost", "light"];
  const out: HeaderButton[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const rec = raw as Record<string, unknown>;
    const kind = kinds.includes(rec.kind as ButtonKind) ? (rec.kind as ButtonKind) : "custom_link";
    const variant = variants.includes(rec.variant as ButtonVariant)
      ? (rec.variant as ButtonVariant)
      : "primary";
    out.push({
      kind,
      label: typeof rec.label === "string" ? rec.label : "",
      href: typeof rec.href === "string" ? rec.href : "",
      icon: typeof rec.icon === "string" ? rec.icon : "",
      variant,
      visible: rec.visible !== false,
      size: typeof rec.size === "string" ? rec.size : "md",
    });
  }
  return out;
}

function textValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function boolValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function linkItems(value: unknown, fallback: HeaderNavItem[]): HeaderNavItem[] {
  if (!Array.isArray(value)) return fallback;
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const label = textValue(record.label);
      const href = textValue(record.href);
      return label && href ? { label, href } : null;
    })
    .filter((item): item is HeaderNavItem => Boolean(item));
}

export function SiteHeader({ variant = "solid", config }: Props) {
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
  // Sprint de Reconciliación 5 · Menú principal conectado al motor.
  // El menú público ya no depende de `config.nav` (composición EB): se
  // renderiza vía `PrimaryMegaMenu` con dropdowns tipo destino turístico,
  // consumiendo destinos reales publicados. `config.nav` legacy se ignora
  // deliberadamente para garantizar una navegación consistente.
  void linkItems;
  void t;
  const ctaLabel = textValue(config?.cta_label) ?? t("nav.plan_trip");
  const ctaHref = textValue(config?.cta_href) ?? "/arma-tu-viaje";
  const showLanguage = boolValue(config?.show_language, true);
  const showUserMenu = boolValue(config?.show_user_menu, true);

  // Nuevo modelo declarativo: `buttons[]` reordenable/configurable desde el
  // Studio. Si no viene, se sintetiza uno equivalente a la barra legacy
  // para no romper composiciones publicadas antes de esta versión.
  const configuredButtons = parseButtons(config?.buttons);
  const buttons: HeaderButton[] = configuredButtons ?? [
    {
      kind: "cta",
      label: ctaLabel,
      href: ctaHref,
      icon: "Compass",
      variant: "light",
      visible: true,
    },
    { kind: "language", label: "", href: "", icon: "", variant: "ghost", visible: showLanguage },
    { kind: "user_menu", label: "Iniciar sesión", href: "", icon: "User", variant: "primary", visible: showUserMenu },
    { kind: "menu_toggle", label: "", href: "", icon: "Menu", variant: "ghost", visible: true },
  ];
  const visibleButtons = buttons.filter((b) => b.visible);

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
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-foreground transition-all active:scale-[0.98]"
              >
                <X className="size-4" />
              </button>
            </div>
            <nav aria-label="Menú móvil" className="flex flex-col gap-0.5 px-4 py-5">
              <PrimaryMegaMenu variant="mobile" onNavigate={() => setOpen(false)} />
              <a
                href={ctaHref}
                onClick={() => setOpen(false)}
                className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground shadow-sm transition-all hover:opacity-95 active:scale-[0.98]"
              >
                <Compass className="size-4" aria-hidden />
                {ctaLabel}
              </a>
              {showUserMenu ? <div className="mt-4 border-t border-border/70 pt-4 sm:hidden">
                <UserMenu />
              </div> : null}
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
          "@container sticky top-0 z-30 transition-colors duration-300",
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
        <SiteTopBar hidden={isOverlay} />
        <Container className="grid h-16 grid-cols-[auto_1fr_auto] items-center gap-6">
          <Link to="/" aria-label="Inicio" className="flex items-center">
            <BrandLogo tone={isOverlay ? "light" : "dark"} size="md" />
          </Link>

          <div className="flex min-w-0 items-center justify-center">
            <PrimaryMegaMenu variant="desktop" isOverlay={isOverlay} />
          </div>

          <div className="flex items-center gap-2">
            {visibleButtons.map((btn, idx) => renderHeaderButton(btn, idx, {
              isOverlay,
              open,
              setOpen,
              menuButtonRef,
              ctaFallback: { label: ctaLabel, href: ctaHref },
            }))}
          </div>
        </Container>
      </header>
      {mobileDrawer}
    </>
  );
}

interface RenderCtx {
  isOverlay: boolean;
  open: boolean;
  setOpen: (updater: (v: boolean) => boolean) => void;
  menuButtonRef: React.RefObject<HTMLButtonElement | null>;
  ctaFallback: { label: string; href: string };
}

function renderHeaderButton(btn: HeaderButton, idx: number, ctx: RenderCtx) {
  const key = `${btn.kind}-${idx}`;
  const { isOverlay, open, setOpen, menuButtonRef, ctaFallback } = ctx;

  if (btn.kind === "language") {
    // v1.1: el selector de idioma vive en SiteTopBar (desktop) y en el drawer
    // (mobile). En la fila principal sólo se muestra bajo `lg` cuando la
    // topbar está oculta, para preservar acceso al cambio de idioma sobre
    // el Hero (overlay) o en tabletas.
    return (
      <div key={key} className="lg:hidden">
        <LanguageSwitcher />
      </div>
    );
  }
  if (btn.kind === "user_menu") {
    return (
      <div key={key} data-header-button-kind={btn.kind} className="hidden sm:block">
        <UserMenu />
      </div>
    );
  }
  if (btn.kind === "menu_toggle") {
    return (
      <button
        key={key}
        ref={menuButtonRef}
        type="button"
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-md border transition-all active:scale-[0.98] lg:hidden",
          isOverlay
            ? "border-white/30 bg-white/10 text-white"
            : "border-border bg-card text-foreground",
        )}
        data-header-button-kind={btn.kind}
        aria-label={btn.label || "Menú"}
        aria-expanded={open}
        aria-controls="mobile-drawer"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
    );
  }

  // cta / custom_link → <a>
  const href = btn.href || (btn.kind === "cta" ? ctaFallback.href : "#");
  const label = btn.label || (btn.kind === "cta" ? ctaFallback.label : "Enlace");
  const Icon = btn.icon && ICON_MAP[btn.icon] ? ICON_MAP[btn.icon] : null;
  const variantClass = getVariantClass(btn.variant, isOverlay);
  const size = (btn.size ?? "md").toLowerCase();
  const sizeClass =
    size === "xs"
      ? "px-2 py-0.5 text-[11px] gap-1"
      : size === "sm"
        ? "px-2.5 py-1 text-[12px] gap-1"
        : size === "lg"
          ? "px-4 py-2 text-sm gap-2"
          : "px-3 py-1.5 text-[13px] gap-1.5";
  const hiddenOnMobile = btn.kind === "cta" ? "hidden sm:inline-flex" : "inline-flex";
  return (
    <a
      key={key}
      href={href}
      data-header-button-kind={btn.kind}
      className={cn(
        hiddenOnMobile,
        "items-center rounded-md font-medium tracking-tight transition-all active:scale-[0.98]",
        sizeClass,
        variantClass,
      )}
    >
      {Icon ? <Icon className="size-4" aria-hidden /> : null}
      {label}
    </a>
  );
}

function getVariantClass(variant: HeaderButton["variant"], isOverlay: boolean): string {
  switch (variant) {
    case "primary":
      return "bg-primary text-primary-foreground hover:opacity-95";
    case "secondary":
      return isOverlay
        ? "border border-white/50 text-white hover:bg-white/10"
        : "border border-border text-foreground hover:bg-accent";
    case "ghost":
      return isOverlay
        ? "text-white/90 hover:bg-white/10"
        : "text-foreground hover:bg-accent";
    case "light":
      return isOverlay
        ? "border border-white/40 bg-white/10 text-white backdrop-blur hover:bg-white/20"
        : "border border-primary/40 bg-primary/10 text-primary hover:bg-primary/15";
  }
}
