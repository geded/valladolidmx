/**
 * /cms/demo-pack — Panel de estado del Demo Pack v1 · Oriente Maya.
 *
 * Read-only. Muestra la cobertura del dataset demo (destinos, empresas,
 * productos, KB multilingüe, reseñas y la orden VMX-DEMO01) y provee
 * accesos rápidos al recorrido demo end-to-end.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { getDemoPackStatus } from "@/lib/demo-pack/status.functions";

export const Route = createFileRoute("/_authenticated/cms/demo-pack")({
  head: () => ({
    meta: [
      { title: "Demo Pack v1 · CMS · Valladolid.mx" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DemoPackPanel,
});

function DemoPackPanel() {
  const fn = useServerFn(getDemoPackStatus);
  const q = useQuery({
    queryKey: ["cms", "demo-pack", "status"],
    queryFn: () => fn(),
  });

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <header className="border-b border-border pb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
          Demo World · Oriente Maya
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Demo Pack v1
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Estado del ecosistema navegable oficial del Oriente Maya. Cada elemento
          debe ser descubrible, recomendable por Alux y vendible.
        </p>
      </header>

      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando cobertura…</p>
      ) : q.error ? (
        <p className="text-sm text-destructive">
          No se pudo cargar el estado del Demo Pack.
        </p>
      ) : q.data ? (
        <>
          <section
            className={
              "rounded-2xl border p-5 " +
              (q.data.overallOk
                ? "border-success/40 bg-success/5"
                : "border-warning/40 bg-warning/5")
            }
          >
            <div className="flex items-center gap-3">
              {q.data.overallOk ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : (
                <AlertCircle className="h-5 w-5 text-warning" />
              )}
              <div>
                <p className="text-sm font-semibold">
                  {q.data.overallOk
                    ? "Demo Pack completo y listo para demostrar el recorrido."
                    : "Faltan piezas para completar el Demo Pack."}
                </p>
                <p className="text-xs text-muted-foreground">
                  Generado {new Date(q.data.generatedAt).toLocaleString("es-MX")}
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            {q.data.sections.map((s) => (
              <div
                key={s.key}
                className="flex items-center justify-between rounded-2xl border border-border bg-card p-4"
              >
                <div>
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.count} / meta {s.target}
                  </p>
                </div>
                {s.ok ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-warning" />
                )}
              </div>
            ))}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Recorrido demo end-to-end
            </p>
            <h2 className="mt-2 text-lg font-semibold">
              Viajero: Armando G. · Orden {q.data.demoOrderFolio}
            </h2>
            <ul className="mt-4 space-y-2 text-sm">
              <DemoLink to="/oriente-maya" label="Descubrimiento · Oriente Maya" />
              <DemoLink to="/hoteles" label="Hoteles demo (Suite Selva Maya)" />
              <DemoLink to="/casas-de-vacaciones" label="Casas de vacaciones demo" />
              <DemoLink to="/experiencias" label="Experiencias demo (Manglar al amanecer)" />
              <DemoLink to="/cms/travel-plans" label="Panel Concierge · Travel Plans" />
              <DemoLink to="/cms/ventas-en-linea" label="Comisiones · Ventas en línea" />
              <DemoLink to="/cms/alux/calidad" label="Alux · Calidad heurística" />
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              Login demo: <code className="rounded bg-muted px-1.5 py-0.5">geded@valladolid.com.mx</code>
            </p>
          </section>
        </>
      ) : null}
    </div>
  );
}

function DemoLink({ to, label }: { to: string; label: string }) {
  return (
    <li>
      <Link
        to={to}
        className="inline-flex items-center gap-2 text-primary hover:underline"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        {label}
      </Link>
    </li>
  );
}