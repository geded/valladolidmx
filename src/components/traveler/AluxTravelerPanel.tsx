/**
 * AluxTravelerPanel — Iniciativa 7 · Sub-ola H.
 *
 * Copiloto del viajero dentro del Workspace de Cuenta. NO es un chat
 * libre: expone la lista cerrada de capacidades v1 aprobadas y para
 * cada una muestra la sugerencia como AluxSuggestionCard explicable.
 *
 * Reglas (Sub-ola H):
 *  - Sólo llama a las server functions aprobadas en Sub-ola G.
 *  - Nunca modifica el plan sin CTA explícito del usuario
 *    (AddToTravelPlanButton se reutiliza en la propia tarjeta).
 *  - Nunca envía al Concierge; sólo redacta borradores.
 *  - Nunca contacta empresas, reserva ni crea pagos.
 *  - Sin memoria conversacional propia: cada llamada usa el contexto
 *    oficial del Travel Workspace.
 *
 * AT-3 · Alux productivo en Mi Viaje (2026-07-05):
 *  - Reconocimiento explícito de 402 (créditos) y 429 (rate limit) del
 *    Lovable AI Gateway: se muestra un aviso claro y se ofrece "reintentar"
 *    sin dejar la superficie en blanco.
 *  - Errores persisten por capacidad (no sólo toast), así el viajero ve
 *    exactamente qué capacidad falló y puede repetirla.
 */
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "@/i18n/context";
import {
  Sparkles,
  Wand2,
  Search,
  Bed,
  UtensilsCrossed,
  Compass,
  MessageSquareText,
  Loader2,
  AlertTriangle,
  RotateCcw,
  Ticket,
  Gift,
} from "lucide-react";
import { toast } from "sonner";
import {
  detectPlanGaps,
  draftConciergeMessage,
  improveMyTrip,
  suggestExperiences,
  suggestHotels,
  suggestRestaurants,
  suggestFromCoupons,
  discoverPromotions,
  type AluxTravelerCapability,
  type AluxTravelerSuggestion,
} from "@/lib/traveler/alux-traveler.functions";
import { AluxSuggestionCard } from "./AluxSuggestionCard";

type CapabilityDef = {
  id: AluxTravelerCapability;
  label: string;
  description: string;
  icon: typeof Sparkles;
};

const CAPABILITIES: CapabilityDef[] = [
  {
    id: "improve_trip",
    label: "Mejorar mi viaje",
    description: "Ritmo, orden y duración del plan activo.",
    icon: Wand2,
  },
  {
    id: "suggest_from_coupons",
    label: "Aprovechar mis cupones",
    description: "Cómo y cuándo usar los cupones que ya reclamaste.",
    icon: Ticket,
  },
  {
    id: "discover_promotions",
    label: "Descubrir promociones para mí",
    description: "Promociones vigentes que aún no reclamas y encajan contigo.",
    icon: Gift,
  },
  {
    id: "detect_gaps",
    label: "Detectar huecos",
    description: "Días sin actividad, comidas, hospedaje o transporte.",
    icon: Search,
  },
  {
    id: "suggest_hotels",
    label: "Recomendar hoteles",
    description: "Hospedajes del catálogo compatibles con tu perfil.",
    icon: Bed,
  },
  {
    id: "suggest_restaurants",
    label: "Recomendar restaurantes",
    description: "Cocina compatible con tus restricciones.",
    icon: UtensilsCrossed,
  },
  {
    id: "suggest_experiences",
    label: "Recomendar experiencias",
    description: "Actividades compatibles con tu momento del viaje.",
    icon: Compass,
  },
  {
    id: "draft_concierge_message",
    label: "Preparar mensaje para Concierge",
    description: "Borrador que tú envías desde el botón oficial.",
    icon: MessageSquareText,
  },
];

export function AluxTravelerPanel() {
  const { locale: activeLocale } = useTranslation();
  const rawLocale = (activeLocale ?? "es").toLowerCase().slice(0, 2);
  const locale = (["es", "en", "fr", "de", "it", "pt"] as const).includes(
    rawLocale as never,
  )
    ? (rawLocale as "es" | "en" | "fr" | "de" | "it" | "pt")
    : "es";
  const [active, setActive] = useState<AluxTravelerCapability | null>(null);
  const [results, setResults] = useState<
    Partial<Record<AluxTravelerCapability, AluxTravelerSuggestion>>
  >({});
  const [errors, setErrors] = useState<
    Partial<Record<AluxTravelerCapability, { kind: "rate_limited" | "credits_exhausted" | "error"; message: string }>>
  >({});

  const fns = {
    suggest_experiences: useServerFn(suggestExperiences),
    suggest_restaurants: useServerFn(suggestRestaurants),
    suggest_hotels: useServerFn(suggestHotels),
    improve_trip: useServerFn(improveMyTrip),
    detect_gaps: useServerFn(detectPlanGaps),
    draft_concierge_message: useServerFn(draftConciergeMessage),
    suggest_from_coupons: useServerFn(suggestFromCoupons),
    discover_promotions: useServerFn(discoverPromotions),
  } as const;

  const mut = useMutation({
    mutationFn: async (id: AluxTravelerCapability) => {
      const fn = fns[id];
      const res = (await fn({ data: { locale } })) as AluxTravelerSuggestion;
      return { id, res };
    },
    onMutate: (id) => {
      setActive(id);
      setErrors((prev) => {
        if (!prev[id]) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
    onSuccess: ({ id, res }) => {
      setResults((prev) => ({ ...prev, [id]: res }));
    },
    onError: (e, id) => {
      const message = e instanceof Error ? e.message : String(e);
      const kind: "rate_limited" | "credits_exhausted" | "error" =
        /\b429\b|rate.?limit/i.test(message)
          ? "rate_limited"
          : /\b402\b|credit/i.test(message)
            ? "credits_exhausted"
            : "error";
      setErrors((prev) => ({ ...prev, [id]: { kind, message } }));
      const title =
        kind === "credits_exhausted"
          ? "Alux está sin cuota momentáneamente"
          : kind === "rate_limited"
            ? "Alux está saturado, intenta en un momento"
            : "Alux no pudo generar la sugerencia";
      toast.error(title, {
        description: kind === "error" ? message : undefined,
      });
    },
    onSettled: () => setActive(null),
  });

  return (
    <section
      aria-label="Copiloto Alux · Viajero"
      className="rounded-2xl border border-primary/20 bg-card p-5"
    >
      <header className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary">
          <Sparkles className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Alux · Copiloto de tu viaje</h2>
          <p className="text-xs text-muted-foreground">
            Analiza tu Travel Workspace y sugiere. Nunca modifica ni envía nada
            sin que tú lo confirmes.
          </p>
        </div>
      </header>

      <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-foreground">
        <p className="font-medium">Ayúdame a asesorarte mejor</p>
        <p className="mt-1 text-muted-foreground">
          Mientras más completo esté tu perfil (estilo, intereses, presupuesto, fechas) y más lo completes como perfil público,
          más preciso puedo ser al recomendarte hoteles, restaurantes, experiencias y rutas del Oriente Maya.
          {" "}
          <a href="/cuenta/perfil" className="font-medium text-primary hover:underline">
            Completar perfil
          </a>
          {" · "}
          <a href="/cuenta/perfil-publico" className="font-medium text-primary hover:underline">
            Completar tu perfil público
          </a>
        </p>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {CAPABILITIES.map((c) => {
          const Icon = c.icon;
          const isRunning = active === c.id && mut.isPending;
          const hasResult = Boolean(results[c.id]);
          return (
            <button
              key={c.id}
              type="button"
              disabled={mut.isPending}
              onClick={() => mut.mutate(c.id)}
              className="group flex items-start gap-3 rounded-xl border border-border bg-background p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:opacity-60"
            >
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                {isRunning ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Icon className="size-4" aria-hidden />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{c.label}</span>
                <span className="block text-[11px] text-muted-foreground">
                  {c.description}
                </span>
                {hasResult ? (
                  <span className="mt-0.5 inline-block text-[10px] font-semibold uppercase tracking-wide text-primary">
                    · Sugerencia lista
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      {/* Resultados apilados por capacidad */}
      <div className="mt-5 space-y-4">
        {CAPABILITIES.map((c) => {
          const err = errors[c.id];
          if (err) {
            const title =
              err.kind === "credits_exhausted"
                ? "Alux está sin cuota momentáneamente"
                : err.kind === "rate_limited"
                  ? "Alux está saturado, intenta de nuevo en un momento"
                  : "Alux no pudo generar esta sugerencia";
            return (
              <article
                key={`err-${c.id}`}
                className="rounded-xl border border-warning/30 bg-warning/5 p-4"
              >
                <header className="mb-2 flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-full bg-warning/15 text-warning">
                    <AlertTriangle className="size-3.5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-warning">
                      Alux · {c.label}
                    </p>
                    <p className="text-xs text-foreground">{title}</p>
                  </div>
                </header>
                {err.kind === "error" && (
                  <p className="mb-3 text-[11px] text-muted-foreground">
                    {err.message}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => mut.mutate(c.id)}
                  disabled={mut.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-primary/5 disabled:opacity-60"
                >
                  <RotateCcw className="size-3" aria-hidden />
                  Reintentar
                </button>
              </article>
            );
          }
          const res = results[c.id];
          if (!res) return null;
          return (
            <AluxSuggestionCard
              key={c.id}
              capabilityLabel={c.label}
              suggestion={res}
            />
          );
        })}
        {mut.isPending ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" aria-hidden />
            Alux está pensando sobre tu viaje…
          </p>
        ) : null}
      </div>

      <p className="mt-4 text-[11px] italic text-muted-foreground">
        Alux no reserva, no contacta empresas y no envía al Concierge. Todas las
        acciones son tuyas.
      </p>
    </section>
  );
}