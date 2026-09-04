/**
 * `ExperienceFiltersBar` — presentación compacta de filtros del listado
 * de Experiencias (patrón Airbnb).
 *
 * Sólo presentación/UX: no conoce datos ni contratos CMS. Recibe los
 * grupos ya calculados y el estado de selección, y devuelve cambios.
 *
 * · Desktop ≥1200: barra con máximo 3 controles principales (popover)
 *   + "Todos los filtros".
 * · Tablet 768–1199: barra horizontal deslizable + "Más filtros".
 * · Móvil ≤767: botón "Filtros" con contador + 2 chips rápidos.
 *
 * El panel completo vive en un Sheet (lateral en ≥768, inferior en
 * móvil) con grupos, contador, "Limpiar" y CTA fijo "Mostrar N".
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface FilterOptionVM {
  value: string;
  label: string;
  count: number;
}

export interface FilterGroupVM {
  id: string;
  label: string;
  options: FilterOptionVM[];
}

export type FilterSelection = Record<string, string[]>;

export interface ExperienceFiltersBarProps {
  groups: readonly FilterGroupVM[];
  selection: FilterSelection;
  onToggle: (groupId: string, value: string) => void;
  onClear: () => void;
  /** Número de resultados con la selección actual. */
  resultCount: number;
  /** Ids de grupos que se muestran como control principal en la barra. */
  primaryGroupIds?: readonly string[];
  className?: string;
}

const DEFAULT_PRIMARY = ["destino", "tipo", "duracion"] as const;

function countSelected(selection: FilterSelection): number {
  return Object.values(selection).reduce((total, values) => total + (values?.length ?? 0), 0);
}

/** Altura real del header sticky para calcular el offset de la barra. */
function useStickyOffset(): number {
  const [offset, setOffset] = useState(64);
  useEffect(() => {
    const measure = () => {
      const header = document.querySelector("header");
      const height = header?.getBoundingClientRect().height ?? 64;
      setOffset(Math.round(height));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  return offset;
}

export function ExperienceFiltersBar({
  groups,
  selection,
  onToggle,
  onClear,
  resultCount,
  primaryGroupIds = DEFAULT_PRIMARY,
  className,
}: ExperienceFiltersBarProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const offset = useStickyOffset();
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);

  const primary = useMemo(
    () =>
      primaryGroupIds
        .map((id) => groups.find((group) => group.id === id))
        .filter((group): group is FilterGroupVM => Boolean(group)),
    [groups, primaryGroupIds],
  );

  const total = countSelected(selection);
  if (groups.length === 0) return null;

  return (
    <>
      <div
        className={cn(
          "sticky z-20 -mx-4 border-y border-border/70 bg-background/95 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-pill sm:border sm:px-3",
          className,
        )}
        style={{ top: offset }}
      >
        <div
          className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="group"
          aria-label="Filtros de experiencias"
        >
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setPanelOpen(true)}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-pill border border-border bg-background px-4 text-sm font-medium"
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            <span>{isMobile ? "Filtros" : "Todos los filtros"}</span>
            {total > 0 ? (
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                {total}
              </span>
            ) : null}
          </button>

          {primary.map((group, index) => (
            <QuickFilter
              key={group.id}
              group={group}
              selected={selection[group.id] ?? []}
              onToggle={onToggle}
              /* Móvil: máximo 2 chips rápidos. */
              className={index >= 2 ? "hidden md:inline-flex" : undefined}
            />
          ))}

          {total > 0 ? (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-pill px-3 text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              <X className="size-3.5" aria-hidden />
              Limpiar
            </button>
          ) : null}
        </div>
      </div>

      <Sheet
        open={panelOpen}
        onOpenChange={(open) => {
          setPanelOpen(open);
          if (!open) triggerRef.current?.focus();
        }}
      >
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          aria-label="Todos los filtros"
          className={cn(
            "flex flex-col gap-0 p-0",
            isMobile
              ? "max-h-[85vh] rounded-t-3xl"
              : "w-full max-w-md sm:max-w-md",
          )}
        >
          <header className="flex items-center justify-between border-b border-border px-5 py-4">
            <SheetTitle className="text-base font-semibold">Filtros</SheetTitle>
            {total > 0 ? (
              <button
                type="button"
                onClick={onClear}
                className="min-h-11 rounded-pill px-3 text-sm text-muted-foreground underline underline-offset-4"
              >
                Limpiar ({total})
              </button>
            ) : null}
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div className="space-y-6">
              {groups.map((group) => (
                <section key={group.id} aria-labelledby={`filtro-${group.id}`}>
                  <h3
                    id={`filtro-${group.id}`}
                    className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {group.label}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {group.options.map((option) => (
                      <OptionChip
                        key={option.value}
                        option={option}
                        selected={(selection[group.id] ?? []).includes(option.value)}
                        onSelect={() => onToggle(group.id, option.value)}
                        wrap
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>

          <footer className="border-t border-border bg-background px-5 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="min-h-11 w-full rounded-pill bg-primary px-5 text-sm font-semibold text-primary-foreground"
            >
              Mostrar {resultCount} {resultCount === 1 ? "experiencia" : "experiencias"}
            </button>
          </footer>
        </SheetContent>
      </Sheet>
    </>
  );
}

function QuickFilter({
  group,
  selected,
  onToggle,
  className,
}: {
  group: FilterGroupVM;
  selected: string[];
  onToggle: (groupId: string, value: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const label =
    selected.length === 0
      ? group.label
      : selected.length === 1
        ? (group.options.find((option) => option.value === selected[0])?.label ?? group.label)
        : `${group.label} · ${selected.length}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex min-h-11 max-w-[13rem] shrink-0 items-center gap-1.5 rounded-pill border px-4 text-sm",
            selected.length > 0
              ? "border-primary bg-primary/10 text-foreground"
              : "border-border bg-background",
            className,
          )}
        >
          <span className="truncate">{label}</span>
          <ChevronDown className="size-3.5 shrink-0 opacity-70" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-80 w-72 overflow-y-auto p-2">
        <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {group.label}
        </p>
        <div className="flex flex-col gap-1">
          {group.options.map((option) => (
            <OptionChip
              key={option.value}
              option={option}
              selected={selected.includes(option.value)}
              onSelect={() => onToggle(group.id, option.value)}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function OptionChip({
  option,
  selected,
  onSelect,
  wrap = false,
}: {
  option: FilterOptionVM;
  selected: boolean;
  onSelect: () => void;
  wrap?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex min-h-11 items-center gap-2 rounded-pill border px-3 text-left text-sm",
        wrap ? "max-w-full" : "w-full",
        selected ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background",
      )}
    >
      <span className={cn("min-w-0", wrap ? "truncate" : "flex-1 truncate")}>{option.label}</span>
      <span className="shrink-0 text-xs text-muted-foreground">{option.count}</span>
    </button>
  );
}
