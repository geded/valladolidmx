/**
 * Aviso «Nuevo viajero registrado» y lectura paginada del monitor.
 * Reglas puras: quién cuenta como viajero nuevo, a quién se avisa y que
 * el monitor no se tope en 1,000 registros.
 */
import { describe, expect, it } from "vitest";
import {
  isNewTravelerSignup,
  resolveSignupAdminRecipients,
  savedItemsLabel,
} from "../src/lib/notifications/traveler-signup-admin";
import { buildReadArgs, readVisitorIntelEvents } from "../src/lib/visitor-intel/event-reads.server";
import { registrationPromptTarget } from "../src/lib/visitor-intel/session-signals";

const NOW = Date.parse("2026-11-20T22:00:00Z");
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString();

describe("viajero nuevo", () => {
  it("una cuenta de viajero creada hace 1 hora es registro nuevo", () => {
    expect(isNewTravelerSignup(hoursAgo(1), ["traveler"], NOW)).toBe(true);
  });
  it("una cuenta de hace más de 72 horas no vuelve a avisar", () => {
    expect(isNewTravelerSignup(hoursAgo(73), ["traveler"], NOW)).toBe(false);
  });
  it("una cuenta sin rol de viajero no cuenta como viajero nuevo", () => {
    expect(isNewTravelerSignup(hoursAgo(1), ["editor"], NOW)).toBe(false);
  });
});

describe("destinatarios del aviso", () => {
  it("usa el correo interno del administrador cuando no hay lista dedicada", () => {
    expect(
      resolveSignupAdminRecipients({
        internalSetting: "Geded@Valladolid.com.mx",
        adminEmails: ["otro@example.com"],
      }),
    ).toEqual(["geded@valladolid.com.mx"]);
  });
  it("la lista dedicada tiene prioridad sobre el correo interno", () => {
    expect(
      resolveSignupAdminRecipients({
        signupSetting: ["a@example.com", "b@example.com"],
        internalSetting: "geded@valladolid.com.mx",
      }),
    ).toEqual(["a@example.com", "b@example.com"]);
  });
  it("nunca se avisa al propio viajero", () => {
    expect(
      resolveSignupAdminRecipients({
        adminEmails: ["admin@example.com", "viajero@example.com"],
        travelerEmail: "viajero@example.com",
      }),
    ).toEqual(["admin@example.com"]);
  });
  it("describe cuántos lugares guardó en Mi Viaje", () => {
    expect(savedItemsLabel(3)).toBe("3 lugares guardados");
    expect(savedItemsLabel(1)).toBe("1 lugar guardado");
  });
});

describe("monitor sin tope de 1,000", () => {
  it("lee todas las páginas cuando hay más de 1,000 registros", async () => {
    const total = 2_345;
    const calls: number[] = [];
    const fake = {
      rpc: async (_fn: string, args: Record<string, unknown>) => {
        const offset = Number(args["_offset"]);
        calls.push(offset);
        const size = Math.max(0, Math.min(1_000, total - offset));
        return {
          data: Array.from({ length: size }, (_, i) => ({ event_id: String(offset + i) })),
          error: null,
        };
      },
    };
    const rows = await readVisitorIntelEvents({ since: "2026-11-01T00:00:00Z" }, "test", fake);
    expect(rows).toHaveLength(2_345);
    expect(calls).toEqual([0, 1_000, 2_000]);
  });
  it("filtra registros reales y simulados por modo", () => {
    expect(buildReadArgs({ mode: "real" }, 0)["_mode"]).toBe("real");
    expect(buildReadArgs({}, 0)["_mode"]).toBe("all");
  });
});

describe("invitación a registrarse", () => {
  it("guarda sólo tipo y motivo, sin datos personales", () => {
    expect(registrationPromptTarget("anonymous_trip.persist", "hard_limit")).toBe(
      "anonymous_trip.persist:hard_limit",
    );
    expect(registrationPromptTarget("concierge.request", "ana@mail.com x")).toBe(
      "concierge.request:anamail.comx",
    );
  });
});
