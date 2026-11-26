/**
 * Cupo por visitante (IP) para servicios de pago usados sin cuenta.
 * Reutiliza el limitador atómico `mcp_rate_hit`; cada llamada reserva su
 * lugar antes de contactar al proveedor, incluso con solicitudes simultáneas.
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

export interface PublicQuotaUsage {
  perMinute: number;
  perHour: number;
  perDay: number | null;
}

type RateRow = { allowed: boolean; current_count: number; retry_after_seconds: number };
type RateAdmin = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: RateRow[] | RateRow | null; error: { message: string } | null }>;
};

export async function enforcePublicQuota(
  tool: string,
  limits: { perMinute: number; perHour: number; perDay?: number; platformPerDay?: number },
): Promise<PublicQuotaUsage> {
  const h = getRequest().headers;
  const ip =
    h.get("cf-connecting-ip") ??
    h.get("x-real-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "0.0.0.0";
  const salt = process.env["ALUX_PUBLIC_IP_SALT"] ?? process.env["SUPABASE_URL"] ?? "vmx";
  const key = `ip:${createHash("sha256").update(`${salt}:${ip}`).digest("hex")}`;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const rateAdmin = supabaseAdmin as unknown as RateAdmin;
  const usage: PublicQuotaUsage = { perMinute: 0, perHour: 0, perDay: null };
  const windows = [
    ["perMinute", 60, limits.perMinute],
    ["perHour", 3600, limits.perHour],
    ...(limits.perDay ? ([["perDay", 86400, limits.perDay]] as const) : []),
  ] as const;

  for (const [name, win, limit] of windows) {
    const { data, error } = await rateAdmin.rpc("mcp_rate_hit", {
      p_scope_key: key,
      p_tool_name: tool,
      p_window_seconds: win,
      p_limit: limit,
    });
    if (error) throw new Error("quota_unavailable");
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error("quota_unavailable");
    usage[name] = Number(row.current_count ?? 0);
    if (row.allowed === false) throw new Error("rate_limited");
  }
  if (limits.platformPerDay) {
    // Tope total del día para todos los visitantes juntos: el gasto nunca se dispara.
    const { data, error } = await rateAdmin.rpc("mcp_rate_hit", {
      p_scope_key: "platform:all",
      p_tool_name: tool,
      p_window_seconds: 86400,
      p_limit: limits.platformPerDay,
    });
    if (error) throw new Error("quota_unavailable");
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error("quota_unavailable");
    if (row.allowed === false) throw new Error("rate_limited");
  }
  return usage;
}
