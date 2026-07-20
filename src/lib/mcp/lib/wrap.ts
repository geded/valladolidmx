import type { ToolContext } from "@lovable.dev/mcp-js";
import { logInvocation } from "./audit";
import {
  DEFAULT_POLICIES,
  enforceRateLimit,
  type RateLimitPolicy,
  type RateScope,
} from "./rate-limit";
import { inputHash } from "./hash";
import { SUPPORTED_LOCALES, type SupportedLocale } from "./contracts";

export type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

export type GuardedHandler<I> = (
  input: I & { locale?: SupportedLocale },
  ctx: ToolContext,
  meta: { localeUsed: SupportedLocale; localeFallback: boolean },
) => Promise<ToolResult & { resultCount?: number }>;

function resolveScope(ctx: ToolContext): RateScope {
  const uid = ctx.isAuthenticated() ? ctx.getUserId() : null;
  if (uid) return { kind: "user", key: uid };
  const cid = ctx.getClientId?.() ?? null;
  if (cid) return { kind: "client", key: cid };
  return { kind: "ip", key: "unknown" };
}

function resolveLocale(raw: unknown): { localeUsed: SupportedLocale; localeFallback: boolean } {
  if (typeof raw === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(raw)) {
    return { localeUsed: raw as SupportedLocale, localeFallback: false };
  }
  return { localeUsed: "es", localeFallback: raw != null };
}

export function withMcpGuardrails<I>(config: {
  toolName: string;
  contractVersion: string;
  policy?: RateLimitPolicy;
  requiresAuth?: boolean;
  handler: GuardedHandler<I>;
}) {
  return async (input: I & { locale?: string }, ctx: ToolContext): Promise<ToolResult> => {
    const startedAt = Date.now();
    const meta = resolveLocale(input?.locale);
    const scope = resolveScope(ctx);
    const clientId = ctx.getClientId?.() ?? null;
    const userId = (ctx.isAuthenticated() ? ctx.getUserId() : null) ?? null;
    const hash = inputHash(input);

    if (config.requiresAuth && !ctx.isAuthenticated()) {
      const res: ToolResult = {
        content: [{ type: "text", text: "No autenticado." }],
        isError: true,
      };
      await logInvocation({
        toolName: config.toolName,
        contractVersion: config.contractVersion,
        clientId, userId, inputHash: hash, locale: meta.localeUsed,
        durationMs: Date.now() - startedAt,
        success: false, errorCode: "UNAUTHENTICATED", resultCount: 0,
      });
      return res;
    }

    const policy =
      config.policy ??
      (ctx.isAuthenticated() ? DEFAULT_POLICIES.authenticated : DEFAULT_POLICIES.anonymous);
    const rl = await enforceRateLimit(scope, config.toolName, policy);
    if (!rl.allowed) {
      const res: ToolResult = {
        content: [
          {
            type: "text",
            text: `Límite de uso alcanzado. Reintenta en ${rl.retryAfterSeconds}s.`,
          },
        ],
        isError: true,
        structuredContent: {
          error: "RATE_LIMITED",
          retry_after_seconds: rl.retryAfterSeconds,
          window_seconds: rl.windowSeconds,
        },
      };
      await logInvocation({
        toolName: config.toolName,
        contractVersion: config.contractVersion,
        clientId, userId, inputHash: hash, locale: meta.localeUsed,
        durationMs: Date.now() - startedAt,
        success: false, errorCode: "RATE_LIMITED", resultCount: 0,
      });
      return res;
    }

    try {
      const result = await config.handler(input as I & { locale?: SupportedLocale }, ctx, meta);
      await logInvocation({
        toolName: config.toolName,
        contractVersion: config.contractVersion,
        clientId, userId, inputHash: hash, locale: meta.localeUsed,
        durationMs: Date.now() - startedAt,
        success: !result.isError,
        errorCode: result.isError ? "HANDLER_ERROR" : null,
        resultCount: result.resultCount ?? null,
      });
      const { resultCount: _rc, ...rest } = result;
      return rest;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await logInvocation({
        toolName: config.toolName,
        contractVersion: config.contractVersion,
        clientId, userId, inputHash: hash, locale: meta.localeUsed,
        durationMs: Date.now() - startedAt,
        success: false, errorCode: "UNCAUGHT", resultCount: 0,
      });
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      };
    }
  };
}
