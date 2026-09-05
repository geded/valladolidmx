/**
 * Lote 3M-A · Autorización canónica de los ganchos cron.
 *
 * Único mecanismo aceptado: la cabecera privada `x-cron-secret`, comparada en
 * tiempo constante contra el secreto server-only `CRON_HOOKS_SECRET`
 * (Project Secrets; su réplica en Vault la usa `cron_hooks_invoke()` para
 * emitir la cabecera desde pg_cron).
 *
 * Reglas Founder (Lote 3M-A):
 *  - Sin alternativas: ni `apikey`/clave pública, ni bearer, ni parámetros de URL.
 *  - Fail closed: sin secreto configurado (o demasiado corto) se rechaza todo.
 *  - Rechazo uniforme (401 "Unauthorized") sin revelar el motivo.
 *  - Ningún mensaje de error o excepción transporta el valor del secreto.
 *
 * Lote 3M-A.2: modo simulación (`x-cron-dry-run`) evaluado sólo tras la
 * autorización; ver `cron-dry-run.server.ts`. Nunca sustituye al secreto.
 */
import { timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CRON_DRY_RUN_HEADER,
  CronDryRunViolation,
  createDryRunClient,
  isDryRunRequest,
} from "@/lib/cron/cron-dry-run.server";

export const CRON_HOOK_HEADER = "x-cron-secret";
export const CRON_HOOK_SECRET_ENV = "CRON_HOOKS_SECRET";
export const CRON_HOOK_SECRET_MIN_LENGTH = 32;

export type EnvLike = Record<string, string | undefined>;

/** Cliente con privilegios de servicio; misma forma que `createClient()` sin genéricos. */
export type CronSupabase = SupabaseClient;

export interface CronJobResult {
  /** Código HTTP a devolver; 200 por defecto. */
  status?: number;
  /** Cuerpo JSON de respuesta. Nunca debe contener secretos ni PII. */
  body: Record<string, unknown>;
}

export interface CronRunContext {
  /**
   * `true` cuando la petición autorizada pidió simulación. El cliente recibido
   * ya está envuelto en el guardián de sólo lectura; el trabajo debe omitir
   * encolado, envío y marcas, y devolver únicamente contadores.
   */
  dryRun: boolean;
}

export type CronJobRunner = (supabase: CronSupabase, ctx: CronRunContext) => Promise<CronJobResult>;

export interface CronHookDeps {
  /** Entorno a consultar (por defecto `process.env`). Inyectable en pruebas. */
  env?: EnvLike;
  /** Fábrica del cliente de servicio. Inyectable en pruebas (transporte simulado). */
  createClient?: () => Promise<CronSupabase>;
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Lee el secreto del entorno; `null` si falta o no cumple la longitud mínima. */
export function readCronHookSecret(env: EnvLike = process.env): string | null {
  const value = env[CRON_HOOK_SECRET_ENV];
  if (typeof value !== "string") return null;
  if (value.length < CRON_HOOK_SECRET_MIN_LENGTH) return null;
  return value;
}

/**
 * `true` únicamente si la cabecera `x-cron-secret` coincide en tiempo constante
 * con el secreto configurado. Cualquier otra credencial se ignora.
 */
export function isAuthorizedCronRequest(request: Request, env: EnvLike = process.env): boolean {
  const expected = readCronHookSecret(env);
  if (!expected) return false;
  const provided = request.headers.get(CRON_HOOK_HEADER);
  if (!provided) return false;
  return safeEqual(provided, expected);
}

/** Respuesta uniforme de rechazo: mismo código, cuerpo y cabeceras para todo motivo. */
export function cronUnauthorizedResponse(): Response {
  return new Response("Unauthorized", {
    status: 401,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/** Respuesta sanitizada de fallo interno: sin mensaje, sin pila, sin secreto. */
export function cronFailureResponse(extra: Record<string, unknown> = {}): Response {
  return new Response(JSON.stringify({ ok: false, ...extra }), {
    status: 500,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/** Elimina cualquier aparición del secreto en un texto antes de registrarlo. */
export function redactSecret(text: string, secret: string | null): string {
  if (!secret) return text;
  return text.split(secret).join("[redacted]");
}

async function createServiceClient(env: EnvLike): Promise<CronSupabase> {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(env["SUPABASE_URL"]!, env["SUPABASE_SERVICE_ROLE_KEY"]!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Pipeline común de los ganchos cron:
 *   autorización → (¿simulación?) → cliente de servicio → trabajo → respuesta JSON.
 * Cualquier excepción del trabajo se convierte en 500 sanitizado.
 *
 * La simulación se decide **después** de autorizar: una petición no autorizada
 * con `x-cron-dry-run` recibe el mismo 401 uniforme y nunca crea el cliente.
 */
export async function handleCronHook(
  request: Request,
  run: CronJobRunner,
  deps: CronHookDeps = {},
): Promise<Response> {
  const env = deps.env ?? process.env;
  if (!isAuthorizedCronRequest(request, env)) return cronUnauthorizedResponse();

  const dryRun = isDryRunRequest(request);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };
  if (dryRun) headers[CRON_DRY_RUN_HEADER] = "1";

  try {
    const service = deps.createClient ? await deps.createClient() : await createServiceClient(env);
    const supabase = dryRun ? createDryRunClient(service) : service;
    const result = await run(supabase, { dryRun });
    const body = dryRun ? { ...result.body, dry_run: true } : result.body;
    return new Response(JSON.stringify(body), { status: result.status ?? 200, headers });
  } catch (err) {
    if (err instanceof CronDryRunViolation) {
      // Un trabajo intentó escribir en simulación: el guardián lo detuvo antes
      // de emitir la petición. Se registra sólo el objetivo (tabla/RPC), sin PII.
      console.error("cron dry-run blocked a write", {
        path: safePathname(request.url),
        kind: err.kind,
        target: err.target,
      });
      return cronFailureResponse({ dry_run: true, error: "write_blocked" });
    }
    const message = err instanceof Error ? err.message : "unknown_error";
    console.error("cron hook failed", {
      path: safePathname(request.url),
      error: redactSecret(message, readCronHookSecret(env)),
    });
    return cronFailureResponse(dryRun ? { dry_run: true } : {});
  }
}

function safePathname(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return "unknown";
  }
}
