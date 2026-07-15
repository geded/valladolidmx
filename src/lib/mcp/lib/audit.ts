/**
 * MCP · Auditoría canónica (R2).
 *
 * Registra cada invocación en `public.mcp_tool_invocations` vía RPC
 * `mcp_log_invocation`. No registra tokens, secretos ni datos personales
 * completos — sólo hash de input, IDs, duración y resultado.
 *
 * El cliente admin se carga dinámicamente para evitar fugas al bundle.
 */

export type AuditRecord = {
  toolName: string;
  contractVersion: string;
  clientId: string | null;
  userId: string | null;
  inputHash: string;
  locale: string | null;
  durationMs: number;
  success: boolean;
  errorCode: string | null;
  resultCount: number | null;
};

export async function logInvocation(record: AuditRecord): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // deno-lint-ignore no-explicit-any
    await (supabaseAdmin as any).rpc("mcp_log_invocation", {
      p_tool_name: record.toolName,
      p_contract_version: record.contractVersion,
      p_client_id: record.clientId,
      p_user_id: record.userId,
      p_input_hash: record.inputHash,
      p_locale: record.locale,
      p_duration_ms: record.durationMs,
      p_success: record.success,
      p_error_code: record.errorCode,
      p_result_count: record.resultCount,
    });
  } catch (err) {
    // Auditoría no debe romper la invocación real.
    console.warn("[mcp.audit] failed", err);
  }
}
