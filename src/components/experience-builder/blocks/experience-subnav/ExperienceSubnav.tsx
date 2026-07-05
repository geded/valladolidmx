/**
 * H-03 · Ola I1.b — `vmx.experience.subnav` (Capa 1: Presentación).
 *
 * Componente puro. No hace fetching, no lee router. Renderiza una nav
 * horizontal sticky con anclas + scroll-spy opcional.
 *
 * Accesibilidad: <nav aria-label>, focus visible, min-h 44px táctil,
 * scroll horizontal en móvil con snap.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  Camera,
  Info,
  MapPin,
  MessageCircle,
  Phone,
  Star,
  Tag,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ExperienceSubnavAnchor,
  ExperienceSubnavDTO,
} from "@/lib/experience-builder/blocks/experience-subnav/contract";

const ICONS: Record<string, LucideIcon> = {
  info: Info,
  camera: Camera,
  tag: Tag,
  star: Star,
  "map-pin": MapPin,
  "message-circle": MessageCircle,
  utensils: Utensils,
  phone: Phone,
  "badge-check": BadgeCheck,
};

function AnchorIcon({ name, className }: { name?: string; className?: string }) {
  if (!name) return null;
  const I = ICONS[name];
  if (!I) return null;
  return <I className={className} aria-hidden="true" />;
}

export interface ExperienceSubnavProps {
  dto: ExperienceSubnavDTO;
  className?: string;
}

export function ExperienceSubnav({ dto, className }: ExperienceSubnavProps) {
  const { anchors, variant, sticky, scrollOffset, ariaLabel, capabilities } = dto;
  const [activeId, setActiveId] = useState<string | null>(anchors[0]?.id ?? null);
  const navRef = useRef<HTMLElement | null>(null);

  // Scroll-spy con IntersectionObserver. No-op si no hay anclas en el DOM.
  useEffect(() => {
    if (!capabilities.scrollSpy || typeof window === "undefined") return;
    const targets = anchors
      .map((a) => document.getElementById(a.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (targets.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActiveId(visible.target.id);
      },
      { rootMargin: `-${scrollOffset + 8}px 0px -60% 0px`, threshold: [0, 0.25, 0.6] },
    );
    targets.forEach((t) => obs.observe(t));
    return () => obs.disconnect();
  }, [anchors, capabilities.scrollSpy, scrollOffset]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, a: ExperienceSubnavAnchor) => {
      const el = typeof document !== "undefined" ? document.getElementById(a.id) : null;
      if (!el) return; // fallback al comportamiento nativo con #hash
      e.preventDefault();
      const y = el.getBoundingClientRect().top + window.scrollY - scrollOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
      setActiveId(a.id);
      history.replaceState(null, "", `#${a.id}`);
    },
    [scrollOffset],
  );

  if (anchors.length === 0) return null;

  return (
    <nav
      ref={navRef}
      aria-label={ariaLabel}
      className={cn(
        "z-30 w-full border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70",
        sticky ? "sticky top-0" : "relative",
        className,
      )}
      data-eb-block="experience-subnav"
    >
      <ul
        className={cn(
          "-mx-4 flex items-center gap-1 overflow-x-auto px-4 py-2 [scrollbar-width:none]",
          "sm:mx-0 sm:overflow-visible sm:px-0",
        )}
        style={{ scrollSnapType: "x proximity" }}
      >
        {anchors.map((a) => {
          const isActive = a.id === activeId;
          const base =
            "inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap text-sm font-medium transition focus-visible:outline-none focus-visible:ring-focus";
          const styles =
            variant === "tabs"
              ? cn(
                  base,
                  "border-b-2 px-3 pb-2 pt-1",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )
              : variant === "underline"
                ? cn(
                    base,
                    "px-3 py-2 relative",
                    isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                    isActive &&
                      "after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:rounded-pill after:bg-primary",
                  )
                : cn(
                    base,
                    "rounded-pill px-3.5 py-1.5",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  );
          return (
            <li key={a.id} style={{ scrollSnapAlign: "start" }}>
              <a
                href={`#${a.id}`}
                onClick={(e) => handleClick(e, a)}
                aria-current={isActive ? "location" : undefined}
                className={styles}
              >
                {capabilities.showIcons ? (
                  <AnchorIcon name={a.iconKey} className="h-4 w-4" />
                ) : null}
                {a.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}