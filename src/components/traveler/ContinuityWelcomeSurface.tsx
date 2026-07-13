/**
 * ContinuityWelcomeSurface (AC1.3 · Delight Moment de Continuidad).
 *
 * Superficie de bienvenida para viajeros que regresan. Cumple:
 *  - Founder Continuity Recognition Principle: el mensaje se centra en
 *    la continuidad del viaje, nunca en recuperación técnica.
 *  - Founder First Five Seconds Principle: arriba del fold responde a
 *    ¿Dónde nos quedamos?, ¿Qué es lo más importante ahora?, ¿Cuál es
 *    el siguiente paso? — sin scroll ni interacción.
 *  - Founder Concierge Voice Principle: cero terminología técnica.
 *  - Founder Anonymous Travel Continuity: sin gating, sin permisos,
 *    sin arquitectura nueva. Reutiliza `useAnonymousTrip`.
 *
 * Auto-Hide: si no hay `returning` o no hay datos suficientes.
 */
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Compass, MapPinned, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ANON_COPY, useAnonymousTrip } from "@/lib/traveler/anonymous-draft";

function pickGreeting(seed: number) {
  const bank = ANON_COPY.continuity.greetings;
  const idx = ((seed % bank.length) + bank.length) % bank.length;
  return bank[idx];
}

export function ContinuityWelcomeSurface() {
  const { status, trip, hasReturningTrip, acknowledgeReturn, reset } =
    useAnonymousTrip();

  const summary = useMemo(() => {
    if (!trip) return null;
    const favs = trip.favorites.length;
    const items = trip.plannedItems.length;
    if (favs === 0 && items === 0) return null;
    const parts: string[] = [];
    if (items > 0) {
      parts.push(
        items === 1
          ? "1 experiencia en tu ruta"
          : `${items} experiencias en tu ruta`,
      );
    }
    if (favs > 0) {
      parts.push(
        favs === 1
          ? "1 lugar guardado"
          : `${favs} lugares guardados`,
      );
    }
    return parts.join(" · ");
  }, [trip]);

  // Auto-Hide oficial: sólo mostrar en retorno y con datos reales.
  if (status !== "returning" || !hasReturningTrip || !summary || !trip) {
    return null;
  }

  const greeting = pickGreeting(Math.floor(trip.createdAt / 60_000));
  const hasItems = trip.plannedItems.length > 0;
  const importantNow = hasItems
    ? "Tienes experiencias esperando ser confirmadas en tu ruta."
    : "Tienes lugares que te gustaron listos para sumarse a tu ruta.";
  const nextStepLabel = hasItems
    ? "Revisar mi ruta"
    : "Empezar a armar mi ruta";

  return (
    <section
      aria-label="Continuidad de tu viaje"
      className="mx-auto w-full max-w-6xl px-4 pt-4 md:pt-6"
    >
      <Card className="overflow-hidden border-border/60 bg-gradient-to-br from-primary/5 via-background to-background shadow-soft">
        <CardContent className="space-y-5 p-5 md:p-6">
          <header className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-pill">
              <Sparkles className="mr-1 size-3.5" aria-hidden />
              Alux te acompaña
            </Badge>
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {ANON_COPY.continuity.scopeNotice}
            </span>
          </header>

          <div className="space-y-1.5">
            <h2 className="font-serif text-2xl leading-tight md:text-3xl">
              {greeting.title}
            </h2>
            <p className="text-sm text-muted-foreground md:text-base">
              {greeting.body}
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <MapPinned className="size-3.5" aria-hidden />
                {ANON_COPY.continuity.where.label}
              </p>
              <p className="mt-1 text-sm font-semibold leading-snug">{summary}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <Sparkles className="size-3.5" aria-hidden />
                {ANON_COPY.continuity.important.label}
              </p>
              <p className="mt-1 text-sm leading-snug">{importantNow}</p>
            </div>
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <Compass className="size-3.5" aria-hidden />
                {ANON_COPY.continuity.nextStep.label}
              </p>
              <p className="mt-1 text-sm font-semibold leading-snug">
                {nextStepLabel}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="lg" onClick={acknowledgeReturn}>
              <Link to="/arma-tu-viaje">
                {ANON_COPY.continuity.primaryCta}
                <ArrowRight className="ml-1 size-4" aria-hidden />
              </Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => {
                void reset();
              }}
            >
              {ANON_COPY.continuity.secondaryCta}
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}