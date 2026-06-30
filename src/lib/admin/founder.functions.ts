/**
 * 15.10.4 · Fase 1 — Server functions del Panel Fundador.
 * Lectura agregada de KPIs globales; autorización vive en la RPC
 * SECURITY DEFINER `founder_dashboard_kpis` (super_admin o admin).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface FounderKpis {
  generated_at: string;
  businesses: { total: number; active: number };
  travelers: { total: number };
  concierges: { total: number; active: number };
  cases: { total: number; open: number; overdue: number };
  proposals: { total: number; sent: number; accepted: number };
  quotes: { total: number; submitted: number };
  orders: { total: number; paid: number };
  revenue: { gross_cents: number; currency: string };
  system: { alerts_open: number };
}

export const getFounderKpis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("founder_dashboard_kpis");
    if (error) throw new Error(error.message);
    return (data as unknown) as FounderKpis;
  });