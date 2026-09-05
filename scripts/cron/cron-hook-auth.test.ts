/**
 * Lote 3M-A · Contrato de autorización de los ganchos cron.
 *
 * Escenarios Founder por endpoint:
 *  a) sin credencial → rechazo
 *  b) publishable/anon key (`apikey`) → rechazo
 *  c) secreto incorrecto → rechazo
 *  e) secreto ausente en servidor → fail closed
 *  f) ningún valor secreto en respuesta ni en registro
 *
 * El escenario d) (secreto correcto con transporte simulado) vive en
 * `cron-jobs-isolation.test.ts`. Aquí las rutas reales sólo se ejercitan en
 * rechazo: nunca se alcanza la creación del cliente de servicio.
 */
import { afterAll, beforeAll, describe, expect, it, spyOn } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CRON_HOOK_HEADER,
  CRON_HOOK_SECRET_ENV,
  CRON_HOOK_SECRET_MIN_LENGTH,
  cronUnauthorizedResponse,
  handleCronHook,
  isAuthorizedCronRequest,
  readCronHookSecret,
  redactSecret,
} from "../../src/lib/cron/cron-hook-auth.server";
import { Route as TripRoute } from "../../src/routes/api/public/hooks/trip-journey-emails";
import { Route as VisibilityRoute } from "../../src/routes/api/public/hooks/visibility-notifications";
import { Route as CouponRoute } from "../../src/routes/api/public/hooks/coupon-review-reminders";

const TEST_SECRET = "test-cron-secret-not-real-".padEnd(64, "x");
const WRONG_SECRET = "test-cron-secret-not-real-".padEnd(64, "y");
const SHORT_SECRET = "too-short";
// Clave pública de prueba con forma de JWT; el contrato la rechaza siempre.
const FAKE_PUBLISHABLE = "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.c2lnbmF0dXJl";

type Handler = (ctx: { request: Request }) => Promise<Response> | Response;
function postHandler(route: unknown): Handler {
  const r = route as { options?: { server?: { handlers?: { POST?: Handler } } } };
  const h = r.options?.server?.handlers?.POST;
  if (!h) throw new Error("route without POST handler");
  return h;
}

const ROUTES: Array<{ name: string; path: string; handler: Handler; file: string }> = [
  {
    name: "trip-journey-emails",
    path: "/api/public/hooks/trip-journey-emails",
    handler: postHandler(TripRoute),
    file: "src/routes/api/public/hooks/trip-journey-emails.ts",
  },
  {
    name: "visibility-notifications",
    path: "/api/public/hooks/visibility-notifications",
    handler: postHandler(VisibilityRoute),
    file: "src/routes/api/public/hooks/visibility-notifications.ts",
  },
  {
    name: "coupon-review-reminders",
    path: "/api/public/hooks/coupon-review-reminders",
    handler: postHandler(CouponRoute),
    file: "src/routes/api/public/hooks/coupon-review-reminders.ts",
  },
];

function req(path: string, headers: Record<string, string> = {}, query = ""): Request {
  return new Request(`https://example.test${path}${query}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: "{}",
  });
}

describe("isAuthorizedCronRequest · contrato", () => {
  const env = { [CRON_HOOK_SECRET_ENV]: TEST_SECRET };

  it("acepta únicamente la cabecera canónica con el secreto exacto", () => {
    expect(isAuthorizedCronRequest(req("/x", { [CRON_HOOK_HEADER]: TEST_SECRET }), env)).toBe(true);
  });

  it("a) rechaza sin credencial", () => {
    expect(isAuthorizedCronRequest(req("/x"), env)).toBe(false);
  });

  it("b) rechaza la clave pública en `apikey` aunque coincida con el entorno", () => {
    const envWithPublishable = { ...env, SUPABASE_PUBLISHABLE_KEY: FAKE_PUBLISHABLE };
    expect(isAuthorizedCronRequest(req("/x", { apikey: FAKE_PUBLISHABLE }), envWithPublishable)).toBe(
      false,
    );
    // Ni siquiera si `apikey` lleva el propio secreto: la cabecera no es la canónica.
    expect(isAuthorizedCronRequest(req("/x", { apikey: TEST_SECRET }), env)).toBe(false);
  });

  it("b') rechaza bearer y parámetros de URL como alternativa", () => {
    expect(
      isAuthorizedCronRequest(req("/x", { authorization: `Bearer ${TEST_SECRET}` }), env),
    ).toBe(false);
    expect(isAuthorizedCronRequest(req("/x", {}, `?${CRON_HOOK_HEADER}=${TEST_SECRET}`), env)).toBe(
      false,
    );
    expect(isAuthorizedCronRequest(req("/x", {}, `?secret=${TEST_SECRET}`), env)).toBe(false);
  });

  it("c) rechaza secreto incorrecto (misma longitud y distinta longitud)", () => {
    expect(isAuthorizedCronRequest(req("/x", { [CRON_HOOK_HEADER]: WRONG_SECRET }), env)).toBe(false);
    expect(
      isAuthorizedCronRequest(req("/x", { [CRON_HOOK_HEADER]: TEST_SECRET.slice(0, 63) }), env),
    ).toBe(false);
    expect(isAuthorizedCronRequest(req("/x", { [CRON_HOOK_HEADER]: TEST_SECRET + "x" }), env)).toBe(
      false,
    );
    expect(isAuthorizedCronRequest(req("/x", { [CRON_HOOK_HEADER]: "" }), env)).toBe(false);
  });

  it("e) fail closed: sin secreto en servidor rechaza incluso la cabecera correcta", () => {
    expect(isAuthorizedCronRequest(req("/x", { [CRON_HOOK_HEADER]: TEST_SECRET }), {})).toBe(false);
    expect(
      isAuthorizedCronRequest(req("/x", { [CRON_HOOK_HEADER]: TEST_SECRET }), {
        [CRON_HOOK_SECRET_ENV]: "",
      }),
    ).toBe(false);
    expect(
      isAuthorizedCronRequest(req("/x", { [CRON_HOOK_HEADER]: SHORT_SECRET }), {
        [CRON_HOOK_SECRET_ENV]: SHORT_SECRET,
      }),
    ).toBe(false);
  });

  it("readCronHookSecret aplica la longitud mínima", () => {
    expect(CRON_HOOK_SECRET_MIN_LENGTH).toBe(32);
    expect(readCronHookSecret({})).toBeNull();
    expect(readCronHookSecret({ [CRON_HOOK_SECRET_ENV]: SHORT_SECRET })).toBeNull();
    expect(readCronHookSecret({ [CRON_HOOK_SECRET_ENV]: TEST_SECRET })).toBe(TEST_SECRET);
  });

  it("redactSecret elimina toda aparición del secreto", () => {
    expect(redactSecret(`boom ${TEST_SECRET} twice ${TEST_SECRET}`, TEST_SECRET)).toBe(
      "boom [redacted] twice [redacted]",
    );
    expect(redactSecret("plain", null)).toBe("plain");
  });
});

describe("handleCronHook · pipeline", () => {
  const env = { [CRON_HOOK_SECRET_ENV]: TEST_SECRET };

  it("no crea cliente ni ejecuta el trabajo cuando la autorización falla", async () => {
    let created = 0;
    let ran = 0;
    const deps = {
      env,
      createClient: async () => {
        created += 1;
        return {} as never;
      },
    };
    const runner = async () => {
      ran += 1;
      return { body: { ok: true } };
    };
    for (const r of [
      req("/x"),
      req("/x", { apikey: FAKE_PUBLISHABLE }),
      req("/x", { [CRON_HOOK_HEADER]: WRONG_SECRET }),
      req("/x", { authorization: `Bearer ${TEST_SECRET}` }),
    ]) {
      const res = await handleCronHook(r, runner, deps);
      expect(res.status).toBe(401);
      expect(await res.text()).toBe("Unauthorized");
    }
    expect(created).toBe(0);
    expect(ran).toBe(0);
  });

  it("e) fail closed también en el pipeline: entorno sin secreto → 401 sin tocar el trabajo", async () => {
    let created = 0;
    const res = await handleCronHook(
      req("/x", { [CRON_HOOK_HEADER]: TEST_SECRET }),
      async () => ({ body: { ok: true } }),
      {
        env: {},
        createClient: async () => {
          created += 1;
          return {} as never;
        },
      },
    );
    expect(res.status).toBe(401);
    expect(created).toBe(0);
  });

  it("el rechazo es uniforme: mismo código, cuerpo y cabeceras para todo motivo", async () => {
    const reference = cronUnauthorizedResponse();
    const refBody = await reference.text();
    for (const r of [req("/x"), req("/x", { apikey: "x" }), req("/x", { [CRON_HOOK_HEADER]: "z" })]) {
      const res = await handleCronHook(r, async () => ({ body: {} }), { env });
      expect(res.status).toBe(reference.status);
      expect(await res.text()).toBe(refBody);
      expect(res.headers.get("cache-control")).toBe(reference.headers.get("cache-control"));
      expect(res.headers.get("content-type")).toBe(reference.headers.get("content-type"));
    }
  });

  it("con secreto correcto ejecuta el trabajo con el cliente inyectado y devuelve su cuerpo", async () => {
    const marker = { tag: "fake-client" };
    let received: unknown = null;
    const res = await handleCronHook(
      req("/x", { [CRON_HOOK_HEADER]: TEST_SECRET }),
      async (client) => {
        received = client;
        return { body: { ok: true, sent: 0 } };
      },
      { env, createClient: async () => marker as never },
    );
    expect(res.status).toBe(200);
    expect(received).toBe(marker);
    expect(await res.json()).toEqual({ ok: true, sent: 0 });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("respeta el código de estado declarado por el trabajo", async () => {
    const res = await handleCronHook(
      req("/x", { [CRON_HOOK_HEADER]: TEST_SECRET }),
      async () => ({ status: 500, body: { ok: false, error: "template_not_found" } }),
      { env, createClient: async () => ({}) as never },
    );
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: "template_not_found" });
  });

  it("f) una excepción del trabajo produce 500 sanitizado y el registro no contiene el secreto", async () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await handleCronHook(
        req("/x", { [CRON_HOOK_HEADER]: TEST_SECRET }),
        async () => {
          throw new Error(`upstream said ${TEST_SECRET}`);
        },
        { env, createClient: async () => ({}) as never },
      );
      expect(res.status).toBe(500);
      const text = await res.text();
      expect(text).toBe(JSON.stringify({ ok: false }));
      expect(text).not.toContain(TEST_SECRET);
      expect(text).not.toContain("upstream");
      const logged = JSON.stringify(errorSpy.mock.calls);
      expect(logged).not.toContain(TEST_SECRET);
      expect(logged).toContain("[redacted]");
    } finally {
      errorSpy.mockRestore();
    }
  });
});

describe("rutas reales · sólo rechazo (nunca se crea el cliente de servicio)", () => {
  let previous: string | undefined;
  beforeAll(() => {
    previous = process.env[CRON_HOOK_SECRET_ENV];
    process.env[CRON_HOOK_SECRET_ENV] = TEST_SECRET;
  });
  afterAll(() => {
    if (previous === undefined) delete process.env[CRON_HOOK_SECRET_ENV];
    else process.env[CRON_HOOK_SECRET_ENV] = previous;
  });

  for (const route of ROUTES) {
    describe(route.name, () => {
      it("a) sin credencial → 401", async () => {
        const res = await route.handler({ request: req(route.path) });
        expect(res.status).toBe(401);
        expect(await res.text()).toBe("Unauthorized");
      });

      it("b) `apikey` con clave pública → 401", async () => {
        const publishable = process.env["SUPABASE_PUBLISHABLE_KEY"] || FAKE_PUBLISHABLE;
        const res = await route.handler({ request: req(route.path, { apikey: publishable }) });
        expect(res.status).toBe(401);
        const res2 = await route.handler({
          request: req(route.path, { apikey: FAKE_PUBLISHABLE, "x-lovable-anon": "1" }),
        });
        expect(res2.status).toBe(401);
      });

      it("b') bearer y parámetros de URL → 401", async () => {
        const res = await route.handler({
          request: req(route.path, { authorization: `Bearer ${TEST_SECRET}` }),
        });
        expect(res.status).toBe(401);
        const res2 = await route.handler({
          request: req(route.path, {}, `?${CRON_HOOK_HEADER}=${TEST_SECRET}`),
        });
        expect(res2.status).toBe(401);
      });

      it("c) secreto incorrecto → 401", async () => {
        const res = await route.handler({
          request: req(route.path, { [CRON_HOOK_HEADER]: WRONG_SECRET }),
        });
        expect(res.status).toBe(401);
      });

      it("e) secreto ausente en servidor → 401 (fail closed)", async () => {
        const saved = process.env[CRON_HOOK_SECRET_ENV];
        delete process.env[CRON_HOOK_SECRET_ENV];
        try {
          const res = await route.handler({
            request: req(route.path, { [CRON_HOOK_HEADER]: TEST_SECRET }),
          });
          expect(res.status).toBe(401);
        } finally {
          process.env[CRON_HOOK_SECRET_ENV] = saved;
        }
      });

      it("f) la respuesta de rechazo no contiene secretos ni motivos internos", async () => {
        const res = await route.handler({
          request: req(route.path, { [CRON_HOOK_HEADER]: WRONG_SECRET }),
        });
        const text = await res.text();
        expect(text).toBe("Unauthorized");
        expect(text).not.toContain(TEST_SECRET);
        expect(text).not.toContain(WRONG_SECRET);
      });

      it("contrato de fuente: sin `apikey`, sin clave pública, sin bearer, sin secreto heredado", () => {
        // Se evalúa el código, no la documentación: se descartan comentarios.
        const source = stripComments(readFileSync(join(process.cwd(), route.file), "utf8"));
        expect(source).toContain("handleCronHook(");
        expect(source).not.toMatch(/apikey/i);
        expect(source).not.toContain("SUPABASE_PUBLISHABLE_KEY");
        expect(source).not.toContain("EB_CRON_SECRET");
        expect(source).not.toMatch(/headers\.get\(\s*["']authorization["']/i);
        expect(source).not.toMatch(/searchParams/);
      });
    });
  }

  it("el módulo de autorización no lee `apikey`, bearer ni parámetros de URL", () => {
    const source = stripComments(
      readFileSync(join(process.cwd(), "src/lib/cron/cron-hook-auth.server.ts"), "utf8"),
    );
    expect(source).not.toMatch(/headers\.get\(\s*["']apikey["']/i);
    expect(source).not.toMatch(/headers\.get\(\s*["']authorization["']/i);
    expect(source).not.toMatch(/searchParams/);
    expect(source).not.toContain("SUPABASE_PUBLISHABLE_KEY");
    // La única cabecera consultada es la canónica.
    const headerReads = source.match(/headers\.get\(([^)]*)\)/g) ?? [];
    expect(headerReads).toEqual(["headers.get(CRON_HOOK_HEADER)"]);
  });
});

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}
