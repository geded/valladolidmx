/**
 * /portal — Landing del Portal Empresarial (Ola 3 · Etapa 1).
 *
 * Vista de resumen. En esta etapa muestra la lista de empresas
 * accesibles por el usuario y un placeholder de las secciones que
 * se habilitarán en etapas siguientes (Plan 14.30 §4).
 */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyBusinesses } from "@/lib/portal/portal-reads.functions";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/portal/")({
  component: PortalIndex,
});

const UPCOMING = [
  { stage: "Etapa 2", label: "Onboarding e invitaciones" },
  { stage: "Etapa 3", label: "Ficha pública + workflow editorial" },
  { stage: "Etapa 4", label: "Contactos, ubicaciones, horarios, redes" },
  { stage: "Etapa 5", label: "Galería de empresa" },
  { stage: "Etapa 6", label: "Productos + promociones" },
  { stage: "Etapa 7", label: "Usuarios internos de la empresa" },
];

function PortalIndex() {
  const { user } = useAuth();
  const fetchBusinesses = useServerFn(listMyBusinesses);
  const { data: businesses = [] } = useQuery({
    queryKey: ["portal", "my-businesses", user?.id],
    queryFn: () => fetchBusinesses(),
    enabled: Boolean(user?.id),
    staleTime: 60_000,
  });

  return (
    <div className="mx-auto max-w-3xl">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
          Portal Empresarial · Etapa 1
        </p>
        <h1 className="mt-2 text-3xl">Resumen</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Infraestructura de autorización del Portal disponible. Las
          siguientes etapas habilitarán las capacidades de edición.
        </p>
      </header>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Tus empresas ({businesses.length})
        </h2>
        <ul className="mt-3 grid gap-3">
          {businesses.map((b) => (
            <li
              key={b.business_id}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{b.display_name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    /{b.slug}
                  </p>
                </div>
                <div className="text-right text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  <p>{b.role}</p>
                  <p>{b.status}</p>
                </div>
              </div>
            </li>
          ))}
          {businesses.length === 0 && (
            <li className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              No tienes empresas asignadas todavía.
            </li>
          )}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Próximas etapas
        </h2>
        <ul className="mt-3 grid gap-2">
          {UPCOMING.map((u) => (
            <li
              key={u.stage}
              className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <span>{u.label}</span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                {u.stage}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}