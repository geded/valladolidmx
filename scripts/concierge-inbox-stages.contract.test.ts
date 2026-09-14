/**
 * Contrato: bandejas de seguimiento del Centro Concierge.
 * Verifica que la etapa se derive del ciclo oficial y que las bandejas
 * cubran todo el proceso sin inventar estados.
 */
import { describe, expect, it } from "bun:test";
import {
  CONCIERGE_INBOXES,
  caseReference,
  deriveCaseStage,
  type CaseFollowUp,
} from "../src/lib/concierge/case-stage";

const base = (over: Partial<CaseFollowUp> = {}): CaseFollowUp => ({
  case_id: "ccd06712-cbe5-4ba7-9a92-68782e1ab100",
  quotes_requested: 0,
  quotes_submitted: 0,
  quotes_other: 0,
  latest_proposal_status: null,
  latest_proposal_sent_at: null,
  assigned_concierge_user_id: "d3330000-0000-4000-8000-000000000003",
  assigned_concierge_name: "Concierge Uno",
  ...over,
});

describe("referencia del expediente", () => {
  it("usa la misma forma legible que el detalle", () => {
    expect(caseReference("ccd06712-cbe5-4ba7-9a92-68782e1ab100")).toBe("Expediente CCD06712");
  });
});

describe("etapas derivadas", () => {
  it("marca sin asignar cuando no hay responsable", () => {
    const s = deriveCaseStage({
      status: "new",
      assigned_concierge_user_id: null,
      followUp: base({ assigned_concierge_user_id: null }),
    });
    expect(s.id).toBe("unassigned");
  });

  it("marca en revisión cuando está asignado y no hay cotizaciones", () => {
    const s = deriveCaseStage({
      status: "new",
      assigned_concierge_user_id: "d333",
      followUp: base(),
    });
    expect(s.id).toBe("intake");
  });

  it("marca esperando cotización cuando hay solicitudes sin respuesta", () => {
    const s = deriveCaseStage({
      status: "in_progress",
      assigned_concierge_user_id: "d333",
      followUp: base({ quotes_requested: 2 }),
    });
    expect(s.id).toBe("awaiting_quotes");
    expect(s.nextAction).toContain("2");
  });

  it("marca listo para proponer cuando una empresa ya respondió", () => {
    const s = deriveCaseStage({
      status: "in_progress",
      assigned_concierge_user_id: "d333",
      followUp: base({ quotes_requested: 1, quotes_submitted: 1 }),
    });
    expect(s.id).toBe("ready_to_propose");
  });

  it("distingue propuesta enviada de propuesta vista", () => {
    expect(
      deriveCaseStage({
        status: "in_progress",
        assigned_concierge_user_id: "d333",
        followUp: base({ latest_proposal_status: "sent" }),
      }).id,
    ).toBe("proposal_sent");
    expect(
      deriveCaseStage({
        status: "in_progress",
        assigned_concierge_user_id: "d333",
        followUp: base({ latest_proposal_status: "viewed" }),
      }).label,
    ).toBe("Propuesta vista");
  });

  it("manda a requiere ajuste las propuestas rechazadas, retiradas, reemplazadas o vencidas", () => {
    for (const status of ["rejected", "withdrawn", "superseded", "expired"]) {
      expect(
        deriveCaseStage({
          status: "in_progress",
          assigned_concierge_user_id: "d333",
          followUp: base({ latest_proposal_status: status }),
        }).id,
      ).toBe("needs_rework");
    }
  });

  it("marca aceptada por propuesta aceptada o expediente ganado", () => {
    expect(
      deriveCaseStage({
        status: "in_progress",
        assigned_concierge_user_id: "d333",
        followUp: base({ latest_proposal_status: "accepted" }),
      }).id,
    ).toBe("accepted");
    expect(
      deriveCaseStage({
        status: "closed_won",
        assigned_concierge_user_id: "d333",
        followUp: base(),
      }).id,
    ).toBe("accepted");
  });

  it("marca cerrados los perdidos y archivados", () => {
    for (const status of ["closed_lost", "archived"]) {
      expect(
        deriveCaseStage({ status, assigned_concierge_user_id: "d333", followUp: base() }).id,
      ).toBe("closed");
    }
  });
});

describe("bandejas", () => {
  it("cubre entrada, trabajo, envío y cierre", () => {
    const ids = CONCIERGE_INBOXES.map((i) => i.id);
    for (const expected of [
      "unassigned",
      "mine",
      "awaiting_quotes",
      "ready_to_propose",
      "sent",
      "rework",
      "accepted",
      "closed",
      "all",
    ]) {
      expect(ids).toContain(expected);
    }
  });

  it("no inventa etapas fuera del contrato", () => {
    const allowed = new Set([
      "unassigned",
      "intake",
      "awaiting_quotes",
      "ready_to_propose",
      "proposal_draft",
      "proposal_sent",
      "needs_rework",
      "accepted",
      "closed",
    ]);
    for (const inbox of CONCIERGE_INBOXES) {
      for (const stage of inbox.stages) expect(allowed.has(stage)).toBe(true);
    }
  });
});
