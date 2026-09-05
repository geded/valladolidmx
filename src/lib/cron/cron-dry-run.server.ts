/**
 * Lote 3M-A.2 · Modo simulación (dry-run) de los ganchos cron.
 *
 * Permite ejercitar en un entorno real (preview) todo el pipeline
 *   autorización → cliente de servicio → selección de candidatos → render
 * con la garantía técnica de **cero escrituras y cero envíos**:
 *
 *  - La simulación sólo se activa con la cabecera explícita `x-cron-dry-run`
 *    (`1` o `true`) y **después** de que la autorización canónica haya pasado.
 *    Nunca relaja ni sustituye `x-cron-secret`.
 *  - pg_cron jamás emite esa cabecera (`cron_hooks_invoke` no la conoce), por lo
 *    que las ejecuciones programadas siguen siendo reales.
 *  - El cliente de servicio se envuelve en un guardián de sólo lectura que
 *    bloquea `insert`/`update`/`upsert`/`delete` y cualquier RPC fuera de la
 *    lista blanca de funciones `STABLE` de selección. Un intento de escritura
 *    lanza `CronDryRunViolation` y el gancho responde 500 sin haber tocado datos.
 *  - La respuesta contiene únicamente contadores: nunca correos, nombres ni ids.
 */
import * as React from "react";
import { render } from "@react-email/render";
import { TEMPLATES } from "@/lib/email-templates/registry";
import type { CronSupabase } from "@/lib/cron/cron-hook-auth.server";

export const CRON_DRY_RUN_HEADER = "x-cron-dry-run";

/** Valores aceptados para la cabecera de simulación (comparación exacta tras trim). */
const DRY_RUN_TRUE_VALUES = new Set(["1", "true"]);

/**
 * Funciones SQL que los jobs usan para seleccionar candidatos. Todas son
 * `STABLE` en la base (PostgreSQL impide que modifiquen datos). Cualquier otra
 * RPC — en particular `enqueue_email` — queda bloqueada en simulación.
 */
export const CRON_DRY_RUN_READ_RPCS: ReadonlySet<string> = new Set([
  "get_orders_needing_trip_email",
  "get_coupons_needing_review_reminder",
  "list_visibility_grants_expiring",
  "list_visibility_grants_recently_expired",
]);

const BLOCKED_BUILDER_METHODS = new Set(["insert", "update", "upsert", "delete"]);
const BLOCKED_CLIENT_PROPS = new Set(["storage", "functions", "schema", "channel", "realtime"]);

/** `true` sólo si la cabecera de simulación está presente con un valor afirmativo. */
export function isDryRunRequest(request: Request): boolean {
  const raw = request.headers.get(CRON_DRY_RUN_HEADER);
  if (!raw) return false;
  return DRY_RUN_TRUE_VALUES.has(raw.trim().toLowerCase());
}

export class CronDryRunViolation extends Error {
  readonly kind: "write" | "rpc" | "client";
  readonly target: string;
  constructor(kind: "write" | "rpc" | "client", target: string) {
    super(`dry-run blocked ${kind}: ${target}`);
    this.name = "CronDryRunViolation";
    this.kind = kind;
    this.target = target;
  }
}

/**
 * Envuelve un cliente de servicio real en un guardián de sólo lectura.
 * Las lecturas (`from(...).select(...)`, RPC de la lista blanca) pasan al
 * cliente real; toda escritura o RPC no listada lanza `CronDryRunViolation`
 * antes de emitir petición alguna.
 */
export function createDryRunClient(
  real: CronSupabase,
  allowedRpcs: ReadonlySet<string> = CRON_DRY_RUN_READ_RPCS,
): CronSupabase {
  const guardBuilder = (table: string, builder: object): object =>
    new Proxy(builder, {
      get(target, prop, receiver) {
        if (typeof prop === "string" && BLOCKED_BUILDER_METHODS.has(prop)) {
          return () => {
            throw new CronDryRunViolation("write", `${table}.${prop}`);
          };
        }
        const value = Reflect.get(target, prop, receiver);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });

  const realFrom = (real as unknown as { from: (t: string) => object }).from.bind(real);
  const realRpc = (real as unknown as { rpc: (fn: string, ...rest: unknown[]) => unknown }).rpc.bind(
    real,
  );

  return new Proxy(real as unknown as object, {
    get(target, prop, receiver) {
      if (prop === "from") {
        return (table: string) => guardBuilder(table, realFrom(table));
      }
      if (prop === "rpc") {
        return (fn: string, ...rest: unknown[]) => {
          if (!allowedRpcs.has(fn)) throw new CronDryRunViolation("rpc", fn);
          return realRpc(fn, ...rest);
        };
      }
      if (typeof prop === "string" && BLOCKED_CLIENT_PROPS.has(prop)) {
        throw new CronDryRunViolation("client", prop);
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as unknown as CronSupabase;
}

/** Contadores por tipo de envío en simulación. Nunca contienen datos personales. */
export interface DryRunKindStats {
  candidates: number;
  would_send: number;
  would_suppress: number;
  render_failed: number;
}

export function newDryRunStats(): DryRunKindStats {
  return { candidates: 0, would_send: 0, would_suppress: 0, render_failed: 0 };
}

export type DryRunOutcome = "would_send" | "would_suppress" | "render_failed";

export interface DryRunCandidate {
  /** Destinatario (sólo se usa para la consulta de supresión; jamás se devuelve). */
  email: string;
  templateName: string;
  templateData: Record<string, unknown>;
}

/**
 * Ejecuta la lógica previa al envío sin efectos:
 *   1. consulta de supresión (lectura)
 *   2. render de HTML, texto plano y asunto (cómputo puro)
 * Omite deliberadamente la creación del token de baja, el registro en
 * `email_send_log`, `enqueue_email` y la marca de enviado.
 */
export async function previewCandidate(
  supabase: CronSupabase,
  candidate: DryRunCandidate,
): Promise<DryRunOutcome> {
  const email = candidate.email.toLowerCase().trim();
  if (!email) return "render_failed";

  const { data: suppressed } = await supabase
    .from("suppressed_emails")
    .select("email")
    .eq("email", email)
    .maybeSingle();
  if (suppressed) return "would_suppress";

  const template = TEMPLATES[candidate.templateName];
  if (!template) return "render_failed";
  try {
    const element = React.createElement(template.component, candidate.templateData);
    const html = await render(element);
    const text = await render(element, { plainText: true });
    const subject =
      typeof template.subject === "function"
        ? template.subject(candidate.templateData)
        : template.subject;
    if (!html || !text || !subject) return "render_failed";
    return "would_send";
  } catch {
    return "render_failed";
  }
}

/** Acumula un resultado de simulación en los contadores del tipo. */
export function recordDryRunOutcome(stats: DryRunKindStats, outcome: DryRunOutcome): void {
  stats.candidates += 1;
  stats[outcome] += 1;
}
