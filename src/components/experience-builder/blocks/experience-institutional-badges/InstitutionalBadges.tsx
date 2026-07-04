/**
 * H-03 · Ola I3.c — `vmx.experience.institutional-badges` (Capa 1: Presentación).
 *
 * Consume tokens `--color-badge-*` y `--badge-*` introducidos en M1
 * (I3.d.2). No hardcodea colores. No define estilos condicionales por tema.
 */
import { Fragment, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  getBadgeRegistryEntry,
  isBadgeAuthorized,
} from "@/lib/experience-builder/blocks/experience-institutional-badges/institutional-badges.registry";
import type {
  ExperienceBadgesDTO,
  InstitutionalBadgeItem,
} from "@/lib/experience-builder/blocks/experience-institutional-badges/contract";

export interface InstitutionalBadgesProps {
  dto: ExperienceBadgesDTO;
  /** Slug del sujeto (destino/negocio/producto) — para autorizaciones. */
  subjectSlug?: string;
  className?: string;
}

/* -------------------------------------------------------------------------- */
/* Sub-componente atómico: un badge individual                                */
/* -------------------------------------------------------------------------- */

interface BadgeChipProps {
  item: InstitutionalBadgeItem;
  variant: ExperienceBadgesDTO["variant"];
  size: ExperienceBadgesDTO["size"];
  showLabel: boolean;
  monochrome: boolean;
  linkToProgram: boolean;
}

function BadgeChip({
  item,
  variant,
  size,
  showLabel,
  monochrome,
  linkToProgram,
}: BadgeChipProps) {
  const entry = getBadgeRegistryEntry(item.kind);
  const Icon = entry.icon;
  const label = item.label || entry.label;

  // Estilos derivados 100% de tokens M1. Sin colores literales.
  const colorVar = monochrome ? "var(--color-foreground)" : `var(--color-${entry.colorToken})`;
  const fgVar = monochrome
    ? "var(--color-background)"
    : `var(--color-${entry.colorToken}-foreground)`;

  const style: React.CSSProperties = {
    height: `var(--badge-h-${size})`,
    paddingInline:
      variant === "icon-only" ? 0 : `var(--badge-px-${size})`,
    width: variant === "icon-only" ? `var(--badge-h-${size})` : undefined,
    gap: `var(--badge-gap-${size})`,
    fontSize: `var(--badge-text-${size})`,
    borderRadius:
      variant === "icon-only" ? "999px" : "var(--radius-badge)",
    boxShadow: "var(--shadow-badge)",
  };

  const variantStyle: React.CSSProperties = (() => {
    switch (variant) {
      case "filled":
      case "icon-only":
        return { background: colorVar, color: fgVar, border: "1px solid transparent" };
      case "outline":
        return {
          background: "transparent",
          color: colorVar,
          border: `1px solid currentColor`,
        };
      case "soft":
      default:
        return {
          background: `color-mix(in oklab, ${colorVar} 14%, transparent)`,
          color: colorVar,
          border: `1px solid color-mix(in oklab, ${colorVar} 22%, transparent)`,
        };
    }
  })();

  const iconSizePx = size === "sm" ? 12 : size === "lg" ? 18 : 14;
  const showText = showLabel && variant !== "icon-only";
  const isLink = linkToProgram && (item.programUrl || entry.programUrl);
  const href = item.programUrl || entry.programUrl || "";

  const inner = (
    <>
      <Icon
        style={{ width: iconSizePx, height: iconSizePx }}
        strokeWidth={1.5}
        aria-hidden="true"
      />
      {showText ? (
        <span className="font-medium tracking-tight whitespace-nowrap">{label}</span>
      ) : null}
    </>
  );

  const commonClass =
    "inline-flex items-center justify-center select-none transition-shadow duration-[160ms] motion-reduce:transition-none hover:shadow-[var(--shadow-raised)]";

  if (isLink) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        role="link"
        aria-label={variant === "icon-only" ? label : undefined}
        className={commonClass}
        style={{ ...style, ...variantStyle }}
      >
        {inner}
      </a>
    );
  }

  return (
    <span
      role={variant === "icon-only" ? "img" : "img"}
      aria-label={variant === "icon-only" ? label : undefined}
      className={commonClass}
      style={{ ...style, ...variantStyle }}
    >
      {inner}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Componente principal                                                       */
/* -------------------------------------------------------------------------- */

export function InstitutionalBadges({
  dto,
  subjectSlug,
  className,
}: InstitutionalBadgesProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { variant, size, layout, items, ariaLabel, capabilities } = dto;

  // 1) Autorización institucional (§12).
  const authorized = items.filter((it) => isBadgeAuthorized(it.kind, subjectSlug));
  if (authorized.length === 0) return null;

  // 2) Orden fijo por prioridad institucional (§8, no configurable).
  const ordered = [...authorized].sort((a, b) => {
    const pa = getBadgeRegistryEntry(a.kind).priority;
    const pb = getBadgeRegistryEntry(b.kind).priority;
    if (pa !== pb) return pa - pb;
    return a.slug.localeCompare(b.slug);
  });

  const mobileMax = capabilities.mobileVisibleMax;

  const renderChip = (it: InstitutionalBadgeItem, i: number) => {
    const entry = getBadgeRegistryEntry(it.kind);
    const tooltipText = it.label || entry.tooltip || entry.label;
    const chip = (
      <BadgeChip
        item={it}
        variant={variant}
        size={size}
        showLabel={capabilities.showLabel && !capabilities.compact}
        monochrome={capabilities.monochrome}
        linkToProgram={capabilities.linkToProgram}
      />
    );
    if (!capabilities.showTooltip && variant !== "icon-only") {
      return <Fragment key={`${it.kind}:${it.slug}:${i}`}>{chip}</Fragment>;
    }
    return (
      <Tooltip key={`${it.kind}:${it.slug}:${i}`}>
        <TooltipTrigger asChild>
          <span className="inline-flex">{chip}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {tooltipText}
          {it.issuedAt ? (
            <span className="ml-1 opacity-70">· {new Date(it.issuedAt).getFullYear()}</span>
          ) : null}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider delayDuration={120}>
      <div
        role="group"
        aria-label={ariaLabel}
        data-eb-block="experience-institutional-badges"
        data-layout={layout}
        className={cn("w-full", className)}
      >
        {/* Desktop / tablet: todos visibles */}
        <ul
          role="list"
          className={cn(
            "hidden sm:flex flex-wrap items-center",
            layout === "stack" && "flex-col items-start",
          )}
          style={{ gap: `var(--badge-gap-${size})` }}
        >
          {ordered.map((it, i) => (
            <li key={`${it.kind}:${it.slug}:${i}`} className="inline-flex">
              {renderChip(it, i)}
            </li>
          ))}
        </ul>

        {/* Móvil: 3 primeros + chip "+N" que abre Sheet */}
        <ul
          role="list"
          className={cn(
            "flex sm:hidden flex-wrap items-center",
            layout === "stack" && "flex-col items-start",
          )}
          style={{ gap: `var(--badge-gap-${size === "lg" ? "md" : "sm"})` }}
        >
          {ordered.slice(0, mobileMax).map((it, i) => (
            <li key={`m:${it.kind}:${it.slug}:${i}`} className="inline-flex">
              <BadgeChip
                item={it}
                variant={variant === "icon-only" ? "icon-only" : "soft"}
                size={size === "lg" ? "md" : "sm"}
                showLabel={capabilities.showLabel && !capabilities.compact}
                monochrome={capabilities.monochrome}
                linkToProgram={capabilities.linkToProgram}
              />
            </li>
          ))}
          {ordered.length > mobileMax ? (
            <li className="inline-flex">
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-full border border-border bg-muted text-foreground/80 font-medium hover:bg-muted/80"
                    style={{
                      height: `var(--badge-h-sm)`,
                      paddingInline: `var(--badge-px-sm)`,
                      fontSize: `var(--badge-text-sm)`,
                    }}
                    aria-label={`Ver ${ordered.length - mobileMax} distintivos adicionales`}
                  >
                    +{ordered.length - mobileMax}
                  </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="max-h-[75vh]">
                  <SheetHeader>
                    <SheetTitle>Distintivos institucionales</SheetTitle>
                  </SheetHeader>
                  <ul
                    role="list"
                    className="mt-4 flex flex-wrap items-center"
                    style={{ gap: `var(--badge-gap-md)` }}
                  >
                    {ordered.map((it, i) => (
                      <li key={`sheet:${it.kind}:${it.slug}:${i}`} className="inline-flex">
                        <BadgeChip
                          item={it}
                          variant="soft"
                          size="md"
                          showLabel
                          monochrome={capabilities.monochrome}
                          linkToProgram={capabilities.linkToProgram}
                        />
                      </li>
                    ))}
                  </ul>
                </SheetContent>
              </Sheet>
            </li>
          ) : null}
        </ul>
      </div>
    </TooltipProvider>
  );
}