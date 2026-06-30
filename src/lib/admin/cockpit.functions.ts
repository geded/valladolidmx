/**
 * 15.10.4c — Founder Cockpit Avanzado · Server Functions.
 *
 * Justificación contra Matriz v1.4:
 *  - cockpit.exportPanel (F2 · §Founder·Export)
 *
 * Reutiliza la RPC SECURITY DEFINER `founder_dashboard_kpis` ya aprobada
 * por 15.10.4 · Fase 1. No introduce tablas, RLS, ni eventos BEA.
 * Acceso restringido server-side por `has_role('super_admin')`.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ExportFormat = "json" | "csv";
export type CockpitPanel = "kpis" | "alerts" | "activity";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [k: string]: JsonValue };
type Row = { [k: string]: JsonValue };

export interface CockpitExportPayload {
  panel: CockpitPanel;
  format: ExportFormat;
  generated_at: string;
  rows: Row[];
  content: string;
}

function toCsv(rows: Row[]): string {
  if (rows.length === 0) return "";
  const headers = Array.from(
    rows.reduce<Set<string>>((acc, r) => {
      Object.keys(r).forEach((k) => acc.add(k));
      return acc;
    }, new Set()),
  );
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
}

function flattenKpis(data: Record<string, unknown>): Row[] {
  const out: Row[] = [];
  for (const [group, value] of Object.entries(data)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const [metric, v] of Object.entries(value as Record<string, unknown>)) {
        out.push({ group, metric, value: v as JsonValue });
      }
    } else {
      out.push({ group: "_meta", metric: group, value: value as JsonValue });
    }
  }
  return out;
}

export const exportCockpitPanel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { panel?: CockpitPanel; format?: ExportFormat } | undefined) => ({
    panel: (input?.panel ?? "kpis") as CockpitPanel,
    format: (input?.format ?? "json") as ExportFormat,
  }))
  .handler(async ({ data, context }): Promise<CockpitExportPayload> => {
    // Authorization: super_admin only
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    });
    if (roleErr) throw new Error(`role_check_failed: ${roleErr.message}`);
    if (!isAdmin) throw new Error("forbidden: super_admin required");

    let rows: Row[] = [];
    if (data.panel === "kpis") {
      const { data: kpis, error } = await context.supabase.rpc("founder_dashboard_kpis");
      if (error) throw new Error(`kpis_export_failed: ${error.message}`);
      rows = flattenKpis((kpis ?? {}) as Record<string, unknown>);
    } else if (data.panel === "alerts") {
      const { data: deliveries, error } = await context.supabase.rpc("unc_list_my_deliveries", {
        _limit: 200,
        _only_unread: false,
      });
      if (error) throw new Error(`alerts_export_failed: ${error.message}`);
      rows = (Array.isArray(deliveries) ? deliveries : []) as Row[];
    } else {
      // activity panel: placeholder — readers se conectan en 15.10.4c iteración menor.
      rows = [];
    }

    const generated_at = new Date().toISOString();
    const content =
      data.format === "csv"
        ? toCsv(rows)
        : JSON.stringify({ panel: data.panel, generated_at, rows }, null, 2);
    return { panel: data.panel, format: data.format, generated_at, rows, content };
  });