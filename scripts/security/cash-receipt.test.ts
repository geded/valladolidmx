import { describe, expect, it, mock } from "bun:test";

// Exercise the real action handler without invoking a payment or sending email.
mock.module("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      middleware: () => builder,
      inputValidator: () => builder,
      handler: (handler: unknown) => handler,
    };
    return builder;
  },
}));
mock.module("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
const { markConciergeOrderPaidCash } = await import("../../src/lib/concierge/orders.functions");
type ReceiptHandler = (input: {
  data: { orderId: string; note: null };
  context: { userId: string; supabase: { rpc: (name: string) => Promise<{ data: unknown; error: null }> } };
}) => Promise<unknown>;

describe("Cash receipts", () => {
  it("a traveler requesting cash never confirms inventory or sends paid notices", async () => {
    const calls: string[] = [];
    const receipt = { ok: true, status: "awaiting_payment", folio: "DEMO", travel_plan_id: null };
    const result = await (markConciergeOrderPaidCash as unknown as ReceiptHandler)({
      data: { orderId: "00000000-0000-4000-8000-000000000001", note: null },
      context: { userId: "traveler", supabase: { rpc: async (name) => {
        calls.push(name);
        return { data: name === "has_role" ? false : receipt, error: null };
      } } },
    });
    expect(result).toEqual(receipt);
    expect(calls.filter((name) => name === "commerce_order_holds_confirm")).toHaveLength(0);
    expect(calls.filter((name) => name === "concierge_order_mark_paid_cash")).toHaveLength(1);
  });
  it("replaying an already paid order as a traveler cannot fulfill it again", async () => {
    const calls: string[] = [];
    await (markConciergeOrderPaidCash as unknown as ReceiptHandler)({
      data: { orderId: "00000000-0000-4000-8000-000000000001", note: null },
      context: { userId: "traveler", supabase: { rpc: async (name) => {
        calls.push(name);
        return { data: name === "has_role" ? false : { ok: true, status: "paid" }, error: null };
      } } },
    });
    expect(calls.includes("commerce_order_holds_confirm")).toBe(false);
  });
});