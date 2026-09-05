/**
 * Lote 3M-A · Escenario d) por endpoint: secreto correcto → la autorización se
 * alcanza y el trabajo corre completo, pero contra un cliente simulado. El
 * transporte (`enqueue_email`) es un contador: 0 envíos reales, 0 escrituras
 * reales. Ningún destinatario real: sólo direcciones `example.com` (RFC 2606).
 */
import { describe, expect, it, spyOn } from "bun:test";
import { CRON_HOOK_HEADER, CRON_HOOK_SECRET_ENV, handleCronHook } from "../../src/lib/cron/cron-hook-auth.server";
import { runTripJourneyEmails } from "../../src/lib/cron/jobs/trip-journey-emails.server";
import { runCouponReviewReminders } from "../../src/lib/cron/jobs/coupon-review-reminders.server";
import { runVisibilityNotifications } from "../../src/lib/cron/jobs/visibility-notifications.server";
import { makeFakeSupabase, type FakeSupabase } from "./fake-supabase";

const TEST_SECRET = "test-cron-secret-not-real-".padEnd(64, "x");
const env = { [CRON_HOOK_SECRET_ENV]: TEST_SECRET };

function authed(path: string): Request {
  return new Request(`https://example.test${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", [CRON_HOOK_HEADER]: TEST_SECRET },
    body: "{}",
  });
}

function deps(fake: FakeSupabase) {
  let created = 0;
  return {
    deps: {
      env,
      createClient: async () => {
        created += 1;
        return fake.client;
      },
    },
    created: () => created,
  };
}

const ok = (data: unknown) => ({ data, error: null });

describe("trip-journey-emails · d) secreto correcto con transporte simulado", () => {
  it("sin candidatos: 200, cuatro consultas de selección, 0 envíos, 0 escrituras", async () => {
    const fake = makeFakeSupabase({ rpc: { get_orders_needing_trip_email: () => ok([]) } });
    const d = deps(fake);
    const res = await handleCronHook(
      authed("/api/public/hooks/trip-journey-emails"),
      runTripJourneyEmails,
      d.deps,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      results: {
        t14: { sent: 0, failed: 0, suppressed: 0 },
        t3: { sent: 0, failed: 0, suppressed: 0 },
        welcome: { sent: 0, failed: 0, suppressed: 0 },
        post: { sent: 0, failed: 0, suppressed: 0 },
      },
    });
    expect(d.created()).toBe(1);
    const selections = fake.rpcCalls.filter((c) => c.fn === "get_orders_needing_trip_email");
    expect(selections.map((c) => (c.args as { _kind: string })._kind)).toEqual([
      "t14",
      "t3",
      "welcome",
      "post",
    ]);
    expect(fake.transportCalls()).toHaveLength(0);
    expect(fake.writes).toHaveLength(0);
  });

  it("con un candidato sintético: el correo llega al transporte simulado y se marca sólo en el cliente simulado", async () => {
    const fake = makeFakeSupabase({
      rpc: {
        get_orders_needing_trip_email: (args) =>
          (args as { _kind: string })._kind === "t14"
            ? ok([
                {
                  order_id: "00000000-0000-4000-8000-00000000c0de",
                  folio: "VMX-TEST-0001",
                  user_id: null,
                  traveler_email: "Viajera.Test@example.com",
                  traveler_name: "Viajera Prueba",
                  traveler_locale: "es-MX",
                  destination_name: "Valladolid",
                  start_date: "2026-10-01",
                  end_date: "2026-10-03",
                  party_size: 2,
                  days_to_trip: 14,
                },
              ])
            : ok([]),
        enqueue_email: () => ok(null),
      },
    });
    const res = await handleCronHook(
      authed("/api/public/hooks/trip-journey-emails"),
      runTripJourneyEmails,
      deps(fake).deps,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { results: Record<string, { sent: number }> };
    expect(body.results.t14.sent).toBe(1);
    expect(body.results.t3.sent).toBe(0);

    const transport = fake.transportCalls();
    expect(transport).toHaveLength(1);
    const payload = (transport[0].args as { payload: Record<string, unknown> }).payload;
    expect(payload.to).toBe("viajera.test@example.com");
    expect(payload.idempotency_key).toBe("trip-t14-00000000-0000-4000-8000-00000000c0de");
    expect(String(payload.html)).not.toContain(TEST_SECRET);

    const writeOps = fake.writes.map((w) => `${w.table}:${w.op}`);
    expect(writeOps).toContain("email_send_log:insert");
    expect(writeOps).toContain("concierge_orders:update");
    const mark = fake.writes.find((w) => w.table === "concierge_orders");
    expect(Object.keys(mark!.payload as object)).toEqual(["email_t14_sent_at"]);
  });
});

describe("coupon-review-reminders · d) secreto correcto con transporte simulado", () => {
  it("sin candidatos: 200, dos ventanas consultadas, 0 envíos, 0 escrituras", async () => {
    const fake = makeFakeSupabase({ rpc: { get_coupons_needing_review_reminder: () => ok([]) } });
    const res = await handleCronHook(
      authed("/api/public/hooks/coupon-review-reminders"),
      runCouponReviewReminders,
      deps(fake).deps,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      reminder_1: 0,
      reminder_2: 0,
      failed: 0,
      suppressed: 0,
    });
    const windows = fake.rpcCalls
      .filter((c) => c.fn === "get_coupons_needing_review_reminder")
      .map((c) => c.args);
    expect(windows).toEqual([
      { reminder_number: 1, hours_min: 46, hours_max: 50 },
      { reminder_number: 2, hours_min: 144, hours_max: 192 },
    ]);
    expect(fake.transportCalls()).toHaveLength(0);
    expect(fake.writes).toHaveLength(0);
  });

  it("destinatario suprimido: no hay transporte y la marca queda sólo en el cliente simulado", async () => {
    const fake = makeFakeSupabase({
      rpc: {
        get_coupons_needing_review_reminder: (args) =>
          (args as { reminder_number: number }).reminder_number === 1
            ? ok([
                {
                  coupon_id: "00000000-0000-4000-8000-0000000c0ffe",
                  user_id: "00000000-0000-4000-8000-0000000000aa",
                  business_id: "00000000-0000-4000-8000-0000000000bb",
                  business_slug: "restaurante-prueba",
                  business_name: "Restaurante Prueba",
                  promotion_title: "2x1",
                  coupon_code: "TEST",
                  discount_percent: 10,
                  redeemed_at: "2026-09-01T12:00:00Z",
                  recipient_email: "Suprimida@example.com",
                  traveler_first_name: "Ana",
                },
              ])
            : ok([]),
      },
      selects: { suppressed_emails: ok({ email: "suprimida@example.com" }) },
    });
    const res = await handleCronHook(
      authed("/api/public/hooks/coupon-review-reminders"),
      runCouponReviewReminders,
      deps(fake).deps,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      reminder_1: 0,
      reminder_2: 0,
      failed: 0,
      suppressed: 1,
    });
    expect(fake.transportCalls()).toHaveLength(0);
    expect(fake.writes.map((w) => `${w.table}:${w.op}`)).toEqual(["traveler_coupons:update"]);
  });

  it("candidato válido: un solo envío al transporte simulado con el enlace de reseña", async () => {
    const fake = makeFakeSupabase({
      rpc: {
        get_coupons_needing_review_reminder: (args) =>
          (args as { reminder_number: number }).reminder_number === 2
            ? ok([
                {
                  coupon_id: "00000000-0000-4000-8000-0000000c0ff2",
                  user_id: "00000000-0000-4000-8000-0000000000aa",
                  business_id: "00000000-0000-4000-8000-0000000000bb",
                  business_slug: "restaurante-prueba",
                  business_name: "Restaurante Prueba",
                  promotion_title: "2x1",
                  coupon_code: "TEST",
                  discount_percent: 10,
                  redeemed_at: "2026-08-29T12:00:00Z",
                  recipient_email: "ana@example.com",
                  traveler_first_name: "Ana",
                },
              ])
            : ok([]),
        enqueue_email: () => ok(null),
      },
    });
    const res = await handleCronHook(
      authed("/api/public/hooks/coupon-review-reminders"),
      runCouponReviewReminders,
      deps(fake).deps,
    );
    expect(await res.json()).toEqual({
      ok: true,
      reminder_1: 0,
      reminder_2: 1,
      failed: 0,
      suppressed: 0,
    });
    const transport = fake.transportCalls();
    expect(transport).toHaveLength(1);
    const payload = (transport[0].args as { payload: Record<string, unknown> }).payload;
    expect(payload.to).toBe("ana@example.com");
    expect(String(payload.html)).toContain("/resenar/negocio/restaurante-prueba");
    expect(payload.idempotency_key).toBe("review-reminder-2-00000000-0000-4000-8000-0000000c0ff2");
  });
});

describe("visibility-notifications · d) secreto correcto con transporte simulado", () => {
  it("sin candidatos: 200, tres listados consultados, 0 envíos, 0 escrituras", async () => {
    const fake = makeFakeSupabase({
      rpc: {
        list_visibility_grants_expiring: () => ok([]),
        list_visibility_grants_recently_expired: () => ok([]),
      },
    });
    const res = await handleCronHook(
      authed("/api/public/hooks/visibility-notifications"),
      runVisibilityNotifications,
      deps(fake).deps,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      expiring_7d: 0,
      expiring_1d: 0,
      expired: 0,
      failed: 0,
      skipped: 0,
    });
    expect(fake.rpcCalls.map((c) => c.fn)).toEqual([
      "list_visibility_grants_expiring",
      "list_visibility_grants_expiring",
      "list_visibility_grants_recently_expired",
    ]);
    expect(fake.transportCalls()).toHaveLength(0);
    expect(fake.writes).toHaveLength(0);
  });

  it("candidato a vencer en 7 días: un envío al transporte simulado y marca en el cliente simulado", async () => {
    const grant = {
      grant_id: "00000000-0000-4000-8000-0000000000e7",
      business_id: "00000000-0000-4000-8000-0000000000bb",
      plan_name: "Destacado",
      expires_at: "2026-09-12T13:15:00Z",
      recipient_email: "Duena@example.com",
      recipient_name: "Dueña Prueba",
      business_name: "Hotel Prueba",
      business_slug: "hotel-prueba",
    };
    const fake = makeFakeSupabase({
      rpc: {
        list_visibility_grants_expiring: (args) =>
          (args as { _reminder: number })._reminder === 7 ? ok([grant]) : ok([]),
        list_visibility_grants_recently_expired: () => ok([]),
        enqueue_email: () => ok(null),
      },
    });
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await handleCronHook(
        authed("/api/public/hooks/visibility-notifications"),
        runVisibilityNotifications,
        deps(fake).deps,
      );
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        ok: true,
        expiring_7d: 1,
        expiring_1d: 0,
        expired: 0,
        failed: 0,
        skipped: 0,
      });
    } finally {
      errorSpy.mockRestore();
    }
    const transport = fake.transportCalls();
    expect(transport).toHaveLength(1);
    const payload = (transport[0].args as { payload: Record<string, unknown> }).payload;
    expect(payload.to).toBe("duena@example.com");
    expect(payload.idempotency_key).toBe("visibility-expiring_7d-00000000-0000-4000-8000-0000000000e7");
    const mark = fake.writes.find((w) => w.table === "business_visibility_grants");
    expect(mark).toBeDefined();
    expect(Object.keys(mark!.payload as object)).toEqual(["notified_expiring_7d_at"]);
  });

  it("destinatario suprimido: se contabiliza como omitido sin transporte ni marca", async () => {
    const grant = {
      grant_id: "00000000-0000-4000-8000-0000000000e1",
      business_id: "00000000-0000-4000-8000-0000000000bb",
      plan_name: "Destacado",
      expires_at: "2026-09-06T13:15:00Z",
      recipient_email: "suprimida@example.com",
      recipient_name: null,
      business_name: "Hotel Prueba",
      business_slug: "hotel-prueba",
    };
    const fake = makeFakeSupabase({
      rpc: {
        list_visibility_grants_expiring: (args) =>
          (args as { _reminder: number })._reminder === 1 ? ok([grant]) : ok([]),
        list_visibility_grants_recently_expired: () => ok([]),
      },
      selects: { suppressed_emails: ok({ email: "suprimida@example.com" }) },
    });
    const res = await handleCronHook(
      authed("/api/public/hooks/visibility-notifications"),
      runVisibilityNotifications,
      deps(fake).deps,
    );
    expect(await res.json()).toEqual({
      ok: true,
      expiring_7d: 0,
      expiring_1d: 0,
      expired: 0,
      failed: 0,
      skipped: 1,
    });
    expect(fake.transportCalls()).toHaveLength(0);
    expect(fake.writes).toHaveLength(0);
  });
});
