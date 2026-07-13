/**
 * StageAwareCompanionBoard (CV6.O2) — superficie visible del compañero
 * de viaje. Cambia narrativa, misión, CTA y solicitud de permisos según
 * la etapa del Journey (Founder Journey First Principle).
 *
 * Reutiliza exclusivamente los contratos v1.0.0 congelados:
 *  - `TravelStage`
 *  - `getDailyMission`
 *  - `stageAllowsPermission` (dentro de `PermissionMoment`)
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight, Compass, MapPinned, ShieldCheck, Sparkles, Sun, Waves } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PermissionMoment } from "@/components/traveler/PermissionMoment";
import { getDailyMission } from "@/lib/traveler/journey-stage";
import type { TravelStage } from "@/lib/traveler/journey-stage";
import { getStageExperience } from "@/lib/traveler/stage-experience";

const STAGE_ICON: Record<TravelStage, typeof Compass> = {
  inspiration: Sparkles,
  exploration: Compass,
  planning: Waves,
  pre_trip: ShieldCheck,
  on_trip: MapPinned,
  post_trip: Sun,
};

export interface StageAwareCompanionBoardProps {
  stage: TravelStage;
  firstName?: string | null;
  /** Marca la superficie como preview (Stage Simulator) — sólo estilo. */
  preview?: boolean;
}

export function StageAwareCompanionBoard({
  stage,
  firstName,
  preview,
}: StageAwareCompanionBoardProps) {
  const exp = getStageExperience(stage);
  const mission = getDailyMission(stage);
  const Icon = STAGE_ICON[stage];

  return (
    <Card
      className={`overflow-hidden border-border/60 ${exp.accentClass} ${
        preview ? "ring-1 ring-dashed ring-border" : ""
      }`}
    >
      <CardContent className="space-y-5 p-5 md:p-6">
        <header className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-pill">
            <Icon className="mr-1 size-3.5" aria-hidden /> {exp.label}
          </Badge>
          <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {exp.eyebrow}
          </span>
        </header>

        <div className="space-y-2">
          <h2 className="font-serif text-2xl leading-tight md:text-3xl">
            {exp.greeting(firstName ?? null)}
          </h2>
          <p className="text-sm text-muted-foreground md:text-base">{exp.narrative}</p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Tu misión hoy
          </p>
          <p className="mt-1 text-base font-semibold">{mission.headline}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{mission.subline}</p>
          <div className="mt-3">
            <Button asChild size="sm">
              <Link to={exp.primaryCtaHref}>
                {exp.primaryCtaLabel}
                <ArrowRight className="ml-1 size-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>

        {exp.secondary.length > 0 && (
          <ul className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
            {exp.secondary.map((s) => (
              <li key={s} className="flex items-start gap-2">
                <span className="mt-1 size-1.5 rounded-full bg-primary/60" aria-hidden />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        )}

        {exp.permissionCue && (
          <PermissionMoment
            stage={stage}
            permission={exp.permissionCue.permission}
            title={exp.permissionCue.title}
            benefit={exp.permissionCue.benefit}
            ctaLabel={exp.permissionCue.ctaLabel}
          />
        )}
      </CardContent>
    </Card>
  );
}