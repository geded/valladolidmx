/**
 * CV6.3 · Now·Next·Later — Live Day Surface (mount).
 *
 * Superficie oficial del Centro de Decisiones del viajero durante la
 * fase `onsite`. Consume EXCLUSIVAMENTE:
 *  - `deriveTripPhase`  (Travel Plan Contract · CV0)
 *  - `deriveLiveDay`    (CV6.1)
 *  - `deriveDecisionCenter` (CV6.2)
 *
 * Reglas invariantes aplicadas aquí:
 *  - Auto-Hide (Founder Experience First + Decision Center Principle):
 *    si `phase !== "onsite"` o `center.empty`, la superficie NO se renderiza.
 *  - Jerarquía por tarjeta: Acción → Motivo → Contexto → Secundarias.
 *  - Sin nuevo modelo de datos: adapta ítems del plan a `LiveDayItemInput`
 *    con lectura defensiva; ignora campos ausentes.
 *  - Sin fetch propio — recibe `plan` ya cargado por el consumidor.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, MapPin, Navigation2, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  deriveLiveDay,
  type LiveDayItemInput,
  type LiveDayPlanInput,
} from "@/lib/traveler/live-day";
import {
  deriveDecisionCenter,
  CV6_2_BASE_CONTRIBUTORS,
  type DecisionCard,
  type DecisionTone,
} from "@/lib/traveler/decision-center";
import { CV6_5_DESTINATION_CONTRIBUTORS } from "@/lib/traveler/decision-center-destination";
import { resolveTravelerDestinationContext } from "@/lib/traveler/destination-context.functions";
import type { TripPhase } from "@/lib/traveler/trip-phase";
import {
  deriveAluxSpatialProposals,
  type AluxSpatialProposal,
} from "@/lib/traveler/alux-spatial";
import { useRef } from "react";

type LoosePlan = {
  start_date?: string | null;
  end_date?: string | null;
  items?: Array<Record<string, unknown>> | null;
} & Record<string, unknown>;

function adaptItems(items: Array<Record<string, unknown>> | null | undefined): LiveDayItemInput[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((raw): LiveDayItemInput | null => {
      const id = typeof raw.id === "string" ? raw.id : null;
      if (!id) return null;
      return {
        id,
        day_number: (raw.day_number as number | null | undefined) ?? null,
        order_index: (raw.order_index as number | null | undefined) ?? null,
        starts_at: (raw.starts_at as string | null | undefined) ?? null,
        ends_at: (raw.ends_at as string | null | undefined) ?? null,
        status: (raw.status as LiveDayItemInput["status"]) ?? null,
        entity_type: (raw.entity_type as string | null | undefined) ?? null,
        entity_id: (raw.entity_id as string | null | undefined) ?? null,
      };
    })
    .filter((x): x is LiveDayItemInput => x !== null);
}

const TONE_CLASS: Record<DecisionTone, string> = {
  neutral: "border-border/70 bg-background",
  info: "border-primary/25 bg-primary/5",
  success: "border-emerald-500/25 bg-emerald-500/5",
  warning: "border-amber-500/30 bg-amber-500/5",
  critical: "border-destructive/30 bg-destructive/5",
};

const SLOT_LABEL = {
  now: "Ahora",
  next: "Después",
  later: "Más tarde",
} as const;

function ActionIcon({ intent }: { intent: DecisionCard["primaryAction"] extends infer A ? A extends { intent: infer I } ? I : never : never }) {
  switch (intent) {
    case "navigate":
      return <Navigation2 className="size-4" aria-hidden />;
    case "open_map":
      return <MapPin className="size-4" aria-hidden />;
    default:
      return <ArrowRight className="size-4" aria-hidden />;
  }
}

function CardView({ card }: { card: DecisionCard }) {
  const action = card.primaryAction;
  return (
    <article
      className={`flex flex-col gap-3 rounded-2xl border p-4 shadow-soft ${TONE_CLASS[card.tone]}`}
      aria-label={card.title}
    >
      {/* 1 · Acción concreta (Action First) */}
      {action ? (
        <Link
          to="/cuenta/mi-viaje"
          search={{ vista: "itinerario", focus: card.planItemId ?? undefined } as never}
          className="inline-flex items-center gap-2 self-start rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-soft transition-transform hover:scale-[1.02]"
        >
          <ActionIcon intent={action.intent} />
          {action.label}
        </Link>
      ) : null}

      {/* 2 · Motivo (rationale · Explainable by Default) */}
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{card.title}</p>
        <p className="text-xs text-muted-foreground">{card.rationale}</p>
      </div>

      {/* 3 · Contexto mínimo (opcional) */}
      {card.context ? (
        <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground/80">
          {card.context}
        </p>
      ) : null}

      {/* 4 · Acciones secundarias (nunca compiten con la principal) */}
      {card.secondaryActions?.length ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {card.secondaryActions.map((a) => (
            <Link
              key={a.id}
              to="/cuenta/mi-viaje"
              search={{ vista: "itinerario", focus: card.planItemId ?? undefined } as never}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-3 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              <ActionIcon intent={a.intent} />
              {a.label}
            </Link>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export interface NowNextLaterSurfaceProps {
  phase: TripPhase;
  plan: LoosePlan | null | undefined;
  /** Coordenadas del destino/viajero para resolver contexto. Opcional. */
  geo?: { lat: number; lon: number } | null;
  destination?: string | null;
}

export function NowNextLaterSurface({ phase, plan, geo, destination }: NowNextLaterSurfaceProps) {
  // Consumidores acceden EXCLUSIVAMENTE a ResolvedDestinationContext
  // vía server fn (Guardrail vinculante).
  const resolveFn = useServerFn(resolveTravelerDestinationContext);
  const enabled = phase === "onsite";

  // CV6.5.2 · Adaptamos ítems del día en curso a entidades del scope
  // para que el Hours Contributor pueda evaluar horarios reales.
  // CV6.5.3 · Marcamos rol `next` en el próximo ítem para que el
  // Traffic Contributor calcule ruta/ETA.
  const { todayEntities, traffic } = useMemo(() => {
    const at = new Date();
    const adapted: LiveDayPlanInput = {
      start_date: plan?.start_date ?? null,
      end_date: plan?.end_date ?? null,
      items: adaptItems(plan?.items ?? null),
    };
    const liveDay = deriveLiveDay(adapted, at);
    const seen = new Set<string>();
    const out: Array<{
      id: string;
      type: string;
      role?: "current" | "next";
    }> = [];
    liveDay.items.forEach((it, idx) => {
      const id = it.entity_id ?? null;
      const type = it.entity_type ?? null;
      if (!id || !type) return;
      const key = `${type}:${id}`;
      if (seen.has(key)) return;
      seen.add(key);
      let role: "current" | "next" | undefined;
      if (idx === liveDay.nowIndex) role = "current";
      else if (idx === liveDay.nextIndex) role = "next";
      out.push({ id, type, role });
    });
    const nextItem =
      liveDay.nextIndex != null ? liveDay.items[liveDay.nextIndex] : null;
    const trafficReq =
      nextItem && nextItem.starts_at
        ? { arriveBy: nextItem.starts_at }
        : undefined;
    return { todayEntities: out, traffic: trafficReq };
  }, [plan]);

  const ctxQuery = useQuery({
    queryKey: [
      "traveler.destination-context",
      geo?.lat ?? null,
      geo?.lon ?? null,
      destination ?? null,
      todayEntities.map((e) => `${e.type}:${e.id}`).join("|"),
      traffic?.arriveBy ?? null,
    ],
    queryFn: () =>
      resolveFn({
        data: {
          geo: geo ?? null,
          destination: destination ?? null,
          entities: todayEntities,
          traffic,
        },
      }),
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const center = useMemo(() => {
    const at = new Date();
    const adapted: LiveDayPlanInput = {
      start_date: plan?.start_date ?? null,
      end_date: plan?.end_date ?? null,
      items: adaptItems(plan?.items ?? null),
    };
    const liveDay = deriveLiveDay(adapted, at);
    return deriveDecisionCenter(
      {
        phase,
        liveDay,
        at,
        destination: (ctxQuery.data ?? undefined) as never,
      },
      [...CV6_2_BASE_CONTRIBUTORS, ...CV6_5_DESTINATION_CONTRIBUTORS],
    );
  }, [phase, plan, ctxQuery.data]);

  // CV6.6 · Alux Espacial — dedupe por sesión (Regla de No Saturación).
  const seenKeysRef = useRef<Set<string>>(new Set());

  const aluxProposals: AluxSpatialProposal[] = useMemo(() => {
    const at = new Date();
    const adapted: LiveDayPlanInput = {
      start_date: plan?.start_date ?? null,
      end_date: plan?.end_date ?? null,
      items: adaptItems(plan?.items ?? null),
    };
    const liveDay = deriveLiveDay(adapted, at);
    const proposals = deriveAluxSpatialProposals({
      phase,
      liveDay,
      decisionCenter: center,
      destinationContext: (ctxQuery.data ?? null) as never,
      at,
      seenKeys: seenKeysRef.current,
    });
    proposals.forEach((p) => seenKeysRef.current.add(p.dedupeKey));
    return proposals;
  }, [phase, plan, center, ctxQuery.data]);

  // Auto-Hide global (Founder Decision Center Principle).
  if (center.empty) return null;

  return (
    <section
      aria-label="Centro de decisiones del viaje"
      className="rounded-3xl border border-border/70 bg-card/50 p-4 shadow-soft sm:p-5"
    >
      <header className="mb-3 flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-full bg-primary/15 text-primary">
          <Sparkles className="size-4" aria-hidden />
        </span>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
            Centro de decisiones
          </p>
          <h2 className="text-sm font-semibold text-foreground">
            Qué hacer ahora, después y más tarde
          </h2>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {(["now", "next", "later"] as const).map((slot) => {
          const cards = center[slot];
          if (cards.length === 0) return null;
          return (
            <div key={slot} className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {SLOT_LABEL[slot]}
              </p>
              {cards.map((c) => (
                <CardView key={c.id} card={c} />
              ))}
            </div>
          );
        })}
      </div>

      {/* CV6.6 · Alux Espacial — Auto-Hide si no hay propuestas. */}
      {aluxProposals.length > 0 ? (
        <div className="mt-5 border-t border-border/60 pt-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
            Alux sugiere
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {aluxProposals.map((p) => (
              <article
                key={p.id}
                className="flex flex-col gap-2 rounded-2xl border border-primary/20 bg-primary/[0.04] p-4 shadow-soft"
                aria-label={p.headline}
              >
                <p className="text-sm font-semibold text-foreground">
                  {p.headline}
                </p>
                <dl className="grid gap-1.5 text-xs">
                  <div>
                    <dt className="font-medium text-foreground">Qué hacer</dt>
                    <dd className="text-muted-foreground">{p.whatToDo}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground">Por qué conviene</dt>
                    <dd className="text-muted-foreground">{p.whyItMatters}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground">Qué ganas</dt>
                    <dd className="text-muted-foreground">{p.expectedBenefit}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground">Si no lo haces</dt>
                    <dd className="text-muted-foreground">{p.ifIgnored}</dd>
                  </div>
                </dl>
                <Link
                  to="/cuenta/mi-viaje"
                  search={{ vista: "itinerario", focus: p.planItemId ?? undefined } as never}
                  className="mt-1 inline-flex items-center gap-2 self-start rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-soft transition-transform hover:scale-[1.02]"
                >
                  <Sparkles className="size-4" aria-hidden />
                  {p.primaryCta.label}
                </Link>
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/80">
                  Confianza: {p.confidence}
                </p>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}