/**
 * Canales de Alux (Fase 4 del CRM): interruptores para Alux en
 * Valladolid.mx, WhatsApp y la ventana insertada en otras páginas.
 * Lectura pública solo de los booleanos; cambios solo administradores.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ALUX_CHANNEL_KEYS, channelsFromFlags, normalizeEmbedHost, withChannel } from "./channels";

async function assertAdmin(context: {
  supabase: { rpc: (fn: never, args: never) => PromiseLike<{ data: unknown }> };
  userId: string;
}) {
  const [a, s] = await Promise.all([
    context.supabase.rpc(
      "has_role" as never,
      { _user_id: context.userId, _role: "admin" } as never,
    ),
    context.supabase.rpc(
      "has_role" as never,
      { _user_id: context.userId, _role: "super_admin" } as never,
    ),
  ]);
  if (a.data !== true && s.data !== true) throw new Error("forbidden");
}

/** Público: ¿se muestra Alux en Valladolid.mx? (solo booleanos). */
export const getAluxPublicChannels = createServerFn({ method: "GET" }).handler(async () => {
  const [{ supabaseAdmin }, { readAluxChannelsServer }] = await Promise.all([
    import("@/integrations/supabase/client.server"),
    import("./channels.server"),
  ]);
  const c = await readAluxChannelsServer(supabaseAdmin);
  return { web: c.web };
});

/** Público: ¿puede abrirse la ventana insertada en este sitio? */
export const getAluxEmbedStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ host: z.string().max(255).default("") }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const [{ supabaseAdmin }, server] = await Promise.all([
      import("@/integrations/supabase/client.server"),
      import("./channels.server"),
    ]);
    let flags: Record<string, unknown> = {};
    try {
      flags = await server.readAluxSettingsFlagsServer(supabaseAdmin);
    } catch {
      return { enabled: false };
    }
    if (!channelsFromFlags(flags).embed) return { enabled: false };
    const host = normalizeEmbedHost(data.host);
    const allowed = server.embedHostsFromFlags(flags);
    const ok = host !== null && allowed.some((a) => host === a || host.endsWith(`.${a}`));
    return { enabled: ok };
  });

export const getAluxChannelsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const sb = context.supabase as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq?: (
            a: string,
            b: unknown,
          ) => {
            maybeSingle: () => PromiseLike<{ data: unknown; error: { message: string } | null }>;
          };
          is?: (
            a: string,
            b: null,
          ) => {
            order: (c: string) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
          };
        };
      };
    };
    const [settings, lines] = await Promise.all([
      sb.from("alux_settings").select("flags").eq!("singleton", true).maybeSingle(),
      sb.from("crm_whatsapp_lines").select("id, label, status, alux_enabled, phone_e164").is!(
        "owner_business_id",
        null,
      ).order("created_at"),
    ]);
    if (settings.error) throw new Error(settings.error.message);
    const flags = ((settings.data as { flags?: Record<string, unknown> } | null)?.flags ??
      {}) as Record<string, unknown>;
    const { embedHostsFromFlags } = await import("./channels.server");
    return {
      channels: channelsFromFlags(flags),
      embedHosts: embedHostsFromFlags(flags),
      lines: (
        (lines.data as Array<{
          id: string;
          label: string;
          status: string;
          alux_enabled: boolean;
          phone_e164: string | null;
        }> | null) ?? []
      ).map((l) => ({
        id: l.id,
        label: l.label,
        status: l.status,
        aluxEnabled: l.alux_enabled,
        connected: Boolean(l.phone_e164),
      })),
    };
  });

type SettingsRw = {
  from: (t: string) => {
    select: (s: string) => {
      eq: (
        a: string,
        b: boolean,
      ) => {
        maybeSingle: () => PromiseLike<{
          data: { flags?: unknown } | null;
          error: { message: string } | null;
        }>;
      };
    };
    update: (v: Record<string, unknown>) => {
      eq: (a: string, b: boolean) => PromiseLike<{ error: { message: string } | null }>;
    };
  };
};

async function writeFlags(
  supabase: unknown,
  change: (flags: Record<string, unknown>) => Record<string, unknown>,
) {
  const c = supabase as SettingsRw;
  const cur = await c.from("alux_settings").select("flags").eq("singleton", true).maybeSingle();
  if (cur.error) throw new Error(cur.error.message);
  if (!cur.data) throw new Error("alux_settings_missing");
  const flags = ((cur.data.flags as Record<string, unknown> | null) ?? {}) as Record<
    string,
    unknown
  >;
  const { error } = await c
    .from("alux_settings")
    .update({ flags: change(flags) })
    .eq("singleton", true);
  if (error) throw new Error(error.message);
}

export const setAluxChannel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ key: z.enum(ALUX_CHANNEL_KEYS), enabled: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    await writeFlags(context.supabase, (f) => withChannel(f, data.key, data.enabled));
    return { ok: true };
  });

export const setAluxEmbedHosts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ hosts: z.array(z.string().max(255)).max(50) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const hosts = Array.from(
      new Set(data.hosts.map(normalizeEmbedHost).filter((h): h is string => h !== null)),
    );
    await writeFlags(context.supabase, (f) => ({ ...f, embed_hosts: hosts }));
    return { hosts };
  });
