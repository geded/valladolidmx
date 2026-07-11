/**
 * ProfileCompletionMeter — Barra visual de completitud del perfil.
 * Cuenta 10 campos (5 personales + 5 de viaje) y motiva al viajero a
 * llenarlos explicando por qué importa.
 */
import { Link } from "@tanstack/react-router";
import { Progress } from "@/components/ui/progress";
import { Sparkles } from "lucide-react";
import type { PersonalProfile } from "@/lib/traveler/profile-personal.functions";
import type { TravelerProfile } from "@/lib/traveler/traveler-account.functions";

export interface ProfileCompletionMeterProps {
  personal: PersonalProfile | null | undefined;
  travel: TravelerProfile | null | undefined;
}

function score(personal: PersonalProfile | null | undefined, travel: TravelerProfile | null | undefined) {
  const p = personal ?? null;
  const t = travel ?? null;
  const checks: Array<{ label: string; done: boolean }> = [
    { label: "Nombre", done: Boolean(p?.first_name || p?.display_name) },
    { label: "Teléfono", done: Boolean(p?.phone) },
    { label: "País", done: Boolean(p?.country) },
    { label: "Idioma preferido", done: Boolean(p?.preferred_language) },
    { label: "Foto de perfil", done: Boolean(p?.avatar_url) },
    { label: "Estilo de viaje", done: Boolean(t?.travel_style) },
    { label: "Presupuesto", done: Boolean(t?.budget_range) },
    { label: "Intereses", done: (t?.interests?.length ?? 0) > 0 },
    { label: "Destinos preferidos", done: (t?.preferred_destinations?.length ?? 0) > 0 },
    { label: "Cuándo viajas", done: Boolean(t?.trip_context?.travel_window) },
  ];
  const done = checks.filter((c) => c.done).length;
  return { done, total: checks.length, checks };
}

export function ProfileCompletionMeter({ personal, travel }: ProfileCompletionMeterProps) {
  const { done, total, checks } = score(personal, travel);
  const pct = Math.round((done / total) * 100);
  const missing = checks.filter((c) => !c.done).slice(0, 3);
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
            Tu perfil
          </p>
          <h2 className="mt-1 text-lg font-semibold">
            {done}/{total} completado
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Mientras más nos cuentes, mejor te acompaña Alux para descubrir el Oriente Maya de Yucatán.
          </p>
        </div>
        <Sparkles className="size-5 shrink-0 text-primary" aria-hidden />
      </div>
      <Progress value={pct} className="mt-4 h-2" />
      {missing.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Te falta:</span>
          {missing.map((m) => (
            <span
              key={m.label}
              className="rounded-pill border border-dashed border-border bg-background px-2.5 py-0.5 text-xs text-muted-foreground"
            >
              {m.label}
            </span>
          ))}
        </div>
      )}
      <div className="mt-5">
        <Link
          to="/cuenta/perfil"
          className="inline-flex items-center rounded-pill bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          {done === total ? "Editar mi perfil" : "Completar mi perfil"}
        </Link>
      </div>
    </section>
  );
}