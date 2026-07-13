/**
 * Demo Pack v1 · Status server function.
 *
 * Read-only aggregation of the demo dataset seeded across Sub-olas 1-3.
 * Admin-only. Used by /cms/demo-pack.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface DemoPackSection {
  key: string;
  label: string;
  count: number;
  target: number;
  ok: boolean;
  hint?: string;
}

export interface DemoPackStatus {
  generatedAt: string;
  demoUserId: string;
  demoOrderFolio: string;
  sections: DemoPackSection[];
  overallOk: boolean;
}

const DEMO_USER = "d3e00000-e4d0-4dec-9999-000000000001";
const DEMO_ORDER_ID = "aaaaaaaa-bbbb-4ccc-8ddd-000000000001";

export const getDemoPackStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const rpc = context.supabase as unknown as {
      rpc: (n: string, a: Record<string, unknown>) => Promise<{ data: unknown }>;
    };
    const [{ data: isAdmin }, { data: isSuper }] = await Promise.all([
      rpc.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      rpc.rpc("has_role", { _user_id: context.userId, _role: "super_admin" }),
    ]);
    if (!isAdmin && !isSuper) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as unknown as {
      from: (t: string) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        select: (s: string, o?: { count: "exact"; head: true }) => any;
      };
    };

    const count = async (
      table: string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filter?: (q: any) => any,
    ): Promise<number> => {
      const base = sb.from(table).select("id", { count: "exact", head: true });
      const res = await (filter ? filter(base) : base);
      return (res?.count as number | null) ?? 0;
    };

    const [
      destinos,
      empresas,
      productosDemo,
      productosVentaDirecta,
      kbEntradas,
      kbTraduccionesEn,
      reviewsDemo,
      casasDemo,
      travelPlansDemo,
      orderDemo,
    ] = await Promise.all([
      count("destinations"),
      count("businesses"),
      count("products", (q) => q.in("id", [
        "dddddddd-aaaa-4aaa-8aaa-000000000001",
        "dddddddd-aaaa-4aaa-8aaa-000000000002",
        "dddddddd-aaaa-4aaa-8aaa-000000000003",
        "dddddddd-aaaa-4aaa-8aaa-000000000010",
        "dddddddd-aaaa-4aaa-8aaa-000000000011",
      ])),
      count("products", (q) => q.eq("accepts_online_payment", true)),
      count("alux_knowledge_entries"),
      count("alux_knowledge_translations", (q) => q.eq("locale", "en")),
      count("reviews", (q) => q.eq("author_user_id", DEMO_USER)),
      count("businesses", (q) => q.in("id", [
        "66666666-aaaa-4aaa-8aaa-000000000001",
        "66666666-aaaa-4aaa-8aaa-000000000002",
      ])),
      count("travel_plans", (q) => q.eq("user_id", DEMO_USER)),
      count("concierge_orders", (q) => q.eq("id", DEMO_ORDER_ID)),
    ]);

    const sections: DemoPackSection[] = [
      { key: "destinos", label: "Destinos", count: destinos, target: 3, ok: destinos >= 3 },
      { key: "empresas", label: "Empresas", count: empresas, target: 12, ok: empresas >= 12 },
      { key: "productos-demo", label: "Productos demo", count: productosDemo, target: 5, ok: productosDemo >= 5 },
      { key: "venta-directa", label: "Productos con venta directa", count: productosVentaDirecta, target: 4, ok: productosVentaDirecta >= 4 },
      { key: "casas-vacaciones", label: "Casas de vacaciones", count: casasDemo, target: 2, ok: casasDemo >= 2 },
      { key: "kb-es", label: "KB · Entradas (ES)", count: kbEntradas, target: 15, ok: kbEntradas >= 15 },
      { key: "kb-en", label: "KB · Traducciones EN", count: kbTraduccionesEn, target: 15, ok: kbTraduccionesEn >= 15 },
      { key: "reviews", label: "Reseñas del viajero demo", count: reviewsDemo, target: 5, ok: reviewsDemo >= 5 },
      { key: "travel-plan", label: "Travel Plan del viajero demo", count: travelPlansDemo, target: 1, ok: travelPlansDemo >= 1 },
      { key: "order", label: "Orden confirmada VMX-DEMO01", count: orderDemo, target: 1, ok: orderDemo >= 1 },
    ];

    return {
      generatedAt: new Date().toISOString(),
      demoUserId: DEMO_USER,
      demoOrderFolio: "VMX-DEMO01",
      sections,
      overallOk: sections.every((s) => s.ok),
    } satisfies DemoPackStatus;
  });