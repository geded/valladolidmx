/**
 * G8-R1-F1B-B4 · Contrato del gate `validate:r1:f1b:b4`.
 *
 * Verifica, sin IO de red y sin base de datos, el snapshot acreditado del lote
 * público y las reglas no negociables de la autorización Founder:
 *  · clasificación A/B/C exacta
 *  · cero publicación, cero indexación, cero reclamación, cero badge
 *  · paquete de reclamación completo en las 15 fichas
 *  · solicitud de medios con especificaciones y prohibición de terceros
 *  · reclamación discreta (texto único, sólo pie de ficha)
 *  · geolocalización pendiente sin geocodificación automática
 *  · reversibilidad registrada
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

type Row = {
  slug: string;
  name: string;
  status: string;
  review: string;
  decision: "A" | "B" | "C";
  robots: string;
  canonical: string;
  geo: number;
  contacts: number;
  provenance: number;
  media_blocking: boolean;
};

const SNAPSHOT_PATH = "docs/governance/evidence/g8-r1-f1b-b4/batch-state.snapshot.json";
const REPORT_PATH =
  "docs/governance/evidence/g8-r1-f1b-b4/EDITORIAL-APPROVAL-AND-CLAIM-PACKAGE-v1.0.md";

const snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8")) as {
  batch: string;
  rows: Row[];
  claim_package_contract: string[];
  media_request_contract: string[];
  audit_actions: string[];
  public_claim_text: string;
  claim_placement: string;
};
const report = readFileSync(REPORT_PATH, "utf8");
const contracts = readFileSync("src/lib/provenance/provenance-contracts.ts", "utf8");

const GROUP_A = ["el-sazon-de-valladolid", "sikil-restaurante", "valladolid-expeditions"];
const GROUP_B = ["hotel-olbil", "lemuuch-hotel-boutique", "sutuk-hotel-valladolid"];

describe("G8-R1-F1B-B4 · inventario y clasificación", () => {
  it("cubre exactamente las 15 fichas del lote público", () => {
    expect(snapshot.batch).toBe("G8-R1-F1B-B4");
    expect(snapshot.rows).toHaveLength(15);
    expect(new Set(snapshot.rows.map((r) => r.slug)).size).toBe(15);
  });

  it("aprueba 6 fichas: 3 en Grupo A y 3 en Grupo B", () => {
    const approved = snapshot.rows.filter((r) => r.review === "approved");
    expect(approved).toHaveLength(6);
    expect(
      approved
        .filter((r) => r.decision === "A")
        .map((r) => r.slug)
        .sort(),
    ).toEqual(GROUP_A);
    expect(
      approved
        .filter((r) => r.decision === "B")
        .map((r) => r.slug)
        .sort(),
    ).toEqual([...GROUP_B].sort());
  });

  it("mantiene 9 fichas en revisión con decisión C", () => {
    const pending = snapshot.rows.filter((r) => r.review === "in_review");
    expect(pending).toHaveLength(9);
    expect(pending.every((r) => r.decision === "C")).toBe(true);
  });
});

describe("G8-R1-F1B-B4 · mínimos de las fichas aprobadas", () => {
  const approved = () => snapshot.rows.filter((r) => r.review === "approved");

  it("todas tienen coordenadas acreditadas", () => {
    expect(approved().every((r) => r.geo >= 1)).toBe(true);
  });

  it("todas tienen al menos dos contactos oficiales", () => {
    expect(approved().every((r) => r.contacts >= 2)).toBe(true);
  });

  it("todas tienen procedencia campo por campo", () => {
    expect(approved().every((r) => r.provenance >= 5)).toBe(true);
  });

  it("todas tienen ruta canónica del contrato de navegación", () => {
    expect(
      approved().every((r) => /^\/oriente-maya\/[a-z-]+\/[a-z-]+\/[a-z0-9-]+$/.test(r.canonical)),
    ).toBe(true);
  });

  it("los hoteles del Grupo B bloquean el Release Candidate hasta recibir fotografía", () => {
    const b = snapshot.rows.filter((r) => r.decision === "B");
    expect(b.every((r) => r.media_blocking === true)).toBe(true);
  });
});

describe("G8-R1-F1B-B4 · cero publicación", () => {
  it("ninguna ficha del lote sale de borrador", () => {
    expect(snapshot.rows.every((r) => r.status === "draft")).toBe(true);
  });

  it("todas permanecen noindex,nofollow", () => {
    expect(snapshot.rows.every((r) => r.robots === "noindex,nofollow")).toBe(true);
  });

  it("el reporte declara cero publicación, cero reclamación y cero verificación", () => {
    expect(report).toMatch(
      /Publicadas: \*\*0\*\*\. Reclamadas: \*\*0\*\*\. Verificadas: \*\*0\*\*/,
    );
    expect(report).toMatch(/flag OFF, sin sitemap ni redirects/);
  });
});

describe("G8-R1-F1B-B4 · paquete de reclamación", () => {
  it("declara los elementos obligatorios del paquete", () => {
    for (const key of [
      "name",
      "business_id",
      "future_url",
      "internal_claim_link",
      "current_fields",
      "sources",
      "pending_data",
      "representation_instructions",
      "invitation_text_private",
      "contact_sent",
    ]) {
      expect(snapshot.claim_package_contract).toContain(key);
    }
  });

  it("no envía contacto automático a las empresas", () => {
    expect(report).toMatch(/no enviado.*contact_sent.*false/);
  });

  it("respeta la reclamación discreta: texto único y sólo al pie de la ficha", () => {
    expect(snapshot.public_claim_text).toBe(
      "¿Representas a este establecimiento? Administra esta ficha",
    );
    expect(snapshot.claim_placement).toBe("detail_footer");
    expect(contracts).toContain("detail_footer");
  });

  it("la insignia de establecimiento verificado permanece apagada", () => {
    expect(report).toMatch(/«Establecimiento verificado» permanece apagado/);
  });
});

describe("G8-R1-F1B-B4 · solicitud de medios", () => {
  it("declara portada, galería, vertical, resolución, formatos y autorización", () => {
    for (const key of [
      "cover_landscape",
      "gallery_min",
      "vertical_mobile",
      "min_resolution_px",
      "formats",
      "requires",
    ]) {
      expect(snapshot.media_request_contract).toContain(key);
    }
  });

  it("prohíbe descargar fotografías de terceros", () => {
    expect(snapshot.media_request_contract).toContain("third_party_download_prohibited");
    expect(report).toMatch(
      /Prohibida la descarga de fotografías de sitios oficiales, redes, Google u OTA/,
    );
  });

  it("usa G8-M1 como única puerta de entrada de medios", () => {
    expect(report).toContain("G8-M1");
  });
});

describe("G8-R1-F1B-B4 · pendientes y reversibilidad", () => {
  it("las 9 fichas pendientes no fueron geocodificadas automáticamente", () => {
    expect(report).toMatch(
      /No se ejecutó geocodificación automática ni aproximación al centro territorial/,
    );
    expect(snapshot.rows.filter((r) => r.decision === "C").every((r) => r.geo === 0)).toBe(true);
  });

  it("registra ambas acciones auditables con datos de reversión", () => {
    expect(snapshot.audit_actions).toEqual([
      "editorial_source_review_approved",
      "editorial_operator_confirmation_requested",
    ]);
    expect(report).toMatch(/suficiente para revertir el lote completo sin pérdida de datos/);
  });
});
