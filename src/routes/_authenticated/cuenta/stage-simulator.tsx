/**
 * /cuenta/stage-simulator — CV6.O2 Founder Stage Simulator.
 *
 * Superficie visible para recorrer las 5+1 etapas del Journey y validar
 * que Alux realmente cambia su conversación, misión, CTA y solicitud de
 * permisos en cada etapa. NO introduce nueva persistencia ni nuevo modelo:
 * simplemente renderiza `StageAwareCompanionBoard` con la etapa
 * seleccionada (reutiliza `TravelStage` congelado en CV6.O1).
 */
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { StageAwareCompanionBoard } from "@/components/traveler/StageAwareCompanionBoard";
import { ALL_STAGES, getStageExperience } from "@/lib/traveler/stage-experience";
import type { TravelStage } from "@/lib/traveler/journey-stage";
import { Button } from "@/components/ui/button";

interface SimulatorSearch {
  stage?: TravelStage;
}

const VALID: readonly string[] = ALL_STAGES;

export const Route = createFileRoute("/_authenticated/cuenta/stage-simulator")({
  validateSearch: (raw: Record<string, unknown>): SimulatorSearch => {
    const s = raw.stage;
    return typeof s === "string" && VALID.includes(s)
      ? { stage: s as TravelStage }
      : {};
  },
  component: StageSimulator,
});

function StageSimulator() {
  const { stage } = useSearch({ from: "/_authenticated/cuenta/stage-simulator" });
  const navigate = useNavigate({ from: "/cuenta/stage-simulator" });
  const active: TravelStage = stage ?? "inspiration";

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
          CV6.O2 · Stage Simulator
        </p>
        <h1 className="mt-2 font-serif text-3xl md:text-4xl">
          Recorre cómo Alux acompaña cada etapa
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Elige una etapa del Journey para ver cómo cambia la narrativa, la misión
          diaria, el CTA principal y qué permisos se solicitan (o no).
        </p>
      </header>

      <nav className="flex flex-wrap gap-2" aria-label="Etapas del Journey">
        {ALL_STAGES.map((s) => {
          const exp = getStageExperience(s);
          const isActive = s === active;
          return (
            <Button
              key={s}
              size="sm"
              variant={isActive ? "default" : "outline"}
              onClick={() => navigate({ search: { stage: s } })}
            >
              {exp.label}
            </Button>
          );
        })}
      </nav>

      <StageAwareCompanionBoard stage={active} firstName="Viajero" preview />

      <footer className="rounded-2xl border border-dashed border-border p-4 text-xs text-muted-foreground">
        Vista de validación. El viajero real ve una única etapa —la suya— y jamás
        recibe una solicitud de ubicación antes de la etapa <strong>En destino</strong>.
        <div className="mt-2">
          <Link to="/cuenta" className="underline">
            Volver a mi cuenta
          </Link>
        </div>
      </footer>
    </div>
  );
}