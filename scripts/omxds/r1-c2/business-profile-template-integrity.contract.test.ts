/**
 * Preservation Gate · Las rutas territoriales de empresa conservan una sola
 * autoridad visual. Las composiciones editoriales pueden aportar textos del
 * bloque Premium, pero nunca sustituir `BusinessSurface`.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const routePath = resolve(
  process.cwd(),
  "src/routes/oriente-maya/$destino.$categoria.$empresa.index.tsx",
);
const routeSource = readFileSync(routePath, "utf8");

describe("Ficha territorial de empresa · autoridad Premium única", () => {
  it("usa BusinessSurface como respaldo para todas las familias", () => {
    expect(routeSource).toContain('legacy={<BusinessSurface copy={businessCopy} />}');
  });

  it("no permite que CompositionRenderer sustituya el perfil empresarial", () => {
    expect(routeSource).not.toContain("CompositionRenderer");
    expect(routeSource).not.toMatch(/legacy=\{[\s\S]*composition\.snapshot/);
  });

  it("conserva la composición únicamente como fuente de textos compatibles", () => {
    expect(routeSource).toContain("resolveBusinessPremiumCopyFromTree(");
    expect(routeSource).toContain("BUSINESS_PREMIUM_BLOCK_TYPE");
  });
});