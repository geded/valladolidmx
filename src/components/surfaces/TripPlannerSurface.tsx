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
 *    travel_plans, AnonymousTravelDraft, Context Engine, Navigation Contract
 *    y Alux Traveler ya construidos.
 *
 * Estados:
 *  · empty          → visitante sin sesión ni progreso local.
 *  · guest          → visitante sin sesión con AnonymousTravelDraft.
 *  · authed-empty   → usuario autenticado sin ítems en plan activo.
 *  · authed-active  → usuario autenticado con plan activo poblado.
 */
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
import { useAnonymousTrip } from "@/lib/traveler/anonymous-draft";
import { useAluxContext } from "@/lib/alux/use-alux-context";
import { useTravelPreferences } from "@/lib/alux/use-travel-preferences";
import { GuestPlanPreview } from "@/components/traveler/GuestPlanPreview";
import { AluxTravelerPanel } from "@/components/traveler/AluxTravelerPanel";
import { TripBriefSection } from "@/components/traveler/TripBriefSection";
import { ProgressiveRegistrationButton } from "@/components/traveler/ProgressiveRegistrationButton";
import { Button } from "@/components/ui/button";

/**
 * Escala tipográfica y de componentes ÚNICA de esta superficie.
 * Delta de armonización: no cambia contenido ni estados, sólo unifica
 * jerarquía, pesos, radios y alturas de acción en toda la página.
 */
const EYEBROW = "text-[11px] font-semibold uppercase tracking-[0.14em] text-primary";
const H2 =
  "font-serif text-[1.25rem] font-semibold leading-[1.2] tracking-[-0.01em] sm:text-[1.6rem]";
const H3 = "text-[15px] font-semibold leading-snug sm:text-base";
const BODY = "text-[13px] leading-6 text-muted-foreground sm:text-sm";
const CARD = "rounded-2xl border border-border/70 bg-card p-5 shadow-soft sm:p-7";
const BTN_PRIMARY =
  "inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-95";
const BTN_SECONDARY =
  "inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-accent";

interface ReturnDestination {
  slug: string;
  label: string;
}

export function TripPlannerSurface({
  returnDestination = null,
}: {
  returnDestination?: ReturnDestination | null;
}) {
  const { user } = useAuth();
  const fetchActive = useServerFn(getMyActivePlan);
  const anonymous = useAnonymousTrip();

  const { data: active, isLoading: loadingPlan } = useQuery({
    queryKey: ["traveler", "active-plan", user?.id],
    queryFn: () => fetchActive(),
    enabled: Boolean(user?.id),
    staleTime: 30_000,
  });

  const guestCount = user
    ? 0
    : (anonymous.trip?.plannedItems.length ?? 0) +
      (anonymous.trip?.favorites.length ?? 0) +
      (anonymous.trip?.destinationIds.length ?? 0);

  const alux = useAluxContext();
  const itemCount = active?.items.length ?? 0;

  const state: "empty" | "guest" | "authed-empty" | "authed-active" = user
    ? itemCount > 0
      ? "authed-active"
      : "authed-empty"
    : guestCount > 0
      ? "guest"
      : "empty";

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-10 px-4 pb-4 sm:space-y-14 sm:px-6 lg:px-8">
      <TripPlannerHero
        state={state}
        user={Boolean(user)}
        planTitle={active?.plan.title ?? null}
        itemCount={itemCount}
        guestCount={guestCount}
        loadingPlan={loadingPlan && Boolean(user)}
        aluxReason={alux.hasContext ? alux.reason : null}
        aluxCanonical={alux.canonical ?? null}
        returnDestination={returnDestination}
      />

      {state === "guest" ? <GuestSection guestCount={guestCount} /> : null}
      {state === "authed-active" ? (
        <AuthedActiveSection planTitle={active?.plan.title ?? "Mi Viaje"} itemCount={itemCount} />
      ) : null}
      {state === "authed-empty" ? <AuthedEmptySection /> : null}

      {state === "authed-active" ? <AluxTravelerPanel /> : null}

      <TripBriefSection />
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
  returnDestination,
}: {
  state: "empty" | "guest" | "authed-empty" | "authed-active";
  user: boolean;
  planTitle: string | null;
  itemCount: number;
  guestCount: number;
  loadingPlan: boolean;
  aluxReason: string | null;
  aluxCanonical: string | null;
  returnDestination: ReturnDestination | null;
}) {
  const eyebrow =
    state === "authed-active"
      ? "Tu expediente de viaje"
      : state === "guest"
        ? "Tu expediente en este dispositivo"
        : "Planificador Oficial del Oriente Maya";

  const title =
    state === "authed-active"
      ? (planTitle ?? "Mi Viaje")
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
    <header className="border-b border-border/70 pb-6 pt-1 sm:pb-10 sm:pt-4">
      <p className={`mb-1.5 ${EYEBROW}`}>{eyebrow}</p>
      <h1 className="max-w-3xl text-balance font-serif text-[1.65rem] font-semibold leading-[1.12] tracking-[-0.015em] sm:text-[2.25rem] sm:leading-[1.08] lg:text-[2.6rem]">
        {title}
      </h1>
      <p className="mt-2.5 max-w-2xl text-sm leading-6 text-muted-foreground sm:mt-3 sm:text-[15px] sm:leading-7">
        {subtitle}
      </p>

      <RememberedPreferences />

      <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-5 sm:gap-3">
        {state === "authed-active" ? (
          <Button size="sm" className="h-10 rounded-full px-4" asChild>
            <Link to="/cuenta/mi-viaje">
              Abrir Mi Viaje
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
        ) : null}

        {state === "guest" ? (
          <ProgressiveRegistrationButton reason="save_permanently" className={BTN_PRIMARY}>
            <ShieldCheck className="size-4" aria-hidden />
            Guardar mi viaje
          </ProgressiveRegistrationButton>
        ) : null}

        {state === "authed-empty" || state === "empty" ? (
          <Button size="sm" className="h-10 rounded-full px-4" asChild>
            <Link
              to={returnDestination ? "/oriente-maya/$destino" : "/oriente-maya"}
              params={returnDestination ? { destino: returnDestination.slug } : undefined}
            >
              <Compass className="size-4" aria-hidden />
              {returnDestination ? `Explorar ${returnDestination.label}` : "Empezar a explorar"}
            </Link>
          </Button>
        ) : null}

        {state === "authed-active" || state === "guest" ? (
          <Button
            size="sm"
            variant="outline"
            className="h-10 rounded-full px-4 shadow-none"
            asChild
          >
            <Link
              to={returnDestination ? "/oriente-maya/$destino" : "/oriente-maya"}
              params={returnDestination ? { destino: returnDestination.slug } : undefined}
            >
              Seguir descubriendo
            </Link>
          </Button>
        ) : null}


        {!user ? (
          <Link
            to="/auth"
            className="inline-flex min-h-10 items-center px-2 text-sm font-medium text-primary hover:underline"
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
                <Link to={aluxCanonical} className="underline underline-offset-2">
                  Retomar
                </Link>
              </>
            ) : null}
          </span>
        </div>
      ) : null}

      {loadingPlan ? (
        <p role="status" className="mt-4 text-xs text-muted-foreground">
          Cargando tu expediente…
        </p>
      ) : null}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Viaje local visible                                                */
/* ------------------------------------------------------------------ */

function GuestSection({ guestCount }: { guestCount: number }) {
  return (
    <section aria-labelledby="ayv-guest-h">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className={EYEBROW}>Tu expediente</p>
          <h2 id="ayv-guest-h" className={`mt-0.5 ${H2}`}>
            En tu expediente ({guestCount})
          </h2>
          <p className={`mt-1.5 ${BODY}`}>
            Guardaste esto sin iniciar sesión. Vive en este navegador hasta que lo guardes en tu
            cuenta.
          </p>
        </div>
        <ProgressiveRegistrationButton
          reason="save_permanently"
          className={`hidden shrink-0 sm:inline-flex ${BTN_PRIMARY}`}
        >
          Guardar mi viaje
        </ProgressiveRegistrationButton>
      </div>
      <GuestPlanPreview limit={6} />
      <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0">
          <p className={H3}>Tu siguiente mejor paso</p>
          <p className={`mt-1 ${BODY}`}>
            Alux puede revisar lo que elegiste y sugerirte qué falta según el destino, el tiempo y
            el ritmo de tu viaje.
          </p>
        </div>
        <Link to="/alux" className={`shrink-0 ${BTN_PRIMARY}`}>
          Continuar con Alux
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <ProgressiveRegistrationButton
          reason="other_device"
          className={`justify-center ${BTN_SECONDARY}`}
        >
          Continuar en otro dispositivo
        </ProgressiveRegistrationButton>
        <ProgressiveRegistrationButton reason="share" className={`justify-center ${BTN_SECONDARY}`}>
          Compartir mi viaje
        </ProgressiveRegistrationButton>
        <ProgressiveRegistrationButton
          reason="reminders"
          className={`justify-center ${BTN_SECONDARY}`}
        >
          Recibir recordatorios
        </ProgressiveRegistrationButton>
      </div>
      <div className="mt-3 rounded-2xl border border-warning/35 bg-warning/10 p-4 text-[13px] leading-6 text-foreground sm:text-sm">
        <p>
          <strong className="font-semibold">Importante:</strong> si borras el historial del
          navegador perderás este expediente. Guárdalo en tu cuenta con un solo paso.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Autenticado con plan activo poblado                                */
/* ------------------------------------------------------------------ */

function AuthedActiveSection({ planTitle, itemCount }: { planTitle: string; itemCount: number }) {
  return (
    <section
      aria-labelledby="ayv-active-h"
      className="rounded-2xl border border-primary/25 bg-primary/5 p-5 shadow-soft sm:p-7"
    >
      <p className={EYEBROW}>Expediente activo</p>
      <h2 id="ayv-active-h" className={`mt-0.5 ${H2}`}>
        {planTitle}
      </h2>
      <p className={`mt-1.5 max-w-2xl ${BODY}`}>
        {itemCount} elemento{itemCount === 1 ? "" : "s"} guardado
        {itemCount === 1 ? "" : "s"}. Organiza el recorrido, añade notas y — cuando esté listo —
        envíalo a tu concierge humano desde Mi Viaje.
      </p>
      <div className="mt-5 flex flex-wrap gap-2 sm:gap-3">
        <Link to="/cuenta/mi-viaje" className={BTN_PRIMARY}>
          Abrir Mi Viaje
          <ArrowRight className="size-4" aria-hidden />
        </Link>
        <Link to="/oriente-maya" className={BTN_SECONDARY}>
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
      className="rounded-2xl border border-dashed border-border bg-card/60 p-6 text-center sm:p-8"
    >
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
        <PlusCircle className="size-3" aria-hidden /> Tu expediente está vacío
      </span>
      <h2 id="ayv-authempty-h" className={`mt-4 ${H2}`}>
        Empieza por lo que te llama la atención
      </h2>
      <p className={`mx-auto mt-2 max-w-md ${BODY}`}>
        Recorre destinos, hoteles, restaurantes y experiencias. En cada tarjeta pulsa{" "}
        <strong className="font-semibold text-foreground">Agregar a Mi Viaje</strong> — se guarda
        directamente en tu expediente.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link to="/oriente-maya" className={BTN_PRIMARY}>
          <Compass className="size-4" aria-hidden />
          Explorar destinos
        </Link>
        <Link to="/cuenta/mi-viaje" className={BTN_SECONDARY}>
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
      <div className="mb-5 sm:mb-6">
        <p className={EYEBROW}>Cómo funciona</p>
        <h2 id="ayv-how-h" className={`mt-0.5 ${H2}`}>
          De inspiración a viaje real, en tres pasos
        </h2>
      </div>
      <ol className="grid gap-3 sm:gap-4 md:grid-cols-3">
        {steps.map(({ n, Icon, title, body }) => (
          <li key={n} className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground">
                {n}
              </span>
            </div>
            <h3 className={`mt-4 ${H3}`}>{title}</h3>
            <p className={`mt-1.5 ${BODY}`}>{body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Cierre: siguiente paso                                             */
/* ------------------------------------------------------------------ */

function AluxTeaserSection({ authed }: { authed: boolean }) {
  return (
    <section
      aria-labelledby="ayv-alux-teaser-h"
      className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-soft sm:p-7"
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <Sparkles className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className={EYEBROW}>Copiloto</p>
          <h2 id="ayv-alux-teaser-h" className={`mt-0.5 ${H2}`}>
            Alux, tu copiloto de viaje
          </h2>
          <p className={`mt-1.5 max-w-2xl ${BODY}`}>
            {authed
              ? "Cuando tu expediente tenga al menos un elemento, Alux analiza el ritmo, detecta huecos y sugiere hoteles, restaurantes y experiencias del catálogo — sin modificar nada sin tu confirmación."
              : "Alux puede acompañarte desde ahora: revisa el contexto de tu recorrido y te ayuda a elegir el siguiente paso. Nunca modifica tu viaje sin tu confirmación."}
          </p>
          <div className="mt-4">
            <Link
              to={authed ? "/oriente-maya" : "/alux"}
              className={`${BTN_SECONDARY} border-primary/30 text-primary hover:bg-primary/5`}
            >
              {authed ? "Empezar a explorar" : "Continuar con Alux"}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function NextStepSection({
  state,
}: {
  state: "empty" | "guest" | "authed-empty" | "authed-active";
}) {
  const cta =
    state === "authed-active"
      ? { to: "/cuenta/mi-viaje" as const, label: "Abrir Mi Viaje" }
      : { to: "/oriente-maya" as const, label: "Explorar el Oriente Maya" };

  return (
    <section className={CARD}>
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className={H2}>¿Listo para dar el siguiente paso?</h2>
          <p className={`mt-1.5 max-w-xl ${BODY}`}>
            El expediente es tuyo. Nadie contacta al concierge hasta que tú lo decides — este es tu
            espacio para planear con calma.
          </p>
        </div>
        {state === "guest" ? (
          <ProgressiveRegistrationButton reason="save_permanently" className={BTN_PRIMARY}>
            Guardar mi viaje <ArrowRight className="size-4" aria-hidden />
          </ProgressiveRegistrationButton>
        ) : (
          <Link to={cta.to} className={BTN_PRIMARY}>
            {cta.label}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
      </div>
    </section>
  );
}

/**
 * Muestra, sin crear almacenamiento nuevo, lo que Alux ya recuerda de este
 * viajero (memoria funcional local + resumen de su cuenta) para que el
 * planificador continúe con la misma intención de viaje.
 */
function RememberedPreferences() {
  const preferences = useTravelPreferences();
  if (!preferences.length) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        Alux recuerda
      </span>
      {preferences.map((preference) => (
        <span
          key={preference.slug}
          className="rounded-full border border-[var(--selva)]/25 bg-[var(--selva)]/[0.06] px-2.5 py-1 text-[11px] font-medium text-[var(--brand-territory-deep)]"
        >
          {preference.label}
        </span>
      ))}
    </div>
  );
}
