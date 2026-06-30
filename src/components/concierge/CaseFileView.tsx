/**
 * 14.60.2 — Customer Case File · vista de composición (read-only).
 * Consume concierge_case_file_v1 y respeta visibilidad por rol.
 */
import type { ReactNode } from "react";

type CaseFile = {
  case: {
    id: string;
    status: string;
    priority: string;
    source: string;
    summary: string | null;
    created_at: string;
    updated_at: string;
    traveler_user_id: string;
  };
  viewer: { user_id: string; is_internal: boolean };
  traveler: { user_id: string; display_name?: string | null; preferred_language?: string | null };
  travel_plan: { id: string } | null;
  requests: Array<{
    id: string;
    title: string;
    kind: string;
    status: string;
    source_type: string;
    notes: string | null;
  }>;
  links: Array<{ link_type: string; target_id: string }>;
  businesses: Array<{ id: string; display_name: string; slug: string | null }>;
  timeline: Array<{
    id: string;
    event_type: string;
    summary: string | null;
    occurred_at: string;
    severity: string;
  }>;
  quotes?: Array<{
    quote_id: string;
    request_id: string;
    business_id: string;
    business_name: string | null;
    status: string;
    currency: string;
    total_amount_cents: number | null;
    valid_until: string | null;
    submitted_at: string | null;
    expired_at: string | null;
    created_at: string;
    notes: string | null;
    terms: string | null;
    request_title: string;
    request_kind: string;
  }>;
};

export function CaseFileView({ data, hideInternal = false }: { data: unknown; hideInternal?: boolean }) {
  const f = data as CaseFile | null;
  if (!f) return <p className="text-sm text-muted-foreground">Expediente no disponible.</p>;
  const internal = f.viewer.is_internal && !hideInternal;

  return (
    <div className="grid gap-6">
      <Header f={f} />
      <Section title="Solicitudes">
        {f.requests.length === 0 ? (
          <Empty>Sin solicitudes registradas.</Empty>
        ) : (
          <ul className="grid gap-2">
            {f.requests.map((r) => (
              <li key={r.id} className="rounded-md border border-border bg-card p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{r.title}</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                    {r.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tipo: {r.kind} · Origen: {r.source_type}
                </p>
                {r.notes ? <p className="mt-1 text-xs text-foreground/80">{r.notes}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {f.businesses.length > 0 && (
        <Section title="Empresas participantes">
          <ul className="flex flex-wrap gap-2 text-xs">
            {f.businesses.map((b) => (
              <li
                key={b.id}
                className="rounded-full border border-border bg-card px-3 py-1"
              >
                {b.display_name}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {internal && f.quotes && f.quotes.length > 0 && (
        <Section title="Cotizaciones">
          <ul className="grid gap-2">
            {f.quotes.map((q) => (
              <li key={q.quote_id} className="rounded-md border border-border bg-card p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">
                    {q.business_name ?? "Empresa"} · {q.request_title}
                  </span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                    {q.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {q.total_amount_cents != null
                    ? `${(q.total_amount_cents / 100).toLocaleString("es-MX", { style: "currency", currency: q.currency })}`
                    : "Sin monto"}
                  {q.valid_until ? ` · Vigente hasta ${new Date(q.valid_until).toLocaleString()}` : ""}
                </p>
                {q.notes ? <p className="mt-1 text-xs text-foreground/80">{q.notes}</p> : null}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {internal && (
        <Section title="Enlaces internos">
          {f.links.length === 0 ? (
            <Empty>Sin enlaces.</Empty>
          ) : (
            <ul className="grid gap-1 text-xs text-muted-foreground">
              {f.links.map((l, i) => (
                <li key={i} className="font-mono">
                  {l.link_type} · {l.target_id.slice(0, 8)}
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      <Section title="Línea de tiempo">
        {f.timeline.length === 0 ? (
          <Empty>Sin eventos.</Empty>
        ) : (
          <ol className="grid gap-2">
            {f.timeline.map((t) => (
              <li key={t.id} className="rounded-md border border-border bg-card p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{t.event_type}</span>
                  <span className="text-muted-foreground">
                    {new Date(t.occurred_at).toLocaleString()}
                  </span>
                </div>
                {t.summary ? <p className="mt-1 text-foreground/80">{t.summary}</p> : null}
              </li>
            ))}
          </ol>
        )}
      </Section>
    </div>
  );
}

function Header({ f }: { f: CaseFile }) {
  return (
    <header className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-xs text-muted-foreground">{f.case.id.slice(0, 8)}</span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
          {f.case.status}
        </span>
      </div>
      <h2 className="mt-2 text-lg font-semibold">{f.case.summary ?? "Sin resumen"}</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Origen: {f.case.source} · Prioridad: {f.case.priority} · Creado{" "}
        {new Date(f.case.created_at).toLocaleString()}
      </p>
      {f.traveler.display_name && (
        <p className="mt-1 text-xs text-muted-foreground">
          Viajero: {f.traveler.display_name}
        </p>
      )}
    </header>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-border bg-card/40 p-3 text-xs text-muted-foreground">
      {children}
    </p>
  );
}