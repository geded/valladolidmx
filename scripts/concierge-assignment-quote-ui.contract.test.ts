import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const view = readFileSync("src/components/concierge/CaseFileView.tsx", "utf8");
const functions = readFileSync("src/lib/concierge/concierge.functions.ts", "utf8");
const inbox = readFileSync("src/routes/_authenticated/concierge/index.tsx", "utf8");

describe("Asignación y cotización del expediente", () => {
  test("la autoasignación deriva la identidad de la sesión", () => {
    const selfAssignment = functions.slice(
      functions.indexOf("export const assignSelfConciergeCase"),
      functions.indexOf("export const reassignConciergeCase"),
    );
    expect(selfAssignment).toContain("_concierge_user_id: context.userId");
    expect(selfAssignment).not.toContain("conciergeUserId:");
  });

  test("el expediente muestra resultado legible y refresca sus datos", () => {
    expect(view).toContain('toast.success("El expediente quedó asignado a ti.")');
    expect(view).toContain('readableConciergeError(error, "assign")');
    expect(view).toContain('["concierge", "case-file", f.case.id]');
  });

  test("la bandeja permite tomar un expediente antes de abrir su detalle", () => {
    expect(inbox).toContain("Asignarme este expediente");
    expect(inbox).toContain("useServerFn(assignSelfConciergeCase)");
    expect(inbox).toContain('queryKey: ["concierge"]');
  });

  test("cada servicio empresarial puede solicitar una sola cotización activa", () => {
    expect(view).toContain("useServerFn(requestConciergeQuote)");
    expect(view).toContain('label={busy ? "Enviando…" : "Solicitar cotización"}');
    expect(view).toContain("request.business_id && !quote");
    expect(view).toContain("Solicitud enviada a la empresa; esperando su respuesta.");
  });
});
