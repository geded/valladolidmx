/**
 * G8-Q2C-A · Evidencia estática de cierre.
 *
 * Acredita, sin tocar la base compartida, que el paquete documental de la
 * reclasificación territorial existe, es coherente y no autoriza publicación,
 * redirects, migraciones ni rutas públicas.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const must = (condition, message) => {
  if (!condition) errors.push(message);
};

const BLUEPRINT = "docs/blueprint/19.41-G8-Q2C-A-SAFE-TERRITORIAL-RECLASSIFICATION-v1.0.md";
const PCA = "docs/governance/product-authorizations/PCA-2026-045.json";
const EVIDENCE = "docs/evidence/omxds-q2c-a/EVIDENCE-MANIFEST.md";

for (const file of [BLUEPRINT, PCA, EVIDENCE]) {
  must(fs.existsSync(path.join(root, file)), `Falta el artefacto de cierre: ${file}`);
}

if (errors.length === 0) {
  const pca = JSON.parse(read(PCA));
  must(pca.id === "PCA-2026-045", "El instrumento no es PCA-2026-045");
  must(pca.status === "Approved", "PCA-2026-045 no está aprobada");
  must(pca.public_routes.length === 0, "Q2C-A no puede declarar rutas públicas");
  must(
    /Prohibido expresamente[\s\S]*migraciones/.test(pca.founder_authority),
    "El instrumento no prohíbe migraciones",
  );
  must(
    /redirects 301/.test(pca.founder_authority),
    "El instrumento no prohíbe expresamente los redirects",
  );

  const evidence = read(EVIDENCE);
  for (const token of [
    "tinum",
    "temozon",
    "chichen-itza",
    "ek-balam",
    "zona-arqueologica",
    "draft",
    "idempotencia",
    "rollback",
    "cero redirects",
    "omxds_visual_v1_contracts_enabled=false",
  ]) {
    must(evidence.includes(token), `La evidencia no reporta: ${token}`);
  }

  const pkg = JSON.parse(read("package.json"));
  must(typeof pkg.scripts["validate:q2c:a"] === "string", "validate:q2c:a no está registrado");
}

if (errors.length > 0) {
  console.error(JSON.stringify({ result: "FAIL", errors }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ result: "PASS", gate: "validate:q2c:a" }, null, 2));
