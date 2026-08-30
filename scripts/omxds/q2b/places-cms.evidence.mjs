/**
 * G8-Q2B · Evidencia estática de cierre.
 *
 * Acredita, sin tocar la base compartida, que el paquete documental y de
 * evidencia exigido por el Blueprint 19.40 existe y es coherente.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const must = (condition, message) => {
  if (!condition) errors.push(message);
};

const BLUEPRINT = "docs/blueprint/19.40-G8-Q2B-PLACES-CMS-v1.0.md";
const PCA = "docs/governance/product-authorizations/PCA-2026-044.json";
const EVIDENCE = "docs/evidence/omxds-q2b/EVIDENCE-MANIFEST.md";
const WIDTHS = [390, 430, 768, 1024, 1280, 1440];

for (const file of [BLUEPRINT, PCA, EVIDENCE]) {
  must(fs.existsSync(path.join(root, file)), `Falta el artefacto de cierre: ${file}`);
}

if (errors.length === 0) {
  const pca = JSON.parse(read(PCA));
  must(pca.status === "Approved", "PCA-2026-044 no está aprobada");
  must(pca.blueprint === BLUEPRINT, "PCA-2026-044 no apunta al Blueprint 19.40");
  must(
    pca.branch === "feature/omxds-g8-q2b-places-cms-v1",
    "PCA-2026-044 no declara la rama estable de Q2B",
  );
  must(pca.public_routes.length === 0, "Q2B no puede declarar rutas públicas");
  must(
    pca.required_feature_flags.includes("omxds_visual_v1_contracts_enabled=false"),
    "El flag visual debe permanecer apagado",
  );

  const index = read("docs/governance/06-BLUEPRINT-MASTER-INDEX.md");
  must(index.includes("19.40-G8-Q2B-PLACES-CMS-v1.0.md"), "19.40 no está admitido en el índice 06");

  const evidence = read(EVIDENCE);
  for (const width of WIDTHS)
    must(evidence.includes(`${width}`), `La evidencia no reporta el ancho ${width} px`);
  must(evidence.includes("overflow"), "La evidencia no reporta overflow horizontal");
  must(evidence.includes("44"), "La evidencia no reporta áreas táctiles de 44 px");

  const functions = read("src/lib/places/places-cms.functions.ts");
  must(functions.includes('from("content_audit_log")'), "Falta la auditoría en las escrituras");

  const pkg = JSON.parse(read("package.json"));
  must(typeof pkg.scripts["validate:q2b"] === "string", "validate:q2b no está registrado");
}

if (errors.length > 0) {
  console.error(JSON.stringify({ result: "FAIL", errors }, null, 2));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      result: "PASS",
      blueprint: BLUEPRINT,
      authorization: "PCA-2026-044",
      evidence: EVIDENCE,
      widths: WIDTHS,
      public_routes: 0,
      feature_flag: "omxds_visual_v1_contracts_enabled=false",
    },
    null,
    2,
  ),
);
