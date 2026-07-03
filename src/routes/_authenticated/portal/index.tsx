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
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/portal/")({
  component: PortalIndex,
});

const SHORTCUTS = [
  { to: "/portal/ficha" as const, label: "Ficha pública" },
  { to: "/portal/presencia" as const, label: "Contactos, ubicaciones, horarios, redes" },
  { to: "/portal/galeria" as const, label: "Galería de empresa" },
  { to: "/portal/catalogo" as const, label: "Productos y promociones" },
  { to: "/portal/invitaciones" as const, label: "Invitaciones y usuarios" },
  { to: "/portal/propiedad" as const, label: "Propiedad y transferencia" },
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
          Portal Empresarial
        </p>
        <h1 className="mt-2 text-3xl">Resumen</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Administra la presencia pública, el catálogo y la operación de tus empresas.
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
          Accesos rápidos
        </h2>
        <ul className="mt-3 grid gap-2">
          {SHORTCUTS.map((s) => (
            <li key={s.to}>
              <Link
                to={s.to}
                className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm transition-colors hover:bg-accent"
              >
                <span>{s.label}</span>
                <span aria-hidden className="text-muted-foreground">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}