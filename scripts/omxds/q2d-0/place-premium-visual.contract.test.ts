/**
 * G8-Q2D-0 · Contrato de la autoridad visual de Lugar/Atractivo.
 *
 * Verifica el instrumento de gobernanza, la naturaleza render-only de la
 * propuesta, la ausencia total de superficie pública/plantilla productiva y
 * la existencia de dos direcciones visuales reales.
 */
import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

const BLUEPRINT = "docs/blueprint/19.42-G8-Q2D-0-PLACE-PREMIUM-VISUAL-AUTHORITY-v1.0.md";
const PCA = "docs/governance/product-authorizations/PCA-2026-046.json";
const EVIDENCE = "docs/evidence/omxds-q2d-0/EVIDENCE-MANIFEST.md";
const ROUTE = "src/routes/lovable/g8-place-premium-visual-approval.tsx";
const SURFACE = "src/components/place-premium/PlacePremiumSurface.tsx";
const CONTENT = "src/components/place-premium/place-premium-content.ts";
const INVENTORY = "src/lib/experience-builder/route-inventory.ts";

describe("G8-Q2D-0 · gobernanza", () => {
  test("el instrumento existe, está aprobado y no declara rutas públicas", () => {
    const pca = JSON.parse(read(PCA));
    expect(pca.id).toBe("PCA-2026-046");
    expect(pca.status).toBe("Approved");
    expect(pca.blueprint).toBe(BLUEPRINT);
    expect(pca.branch).toBe("feature/omxds-g8-q2d-place-visual-authority-v1");
    expect(pca.public_routes).toEqual([]);
    expect(pca.required_tests).toContain("bun run validate:q2d:0");
  });

  test("el blueprint declara autoridad visual nueva y prohibiciones vigentes", () => {
    const bp = read(BLUEPRINT);
    for (const token of [
      "chichen-itza",
      "zona-arqueologica",
      "Tinum",
      "pageKind=place",
      "premium-entity-place",
    ]) {
      expect(bp).toContain(token);
    }
    expect(bp).toContain("STOP CONDITION");
  });

  test("el manifiesto de evidencia existe", () => {
    expect(fs.existsSync(path.join(root, EVIDENCE))).toBe(true);
  });
});

describe("G8-Q2D-0 · vista interna", () => {
  const route = read(ROUTE);

  test("es noindex y usa la ruta interna autorizada", () => {
    expect(route).toContain("/lovable/g8-place-premium-visual-approval");
    expect(route).toContain("noindex,nofollow,noarchive");
  });

  test("no lee ni escribe contenido real", () => {
    for (const token of ["useQuery", "useServerFn", "supabase", "createServerFn", "loader:"]) {
      expect(route.includes(token)).toBe(false);
    }
  });

  test("está declarada en el Route Inventory", () => {
    expect(read(INVENTORY)).toContain(ROUTE);
  });
});

describe("G8-Q2D-0 · propuesta visual", () => {
  const surface = read(SURFACE);
  const content = read(CONTENT);

  test("reutiliza el sistema premium aprobado y el mapa oficial", () => {
    expect(surface).toContain("@/components/premium");
    expect(surface).toContain("ExperienceMapBlock");
    expect(surface).toContain("PremiumTerritorialBreadcrumb");
  });

  test("ofrece dos direcciones reales que cambian el DOM", () => {
    expect(surface).toContain("data-place-presentation");
    expect(surface).toContain("cinematic");
    expect(surface).toContain("HeroEditorial");
    expect(surface).toContain("PremiumHero");
    expect(surface).toContain("GalleryFilmstrip");
    expect(surface).toContain("GalleryMosaic");
  });

  test("oculta los módulos sin contenido", () => {
    expect(surface).toContain("content.events.length ?");
    expect(content).toContain("events: []");
  });

  test("los medios son gobernados y están marcados como demo con crédito", () => {
    expect(content).toContain("/api/public/studio-media/governed/v1p1c");
    expect(content).toContain("DEMO VISUAL");
    expect(content).toContain("credit");
    expect(content.includes("supabase")).toBe(false);
  });

  test("el breadcrumb territorial es el canónico del caso", () => {
    for (const token of ["Inicio", "Oriente Maya", "Tinum", "Chichén Itzá"]) {
      expect(content).toContain(token);
    }
  });

  test("no registra plantilla productiva ni page kind alguno", () => {
    for (const file of [surface, content, read(ROUTE)]) {
      expect(/pageKind\s*[:=]\s*["']/.test(file)).toBe(false);
      expect(file.includes("registerBlock")).toBe(false);
      expect(file.includes("entity-premium-templates")).toBe(false);
      expect(file.includes("page-kind-registry")).toBe(false);
    }
  });
});
