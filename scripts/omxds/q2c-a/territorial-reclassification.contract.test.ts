/**
 * G8-Q2C-A · Contrato de la reclasificación territorial segura.
 *
 * Verifica el instrumento de gobernanza, la taxonomía canónica utilizada y el
 * manifiesto de evidencia con el estado real de datos. No escribe en la base
 * compartida, no publica y no declara superficie pública alguna.
 */
import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { PLACE_TYPE_SLUGS } from "@/lib/places/place-taxonomy";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

const BLUEPRINT = "docs/blueprint/19.41-G8-Q2C-A-SAFE-TERRITORIAL-RECLASSIFICATION-v1.0.md";
const PCA = "docs/governance/product-authorizations/PCA-2026-045.json";
const EVIDENCE = "docs/evidence/omxds-q2c-a/EVIDENCE-MANIFEST.md";

const HISTORIC = {
  chichenItza: "ec9eb324-1952-4849-a1d4-00506d7cabb5",
  ekBalam: "11111111-aaaa-4aaa-8aaa-000000000002",
};

describe("G8-Q2C-A · gobernanza", () => {
  test("el instrumento existe, está aprobado y apunta al blueprint", () => {
    const pca = JSON.parse(read(PCA));
    expect(pca.status).toBe("Approved");
    expect(pca.blueprint).toBe(BLUEPRINT);
    expect(pca.branch).toBe("feature/omxds-g8-q2c-places-data-v1");
    expect(pca.public_routes).toEqual([]);
    expect(pca.required_feature_flags).toContain("omxds_visual_v1_contracts_enabled=false");
    expect(pca.required_tests).toContain("bun run validate:q2c:a");
  });

  test("el blueprint declara altas en borrador, cero publicación y cero redirects", () => {
    const bp = read(BLUEPRINT);
    for (const token of ["tinum", "temozon", "chichen-itza", "ek-balam", "zona-arqueologica"]) {
      expect(bp).toContain(token);
    }
    expect(bp).toContain("Cero redirects, cero publicación");
    expect(bp).toContain("source_destination_id");
    expect(bp).toContain("omxds_visual_v1_contracts_enabled=false");
  });

  test("el blueprint está admitido en el Master Index", () => {
    expect(read("docs/governance/06-BLUEPRINT-MASTER-INDEX.md")).toContain(
      "19.41-G8-Q2C-A-SAFE-TERRITORIAL-RECLASSIFICATION-v1.0.md",
    );
  });
});

describe("G8-Q2C-A · taxonomía", () => {
  test("el tipo zona arqueológica es canónico", () => {
    expect(PLACE_TYPE_SLUGS).toContain("zona-arqueologica");
  });
});

describe("G8-Q2C-A · evidencia de datos", () => {
  const evidence = read(EVIDENCE);

  test("registra los dos destinos nuevos en borrador", () => {
    expect(evidence).toContain("bdeb0bdd-178b-4b04-b36f-6982e7d1ae17");
    expect(evidence).toContain("a7111b9a-a1de-49c0-b251-9818645a9a43");
    expect(evidence).toContain("Temozón");
  });

  test("registra los dos lugares nuevos con su destino y su origen", () => {
    expect(evidence).toContain("3842b6cb-80e9-4d50-abde-57560a563e21");
    expect(evidence).toContain("6c22aa5f-62f9-4faa-ba39-c66e884d7904");
    expect(evidence).toContain("Ek' Balam");
    expect(evidence).toContain(HISTORIC.chichenItza);
    expect(evidence).toContain(HISTORIC.ekBalam);
  });

  test("acredita idempotencia, preservación histórica y ausencia de publicación", () => {
    expect(evidence).toContain("idempotencia");
    expect(evidence).toContain("/oriente-maya/ek-balam");
    expect(evidence).toContain("published");
    expect(evidence).toContain("cero redirects");
    expect(evidence).toContain("rollback");
  });
});
