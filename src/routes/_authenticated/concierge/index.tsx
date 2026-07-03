/**
 * /concierge — Bandeja de expedientes (migrado 1:1 a 15.10.5c.2).
 *
 * Contenido funcional idéntico al previo `concierge.tsx`; sólo se removió
 * el contenedor `<main>` local (ahora lo aporta WorkspaceShell).
 */
import { createFileRoute, ErrorComponent, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  listConciergeCasesExtended,
  getConciergeMyWorkload,
} from "@/lib/concierge/concierge.functions";

type Scope = "concierge" | "unassigned" | "lead";
type Sort = "updated_at" | "priority" | "sla_status" | "idle" | "created_at" | "trip_date" | "assigned_concierge";
type CaseRow = {
  id: string;
  status: string;
  priority: string;
  source: string;
  summary: string | null;
  created_at: string;
  updated_at: string;
  last_activity_at: string | null;
  target_response_at: string | null;
  sla_status: "on_time" | "due_soon" | "overdue" | null;
  assigned_concierge_user_id: string | null;
};

export const Route = createFileRoute("/_authenticated/concierge/")({
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
  const [scope, setScope] = useState<Scope>("concierge");
  const [sort, setSort] = useState<Sort>("sla_status");
  const [priority, setPriority] = useState<string>("");
  const [slaStatus, setSlaStatus] = useState<string>("");

  const listFn = useServerFn(listConciergeCasesExtended);
  const workloadFn = useServerFn(getConciergeMyWorkload);

  const casesQ = useSuspenseQuery(
    queryOptions({
      queryKey: ["concierge", "cases-ext", scope, sort, priority, slaStatus],
      queryFn: () =>
        listFn({
          data: {
            scope,
            sort,
            limit: 100,
            ...(priority ? { priority: [priority as "low" | "normal" | "high" | "urgent"] } : {}),
            ...(slaStatus ? { slaStatus: [slaStatus as "on_time" | "due_soon" | "overdue"] } : {}),
          },
        }) as Promise<CaseRow[]>,
    }),
  );
  const wlQ = useSuspenseQuery(
    queryOptions({
      queryKey: ["concierge", "my-workload"],
      queryFn: () => workloadFn() as Promise<{ active_cases: number; overdue: number; due_soon: number } | null>,
    }),
  );

  return (
    <section className="mx-auto w-full max-w-[1100px]">
      <header className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Concierge Workspace
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Bandeja de expedientes</h1>
        {wlQ.data && (
          <p className="mt-1 text-sm text-muted-foreground">
            Activos: <strong className="text-foreground">{wlQ.data.active_cases}</strong>
            {" · "}Vencidos: <strong className="text-destructive">{wlQ.data.overdue}</strong>
            {" · "}Por vencer: <strong className="text-amber-600">{wlQ.data.due_soon}</strong>
          </p>
        )}
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Tab active={scope === "concierge"} label="Mis expedientes" onClick={() => setScope("concierge")} />
        <Tab active={scope === "unassigned"} label="Sin asignar" onClick={() => setScope("unassigned")} />
        <Tab active={scope === "lead"} label="Todos (lead)" onClick={() => setScope("lead")} />
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-md border border-border bg-card/40 p-3 text-xs">
        <Select label="Ordenar" value={sort} onChange={(v) => setSort(v as Sort)} options={[
          ["sla_status","SLA"], ["priority","Prioridad"], ["idle","Tiempo sin actividad"],
          ["created_at","Fecha de creación"], ["trip_date","Fecha de viaje"],
          ["assigned_concierge","Concierge asignado"], ["updated_at","Última actualización"],
        ]} />
        <Select label="Prioridad" value={priority} onChange={setPriority} options={[
          ["","Todas"], ["urgent","Urgent"], ["high","High"], ["normal","Normal"], ["low","Low"],
        ]} />
        <Select label="SLA" value={slaStatus} onChange={setSlaStatus} options={[
          ["","Todos"], ["overdue","Vencidos"], ["due_soon","Por vencer"], ["on_time","En tiempo"],
        ]} />
      </div>

      <CasesSection cases={casesQ.data} empty="Sin expedientes." />
    </section>
  );
}

function Tab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
        active ? "bg-primary text-primary-foreground" : "border border-border bg-background hover:bg-muted"
      }`}
    >
      {label}
    </button>
  );
}

function Select({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void; options: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border bg-background px-2 py-1 text-xs"
      >
        {options.map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
      </select>
    </label>
  );
}

function CasesSection({ cases, empty }: { cases: CaseRow[]; empty: string }) {
  const slaCls = (s: CaseRow["sla_status"]) =>
    s === "overdue" ? "bg-destructive/15 text-destructive"
    : s === "due_soon" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
    : s === "on_time" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
    : "bg-muted text-muted-foreground";
  return (
    <section>
      {cases.length === 0 ? (
        <p className="mt-3 rounded-md border border-dashed border-border bg-card/40 p-4 text-sm text-muted-foreground">
          {empty}
        </p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {cases.map((c) => (
            <li key={c.id} className="rounded-md border border-border bg-card p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs text-muted-foreground">{c.id.slice(0, 8)}</span>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${slaCls(c.sla_status)}`}>
                    SLA · {c.sla_status ?? "n/a"}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
                    {c.priority}
                  </span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                    {c.status}
                  </span>
                </div>
              </div>
              <Link
                to="/concierge/expedientes/$caseId"
                params={{ caseId: c.id }}
                className="mt-2 block font-medium hover:underline"
              >
                {c.summary ?? "Sin resumen"}
              </Link>
              <p className="mt-1 text-xs text-muted-foreground">
                Origen: {c.source}
                {c.target_response_at ? ` · Objetivo ${new Date(c.target_response_at).toLocaleString()}` : ""}
                {c.last_activity_at ? ` · Última actividad ${new Date(c.last_activity_at).toLocaleString()}` : ""}
                {c.assigned_concierge_user_id ? ` · Resp. ${c.assigned_concierge_user_id.slice(0, 8)}` : " · Sin asignar"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}