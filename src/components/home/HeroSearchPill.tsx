/**
 * HeroSearchPill — Buscador Airbnb-style para el Hero de Home.
 *
 * Píldora horizontal con 2 segmentos (Destino → Categoría) y botón lupa.
 * Cada segmento abre un Popover con la lista de opciones. Al enviar, navega
 * a la ruta canónica del Navigation Blueprint:
 *   /oriente-maya/:destino/:categoria
 * Si sólo se elige destino → /oriente-maya/:destino
 * Si sólo categoría (sin destino) → /oriente-maya (con hint futura).
 */
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, MapPin, Compass, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DESTINOS_MOCK } from "@/mocks/destinos";
import { CATEGORIAS_MOCK } from "@/mocks/categorias";
import { cn } from "@/lib/utils";

interface Option {
  slug: string;
  name: string;
  hint?: string;
}

const DESTINO_OPTIONS: Option[] = DESTINOS_MOCK.map((d) => ({
  slug: d.slug,
  name: d.name,
  hint: d.tagline,
}));

const CATEGORIA_OPTIONS: Option[] = CATEGORIAS_MOCK.map((c) => ({
  slug: c.slug,
  name: c.name,
  hint: c.description,
}));

export interface HeroSearchPillProps {
  destinoLabel?: string;
  destinoPlaceholder?: string;
  categoriaLabel?: string;
  categoriaPlaceholder?: string;
  submitLabel?: string;
  align?: "left" | "center" | "right";
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
}

export function HeroSearchPill({
  destinoLabel = "Destino",
  destinoPlaceholder = "¿A dónde vas?",
  categoriaLabel = "Categoría",
  categoriaPlaceholder = "¿Qué buscas?",
  submitLabel = "Buscar",
  align = "left",
  maxWidth = "xl",
}: HeroSearchPillProps) {
  const navigate = useNavigate();
  const [destino, setDestino] = useState<Option | null>(null);
  const [categoria, setCategoria] = useState<Option | null>(null);
  const [openDestino, setOpenDestino] = useState(false);
  const [openCategoria, setOpenCategoria] = useState(false);

  const wrapperJustify =
    align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start";
  const maxWidthClass =
    maxWidth === "sm"
      ? "max-w-sm"
      : maxWidth === "md"
        ? "max-w-md"
        : maxWidth === "lg"
          ? "max-w-lg"
          : maxWidth === "full"
            ? "max-w-none"
            : "max-w-2xl";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (destino && categoria) {
      navigate({
        to: "/oriente-maya/$destino/$categoria",
        params: { destino: destino.slug, categoria: categoria.slug },
      });
      return;
    }
    if (destino) {
      navigate({ to: "/oriente-maya/$destino", params: { destino: destino.slug } });
      return;
    }
    if (!destino) {
      setOpenDestino(true);
      return;
    }
    navigate({ to: "/oriente-maya" });
  };

  return (
    <form
      role="search"
      aria-label="Buscador principal"
      onSubmit={handleSubmit}
      className={cn("flex w-full", wrapperJustify)}
    >
      <div
        className={cn(
          "flex w-full items-stretch rounded-full bg-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.35)] ring-1 ring-black/5 backdrop-blur-sm",
          "p-1 gap-1",
          maxWidthClass,
        )}
      >
        {/* Segmento: Destino */}
        <Popover open={openDestino} onOpenChange={setOpenDestino}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "group relative flex flex-1 items-center gap-2 rounded-full px-3 py-1.5 text-left transition-colors",
                "hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                openDestino && "bg-muted/70",
              )}
            >
              <MapPin className="size-4 shrink-0 text-primary" aria-hidden />
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {destinoLabel}
                </span>
                <span
                  className={cn(
                    "truncate text-[13px]",
                    destino ? "font-medium text-foreground" : "text-muted-foreground/80",
                  )}
                >
                  {destino?.name ?? destinoPlaceholder}
                </span>
              </span>
              <ChevronDown className="ml-auto size-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-1.5">
            <OptionList
              options={DESTINO_OPTIONS}
              selected={destino?.slug}
              onSelect={(opt) => {
                setDestino(opt);
                setOpenDestino(false);
                if (!categoria) setTimeout(() => setOpenCategoria(true), 80);
              }}
              emptyLabel="Sin destinos disponibles"
            />
          </PopoverContent>
        </Popover>

        {/* Divisor */}
        <div aria-hidden className="my-auto h-6 w-px bg-border/70" />

        {/* Segmento: Categoría */}
        <Popover open={openCategoria} onOpenChange={setOpenCategoria}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "group relative flex flex-1 items-center gap-2 rounded-full px-3 py-1.5 text-left transition-colors",
                "hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                openCategoria && "bg-muted/70",
              )}
            >
              <Compass className="size-4 shrink-0 text-primary" aria-hidden />
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {categoriaLabel}
                </span>
                <span
                  className={cn(
                    "truncate text-[13px]",
                    categoria ? "font-medium text-foreground" : "text-muted-foreground/80",
                  )}
                >
                  {categoria?.name ?? categoriaPlaceholder}
                </span>
              </span>
              <ChevronDown className="ml-auto size-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 p-1.5">
            <OptionList
              options={CATEGORIA_OPTIONS}
              selected={categoria?.slug}
              onSelect={(opt) => {
                setCategoria(opt);
                setOpenCategoria(false);
              }}
              emptyLabel="Sin categorías disponibles"
            />
          </PopoverContent>
        </Popover>

        {/* Botón lupa */}
        <button
          type="submit"
          aria-label={submitLabel}
          className={cn(
            "ml-1 inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-3 text-primary-foreground shadow-md",
            "transition-all hover:brightness-110 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
          )}
        >
          <Search className="size-4" aria-hidden />
          <span className="hidden text-sm font-semibold sm:inline">{submitLabel}</span>
        </button>
      </div>
    </form>
  );
}

function OptionList({
  options,
  selected,
  onSelect,
  emptyLabel,
}: {
  options: Option[];
  selected?: string;
  onSelect: (opt: Option) => void;
  emptyLabel: string;
}) {
  if (options.length === 0) {
    return <div className="p-3 text-sm text-muted-foreground">{emptyLabel}</div>;
  }
  return (
    <ul className="max-h-72 overflow-y-auto">
      {options.map((opt) => {
        const isActive = opt.slug === selected;
        return (
          <li key={opt.slug}>
            <button
              type="button"
              onClick={() => onSelect(opt)}
              className={cn(
                "flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition-colors",
                "hover:bg-muted focus:outline-none focus-visible:bg-muted",
                isActive && "bg-muted",
              )}
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium text-foreground">{opt.name}</span>
                {opt.hint ? (
                  <span className="truncate text-xs text-muted-foreground">{opt.hint}</span>
                ) : null}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}