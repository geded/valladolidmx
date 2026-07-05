/**
 * /cuenta/anfitrion — Onboarding empresarial dentro del Workspace Cuenta.
 *
 * Permite a un viajero autenticado reclamar una empresa existente o registrar
 * una nueva para revisión administrativa, sin salir de su workspace.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Building2 } from "lucide-react";
import { BecomeHostFlow } from "@/components/hosting/BecomeHostFlow";
import { listMyBusinesses } from "@/lib/hosting/hosting.functions";

export const Route = createFileRoute("/_authenticated/cuenta/anfitrion")({
  component: CuentaAnfitrionRoute,
});

function CuentaAnfitrionRoute() {
  const list = useServerFn(listMyBusinesses);
  const mine = useQuery({
    queryKey: ["my-businesses"],
    queryFn: () => list(),
  });

  return (
    <div className="max-w-4xl">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
        Anfitrión empresarial
      </p>
      <h1 className="mt-2 text-4xl">Convierte tu negocio en anfitrión</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Sigue nuestros pasos estilo Airbnb: verificamos tu identidad primero y
        después revisamos tu ficha antes de publicarla en Valladolid.mx.
      </p>

      {mine.data && mine.data.length > 0 && (
        <section className="mt-8 rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">
            Mis empresas
          </h2>
          <ul className="mt-3 space-y-2">
            {mine.data.map((b) => (
              <li
                key={b.id}
                className="flex flex-col gap-2 rounded-xl border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Building2 className="size-4 text-primary" aria-hidden />
                    <span className="truncate text-sm font-medium">
                      {b.display_name}
                    </span>
                    <StatusBadge status={b.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {b.destination_name ?? "—"}
                  </p>
                  {b.review_notes && (
                    <p className="mt-1 text-xs text-warning">
                      Notas del admin: {b.review_notes}
                    </p>
                  )}
                </div>
                <Link
                  to="/cuenta/empresa/$businessId/publicacion"
                  params={{ businessId: b.id }}
                  className="inline-flex items-center gap-1 self-start rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground sm:self-auto"
                >
                  Prepara para publicar
                  <ArrowRight className="size-3" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-8">
        <BecomeHostFlow />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: "Borrador", cls: "bg-muted text-muted-foreground" },
    in_review: { label: "En revisión", cls: "bg-info/15 text-info" },
    approved: { label: "Aprobado", cls: "bg-success/15 text-success" },
    published: { label: "Publicado", cls: "bg-success/15 text-success" },
    archived: { label: "Archivado", cls: "bg-destructive/15 text-destructive" },
  };
  const v = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${v.cls}`}>
      {v.label}
    </span>
  );
}