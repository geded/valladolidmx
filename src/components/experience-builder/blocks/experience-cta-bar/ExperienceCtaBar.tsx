/**
 * H-03 · Ola I1.b — `vmx.experience.cta-bar` (Capa 1: Presentación).
 *
 * Componente puro. Sticky mobile-first, safe-area-inset, min-h 44px.
 * Aparece tras `revealAfterScroll` px si > 0.
 */
import { useEffect, useState } from "react";
import {
  Calendar,
  Heart,
  MessageCircle,
  Phone,
  Share2,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ExperienceCtaBarAction,
  ExperienceCtaBarDTO,
} from "@/lib/experience-builder/blocks/experience-cta-bar/contract";

const ICONS: Record<string, LucideIcon> = {
  calendar: Calendar,
  heart: Heart,
  "message-circle": MessageCircle,
  phone: Phone,
  share: Share2,
  cart: ShoppingBag,
};

function ActionIcon({ name, className }: { name?: string; className?: string }) {
  if (!name) return null;
  const I = ICONS[name];
  if (!I) return null;
  return <I className={className} aria-hidden="true" />;
}

export interface ExperienceCtaBarProps {
  dto: ExperienceCtaBarDTO;
  onAction?: (a: ExperienceCtaBarAction) => void;
  className?: string;
}

export function ExperienceCtaBar({ dto, onAction, className }: ExperienceCtaBarProps) {
  const { variant, actions, revealAfterScroll, desktopPosition, label, meta, ariaLabel } = dto;
  const [visible, setVisible] = useState(revealAfterScroll === 0);

  useEffect(() => {
    if (revealAfterScroll === 0 || typeof window === "undefined") {
      setVisible(true);
      return;
    }
    const onScroll = () => setVisible(window.scrollY >= revealAfterScroll);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [revealAfterScroll]);

  if (actions.length === 0) return null;

  const containerBase =
    variant === "inline"
      ? "relative w-full"
      : cn(
          "fixed left-0 right-0 z-40 transition-transform duration-300",
          desktopPosition === "top" ? "top-0" : "bottom-0",
          visible ? "translate-y-0 opacity-100" : desktopPosition === "top" ? "-translate-y-full opacity-0" : "translate-y-full opacity-0",
        );

  const inner = (
    <div
      className={cn(
        "mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3",
        variant === "floating"
          ? "rounded-full border border-border bg-background/95 shadow-lg backdrop-blur sm:max-w-2xl"
          : variant === "bar"
            ? "border-t border-border bg-background/95 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur"
            : "rounded-2xl border border-border bg-card",
      )}
      style={{
        paddingBottom:
          variant !== "inline" && desktopPosition === "bottom"
            ? "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)"
            : undefined,
      }}
    >
      {(label || meta) && (
        <div className="min-w-0 flex-1">
          {label ? (
            <p className="truncate text-sm font-semibold text-foreground">{label}</p>
          ) : null}
          {meta ? (
            <p className="truncate text-xs text-muted-foreground">{meta}</p>
          ) : null}
        </div>
      )}
      <div className="ml-auto flex items-center gap-2">
        {actions.map((a, i) => {
          const iconOnly = !a.label && Boolean(a.iconKey);
          const classes = cn(
            "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            iconOnly ? "px-3" : "px-4",
            a.emphasis === "primary"
              ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
              : a.emphasis === "ghost"
                ? "text-foreground hover:bg-muted"
                : "bg-background text-foreground ring-1 ring-border hover:bg-muted",
          );
          const inner = (
            <>
              <ActionIcon name={a.iconKey} className="h-4 w-4" />
              {a.label ? <span>{a.label}</span> : null}
            </>
          );
          if (onAction) {
            return (
              <button
                key={i}
                type="button"
                className={classes}
                onClick={() => onAction(a)}
                aria-label={a.label || a.action}
              >
                {inner}
              </button>
            );
          }
          const href = a.href ?? "#";
          return (
            <a key={i} className={classes} href={href} aria-label={a.label || a.action}>
              {inner}
            </a>
          );
        })}
      </div>
    </div>
  );

  return (
    <div
      role="region"
      aria-label={ariaLabel}
      className={cn(containerBase, className)}
      data-eb-block="experience-cta-bar"
    >
      {variant === "floating" ? (
        <div className="mx-auto max-w-6xl px-3 pb-3 sm:pb-4">{inner}</div>
      ) : (
        inner
      )}
    </div>
  );
}