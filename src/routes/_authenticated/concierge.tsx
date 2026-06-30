/**
 * 14.60.1 — Concierge Workspace · Bandeja (lectura).
 * Vista mínima para validar el dominio: lista expedientes vía
 * concierge_case_list_for_role. RLS y autorización viven en la BD.
 */
import { createFileRoute, ErrorComponent } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listConciergeCases,
  type ConciergeCase,
  type ConciergeCaseScope,
} from "@/lib/concierge/concierge.functions";
import { PageShell } from "@/components/common/PageShell";

function casesQueryOptions(fn: () => Promise<ConciergeCase[]>, scope: ConciergeCaseScope) {
  return queryOptions({
    queryKey: ["concierge", "cases", scope],
    queryFn: fn,
  });
}

export const Route = createFileRoute("/_authenticated/concierge")({
  component: ConciergeInboxPage,
  errorComponent: ErrorComponent,
  notFoundComponent: () => <div className="p-6">No encontrado.</div>,
  head: () => ({
    meta: [
      { title: "Concierge · Bandeja · Valladolid.mx" },
      { name: "description", content: "Bandeja de expedientes del Concierge Workspace." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function ConciergeInboxPage() {
  const fn = useServerFn(listConciergeCases);
  const load = (scope: ConciergeCaseScope) => () =>
    fn({ data: { scope, limit: 100 } }) as Promise<ConciergeCase[]>;

  const leadQ = useSuspenseQuery(casesQueryOptions(load("lead"), "lead"));
  const mineQ = useSuspenseQuery(casesQueryOptions(load("concierge"), "concierge"));

  return (
    <PageShell>
      <header className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Ola 6 · Concierge Workspace
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Bandeja de expedientes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vista de lectura. Acciones de asignación, cotización y propuesta llegan en etapas posteriores.
        </p>
      </header>

      <CasesSection title="Todos los expedientes (lead)" cases={leadQ.data} empty="Sin expedientes registrados." />
      <CasesSection title="Mis expedientes" cases={mineQ.data} empty="Sin expedientes asignados." />
    </PageShell>
  );
}

function CasesSection({
  title,
  cases,
  empty,
}: {
  title: string;
  cases: ConciergeCase[];
  empty: string;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {cases.length === 0 ? (
        <p className="mt-3 rounded-md border border-dashed border-border bg-card/40 p-4 text-sm text-muted-foreground">
          {empty}
        </p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {cases.map((c) => (
            <li
              key={c.id}
              className="rounded-md border border-border bg-card p-4 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs text-muted-foreground">{c.id.slice(0, 8)}</span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  {c.status}
                </span>
              </div>
              <p className="mt-2 font-medium">{c.summary ?? "Sin resumen"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Origen: {c.source} · Prioridad: {c.priority} · Actualizado{" "}
                {new Date(c.updated_at).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}