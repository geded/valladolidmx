/**
 * Lote 3M-A.2 · Contrato del modo simulación (`x-cron-dry-run`).
 *
 * Escenarios Founder:
 *  1) autorización previa: la simulación nunca sustituye ni relaja `x-cron-secret`
 *  2) bloqueo de escrituras (`insert`/`update`/`upsert`/`delete`)
 *  3) bloqueo de `enqueue_email` (y de cualquier RPC fuera de la lista blanca)
 *  4) RPC de selección permitidas (las cuatro funciones `STABLE`)
 *  5) respuesta sin PII ni secretos: sólo contadores y `dry_run:true`
 *  6) la ruta real (sin la cabecera) conserva el comportamiento anterior
 */
import { describe, expect, it } from "bun:test";
import {
  CRON_HOOK_HEADER,
  CRON_HOOK_SECRET_ENV,
  handleCronHook,
  type CronSupabase,
} from "../../src/lib/cron/cron-hook-auth.server";
import {
  CRON_DRY_RUN_HEADER,
  CRON_DRY_RUN_READ_RPCS,
  CronDryRunViolation,
  createDryRunClient,
  isDryRunRequest,
  newDryRunStats,
  recordDryRunOutcome,
} from "../../src/lib/cron/cron-dry-run.server";
import { runTripJourneyEmails } from "../../src/lib/cron/jobs/trip-journey-emails.server";
import { runCouponReviewReminders } from "../../src/lib/cron/jobs/coupon-review-reminders.server";
import { runVisibilityNotifications } from "../../src/lib/cron/jobs/visibility-notifications.server";
import { makeFakeSupabase, type FakeSupabase } from "./fake-supabase";

const TEST_SECRET = "test-cron-secret-not-real-".padEnd(64, "x");
const WRONG_SECRET = "test-cron-secret-not-real-".padEnd(64, "y");
const FAKE_PUBLISHABLE = "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.c2lnbmF0dXJl";
const env = { [CRON_HOOK_SECRET_ENV]: TEST_SECRET };
const ok = (data: unknown) => ({ data, error: null });

function request(path: string, headers: Record<string, string>): Request {
  return new Request(`https://example.test${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: "{}",
  });
}

function dryRunRequest(path: string): Request {
  return request(path, { [CRON_HOOK_HEADER]: TEST_SECRET, [CRON_DRY_RUN_HEADER]: "1" });
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

/** Candidato sintético de viaje; dirección RFC 2606, nunca real. */
const TRIP_ROW = {
  order_id: "00000000-0000-4000-8000-0000000d1e00",
  folio: "VMX-DRYRUN-0001",
  user_id: null,
  traveler_email: "Viajera.DryRun@example.com",
  traveler_name: "Viajera Simulada",
  traveler_locale: "es-MX",
  destination_name: "Valladolid",
  start_date: "2026-10-01",
  end_date: "2026-10-03",
  party_size: 2,
  days_to_trip: 14,
};

describe("isDryRunRequest · sólo con la cabecera explícita", () => {
  it("acepta 1/true (con mayúsculas y espacios) y rechaza el resto", () => {
    for (const v of ["1", "true", "TRUE", " true "]) {
      expect(isDryRunRequest(request("/x", { [CRON_DRY_RUN_HEADER]: v }))).toBe(true);
    }
    for (const v of ["0", "false", "", "yes", "si"]) {
      expect(isDryRunRequest(request("/x", { [CRON_DRY_RUN_HEADER]: v }))).toBe(false);
    }
    expect(isDryRunRequest(request("/x", {}))).toBe(false);
  });
});

describe("1) autorización previa · la simulación nunca abre una puerta", () => {
  const cases: Array<{ name: string; headers: Record<string, string> }> = [
    { name: "clave pública (`apikey`) + dry-run", headers: { apikey: FAKE_PUBLISHABLE } },
    { name: "bearer + dry-run", headers: { authorization: `Bearer ${FAKE_PUBLISHABLE}` } },
    { name: "secreto incorrecto + dry-run", headers: { [CRON_HOOK_HEADER]: WRONG_SECRET } },
    { name: "sin credencial + dry-run", headers: {} },
  ];

  for (const c of cases) {
    it(`${c.name} → 401 y nunca se crea el cliente de servicio`, async () => {
      const fake = makeFakeSupabase();
      const d = deps(fake);
      const res = await handleCronHook(
        request("/api/public/hooks/trip-journey-emails", {
          ...c.headers,
          [CRON_DRY_RUN_HEADER]: "1",
        }),
        runTripJourneyEmails,
        d.deps,
      );
      expect(res.status).toBe(401);
      expect(await res.text()).toBe("Unauthorized");
      expect(res.headers.get(CRON_DRY_RUN_HEADER)).toBeNull();
      expect(d.created()).toBe(0);
      expect(fake.rpcCalls).toHaveLength(0);
      expect(fake.writes).toHaveLength(0);
    });
  }

  it("secreto ausente en el servidor → 401 aunque se pida simulación (fail closed)", async () => {
    const fake = makeFakeSupabase();
    const res = await handleCronHook(
      dryRunRequest("/api/public/hooks/trip-journey-emails"),
      runTripJourneyEmails,
      { env: {}, createClient: async () => fake.client },
    );
    expect(res.status).toBe(401);
    expect(fake.rpcCalls).toHaveLength(0);
  });
});

describe("2) el guardián bloquea toda escritura", () => {
  for (const op of ["insert", "update", "upsert", "delete"] as const) {
    it(`\`${op}\` lanza CronDryRunViolation y no llega al cliente real`, () => {
      const fake = makeFakeSupabase();
      const guarded = createDryRunClient(fake.client);
      const builder = guarded.from("email_send_log") as unknown as Record<string, () => unknown>;
      expect(() => builder[op]!({})).toThrow(CronDryRunViolation);
      expect(fake.writes).toHaveLength(0);
    });
  }

  it("las lecturas siguen pasando al cliente real", async () => {
    const fake = makeFakeSupabase({ selects: { suppressed_emails: ok(null) } });
    const guarded = createDryRunClient(fake.client);
    const res = await guarded
      .from("suppressed_emails")
      .select("email")
      .eq("email", "x@example.com")
      .maybeSingle();
    expect(res.error).toBeNull();
    expect(fake.writes).toHaveLength(0);
  });

  it("las superficies con efectos (storage, functions, channel…) están vedadas", () => {
    const guarded = createDryRunClient(makeFakeSupabase().client) as unknown as Record<
      string,
      unknown
    >;
    for (const prop of ["storage", "functions", "schema", "channel", "realtime"]) {
      expect(() => guarded[prop]).toThrow(CronDryRunViolation);
    }
  });
});

describe("3) y 4) RPC: `enqueue_email` bloqueada, selección permitida", () => {
  it("`enqueue_email` lanza violación y no se registra llamada alguna", () => {
    const fake = makeFakeSupabase();
    const guarded = createDryRunClient(fake.client);
    expect(() => guarded.rpc("enqueue_email", { payload: {} })).toThrow(CronDryRunViolation);
    expect(fake.transportCalls()).toHaveLength(0);
    expect(fake.rpcCalls).toHaveLength(0);
  });

  it("cualquier RPC fuera de la lista blanca queda bloqueada", () => {
    const guarded = createDryRunClient(makeFakeSupabase().client);
    for (const fn of ["create_unsubscribe_token", "mark_trip_email_sent", "exec_sql"]) {
      expect(() => guarded.rpc(fn, {})).toThrow(CronDryRunViolation);
    }
  });

  it("la lista blanca contiene sólo las cuatro funciones de selección", () => {
    expect([...CRON_DRY_RUN_READ_RPCS].sort()).toEqual([
      "get_coupons_needing_review_reminder",
      "get_orders_needing_trip_email",
      "list_visibility_grants_expiring",
      "list_visibility_grants_recently_expired",
    ]);
  });

  for (const fn of CRON_DRY_RUN_READ_RPCS) {
    it(`la RPC de selección \`${fn}\` sí llega al cliente real`, async () => {
      const fake = makeFakeSupabase({ rpc: { [fn]: () => ok([]) } });
      const guarded = createDryRunClient(fake.client);
      await guarded.rpc(fn, {});
      expect(fake.rpcCalls.map((c) => c.fn)).toEqual([fn]);
      expect(fake.writes).toHaveLength(0);
    });
  }
});

describe("5) los tres ganchos en simulación: contadores, sin envíos ni escrituras", () => {
  it("trip-journey-emails · candidato sintético → would_send sin cola ni marca", async () => {
    const fake = makeFakeSupabase({
      rpc: {
        get_orders_needing_trip_email: (args) =>
          (args as { _kind: string })._kind === "t14" ? ok([TRIP_ROW]) : ok([]),
      },
    });
    const d = deps(fake);
    const res = await handleCronHook(
      dryRunRequest("/api/public/hooks/trip-journey-emails"),
      runTripJourneyEmails,
      d.deps,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get(CRON_DRY_RUN_HEADER)).toBe("1");
    const body = (await res.json()) as {
      ok: boolean;
      dry_run: boolean;
      results: Record<string, ReturnType<typeof newDryRunStats>>;
    };
    expect(body.ok).toBe(true);
    expect(body.dry_run).toBe(true);
    expect(body.results.t14).toEqual({
      candidates: 1,
      would_send: 1,
      would_suppress: 0,
      render_failed: 0,
    });
    expect(body.results.t3).toEqual(newDryRunStats());
    expect(d.created()).toBe(1);
    expect(fake.transportCalls()).toHaveLength(0);
    expect(fake.writes).toHaveLength(0);
    expect(fake.rpcCalls.every((c) => CRON_DRY_RUN_READ_RPCS.has(c.fn))).toBe(true);
  });

  it("trip-journey-emails · destinatario suprimido → would_suppress", async () => {
    const fake = makeFakeSupabase({
      rpc: {
        get_orders_needing_trip_email: (args) =>
          (args as { _kind: string })._kind === "t14" ? ok([TRIP_ROW]) : ok([]),
      },
      selects: { suppressed_emails: ok({ email: "viajera.dryrun@example.com" }) },
    });
    const res = await handleCronHook(
      dryRunRequest("/api/public/hooks/trip-journey-emails"),
      runTripJourneyEmails,
      deps(fake).deps,
    );
    const body = (await res.json()) as { results: Record<string, { would_suppress: number }> };
    expect(body.results.t14.would_suppress).toBe(1);
    expect(fake.transportCalls()).toHaveLength(0);
    expect(fake.writes).toHaveLength(0);
  });

  it("coupon-review-reminders · sin candidatos → contadores en cero y `dry_run:true`", async () => {
    const fake = makeFakeSupabase({ rpc: { get_coupons_needing_review_reminder: () => ok([]) } });
    const res = await handleCronHook(
      dryRunRequest("/api/public/hooks/coupon-review-reminders"),
      runCouponReviewReminders,
      deps(fake).deps,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      reminder_1: newDryRunStats(),
      reminder_2: newDryRunStats(),
      selection_errors: [],
      dry_run: true,
    });
    expect(fake.writes).toHaveLength(0);
    expect(fake.transportCalls()).toHaveLength(0);
  });

  it("visibility-notifications · candidato a vencer → would_send sin envío", async () => {
    const fake = makeFakeSupabase({
      rpc: {
        list_visibility_grants_expiring: (args) =>
          (args as { _reminder: number })._reminder === 7
            ? ok([
                {
                  grant_id: "00000000-0000-4000-8000-0000000d1e01",
                  business_id: "00000000-0000-4000-8000-0000000d1e02",
                  business_name: "Negocio Simulado",
                  plan_name: "Visibilidad Plus",
                  expires_at: "2026-10-01T00:00:00Z",
                  recipient_email: "Anfitrion.DryRun@example.com",
                  recipient_name: "Anfitrión Simulado",
                },
              ])
            : ok([]),
        list_visibility_grants_recently_expired: () => ok([]),
      },
    });
    const res = await handleCronHook(
      dryRunRequest("/api/public/hooks/visibility-notifications"),
      runVisibilityNotifications,
      deps(fake).deps,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, { would_send?: number }> & {
      dry_run: boolean;
    };
    expect(body.dry_run).toBe(true);
    expect(body["expiring_7d"]?.would_send).toBe(1);
    expect(body["expiring_1d"]).toEqual(newDryRunStats());
    expect(body["expired"]).toEqual(newDryRunStats());
    expect(fake.writes).toHaveLength(0);
    expect(fake.transportCalls()).toHaveLength(0);
  });

  it("la respuesta no contiene PII ni secretos en ninguno de los tres ganchos", async () => {
    const bodies: string[] = [];
    const runs: Array<[string, Parameters<typeof handleCronHook>[1], FakeSupabase]> = [
      [
        "/api/public/hooks/trip-journey-emails",
        runTripJourneyEmails,
        makeFakeSupabase({
          rpc: {
            get_orders_needing_trip_email: (args) =>
              (args as { _kind: string })._kind === "t14" ? ok([TRIP_ROW]) : ok([]),
          },
        }),
      ],
      [
        "/api/public/hooks/coupon-review-reminders",
        runCouponReviewReminders,
        makeFakeSupabase({
          rpc: {
            get_coupons_needing_review_reminder: () =>
              ok([
                {
                  coupon_id: "00000000-0000-4000-8000-0000000d1e03",
                  business_name: "Negocio Simulado",
                  business_slug: "negocio-simulado",
                  recipient_email: "Cupon.DryRun@example.com",
                  traveler_first_name: "Cliente",
                },
              ]),
          },
        }),
      ],
      [
        "/api/public/hooks/visibility-notifications",
        runVisibilityNotifications,
        makeFakeSupabase({
          rpc: {
            list_visibility_grants_expiring: () => ok([]),
            list_visibility_grants_recently_expired: () => ok([]),
          },
        }),
      ],
    ];

    for (const [path, run, fake] of runs) {
      const res = await handleCronHook(dryRunRequest(path), run, deps(fake).deps);
      expect(res.status).toBe(200);
      bodies.push(await res.text());
      expect(fake.writes).toHaveLength(0);
      expect(fake.transportCalls()).toHaveLength(0);
    }

    for (const text of bodies) {
      expect(text).toContain('"dry_run":true');
      expect(text).not.toContain(TEST_SECRET);
      expect(text.toLowerCase()).not.toContain("example.com");
      expect(text).not.toContain("@");
      expect(text).not.toContain("Simulad");
      expect(text).not.toContain("VMX-DRYRUN-0001");
      expect(text).not.toContain("0000000d1e0");
      expect(text).not.toContain("<html");
    }
  });
});

describe("6) sin la cabecera la ruta real no cambia", () => {
  it("secreto correcto sin dry-run → el trabajo real encola y marca como antes", async () => {
    const fake = makeFakeSupabase({
      rpc: {
        get_orders_needing_trip_email: (args) =>
          (args as { _kind: string })._kind === "t14" ? ok([TRIP_ROW]) : ok([]),
        enqueue_email: () => ok(null),
      },
    });
    const res = await handleCronHook(
      request("/api/public/hooks/trip-journey-emails", { [CRON_HOOK_HEADER]: TEST_SECRET }),
      runTripJourneyEmails,
      deps(fake).deps,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get(CRON_DRY_RUN_HEADER)).toBeNull();
    const body = (await res.json()) as { dry_run?: boolean; results: Record<string, unknown> };
    expect(body.dry_run).toBeUndefined();
    expect(fake.transportCalls()).toHaveLength(1);
    expect(fake.writes.length).toBeGreaterThan(0);
  });

  it("un trabajo que intente escribir en simulación se detiene con 500 sin mutar nada", async () => {
    const fake = makeFakeSupabase();
    const rogue = async (supabase: CronSupabase) => {
      await supabase.rpc("enqueue_email", { payload: {} });
      return { body: { ok: true } };
    };
    const res = await handleCronHook(
      dryRunRequest("/api/public/hooks/trip-journey-emails"),
      rogue,
      deps(fake).deps,
    );
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, dry_run: true, error: "write_blocked" });
    expect(fake.rpcCalls).toHaveLength(0);
    expect(fake.writes).toHaveLength(0);
  });
});

describe("contadores", () => {
  it("recordDryRunOutcome acumula candidatos y desglose", () => {
    const stats = newDryRunStats();
    recordDryRunOutcome(stats, "would_send");
    recordDryRunOutcome(stats, "would_suppress");
    recordDryRunOutcome(stats, "render_failed");
    recordDryRunOutcome(stats, "would_send");
    expect(stats).toEqual({
      candidates: 4,
      would_send: 2,
      would_suppress: 1,
      render_failed: 1,
    });
  });
});
