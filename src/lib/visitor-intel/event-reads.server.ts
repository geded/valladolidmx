/**
 * event-reads.server.ts — Lectura única del registro append-only del monitor.
 *
 * `visitor_intel` no está expuesto en la Data API; toda lectura pasa por la
 * función interna `public.visitor_intel_read_events` (sólo service_role) y se
 * pagina de 1,000 en 1,000 para que los totales nunca se topen en 1,000.
 * Server-only: los llamadores verifican antes el rol del usuario.
 */
export type VisitorIntelReadMode = "all" | "real" | "simulation" | "combined";

export interface VisitorIntelReadFilters {
  readonly since?: string;
  readonly kind?: string;
  readonly mode?: VisitorIntelReadMode;
  readonly simulationRunId?: string;
  readonly routePrefix?: string;
  readonly subjectId?: string;
  readonly subjectPrefix?: string;
  /** Techo de seguridad para no agotar memoria del Worker. */
  readonly maxRows?: number;
}

export interface VisitorIntelEventRow {
  event_id: string;
  occurred_at: string;
  ingested_at: string;
  kind: string;
  subject_id: string;
  surface: string;
  route: string;
  locale: string | null;
  is_simulation: boolean;
  simulation_run_id: string | null;
  payload: unknown;
}

const PAGE_SIZE = 1_000;
const DEFAULT_MAX_ROWS = 50_000;

type RpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { code?: string; message: string } | null }>;
};

export function buildReadArgs(filters: VisitorIntelReadFilters, offset: number) {
  return {
    _since: filters.since ?? null,
    _kind: filters.kind ?? null,
    _mode: filters.mode ?? "all",
    _simulation_run_id: filters.simulationRunId ?? null,
    _route_prefix: filters.routePrefix ?? null,
    _subject_id: filters.subjectId ?? null,
    _subject_prefix: filters.subjectPrefix ?? null,
    _offset: offset,
    _limit: PAGE_SIZE,
  };
}

/** Lee todas las filas que cumplen el filtro, en páginas de 1,000. */
export async function readVisitorIntelEvents(
  filters: VisitorIntelReadFilters,
  label: string,
  client?: unknown,
): Promise<VisitorIntelEventRow[]> {
  const db = (client ??
    (await import("@/integrations/supabase/client.server")).supabaseAdmin) as unknown as RpcClient;
  const maxRows = filters.maxRows ?? DEFAULT_MAX_ROWS;
  const rows: VisitorIntelEventRow[] = [];
  for (let offset = 0; offset < maxRows; offset += PAGE_SIZE) {
    const { data, error } = await db.rpc("visitor_intel_read_events", buildReadArgs(filters, offset));
    if (error) {
      console.error(`[visitor_intel.${label}] read failed`, error);
      throw new Response("Read failed", { status: 500 });
    }
    const page = (Array.isArray(data) ? data : []) as VisitorIntelEventRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

/** Total exacto de filas (sin traer el contenido). */
export async function countVisitorIntelEvents(
  filters: { since?: string; kind?: string },
  label: string,
): Promise<number> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as RpcClient;
  const { data, error } = await db.rpc("visitor_intel_count_events", {
    _since: filters.since ?? null,
    _kind: filters.kind ?? null,
  });
  if (error) {
    console.error(`[visitor_intel.${label}] count failed`, error);
    return 0;
  }
  return Number(data ?? 0);
}
