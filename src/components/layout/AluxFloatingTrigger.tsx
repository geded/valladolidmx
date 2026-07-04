/**
 * AluxFloatingTrigger — Concierge contextual del Oriente Maya (US-E1.1).
 *
 * Presencia transversal de Alux. Abre un Sheet que prioriza el
 * CONTEXTO del recorrido (Where am I? · What am I exploring? · What's
 * near? · What next? · Why?) antes que la conversación. Sin contexto
 * territorial vivo, el trigger cae al modo informativo clásico
 * (enlace a /alux).
 *
 * Fuente única del contexto: `useAluxContext()` → Context Engine +
 * Navigation Session. Las sugerencias contextuales las provee la server
 * fn pública `aluxContextualSuggest` (US-E1.2), sin motor paralelo.
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight, Compass, MapPin, Sparkles } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAluxContext, type AluxContextSlot } from "@/lib/alux/use-alux-context";
import {
  aluxContextualSuggest,
  type AluxContextualSuggestion,
} from "@/lib/alux/contextual-suggest.functions";
import { useTranslation } from "@/i18n/context";

function ContextChip({ slot }: { slot: AluxContextSlot }) {
  const content = (
    <span className="inline-flex items-center rounded-full border border-border bg-card/70 px-2.5 py-1 text-[11px] font-medium text-foreground">
      {slot.label}
    </span>
  );
  if (!slot.href) return content;
  return (
    <a
      href={slot.href}
      className="inline-flex items-center rounded-full border border-border bg-card/70 px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-card"
    >
      {slot.label}
    </a>
  );
}

export function AluxFloatingTrigger() {
  const { t } = useTranslation();
  const ctx = useAluxContext();
  const [open, setOpen] = useState(false);

  // Sin contexto territorial vivo/rehidratado → comportamiento clásico.
  if (!ctx.hasContext) {
    return (
      <div className="pointer-events-none fixed bottom-4 right-4 z-40 md:bottom-6 md:right-6">
        <Link
          to="/alux"
          title={t("alux_floating")}
          className="pointer-events-auto group flex items-center gap-2 rounded-md border border-border bg-card/90 px-3.5 py-2 text-[13px] font-medium text-foreground shadow-lg backdrop-blur-md transition-all hover:bg-card active:scale-[0.98]"
        >
          <span className="grid size-6 place-items-center rounded-full bg-primary/15 text-primary">
            <Sparkles className="size-3.5" aria-hidden />
          </span>
          <span className="hidden sm:inline">Alux</span>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            · {t("alux_floating")}
          </span>
        </Link>
      </div>
    );
  }

  const chain: AluxContextSlot[] = [
    ctx.destination,
    ctx.category,
    ctx.business,
    ctx.product,
  ].filter((s): s is AluxContextSlot => Boolean(s));

  const current = chain[chain.length - 1];
  const originLabel =
    ctx.origin === "live"
      ? "Contexto en vivo"
      : "Contexto reciente";

  return (
    <>
      <div className="pointer-events-none fixed bottom-4 right-4 z-40 md:bottom-6 md:right-6">
        <button
          type="button"
          onClick={() => setOpen(true)}
          title={`Alux · ${current?.label ?? ""}`}
          className="pointer-events-auto group flex max-w-[80vw] items-center gap-2 rounded-full border border-border bg-card/90 px-3.5 py-2 text-[13px] font-medium text-foreground shadow-lg backdrop-blur-md transition-all hover:bg-card active:scale-[0.98]"
        >
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
            <Sparkles className="size-3.5" aria-hidden />
          </span>
          <span className="hidden sm:inline">Alux</span>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            · Concierge IA
          </span>
          <span className="ml-1 truncate text-xs text-muted-foreground sm:hidden">
            {current?.label}
          </span>
        </button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full max-w-md flex-col gap-6 overflow-y-auto"
        >
          <SheetHeader className="text-left">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-full bg-primary/15 text-primary">
                <Sparkles className="size-4" aria-hidden />
              </span>
              <div>
                <SheetTitle className="text-lg">Alux · Concierge IA del Oriente Maya</SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  {originLabel} · te acompaña mientras exploras el destino.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* ¿Dónde estoy? */}
          <section aria-labelledby="alux-where">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <MapPin className="size-3.5" aria-hidden />
              <span id="alux-where">Dónde estás</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {chain.map((slot) => (
                <ContextChip key={`${slot.slug}-${slot.label}`} slot={slot} />
              ))}
            </div>
          </section>

          {/* ¿Qué estoy explorando? + ¿Por qué? */}
          <section aria-labelledby="alux-what" className="rounded-2xl border border-border bg-card/60 p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <Compass className="size-3.5" aria-hidden />
              <span id="alux-what">Qué estás explorando</span>
            </div>
            <p className="mt-2 text-sm text-foreground">{ctx.reason}</p>
            {current?.href && (
              <a
                href={current.href}
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Ver {current.label}
                <ArrowRight className="size-3.5" aria-hidden />
              </a>
            )}
          </section>

          {/* ¿Qué hay cerca / qué me recomiendas después? */}
          <section aria-labelledby="alux-next">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <Sparkles className="size-3.5" aria-hidden />
              <span id="alux-next">Qué explorar cerca</span>
            </div>
            {ctx.related.length > 0 ? (
              <ul className="mt-2 grid gap-2">
                {ctx.related.slice(0, 6).map((slot) => (
                  <li key={`${slot.slug}-${slot.label}`}>
                    {slot.href ? (
                      <a
                        href={slot.href}
                        className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card/60 px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-card"
                      >
                        <span className="truncate">{slot.label}</span>
                        <ArrowRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                      </a>
                    ) : (
                      <div className="rounded-xl border border-border bg-card/40 px-3 py-2.5 text-sm text-muted-foreground">
                        {slot.label}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Sigue explorando {ctx.destination?.label ?? "el Oriente Maya"} y Alux te
                sugerirá qué visitar a continuación.
              </p>
            )}
            <p className="mt-3 text-[11px] text-muted-foreground">
              Sugerencias derivadas del contexto real de tu recorrido, nunca inventadas.
            </p>
          </section>

          <div className="mt-auto border-t border-border pt-4">
            <Link
              to="/alux"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Conocer más sobre Alux
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
