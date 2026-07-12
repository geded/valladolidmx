/**
 * AluxFloatingTrigger — Concierge contextual del Oriente Maya (US-E1.1).
 *
 * Presencia transversal de Alux. Abre SIEMPRE un Sheet superpuesto
 * (nunca navega afuera) que prioriza el CONTEXTO del recorrido
 * (Where am I? · What am I exploring? · What's near? · Why?).
 *
 * AT-0 · Política de Presencia (2026-07-05):
 *  · Se oculta automáticamente en superficies con CTA sticky comercial
 *    (ficha de empresa, ficha de producto, carrito, pagos) para no
 *    solaparlas. En esas superficies Alux aparece embebido en el
 *    contenido, no como flotante — regla en `useAluxFloatingPresence`.
 *
 * AT-0.1 · Unificación de superficie (2026-07-05):
 *  · El Sheet es la ÚNICA superficie del flotante. Se eliminó el
 *    fallback que llevaba a `/alux` y el link "Conocer más sobre Alux"
 *    del pie del Sheet: Alux es un copiloto contextual, no una página
 *    aparte. Cuando no hay contexto territorial vivo, el Sheet abre en
 *    modo "descubrimiento" e invita a explorar destinos del Oriente
 *    Maya sin sacar al visitante de la superficie actual.
 *
 * AT-2 · Sheet productivo (2026-07-05):
 *  · Consume sugerencias reales (server fn productiva).
 *  · Agrupa por categoría publicada (hoteles / restaurantes /
 *    experiencias / otras) para volver navegable el bloque "Qué explorar".
 *  · Muestra un microbadge "✨ Alux" cuando el rationale viene del
 *    modelo, y avisa con un chip discreto si el gateway está sin cuota
 *    o rate-limited (las sugerencias siguen sirviéndose desde catálogo).
 *  · Loading con skeletons — nunca queda "en blanco".
 *
 * Fuente única del contexto: `useAluxContext()` → Context Engine +
 * Navigation Session. Las sugerencias contextuales las provee la server
 * fn pública `aluxContextualSuggest` (US-E1.2), sin motor paralelo.
 */
import { ArrowRight, Compass, MapPin, Sparkles } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRouterState } from "@tanstack/react-router";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAluxContext, type AluxContext, type AluxContextSlot } from "@/lib/alux/use-alux-context";
import { useAluxFloatingPresence } from "@/lib/alux/floating-presence";
import { useVisitorGeolocation } from "@/components/maps/useVisitorGeolocation";
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
  const rawCtx = useAluxContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Sólo confiamos en el contexto territorial cuando la ruta actual
  // pertenece al árbol `/oriente-maya/*`. En cualquier otra superficie
  // (Home, Marketplace, /alux, /cuenta, etc.) el Sheet abre siempre en
  // "modo descubrimiento" — nunca arrastra el destino/ficha anterior.
  const contextIsRelevant = pathname.startsWith("/oriente-maya/");
  const ctx: AluxContext = contextIsRelevant
    ? rawCtx
    : {
        hasContext: false,
        related: [],
        reason: rawCtx.reason,
        origin: "none",
        region: undefined,
        destination: undefined,
        category: undefined,
        business: undefined,
        product: undefined,
        canonical: undefined,
      };
  const presence = useAluxFloatingPresence();
  const [open, setOpen] = useState(false);
  const geo = useVisitorGeolocation();
  const suggestFn = useServerFn(aluxContextualSuggest);
  const suggestionsQuery = useQuery({
    queryKey: [
      "alux",
      "contextual-suggest",
      ctx.destination?.slug ?? null,
      ctx.category?.slug ?? null,
      ctx.business?.slug ?? null,
      ctx.product?.slug ?? null,
    ],
    queryFn: () =>
      suggestFn({
        data: {
          region: ctx.region,
          destination: ctx.destination,
          category: ctx.category,
          business: ctx.business,
          product: ctx.product,
          limit: 6,
        },
      }),
    enabled: open && ctx.hasContext && Boolean(ctx.destination?.slug),
    staleTime: 60_000,
  });

  // AT-0: en superficies con CTA sticky comercial, cedemos el espacio.
  if (presence.shouldHide) return null;

  const chain: AluxContextSlot[] = [
    ctx.destination,
    ctx.category,
    ctx.business,
    ctx.product,
  ].filter((s): s is AluxContextSlot => Boolean(s));

  const current = chain[chain.length - 1];
  const originLabel = ctx.hasContext
    ? ctx.origin === "live"
      ? "Contexto en vivo"
      : "Contexto reciente"
    : "Modo descubrimiento";

  const triggerLabel = ctx.hasContext
    ? current?.label ?? "Concierge IA"
    : t("alux_floating");

  return (
    <>
      <div
        className="pointer-events-none fixed right-4 z-40 transition-[bottom] duration-300 md:right-6"
        style={{
          bottom: `calc(env(safe-area-inset-bottom, 0px) + ${1 + presence.bottomOffset / 16}rem)`,
        }}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          title={`Alux · ${triggerLabel}`}
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
            {triggerLabel}
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

          {/* Ubicación viva (A5) — opt-in contextual, no intrusivo. */}
          <section
            aria-labelledby="alux-geo"
            className="rounded-2xl border border-border bg-card/60 p-4"
          >
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <MapPin className="size-3.5" aria-hidden />
              <span id="alux-geo">Cercanía real</span>
            </div>
            {geo.status === "granted" && geo.location ? (
              <p className="mt-2 text-sm text-foreground">
                Compartiste tu ubicación. Puedo calcular distancias reales a
                hoteles, restaurantes y experiencias del Oriente Maya.
              </p>
            ) : (
              <>
                <p className="mt-2 text-sm text-foreground">
                  Compartir tu ubicación me permite priorizar lugares que
                  están realmente cerca de ti y calcular tiempos de traslado.
                </p>
                <button
                  type="button"
                  onClick={geo.request}
                  disabled={geo.status === "requesting"}
                  className="mt-3 inline-flex items-center gap-1 rounded-full border border-primary/40 bg-background px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
                >
                  <MapPin className="size-3.5" aria-hidden />
                  {geo.status === "requesting"
                    ? "Solicitando permiso…"
                    : geo.status === "denied"
                      ? "Permiso denegado — reintentar"
                      : geo.status === "unavailable"
                        ? "Ubicación no disponible"
                        : "Compartir mi ubicación"}
                </button>
              </>
            )}
          </section>

          {ctx.hasContext ? (
            <>
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
            </>
          ) : (
            /* Modo descubrimiento (sin contexto territorial) — AT-0.1 */
            <section
              aria-labelledby="alux-discover"
              className="rounded-2xl border border-border bg-card/60 p-4"
            >
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <Compass className="size-3.5" aria-hidden />
                <span id="alux-discover">Empieza a explorar</span>
              </div>
              <p className="mt-2 text-sm text-foreground">
                Aún no exploras un destino del Oriente Maya. Elige un Pueblo
                Mágico para que te acompañe con recomendaciones basadas en
                tu recorrido, nunca inventadas.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <ContextChip
                  slot={{ slug: "valladolid", label: "Valladolid", href: "/oriente-maya/valladolid" }}
                />
                <ContextChip
                  slot={{ slug: "izamal", label: "Izamal", href: "/oriente-maya/izamal" }}
                />
                <ContextChip
                  slot={{ slug: "espita", label: "Espita", href: "/oriente-maya/espita" }}
                />
              </div>
            </section>
          )}

          {/* ¿Qué hay cerca / qué me recomiendas después? */}
          <section aria-labelledby="alux-next">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <Sparkles className="size-3.5" aria-hidden />
              <span id="alux-next">Qué explorar cerca</span>
              {suggestionsQuery.data?.rationaleSource === "ai" && (
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  <Sparkles className="size-3" aria-hidden />
                  Alux
                </span>
              )}
            </div>
            {(suggestionsQuery.data?.aiStatus === "rate_limited" ||
              suggestionsQuery.data?.aiStatus === "credits_exhausted") && (
              <p className="mt-2 rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                {suggestionsQuery.data.aiStatus === "credits_exhausted"
                  ? "Alux está en pausa breve por cuota. Te mostramos sugerencias del catálogo mientras vuelve."
                  : "Alux está saturado en este momento. Te mostramos sugerencias del catálogo mientras se libera."}
              </p>
            )}
            {(() => {
              const remote = suggestionsQuery.data?.suggestions ?? [];
              const items: AluxContextualSuggestion[] = remote.length > 0
                ? [...remote]
                : ctx.related.slice(0, 6).map((slot) => ({
                    kind: "business" as const,
                    slug: slot.slug,
                    label: slot.label,
                    href: slot.href ?? "#",
                    rationale: `Relacionado con ${ctx.destination?.label ?? "tu recorrido"}.`,
                    source: { table: "context-engine", id: slot.slug },
                  }));
              if (suggestionsQuery.isLoading && items.length === 0) {
                return (
                  <ul className="mt-2 grid gap-2" aria-label="Cargando sugerencias">
                    {[0, 1, 2].map((i) => (
                      <li
                        key={i}
                        className="h-14 animate-pulse rounded-xl border border-border bg-card/40"
                      />
                    ))}
                  </ul>
                );
              }
              if (items.length === 0) {
                return (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {suggestionsQuery.data?.reason
                      ?? `Sigue explorando ${ctx.destination?.label ?? "el Oriente Maya"} y Alux te sugerirá qué visitar a continuación.`}
                  </p>
                );
              }
              // Agrupar por categoría publicada para volver navegable el bloque.
              const groups = new Map<string, { label: string; items: AluxContextualSuggestion[] }>();
              for (const it of items) {
                const key = it.categorySlug ?? "otras";
                const label = it.categoryName ?? "Otras opciones";
                if (!groups.has(key)) groups.set(key, { label, items: [] });
                groups.get(key)!.items.push(it);
              }
              const grouped = Array.from(groups.values());
              const showGroupHeaders = grouped.length > 1;
              return (
                <div className="mt-2 grid gap-4">
                  {grouped.map((g) => (
                    <div key={g.label}>
                      {showGroupHeaders && (
                        <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
                          {g.label}
                        </p>
                      )}
                      <ul className="grid gap-2">
                        {g.items.map((item) => (
                          <li key={`${item.source.table}-${item.source.id}`}>
                            <a
                              href={item.href}
                              className="group flex items-start justify-between gap-3 rounded-xl border border-border bg-card/60 px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-card"
                            >
                              <span className="min-w-0">
                                <span className="block truncate font-medium">{item.label}</span>
                                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                                  {item.rationale}
                                </span>
                              </span>
                              <ArrowRight className="mt-1 size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              );
            })()}
            <p className="mt-3 text-[11px] text-muted-foreground">
              Sugerencias derivadas del catálogo publicado y del contexto real de tu recorrido, nunca inventadas.
            </p>
          </section>

          {/* Invitación a completar y publicar perfil — para asesoría más precisa */}
          <section
            aria-labelledby="alux-profile"
            className="rounded-2xl border border-primary/20 bg-primary/5 p-4"
          >
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              <Sparkles className="size-3.5" aria-hidden />
              <span id="alux-profile">Ayúdame a asesorarte mejor</span>
            </div>
            <p className="mt-2 text-sm text-foreground">
              Si completas tu perfil de viajero (estilo, intereses, compañía, presupuesto, fechas)
              y también tu perfil público, puedo recomendarte hoteles, restaurantes,
              experiencias y rutas del Oriente Maya con mucha más precisión.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href="/cuenta/perfil-publico"
                className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Completar tu perfil público
                <ArrowRight className="size-3.5" aria-hidden />
              </a>
            </div>
          </section>
        </SheetContent>
      </Sheet>
    </>
  );
}
