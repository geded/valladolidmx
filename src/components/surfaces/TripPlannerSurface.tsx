/**
 * TripPlannerSurface — página pública "Arma tu Viaje" (US-E4.1).
 *
 * Planificador Oficial del viaje del visitante. NO es una lista de
 * favoritos: presenta el expediente en construcción, cómo continuar
 * descubriendo y cómo convertirlo en un viaje real.
 *
 * Reglas duras (Founder):
 *  · "Arma tu Viaje" = superficie pública (esta página).
 *  · "Mi Viaje" = workspace privado (/cuenta/mi-viaje).
 *  · "Agregar a Mi Viaje" = acción universal desde tarjetas.
 *  · Toda lectura pasa por travel-plans.functions.ts.
 *  · Cero engines, cero rutas, cero modelos paralelos. Reutiliza
 *    travel_plans, guest-queue, Context Engine, Navigation Contract
 *    y Alux Traveler ya construidos.
 *
 * Estados:
 *  · empty          → visitante sin sesión ni guest-queue.
 *  · guest          → visitante sin sesión con guest-queue > 0.
 *  · authed-empty   → usuario autenticado sin ítems en plan activo.
 *  · authed-active  → usuario autenticado con plan activo poblado.
 */
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Compass,
  MapPin,
  Sparkles,
  Route as RouteIcon,
  MessageCircle,
  ArrowRight,
  PlusCircle,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getMyActivePlan } from "@/lib/traveler/travel-plans.functions";
import { readGuestQueue } from "@/lib/traveler/guest-queue";
import { useAluxContext } from "@/lib/alux/use-alux-context";
import { GuestPlanPreview } from "@/components/traveler/GuestPlanPreview";
import { AluxTravelerPanel } from "@/components/traveler/AluxTravelerPanel";

export function TripPlannerSurface() {
  const { user } = useAuth();
  const fetchActive = useServerFn(getMyActivePlan);

  const { data: active, isLoading: loadingPlan } = useQuery({
    queryKey: ["traveler", "active-plan", user?.id],
    queryFn: () => fetchActive(),
    enabled: Boolean(user?.id),
    staleTime: 30_000,
  });

  const [guestCount, setGuestCount] = useState<number | null>(null);
  useEffect(() => {
    if (user) {
      setGuestCount(0);
      return;
    }
    setGuestCount(readGuestQueue().length);
  }, [user]);

  const alux = useAluxContext();
  const itemCount = active?.items.length ?? 0;

  const state: "empty" | "guest" | "authed-empty" | "authed-active" = user
    ? itemCount > 0
      ? "authed-active"
      : "authed-empty"
    : (guestCount ?? 0) > 0
      ? "guest"
      : "empty";

  return (
    <div className="space-y-12 sm:space-y-16">
      <TripPlannerHero
        state={state}
        user={Boolean(user)}
        planTitle={active?.plan.title ?? null}
        itemCount={itemCount}
        guestCount={guestCount ?? 0}
        loadingPlan={loadingPlan && Boolean(user)}
        aluxReason={alux.hasContext ? alux.reason : null}
        aluxCanonical={alux.canonical ?? null}
      />

      {state === "guest" ? <GuestSection guestCount={guestCount ?? 0} /> : null}
      {state === "authed-active" ? (
        <AuthedActiveSection
          planTitle={active?.plan.title ?? "Mi Viaje"}
          itemCount={itemCount}
        />
      ) : null}
      {state === "authed-empty" ? <AuthedEmptySection /> : null}

      {state === "authed-active" ? <AluxTravelerPanel /> : null}
      {state !== "authed-active" ? <AluxTeaserSection authed={Boolean(user)} /> : null}

      <HowItWorksSection />

      <NextStepSection state={state} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                               */
/* ------------------------------------------------------------------ */

function TripPlannerHero({
  state,
  user,
  planTitle,
  itemCount,
  guestCount,
  loadingPlan,
  aluxReason,
  aluxCanonical,
}: {
  state: "empty" | "guest" | "authed-empty" | "authed-active";
  user: boolean;
  planTitle: string | null;
  itemCount: number;
  guestCount: number;
  loadingPlan: boolean;
  aluxReason: string | null;
  aluxCanonical: string | null;
}) {
  const eyebrow =
    state === "authed-active"
      ? "Tu expediente de viaje"
      : state === "guest"
        ? "Tu expediente en este dispositivo"
        : "Planificador Oficial del Oriente Maya";

  const title =
    state === "authed-active"
      ? planTitle ?? "Mi Viaje"
      : state === "guest"
        ? "Continúa armando tu viaje"
        : "Arma tu viaje al Oriente Maya";

  const subtitle =
    state === "authed-active"
      ? `Tienes ${itemCount} elemento${itemCount === 1 ? "" : "s"} guardado${itemCount === 1 ? "" : "s"}. Organízalos, añade notas y prepáralo para tu concierge humano.`
      : state === "guest"
        ? `Guardaste ${guestCount} elemento${guestCount === 1 ? "" : "s"} sin iniciar sesión. Guárdalo en tu cuenta para conservarlo entre dispositivos y compartirlo con tu concierge cuando estés listo.`
        : "No es un carrito de compras. Es tu planificador personal: guarda lugares, experiencias y notas, organiza tu recorrido y — cuando estés listo — un concierge humano te ayuda a hacerlo realidad.";

  return (
    <header className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-10">
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-primary">
        {eyebrow}
      </p>
      <h1 className="text-balance text-3xl font-semibold sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 max-w-2xl text-base text-muted-foreground sm:text-lg">
        {subtitle}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {state === "authed-active" ? (
          <Link
            to="/cuenta/mi-viaje"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:opacity-95 active:scale-[0.98]"
          >
            Abrir Mi Viaje
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        ) : null}

        {state === "guest" ? (
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:opacity-95 active:scale-[0.98]"
          >
            <ShieldCheck className="size-4" aria-hidden />
            Guardar mi viaje
          </Link>
        ) : null}

        {state === "authed-empty" || state === "empty" ? (
          <Link
            to="/oriente-maya"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:opacity-95 active:scale-[0.98]"
          >
            <Compass className="size-4" aria-hidden />
            Empezar a explorar
          </Link>
        ) : null}

        <Link
          to="/oriente-maya"
          className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          Seguir descubriendo
        </Link>

        {!user ? (
          <Link
            to="/auth"
            className="text-sm font-medium text-primary hover:underline"
          >
            Ya tengo cuenta
          </Link>
        ) : null}
      </div>

      {aluxReason ? (
        <div className="mt-6 inline-flex max-w-full items-start gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs text-primary">
          <Sparkles className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span className="truncate">
            <strong className="font-semibold">Alux:</strong> {aluxReason}
            {aluxCanonical ? (
              <>
                {" · "}
                <Link
                  to={aluxCanonical}
                  className="underline underline-offset-2"
                >
                  Retomar
                </Link>
              </>
            ) : null}
          </span>
        </div>
      ) : null}

      {loadingPlan ? (
        <p
          role="status"
          className="mt-4 text-xs text-muted-foreground"
        >
          Cargando tu expediente…
        </p>
      ) : null}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Guest-queue visible                                                */
/* ------------------------------------------------------------------ */

function GuestSection({ guestCount }: { guestCount: number }) {
  return (
    <section aria-labelledby="ayv-guest-h">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 id="ayv-guest-h" className="text-xl font-semibold sm:text-2xl">
            En tu expediente ({guestCount})
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Guardaste esto sin iniciar sesión. Vive en este navegador hasta que
            lo guardes en tu cuenta.
          </p>
        </div>
        <Link
          to="/auth"
          className="hidden shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 sm:inline-flex"
        >
          Guardar mi viaje
        </Link>
      </div>
      <GuestPlanPreview limit={6} />
      <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-foreground">
        <p>
          <strong>Importante:</strong> si borras el historial del navegador
          perderás este expediente. Guárdalo en tu cuenta con un solo paso.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Autenticado con plan activo poblado                                */
/* ------------------------------------------------------------------ */

function AuthedActiveSection({
  planTitle,
  itemCount,
}: {
  planTitle: string;
  itemCount: number;
}) {
  return (
    <section
      aria-labelledby="ayv-active-h"
      className="rounded-2xl border border-primary/30 bg-primary/5 p-6 sm:p-8"
    >
      <p className="text-xs uppercase tracking-wide text-primary">
        Expediente activo
      </p>
      <h2 id="ayv-active-h" className="mt-1 text-2xl font-semibold">
        {planTitle}
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        {itemCount} elemento{itemCount === 1 ? "" : "s"} guardado
        {itemCount === 1 ? "" : "s"}. Organiza el recorrido, añade notas y —
        cuando esté listo — envíalo a tu concierge humano desde Mi Viaje.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          to="/cuenta/mi-viaje"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-95"
        >
          Abrir Mi Viaje
          <ArrowRight className="size-4" aria-hidden />
        </Link>
        <Link
          to="/oriente-maya"
          className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Añadir más experiencias
        </Link>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Autenticado sin ítems                                              */
/* ------------------------------------------------------------------ */

function AuthedEmptySection() {
  return (
    <section
      aria-labelledby="ayv-authempty-h"
      className="rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center"
    >
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
        <PlusCircle className="size-3" aria-hidden /> Tu expediente está vacío
      </span>
      <h2 id="ayv-authempty-h" className="mt-4 text-2xl font-semibold">
        Empieza por lo que te llama la atención
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Recorre destinos, hoteles, restaurantes y experiencias. En cada tarjeta
        pulsa <strong>➕ Agregar a Mi Viaje</strong> — se guarda directamente en
        tu expediente.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/oriente-maya"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Compass className="size-4" aria-hidden />
          Explorar destinos
        </Link>
        <Link
          to="/cuenta/mi-viaje"
          className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Ir a Mi Viaje
        </Link>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Cómo funciona                                                      */
/* ------------------------------------------------------------------ */

function HowItWorksSection() {
  const steps: Array<{
    n: string;
    Icon: typeof MapPin;
    title: string;
    body: string;
  }> = [
    {
      n: "01",
      Icon: MapPin,
      title: "Guarda lo que te inspira",
      body: "Destinos, hoteles, restaurantes, experiencias y eventos. Cada elemento entra a tu expediente con su ficha, no como un simple favorito.",
    },
    {
      n: "02",
      Icon: RouteIcon,
      title: "Organiza tu recorrido",
      body: "Añade notas, ordena por interés y prepara tu plan a tu ritmo. Alux te sugiere qué falta según el contexto en el que estás explorando.",
    },
    {
      n: "03",
      Icon: MessageCircle,
      title: "Tu concierge humano lo hace real",
      body: "Cuando estés listo, envías el expediente. Un concierge humano lo revisa, coordina y responde — jamás automatizado, jamás sin tu permiso.",
    },
  ];

  return (
    <section aria-labelledby="ayv-how-h">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
          Cómo funciona
        </p>
        <h2 id="ayv-how-h" className="mt-1 text-2xl font-semibold sm:text-3xl">
          De inspiración a viaje real, en tres pasos
        </h2>
      </div>
      <ol className="grid gap-4 md:grid-cols-3">
        {steps.map(({ n, Icon, title, body }) => (
          <li
            key={n}
            className="rounded-2xl border border-border bg-card p-6"
          >
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="text-xs font-semibold tracking-wider text-muted-foreground">
                {n}
              </span>
            </div>
            <h3 className="mt-4 text-lg font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Cierre: siguiente paso                                             */
/* ------------------------------------------------------------------ */

function NextStepSection({
  state,
}: {
  state: "empty" | "guest" | "authed-empty" | "authed-active";
}) {
  const cta =
    state === "authed-active"
      ? { to: "/cuenta/mi-viaje" as const, label: "Abrir Mi Viaje" }
      : state === "guest"
        ? { to: "/auth" as const, label: "Guardar mi viaje" }
        : { to: "/oriente-maya" as const, label: "Explorar el Oriente Maya" };

  return (
    <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold sm:text-2xl">
            ¿Listo para dar el siguiente paso?
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            El expediente es tuyo. Nadie contacta al concierge hasta que tú lo
            decides — este es tu espacio para planear con calma.
          </p>
        </div>
        <Link
          to={cta.to}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-95"
        >
          {cta.label}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}