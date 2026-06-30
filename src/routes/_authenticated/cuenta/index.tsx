/**
 * /cuenta — Resumen de la cuenta del viajero (Ola 4 · Etapa 3).
 * Lectura del propio `traveler_profiles` vía server fn protegida.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/useAuth";
import { getMyTravelerProfile } from "@/lib/traveler/traveler-account.functions";

export const Route = createFileRoute("/_authenticated/cuenta/")({
  component: CuentaResumen,
});

function CuentaResumen() {
  const { user } = useAuth();
  const fetchProfile = useServerFn(getMyTravelerProfile);
  const { data, isLoading, error } = useQuery({
    queryKey: ["traveler", "profile", user?.id],
    queryFn: () => fetchProfile(),
    enabled: Boolean(user?.id),
    staleTime: 60_000,
  });

  return (
    <div className="max-w-3xl">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
        Cuenta del viajero
      </p>
      <h1 className="mt-2 text-4xl">Bienvenida, bienvenido.</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Esta es tu cuenta para guardar preferencias y, próximamente,
        favoritos e historial de reservas.
      </p>

      <section className="mt-8 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Tu perfil de viaje</h2>
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
        <div className="mt-5">
          <Link
            to="/cuenta/perfil"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            {data ? "Editar mi perfil" : "Completar mi perfil"}
          </Link>
        </div>
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