/**
 * Adaptador Evolution API (WhatsApp por QR) · sólo servidor.
 *
 * Reglas:
 *  - Sólo opera líneas `vmx-*`: jamás toca las líneas de Zazil (`zt-*`) que
 *    viven en el mismo servidor.
 *  - Credenciales `EVOLUTION_API_URL` y `EVOLUTION_API_KEY` leídas en cada
 *    llamada; ningún error transporta la clave.
 */
import { isVmxInstance } from "@/lib/crm/whatsapp/rules";
import type { ChannelLineInfo, ChannelQr, WhatsAppChannel } from "./types";

export const WEBHOOK_EVENTS = ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"] as const;

export class EvolutionError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "EvolutionError";
  }
}

function creds(): { base: string; key: string } {
  const base = (process.env["EVOLUTION_API_URL"] ?? "").trim().replace(/\/+$/, "");
  const key = (process.env["EVOLUTION_API_KEY"] ?? "").trim();
  if (!/^https?:\/\//.test(base) || !key) {
    throw new EvolutionError("El servidor de mensajes no está configurado.", 503);
  }
  return { base, key };
}

function guard(instanceName: string): string {
  if (!isVmxInstance(instanceName)) {
    throw new EvolutionError("Línea no permitida para Valladolid.mx.", 400);
  }
  return encodeURIComponent(instanceName);
}

async function call<T>(path: string, init: RequestInit = {}, timeoutMs = 15_000): Promise<T> {
  const { base, key } = creds();
  const res = await fetch(`${base}${path}`, {
    ...init,
    redirect: "manual",
    headers: { "content-type": "application/json", apikey: key, ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  if (!res.ok) {
    const detail = text.replace(/[A-Za-z0-9_-]{32,}/g, "…").slice(0, 300);
    throw new EvolutionError(`Servidor de mensajes [${res.status}]: ${detail}`, res.status);
  }
  try {
    return (text ? JSON.parse(text) : {}) as T;
  } catch {
    return {} as T;
  }
}

function toQr(raw: unknown): ChannelQr {
  const r = (raw ?? {}) as Record<string, unknown>;
  const nested = (r["qrcode"] ?? {}) as Record<string, unknown>;
  const base64 =
    (typeof r["base64"] === "string" && r["base64"]) ||
    (typeof nested["base64"] === "string" && nested["base64"]) ||
    null;
  const pairing =
    (typeof r["pairingCode"] === "string" && r["pairingCode"]) ||
    (typeof nested["pairingCode"] === "string" && nested["pairingCode"]) ||
    null;
  const image = base64
    ? base64.startsWith("data:")
      ? base64
      : `data:image/png;base64,${base64}`
    : null;
  return { imageDataUrl: image && image.length <= 60000 ? image : null, pairingCode: pairing };
}

function webhookConfig(url: string) {
  return {
    enabled: true,
    url,
    byEvents: false,
    base64: false,
    events: [...WEBHOOK_EVENTS],
  };
}

export const evolutionChannel: WhatsAppChannel = {
  async createLine(instanceName, url) {
    guard(instanceName);
    const res = await call<unknown>("/instance/create", {
      method: "POST",
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
        groupsIgnore: true,
        rejectCall: false,
        alwaysOnline: false,
        readMessages: false,
        readStatus: false,
        syncFullHistory: false,
        webhook: webhookConfig(url),
      }),
    });
    return toQr(res);
  },

  async connect(instanceName) {
    const name = guard(instanceName);
    return toQr(await call<unknown>(`/instance/connect/${name}`, { method: "GET" }));
  },

  async info(instanceName): Promise<ChannelLineInfo> {
    const name = guard(instanceName);
    const [stateRes, list] = await Promise.all([
      call<Record<string, unknown>>(`/instance/connectionState/${name}`, { method: "GET" }),
      call<unknown>(`/instance/fetchInstances?instanceName=${name}`, { method: "GET" }).catch(
        () => [],
      ),
    ]);
    const inst = (stateRes["instance"] ?? stateRes) as Record<string, unknown>;
    const s = String(inst["state"] ?? "").toLowerCase();
    const row = (Array.isArray(list) ? list[0] : null) as Record<string, unknown> | null;
    return {
      state: s === "open" || s === "connecting" || s === "close" ? s : "unknown",
      ownerJid: typeof row?.["ownerJid"] === "string" ? row["ownerJid"] : null,
      profileName:
        typeof row?.["profileName"] === "string" ? row["profileName"].slice(0, 120) : null,
    };
  },

  async setWebhook(instanceName, url) {
    const name = guard(instanceName);
    await call(`/webhook/set/${name}`, {
      method: "POST",
      body: JSON.stringify({ webhook: webhookConfig(url) }),
    });
  },

  async logout(instanceName) {
    const name = guard(instanceName);
    await call(`/instance/logout/${name}`, { method: "DELETE" });
  },

  async sendText(instanceName, to, text) {
    const name = guard(instanceName);
    const res = await call<Record<string, unknown>>(
      `/message/sendText/${name}`,
      { method: "POST", body: JSON.stringify({ number: to, text }) },
      20_000,
    );
    const key = (res["key"] ?? {}) as Record<string, unknown>;
    return { id: typeof key["id"] === "string" ? key["id"] : null };
  },

  async deleteForEveryone(instanceName, message) {
    const name = guard(instanceName);
    await call(`/chat/deleteMessageForEveryone/${name}`, {
      method: "DELETE",
      body: JSON.stringify({
        id: message.id,
        remoteJid: message.remoteJid,
        fromMe: message.fromMe,
      }),
    });
  },
};
