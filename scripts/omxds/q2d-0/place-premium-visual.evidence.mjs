/**
 * G8-Q2D-0 · Evidencia estática de la autoridad visual de Lugar/Atractivo.
 *
 * Acredita, sin tocar la base compartida, que el paquete documental y la
 * propuesta visual existen, son coherentes y no autorizan publicación,
 * plantillas productivas, rutas públicas ni cambios de datos.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const must = (condition, message) => {
  if (!condition) errors.push(message);
};

const BLUEPRINT = "docs/blueprint/19.42-G8-Q2D-0-PLACE-PREMIUM-VISUAL-AUTHORITY-v1.0.md";
const PCA = "docs/governance/product-authorizations/PCA-2026-046.json";
const EVIDENCE = "docs/evidence/omxds-q2d-0/EVIDENCE-MANIFEST.md";
const ROUTE = "src/routes/lovable/g8-place-premium-visual-approval.tsx";
const SURFACE = "src/components/place-premium/PlacePremiumSurface.tsx";
const CONTENT = "src/components/place-premium/place-premium-content.ts";

for (const file of [BLUEPRINT, PCA, EVIDENCE, ROUTE, SURFACE, CONTENT]) {
  must(fs.existsSync(path.join(root, file)), `Falta el artefacto de Q2D-0: ${file}`);
}

if (errors.length === 0) {
  const pca = JSON.parse(read(PCA));
  must(pca.id === "PCA-2026-046", "El instrumento no es PCA-2026-046");
  must(pca.status === "Approved", "PCA-2026-046 no está aprobada");
  must(pca.public_routes.length === 0, "Q2D-0 no puede declarar rutas públicas");
  must(
    /Prohibido expresamente[\s\S]*pageKind=place/.test(pca.founder_authority),
    "El instrumento no prohíbe crear pageKind=place",
  );
  must(
    /redirects 301/.test(pca.founder_authority),
    "El instrumento no prohíbe expresamente los redirects",
  );

  const route = read(ROUTE);
  must(/noindex,nofollow,noarchive/.test(route), "La vista interna no es noindex");
  for (const token of ["useQuery", "useServerFn", "supabase", "createServerFn"]) {
    must(!route.includes(token), `La vista interna no puede leer datos reales (${token})`);
  }

  const surface = read(SURFACE);
  must(surface.includes("ExperienceMapBlock"), "El mapa debe ser el bloque oficial");
  must(surface.includes("data-place-presentation"), "Falta la marca de dirección visual en el DOM");
  must(
    surface.includes("GalleryFilmstrip") && surface.includes("GalleryMosaic"),
    "Las dos direcciones deben cambiar la composición de la galería",
  );
  must(surface.includes("content.events.length ?"), "Los módulos vacíos deben ocultarse");

  const content = read(CONTENT);
  must(content.includes("DEMO VISUAL"), "El fixture debe marcarse como DEMO VISUAL");
  must(
    content.includes("/api/public/studio-media/governed/v1p1c"),
    "Sólo se admiten medios gobernados por la ruta pública estable",
  );
  must(!content.includes("supabase"), "El fixture no puede tocar la base de datos");

  const evidence = read(EVIDENCE);
  for (const token of ["Editorial", "Cinematográfica", "390", "768", "1440"]) {
    must(evidence.includes(token), `El manifiesto de evidencia no declara: ${token}`);
  }
}

if (errors.length) {
  console.error("✖ G8-Q2D-0 · evidencia incompleta:\n  - " + errors.join("\n  - "));
  process.exit(1);
}

console.log(
  "✔ G8-Q2D-0 · evidencia estática coherente (sin datos, sin publicación, sin rutas públicas).",
);
