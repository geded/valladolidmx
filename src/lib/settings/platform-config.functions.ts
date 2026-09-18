/**
 * settings/platform-config.functions.ts
 *
 * Configuración central de la plataforma (sección /cms/configuracion).
 * Fuente de verdad única: `platform_settings` (clave → valor JSON).
 * NO crea un motor nuevo: reutiliza la tabla ya existente que usan
 * `payments.demo_mode`, marca y otros ajustes.
 *
 * Las llaves secretas (pasarela de pago) NUNCA se leen ni se escriben aquí:
 * sólo se reporta si están capturadas.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SettingKind = "boolean" | "number" | "text";

export interface SettingDefinition {
  key: string;
  group: "dominios" | "pagos" | "reservas" | "avisos";
  label: string;
  help: string;
  kind: SettingKind;
  defaultValue: boolean | number | string;
  /** Sólo lectura mientras el cobro con tarjeta no esté autorizado. */
  locked?: boolean;
  lockedNote?: string;
  min?: number;
  max?: number;
  isPublic?: boolean;
}

export const SETTING_GROUP_LABEL: Record<SettingDefinition["group"], string> = {
  dominios: "Dominios del sitio",
  pagos: "Formas de pago y pasarela",
  reservas: "Reservas y apartados",
  avisos: "Avisos y notificaciones",
};

/**
 * Registro declarativo. Para agregar un ajuste nuevo basta con sumar una
 * entrada aquí; la pantalla se arma sola.
 */
export const PLATFORM_SETTINGS: SettingDefinition[] = [
  {
    key: "site.primary_domain",
    group: "dominios",
    label: "Dominio principal del sitio",
    help: "Dirección oficial que se usa en buscadores, enlaces compartidos y correos. Cámbialo sólo cuando el dominio ya esté conectado y funcionando.",
    kind: "text",
    defaultValue: "quehacerenvalladolid.com",
    isPublic: true,
  },
  {
    key: "site.alternate_domains",
    group: "dominios",
    label: "Otros dominios conectados",
    help: "Direcciones adicionales que también llevan al sitio, separadas por coma. Ejemplo: orientemaya.com, valladolid.mx",
    kind: "text",
    defaultValue: "",
    isPublic: true,
  },
  {
    key: "payments.cash_enabled",
    group: "pagos",
    label: "Pago en efectivo",
    help: "Modalidad vigente: el viajero confirma y paga con su concierge o en el establecimiento.",
    kind: "boolean",
    defaultValue: true,
    isPublic: true,
  },
  {
    key: "payments.card_enabled",
    group: "pagos",
    label: "Pago con tarjeta en línea",
    help: "Los pasos ya están instalados. Se habilita cuando la pasarela esté configurada y autorizada.",
    kind: "boolean",
    defaultValue: false,
    locked: true,
    lockedNote: "Pendiente de credenciales de la pasarela y autorización.",
    isPublic: true,
  },
  {
    key: "payments.demo_mode",
    group: "pagos",
    label: "Modo demo de pagos",
    help: "Permite simular una compra para pruebas internas, sin cobro real.",
    kind: "boolean",
    defaultValue: true,
    isPublic: true,
  },
  {
    key: "payments.cash_instructions",
    group: "pagos",
    label: "Instrucciones de pago en efectivo",
    help: "Texto que verá el viajero al confirmar su reservación.",
    kind: "text",
    defaultValue:
      "Tu concierge te contactará para coordinar el pago y la entrega de tus confirmaciones.",
    isPublic: true,
  },
  {
    key: "reservations.hold_minutes",
    group: "reservas",
    label: "Minutos que se apartan los lugares",
    help: "Tiempo que se reservan los lugares mientras el viajero completa su reservación.",
    kind: "number",
    defaultValue: 20,
    min: 5,
    max: 180,
  },
  {
    key: "reservations.default_min_lead_hours",
    group: "reservas",
    label: "Anticipación mínima por omisión (horas)",
    help: "Se aplica a las experiencias que no definan su propia anticipación.",
    kind: "number",
    defaultValue: 24,
    min: 0,
    max: 720,
  },
  {
    key: "reservations.max_quantity",
    group: "reservas",
    label: "Máximo de personas por reservación",
    help: "Tope general de seguridad para las reservaciones en línea.",
    kind: "number",
    defaultValue: 20,
    min: 1,
    max: 200,
  },
  {
    key: "notifications.internal_email",
    group: "avisos",
    label: "Correo interno de operación",
    help: "Recibe los avisos de nuevas reservaciones y solicitudes.",
    kind: "text",
    defaultValue: "",
  },
  {
    key: "notifications.new_reservation",
    group: "avisos",
    label: "Avisar cada nueva reservación",
    help: "Aviso al equipo de concierge en cuanto entra una reservación.",
    kind: "boolean",
    defaultValue: true,
  },
  {
    key: "notifications.traveler_message",
    group: "avisos",
    label: "Avisar mensajes de viajeros",
    help: "Aviso cuando un viajero escribe y nadie ha respondido.",
    kind: "boolean",
    defaultValue: true,
  },
  {
    key: "notifications.online_sale_request",
    group: "avisos",
    label: "Avisar solicitudes de venta en línea",
    help: "Aviso cuando una empresa pide autorización para vender en línea.",
    kind: "boolean",
    defaultValue: true,
  },
];

const DEFINITION_BY_KEY = new Map(PLATFORM_SETTINGS.map((d) => [d.key, d]));

type AnyClient = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
  from: (table: string) => any;
};

const client = (context: { supabase: unknown }) => context.supabase as unknown as AnyClient;

async function assertAdmin(context: { supabase: unknown; userId: string }): Promise<void> {
  const c = client(context);
  const results = await Promise.all(
    (["super_admin", "admin"] as const).map((role) =>
      c.rpc("has_role", { _user_id: context.userId, _role: role }),
    ),
  );
  for (const r of results) {
    if (r.error) throw new Error(`role_check_failed: ${r.error.message}`);
  }
  if (!results.some((r) => r.data === true)) throw new Error("forbidden");
}

export interface PlatformConfigValue {
  key: string;
  value: boolean | number | string;
  updated_at: string | null;
}

export interface PlatformConfigView {
  values: PlatformConfigValue[];
  gateway: {
    provider: string;
    hasSecretKey: boolean;
    hasWebhookSecret: boolean;
    ready: boolean;
    webhookPath: string;
  };
}

/** Lee todos los ajustes y el estado (sin secretos) de la pasarela. */
export const getPlatformConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PlatformConfigView> => {
    await assertAdmin(context);

    const { data, error } = await client(context)
      .from("platform_settings")
      .select("key, value, updated_at")
      .in(
        "key",
        PLATFORM_SETTINGS.map((d) => d.key),
      );
    if (error) throw new Error(error.message);

    const stored = new Map(
      ((data ?? []) as { key: string; value: unknown; updated_at: string | null }[]).map((r) => [
        r.key,
        r,
      ]),
    );

    const values = PLATFORM_SETTINGS.map((def) => {
      const row = stored.get(def.key);
      let value: boolean | number | string = def.defaultValue;
      if (row && row.value !== null && row.value !== undefined) {
        if (def.kind === "boolean") value = Boolean(row.value);
        else if (def.kind === "number") value = Number(row.value);
        else value = String(row.value);
      }
      return { key: def.key, value, updated_at: row?.updated_at ?? null };
    });

    const provider = (process.env["PAYMENTS_PROVIDER"] ?? "stripe").toLowerCase();
    const hasSecretKey = Boolean(process.env["STRIPE_SECRET_KEY"]);
    const hasWebhookSecret = Boolean(process.env["STRIPE_WEBHOOK_SECRET"]);

    return {
      values,
      gateway: {
        provider,
        hasSecretKey,
        hasWebhookSecret,
        ready: hasSecretKey && hasWebhookSecret,
        webhookPath: "/api/public/webhooks/payments",
      },
    };
  });

/** Guarda un ajuste. Los ajustes bloqueados no se pueden encender aquí. */
export const setPlatformConfigValue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        key: z.string().min(3),
        value: z.union([z.boolean(), z.number(), z.string().max(1000)]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const def = DEFINITION_BY_KEY.get(data.key);
    if (!def) throw new Error("unknown_setting");

    if (def.locked && data.value === true) {
      throw new Error("setting_locked");
    }

    let value: boolean | number | string;
    if (def.kind === "boolean") {
      if (typeof data.value !== "boolean") throw new Error("invalid_value");
      value = data.value;
    } else if (def.kind === "number") {
      const n = Number(data.value);
      if (!Number.isFinite(n)) throw new Error("invalid_value");
      if (def.min != null && n < def.min) throw new Error("value_below_min");
      if (def.max != null && n > def.max) throw new Error("value_above_max");
      value = Math.round(n);
    } else {
      value = String(data.value);
      if (def.key === "site.primary_domain") {
        const host = normalizeDomain(value);
        if (!host) throw new Error("invalid_domain");
        value = host;
      }
      if (def.key === "site.alternate_domains") {
        const raw = value.trim();
        const list = normalizeDomainList(raw);
        if (raw.length > 0 && list.length === 0) throw new Error("invalid_domain");
        value = list.join(", ");
      }
    }

    const { error } = await client(context)
      .from("platform_settings")
      .upsert(
        {
          key: def.key,
          value,
          is_public: def.isPublic ?? false,
          description: def.help,
          updated_by: context.userId,
        },
        { onConflict: "key" },
      );
    if (error) throw new Error(error.message);

    return { key: def.key, value };
  });
