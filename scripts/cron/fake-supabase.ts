/**
 * Lote 3M-A · Cliente Supabase simulado para pruebas de aislamiento de los
 * ganchos cron. Registra cada RPC y cada escritura sin tocar la red ni la
 * base real: el "transporte" (`enqueue_email`) es un contador.
 */
import { mock } from "bun:test";
import type { CronSupabase } from "../../src/lib/cron/cron-hook-auth.server";

// El envío ya no usa la cola `enqueue_email`: va directo al servicio de correo.
// En pruebas, ese envío se redirige al cliente simulado como la RPC de siempre,
// así el contador y el bloqueo en simulación siguen cubriendo el transporte.
mock.module("../../src/lib/email/managed-send.server", () => ({
  sendManagedPayload: async (
    client: {
      rpc: (fn: string, args: unknown) => Promise<{ error: { message: string } | null }>;
      from: (t: string) => { insert: (row: unknown) => Promise<unknown> };
    },
    args: { payload: { to: string; label?: string; message_id?: string } },
  ) => {
    const { error } = await client.rpc("enqueue_email", args);
    if (error) return { error };
    // Igual que el envío real: deja constancia en el registro de correos.
    await client.from("email_send_log").insert({
      message_id: args.payload.message_id ?? null,
      template_name: args.payload.label ?? "unknown",
      recipient_email: args.payload.to,
      status: "sent",
    });
    return { error: null };
  },
}));

export type FakeResp<T = unknown> = { data: T; error: { message: string } | null };

export interface FakeSupabaseOptions {
  /** Respuesta por nombre de RPC. Sin entrada → `{ data: null, error: null }`. */
  rpc?: Record<string, (args: Record<string, unknown> | undefined) => FakeResp>;
  /** Resultado de `.maybeSingle()`/`.single()` por tabla. */
  selects?: Record<string, FakeResp>;
}

export interface FakeSupabase {
  client: CronSupabase;
  rpcCalls: Array<{ fn: string; args: unknown }>;
  writes: Array<{ table: string; op: string; payload: unknown }>;
  /** Llamadas al transporte de correo (cola `enqueue_email`). */
  transportCalls: () => Array<{ fn: string; args: unknown }>;
}

export function makeFakeSupabase(opts: FakeSupabaseOptions = {}): FakeSupabase {
  const rpcCalls: FakeSupabase["rpcCalls"] = [];
  const writes: FakeSupabase["writes"] = [];

  const from = (table: string) => {
    const chain: Record<string, unknown> = {};
    const self = () => chain;
    const resolved = (): FakeResp => opts.selects?.[table] ?? { data: null, error: null };
    Object.assign(chain, {
      select: self,
      eq: self,
      neq: self,
      is: self,
      in: self,
      order: self,
      limit: self,
      insert: (payload: unknown) => {
        writes.push({ table, op: "insert", payload });
        return chain;
      },
      update: (payload: unknown) => {
        writes.push({ table, op: "update", payload });
        return chain;
      },
      upsert: (payload: unknown) => {
        writes.push({ table, op: "upsert", payload });
        return chain;
      },
      delete: () => {
        writes.push({ table, op: "delete", payload: null });
        return chain;
      },
      maybeSingle: async () => resolved(),
      single: async () => resolved(),
      then: (onFulfilled: (v: FakeResp) => unknown, onRejected?: (e: unknown) => unknown) =>
        Promise.resolve<FakeResp>({ data: null, error: null }).then(onFulfilled, onRejected),
    });
    return chain;
  };

  const client = {
    from,
    rpc: async (fn: string, args?: Record<string, unknown>) => {
      rpcCalls.push({ fn, args });
      const handler = opts.rpc?.[fn];
      return handler ? handler(args) : { data: null, error: null };
    },
  };

  return {
    client: client as unknown as CronSupabase,
    rpcCalls,
    writes,
    transportCalls: () => rpcCalls.filter((c) => c.fn === "enqueue_email"),
  };
}
