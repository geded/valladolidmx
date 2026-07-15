/**
 * MCP · Rate Limiting (R1).
 *
 * Ventanas deslizantes atómicas por scope (user/client/ip) y por tool.
 * Usa el RPC `mcp_rate_hit` (SECURITY DEFINER, restringido a service_role).
 */

export type RateScope = { kind: "user" | "client" | "ip"; key: string };

export type RateLimitOk = { allowed: true };
export type RateLimitBlocked = {
  allowed: false;
  retryAfterSeconds: number;
  windowSeconds: number;
  currentCount: number;
  scope: RateScope;
};
export type RateLimitResult = RateLimitOk | RateLimitBlocked;

export type RateLimitPolicy = {
  perMinute?: number;
  perHour?: number;
};

// Defaults conservadores para M1 · Discovery-Grade Tools.
export const DEFAULT_POLICIES: Record<string, RateLimitPolicy> = {
  authenticated: { perMinute: 60, perHour: 1000 },
  anonymous: { perMinute: 20, perHour: 200 },
};

function scopeToKey(s: RateScope): string {
  return `${s.kind}:${s.key}`;
}

async function hit(
  scope: RateScope,
  toolName: string,
  windowSeconds: number,
  limit: number,
): Promise<RateLimitResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // deno-lint-ignore no-explicit-any
  const { data, error } = await (supabaseAdmin as any).rpc("mcp_rate_hit", {
    p_scope_key: scopeToKey(scope),
    p_tool_name: toolName,
    p_window_seconds: windowSeconds,
    p_limit: limit,
  });
  if (error) {
    // Fail-open ante error del limiter para no bloquear al usuario legítimo.
    console.warn("[mcp.rateLimit] rpc error", error);
    return { allowed: true };
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (row?.allowed === false) {
    return {
      allowed: false,
      retryAfterSeconds: row.retry_after_seconds ?? windowSeconds,
      windowSeconds,
      currentCount: row.current_count ?? limit + 1,
      scope,
    };
  }
  return { allowed: true };
}

/**
 * Aplica política de rate limit. El primer scope bloqueante gana.
 */
export async function enforceRateLimit(
  scope: RateScope,
  toolName: string,
  policy: RateLimitPolicy,
): Promise<RateLimitResult> {
  if (policy.perMinute && policy.perMinute > 0) {
    const r = await hit(scope, toolName, 60, policy.perMinute);
    if (!r.allowed) return r;
  }
  if (policy.perHour && policy.perHour > 0) {
    const r = await hit(scope, toolName, 3600, policy.perHour);
    if (!r.allowed) return r;
  }
  return { allowed: true };
}
