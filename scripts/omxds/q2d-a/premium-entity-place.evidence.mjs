/**
 * G8-Q2D-A · Evidencia estática de cierre.
 *
 * Acredita el paquete documental y de código de la plantilla reusable
 * `premium-entity-place` sin tocar datos ni superficies públicas.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const must = (condition, message) => {
  if (!condition) errors.push(message);
};

const BLUEPRINT = "docs/blueprint/19.43-G8-Q2D-A-PREMIUM-ENTITY-PLACE-TEMPLATE-v1.0.md";
const PCA = "docs/governance/product-authorizations/PCA-2026-047.json";
const EVIDENCE = "docs/evidence/omxds-q2d-a/EVIDENCE-MANIFEST.md";
const CONFIG = "src/components/place-premium/place-premium-config.ts";
const REGISTRY = "src/lib/experience-builder/premium-template-registry.ts";
const KINDS = "src/lib/experience-builder/page-kind-registry.ts";

for (const file of [BLUEPRINT, PCA, EVIDENCE, CONFIG, REGISTRY, KINDS]) {
  must(fs.existsSync(path.join(root, file)), `Falta el artefacto de cierre: ${file}`);
}

if (errors.length === 0) {
  const pca = JSON.parse(read(PCA));
  must(pca.id === "PCA-2026-047", "El instrumento no es PCA-2026-047");
  must(pca.status === "Approved", "PCA-2026-047 no está aprobada");
  must(pca.public_routes.length === 0, "Q2D-A no puede declarar rutas públicas");
  must(
    /Prohibido expresamente[\s\S]*redirects 301/.test(pca.founder_authority),
    "El instrumento no prohíbe expresamente los redirects",
  );

  const config = read(CONFIG);
  for (const slug of [
    "zona-arqueologica",
    "cenote",
    "area-natural",
    "museo",
    "templo-convento",
    "mercado-artesanal",
  ]) {
    must(config.includes(slug), `Falta la variante cerrada ${slug}`);
  }
  must(
    config.includes("El modo cinematográfico requiere una portada aprobada"),
    "Falta el aviso oficial del constructor",
  );

  const kinds = read(KINDS);
  must(kinds.includes('kind: "place"'), "Falta pageKind=place en el registro");

  const registry = read(REGISTRY);
  must(registry.includes("PLACE_PREMIUM_VARIANTS"), "Los presets de lugar no están registrados");

  const evidence = read(EVIDENCE);
  must(evidence.includes("PCA-2026-047"), "El manifiesto no referencia el instrumento");
}

if (errors.length > 0) {
  console.error("G8-Q2D-A · evidencia NO conforme:");
  for (const e of errors) console.error(` - ${e}`);
  process.exit(1);
}

console.log("G8-Q2D-A · evidencia estática conforme.");
