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
 */
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import {
  Sparkles,
  Wand2,
  Search,
  Bed,
  UtensilsCrossed,
  Compass,
  MessageSquareText,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  detectPlanGaps,
  draftConciergeMessage,
  improveMyTrip,
  suggestExperiences,
  suggestHotels,
  suggestRestaurants,
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
  const [active, setActive] = useState<AluxTravelerCapability | null>(null);
  const [results, setResults] = useState<
    Partial<Record<AluxTravelerCapability, AluxTravelerSuggestion>>
  >({});

  const fns = {
    suggest_experiences: useServerFn(suggestExperiences),
    suggest_restaurants: useServerFn(suggestRestaurants),
    suggest_hotels: useServerFn(suggestHotels),
    improve_trip: useServerFn(improveMyTrip),
    detect_gaps: useServerFn(detectPlanGaps),
    draft_concierge_message: useServerFn(draftConciergeMessage),
  } as const;

  const mut = useMutation({
    mutationFn: async (id: AluxTravelerCapability) => {
      const fn = fns[id];
      const res = (await fn({ data: {} })) as AluxTravelerSuggestion;
      return { id, res };
    },
    onMutate: (id) => setActive(id),
    onSuccess: ({ id, res }) => {
      setResults((prev) => ({ ...prev, [id]: res }));
    },
    onError: (e) =>
      toast.error("Alux no pudo generar la sugerencia", {
        description: e instanceof Error ? e.message : undefined,
      }),
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