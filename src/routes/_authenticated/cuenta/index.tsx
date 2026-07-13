/**
 * /cuenta — Resumen de la cuenta del viajero (Ola 4 · Etapa 3).
 * Lectura del propio `traveler_profiles` vía server fn protegida.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/useAuth";
import { getMyTravelerProfile } from "@/lib/traveler/traveler-account.functions";
import { getMyPersonalProfile } from "@/lib/traveler/profile-personal.functions";
import { ProfileCompletionMeter } from "@/components/traveler/ProfileCompletionMeter";
import { StageAwareCompanionBoard } from "@/components/traveler/StageAwareCompanionBoard";
import { useTravelStage } from "@/lib/traveler/use-travel-stage";
import { LinkGoogleCard } from "@/components/traveler/LinkGoogleCard";
import { PublicProfileBenefitsCard } from "@/components/traveler/PublicProfileBenefitsCard";
import { getMyPublicProfile } from "@/lib/traveler/traveler-public.functions";
import { ReviewerBadge } from "@/components/traveler/ReviewerBadge";
import { getMyReviewerStats } from "@/lib/reviews/reviewer-stats.functions";
import {
  getProfileModeState,
  type ProfileMode,
} from "@/lib/profile-mode/mode.functions";
import { Briefcase, Compass, Headphones, Mail, Shield, UserRound } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cuenta/")({
  component: CuentaResumen,
});

function CuentaResumen() {
  const { user } = useAuth();
  const fetchMode = useServerFn(getProfileModeState);
  const modeQ = useQuery({
    queryKey: ["profile-mode-state"],
    queryFn: () => fetchMode(),
    enabled: Boolean(user?.id),
    staleTime: 60_000,
  });
  const active: ProfileMode = modeQ.data?.active ?? "traveler";

  if (modeQ.isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando tu cuenta…</p>;
  }

  if (active !== "traveler") {
    return <NonTravelerCuenta mode={active} />;
  }

  return <TravelerCuenta />;
}

function TravelerCuenta() {
  const { user } = useAuth();
  const fetchProfile = useServerFn(getMyTravelerProfile);
  const fetchPersonal = useServerFn(getMyPersonalProfile);
  const fetchPublic = useServerFn(getMyPublicProfile);
  const fetchReviewerStats = useServerFn(getMyReviewerStats);
  const { data, isLoading, error } = useQuery({
    queryKey: ["traveler", "profile", user?.id],
    queryFn: () => fetchProfile(),
    enabled: Boolean(user?.id),
    staleTime: 60_000,
  });
  const { data: personal } = useQuery({
    queryKey: ["traveler", "personal", user?.id],
    queryFn: () => fetchPersonal(),
    enabled: Boolean(user?.id),
    staleTime: 60_000,
  });
  const { data: publicProfile } = useQuery({
    queryKey: ["traveler", "public-profile", user?.id],
    queryFn: () => fetchPublic(),
    enabled: Boolean(user?.id),
    staleTime: 60_000,
  });
  const { data: reviewerStats } = useQuery({
    queryKey: ["reviewer-stats", user?.id],
    queryFn: () => fetchReviewerStats(),
    enabled: Boolean(user?.id),
    staleTime: 5 * 60_000,
  });

  // CV6.O2 · Stage-Aware Experience — resuelve la etapa reutilizando
  // el contrato v1.0.0 (`deriveTravelStage`) y respeta override `?stage=`.
  const { stage } = useTravelStage({ profile: data });

  const completionChecks: boolean[] = [
    Boolean(personal?.first_name || personal?.display_name),
    Boolean(personal?.phone),
    Boolean(personal?.country),
    Boolean(personal?.preferred_language),
    Boolean(personal?.avatar_url),
    Boolean(data?.travel_style),
    Boolean(data?.budget_range),
    (data?.interests?.length ?? 0) > 0,
    (data?.preferred_destinations?.length ?? 0) > 0,
    Boolean(data?.trip_context?.travel_window),
  ];
  const done = completionChecks.filter(Boolean).length;
  const total = completionChecks.length;

  const displayName =
    personal?.display_name ||
    [personal?.first_name, personal?.last_name].filter(Boolean).join(" ").trim() ||
    null;

  return (
    <div className="max-w-3xl">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
        Cuenta del viajero
      </p>
      <h1 className="mt-2 text-4xl">
        {displayName ? `Hola, ${displayName.split(" ")[0]}.` : "Bienvenida, bienvenido."}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Aquí vives tu Oriente Maya de Yucatán: tu perfil, tu viaje, tus favoritos.
      </p>
      {reviewerStats ? (
        <div className="mt-4">
          <ReviewerBadge
            verifiedCount={reviewerStats.verifiedCount}
            isReviewerVerified={reviewerStats.isReviewerVerified}
            size="md"
            showProgress
          />
        </div>
      ) : null}

      <div className="mt-6">
        <StageAwareCompanionBoard
          stage={stage}
          firstName={displayName ? displayName.split(" ")[0] : null}
        />
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Datos de contacto</h2>
        <dl className="mt-4 grid gap-4 text-sm md:grid-cols-2">
          <div className="flex items-start gap-2">
            <UserRound className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Nombre
              </dt>
              <dd className="mt-0.5">{displayName ?? "—"}</dd>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Mail className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Correo
              </dt>
              <dd className="mt-0.5 break-all">{personal?.email ?? user?.email ?? "—"}</dd>
            </div>
          </div>
        </dl>
      </section>

      <div className="mt-6">
        <ProfileCompletionMeter personal={personal} travel={data} />
      </div>

      <PublicProfileBenefitsCard
        isPublic={Boolean(publicProfile?.is_public)}
        isComplete={done === total}
        done={done}
        total={total}
      />

      <LinkGoogleCard />

      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Tu estilo de viaje</h2>
        {isLoading ? (
          <p className="mt-2 text-sm text-muted-foreground">Cargando…</p>
        ) : error ? (
          <p className="mt-2 text-sm text-destructive">
            No pudimos cargar tu perfil: {String((error as Error).message)}
          </p>
        ) : data ? (
          <dl className="mt-3 grid gap-3 text-sm md:grid-cols-2">
            <Field label="Estilo de viaje" value={data.travel_style ?? "—"} />
            <Field label="Rango de presupuesto" value={data.budget_range ?? "—"} />
            <Field label="Idioma preferido" value={data.preferred_language ?? "—"} />
            <Field
              label="Intereses"
              value={data.interests.length ? data.interests.join(", ") : "—"}
            />
            <Field
              label="Destinos preferidos"
              value={
                data.preferred_destinations.length
                  ? data.preferred_destinations.join(", ")
                  : "—"
              }
            />
            <Field
              label="Restricciones alimentarias"
              value={data.dietary_restrictions ?? "—"}
            />
          </dl>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Aún no has completado tu perfil de viaje.
          </p>
        )}
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <FuturePanel
          title="Favoritos"
          body="Guarda empresas, productos y promociones de la vitrina. Disponible en una próxima etapa."
          to="/cuenta/favoritos"
        />
        <FuturePanel
          title="Historial"
          body="Tus reservas y compras aparecerán aquí. Disponible al habilitar pagos."
          to="/cuenta/historial"
        />
      </section>
    </div>
  );
}

const NON_TRAVELER_META: Record<
  Exclude<ProfileMode, "traveler">,
  {
    eyebrow: string;
    title: string;
    body: string;
    to: "/portal" | "/concierge" | "/cms";
    cta: string;
    Icon: typeof Briefcase;
  }
> = {
  business: {
    eyebrow: "Modo Empresa",
    title: "Tu espacio de trabajo empresarial",
    body: "Gestiona tu(s) negocio(s), productos, promociones y estadísticas desde el Portal Empresarial.",
    to: "/portal",
    cta: "Ir al Portal Empresarial",
    Icon: Briefcase,
  },
  concierge: {
    eyebrow: "Modo Concierge",
    title: "Tu bandeja de Concierge",
    body: "Atiende solicitudes de viajeros y coordina propuestas desde el panel Concierge.",
    to: "/concierge",
    cta: "Ir al panel Concierge",
    Icon: Headphones,
  },
  staff: {
    eyebrow: "Modo Staff",
    title: "Tu Studio editorial",
    body: "Administra contenido, plantillas y publicaciones del Oriente Maya desde el CMS Studio.",
    to: "/cms",
    cta: "Ir al CMS Studio",
    Icon: Shield,
  },
};

function NonTravelerCuenta({
  mode,
}: {
  mode: Exclude<ProfileMode, "traveler">;
}) {
  const meta = NON_TRAVELER_META[mode];
  const { Icon } = meta;
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
        {meta.eyebrow}
      </p>
      <h1 className="mt-2 text-4xl">{meta.title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">{meta.body}</p>

      <section className="mt-8 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <Icon className="mt-0.5 size-5 text-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold">Continuar en {meta.eyebrow.replace("Modo ", "")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Estás operando como <strong className="text-foreground">{meta.eyebrow.replace("Modo ", "")}</strong>.
              Puedes cambiar a otro modo en cualquier momento desde el menú de tu foto.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                to={meta.to}
                className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                {meta.cta}
              </Link>
              <Link
                to="/cuenta/perfil"
                className="inline-flex items-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Ajustes de cuenta
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-dashed border-border bg-background p-5">
        <div className="flex items-start gap-3">
          <Compass className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
          <p className="text-xs text-muted-foreground">
            ¿Quieres explorar como viajero? Cambia a modo <strong>Viajero</strong> desde el menú de tu foto para ver tu perfil de viaje, favoritos e historial.
          </p>
        </div>
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}

function FuturePanel({
  title,
  body,
  to,
}: {
  title: string;
  body: string;
  to: "/cuenta/favoritos" | "/cuenta/historial";
}) {
  return (
    <Link
      to={to}
      className="block rounded-2xl border border-dashed border-border bg-background p-5 transition hover:border-primary"
    >
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </Link>
  );
}