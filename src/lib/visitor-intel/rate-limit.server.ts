/**
 * G8-R1-E-R3 · Rate limit DURABLE de ingesta (server-side).
 *
 * NO crea un segundo mecanismo: reutiliza el bucket deslizante durable ya
 * acreditado (`public.mcp_rate_buckets` + RPC atómico `mcp_rate_hit`,
 * MCP M1.0). Sirve para cualquier capacidad, no sólo MCP.
 *
 * Invariantes:
 *  · Clave SEUDÓNIMA (`subject:<subject_id>`), jamás IP cruda ni PII.
 *  · Ventana temporal fija alineada a epoch (idéntica en todas las
 *    instancias serverless ⇒ resiste reintentos distribuidos).
 *  · Conteo atómico en Postgres (UPSERT), no un Map en memoria.
 *  · Fail-closed: si el contador no puede evaluarse, se DENIEGA.
 *  · Auditoría sin PII: sólo capacidad, ventana y conteo.
 */

export interface DurableRateDecision {
  readonly allowed: boolean;
  readonly count: number;
  readonly retryAfterSeconds: number;
}

export interface DurableRateInput {
  /** Identificador seudónimo del sujeto (nunca IP, correo o nombre). */
  readonly subjectId: string;
  /** Capacidad protegida, p.ej. `visitor_intel.ingest`. */
  readonly capability: string;
  readonly windowSeconds?: number;
  readonly limit?: number;
}

export const INGEST_RATE_CAPABILITY = "visitor_intel.ingest" as const;
export const INGEST_RATE_WINDOW_SECONDS = 60;
export const INGEST_RATE_LIMIT = 60;

/** Clave de bucket: seudónima y estable. Nunca contiene PII. */
export function rateScopeKey(subjectId: string): string {
  return `subject:${subjectId}`;
}

type RateRow = { allowed: boolean; current_count: number; retry_after_seconds: number };

/**
 * Consume una unidad del bucket durable. Fail-closed ante cualquier error.
 * Sólo se invoca desde handlers server-side (service_role).
 */
export async function consumeDurableRate(
  admin: unknown,
  input: DurableRateInput,
): Promise<DurableRateDecision> {
  const windowSeconds = input.windowSeconds ?? INGEST_RATE_WINDOW_SECONDS;
  const limit = input.limit ?? INGEST_RATE_LIMIT;
  if (!input.subjectId) return { allowed: false, count: 0, retryAfterSeconds: windowSeconds };

  try {
    const client = admin as {
      rpc: (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: RateRow[] | RateRow | null; error: { message: string } | null }>;
    };
    const { data, error } = await client.rpc("mcp_rate_hit", {
      p_scope_key: rateScopeKey(input.subjectId),
      p_tool_name: input.capability,
      p_window_seconds: windowSeconds,
      p_limit: limit,
    });
    if (error || !data) {
      console.error("[visitor_intel.rate] fail-closed", error?.message ?? "empty");
      return { allowed: false, count: 0, retryAfterSeconds: windowSeconds };
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return { allowed: false, count: 0, retryAfterSeconds: windowSeconds };
    return {
      allowed: Boolean(row.allowed),
      count: Number(row.current_count ?? 0),
      retryAfterSeconds: Number(row.retry_after_seconds ?? 0),
    };
  } catch (error) {
    console.error("[visitor_intel.rate] fail-closed (throw)", error);
    return { allowed: false, count: 0, retryAfterSeconds: windowSeconds };
  }
}
