/**
 * Agente de WhatsApp del administrador · llamadas al agente (sólo servidor).
 *
 * Todas pasan por el conector «WhatsApp Agent»: la clave del agente nunca
 * aparece en el código ni en los registros.
 */
const GATEWAY_URL = "https://connector-gateway.lovable.dev/udc_whatsapp_agent";

export interface AgentCredentials {
  readonly lovableApiKey: string;
  readonly connectionKey: string;
}

export class WhatsAppAgentError extends Error {
  constructor(
    readonly status: number,
    readonly detail: string,
  ) {
    super(`WhatsApp agent request failed [${status}]: ${detail.slice(0, 300)}`);
  }
}

export function readAgentCredentials(
  env: Record<string, string | undefined> = process.env,
): AgentCredentials | null {
  const lovableApiKey = env["LOVABLE_API_KEY"];
  const connectionKey = env["UDC_WHATSAPP_AGENT_API_KEY"];
  if (!lovableApiKey || !connectionKey) return null;
  return { lovableApiKey, connectionKey };
}

async function call(
  creds: AgentCredentials,
  method: "GET" | "POST",
  path: string,
  options: { query?: Record<string, string | number>; body?: unknown } = {},
): Promise<Response> {
  const url = new URL(`${GATEWAY_URL}${path}`);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${creds.lovableApiKey}`,
      "X-Connection-Api-Key": creds.connectionKey,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new WhatsAppAgentError(response.status, await response.text().catch(() => ""));
  }
  return response;
}

/** `null` cuando no hay nada nuevo (204). */
export async function pollAgentUpdates(
  creds: AgentCredentials,
  offset: number,
  limit = 20,
): Promise<unknown | null> {
  const response = await call(creds, "GET", "/updates", {
    query: { offset, limit, timeout: 0 },
  });
  if (response.status === 204) return null;
  return response.json();
}

/** Devuelve el identificador del mensaje enviado. */
export async function sendAgentText(
  creds: AgentCredentials,
  to: string,
  body: string,
): Promise<string | null> {
  const response = await call(creds, "POST", "/messages", {
    body: {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body, preview_url: false },
    },
  });
  const json = (await response.json().catch(() => null)) as {
    messages?: Array<{ id?: string }>;
  } | null;
  return json?.messages?.[0]?.id ?? null;
}

export async function markAgentMessageRead(
  creds: AgentCredentials,
  messageId: string,
  typing: boolean,
): Promise<void> {
  await call(creds, "POST", "/statuses", {
    body: {
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
      ...(typing ? { typing_indicator: { type: "text" } } : {}),
    },
  });
}
