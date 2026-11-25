/**
 * Cupo por visitante (IP) para servicios de pago usados sin cuenta
 * (rutas de mapas). Reutiliza el limitador atómico `mcp_rate_hit`.
 */
import { createHash } from "node:crypto";
import { getRequest } from "@tanstack/react-start/server";

export async function enforcePublicQuota(
  tool: string,
  limits: { perMinute: number; perHour: number },
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
}
