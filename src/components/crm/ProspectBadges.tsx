/**
 * CRM Prospectos · etiquetas compartidas de etapa, temperatura y espera.
 */
import {
  PROSPECT_STAGE_LABEL,
  PROSPECT_TEMPERATURE_LABEL,
  URGENT_WAIT_MINUTES,
  minutesWaiting,
  type ProspectStage,
  type ProspectTemperature,
} from "@/lib/crm/prospect-rules";

export function StageBadge({ stage }: { stage: ProspectStage }) {
  const tone =
    stage === "reservo" || stage === "por_viajar" || stage === "viajo" || stage === "posventa"
      ? "border-success/30 bg-success/10 text-success"
      : stage === "perdido" || stage === "no_interesado"
        ? "border-border bg-muted text-muted-foreground"
        : stage === "nuevo"
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-info/30 bg-info/10 text-info";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone}`}
    >
      {PROSPECT_STAGE_LABEL[stage] ?? stage}
    </span>
  );
}

export function TemperatureBadge({ temperature }: { temperature: ProspectTemperature }) {
  const tone =
    temperature === "caliente"
      ? "border-destructive/30 bg-destructive/10 text-destructive"
      : temperature === "tibio"
        ? "border-warning/30 bg-warning/10 text-warning"
        : "border-info/30 bg-info/10 text-info";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone}`}
    >
      {PROSPECT_TEMPERATURE_LABEL[temperature] ?? temperature}
    </span>
  );
}

export function WaitingLabel({ since }: { since: string }) {
  const mins = minutesWaiting(since);
  const urgent = mins >= URGENT_WAIT_MINUTES;
  const text =
    mins < 60
      ? `${mins} min esperando`
      : mins < 1440
        ? `${Math.floor(mins / 60)} h esperando`
        : `${Math.floor(mins / 1440)} d esperando`;
  return (
    <span className={`text-[11px] font-medium ${urgent ? "text-destructive" : "text-muted-foreground"}`}>
      {text}
    </span>
  );
}

/** Enlace para abrir la plática de WhatsApp del prospecto. */
export function whatsappHref(phoneE164: string): string {
  return `https://wa.me/${phoneE164.replace(/\D/g, "")}`;
}
