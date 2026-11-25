/**
 * Cupo por visitante (IP) para servicios de pago usados sin cuenta
 * (rutas de mapas). Reutiliza el limitador atómico `mcp_rate_hit`.
 */
import { createHash } from "node:crypto";
import { getRequest } from "@tanstack/react-start/server";

const OWN_HOST =
  /(^|\.)quehacerenvalladolid\.com$|(^|\.)valladolid\.(mx|com\.mx)$|^valladolidmx\.lovable\.app$|^(id-preview--|preview--|project--)fd89b51f-9afc-4e15-8ee2-21fe468f6aa9|^localhost$/;

/** Sólo llamadas hechas desde páginas de la plataforma, no desde otros sitios o programas. */
export function assertPlatformOrigin(): void {
  const req = getRequest();
  const h = req.headers;
  const origin = h.get("origin") ?? h.get("referer") ?? "";
  let host = "";
  try {
    host = origin ? new URL(origin).hostname.toLowerCase() : "";
  } catch {
    host = "";
  }
  const own = new URL(req.url).hostname.toLowerCase();
  const site = h.get("sec-fetch-site");
  const trusted = host !== "" && (host === own || OWN_HOST.test(host));
  if (!trusted || (site !== null && site !== "same-origin" && site !== "same-site")) {
    throw new Error("origin_not_allowed");
  }
}

export async function enforcePublicQuota(
  tool: string,
  limits: { perMinute: number; perHour: number; platformPerDay?: number },
): Promise<void> {
  const h = getRequest().headers;
  const ip =
    h.get("cf-connecting-ip") ??
    h.get("x-real-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "0.0.0.0";
  const salt = process.env["ALUX_PUBLIC_IP_SALT"] ?? process.env["SUPABASE_URL"] ?? "vmx";
  const key = `ip:${createHash("sha256").update(`${salt}:${ip}`).digest("hex")}`;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  for (const [win, limit] of [
    [60, limits.perMinute],
    [3600, limits.perHour],
  ] as const) {
    // deno-lint-ignore no-explicit-any
    const { data, error } = await (supabaseAdmin as any).rpc("mcp_rate_hit", {
      p_scope_key: key,
      p_tool_name: tool,
      p_window_seconds: win,
      p_limit: limit,
    });
    if (error) throw new Error("quota_unavailable");
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.allowed === false) throw new Error("rate_limited");
  }
  if (limits.platformPerDay) {
    // Tope total del día para todos los visitantes juntos: el gasto nunca se dispara.
    // deno-lint-ignore no-explicit-any
    const { data, error } = await (supabaseAdmin as any).rpc("mcp_rate_hit", {
      p_scope_key: "platform:all",
      p_tool_name: tool,
      p_window_seconds: 86400,
      p_limit: limits.platformPerDay,
    });
    if (error) throw new Error("quota_unavailable");
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.allowed === false) throw new Error("rate_limited");
  }
}
