import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const server = readFileSync("src/lib/experience-builder/studio-media.functions.ts", "utf8");
const route = readFileSync(
  "src/routes/_authenticated/cms/eventos.$eventId.portada-preview.tsx",
  "utf8",
);
const publicEvent = readFileSync("src/routes/eventos.$slug.tsx", "utf8");

describe("preview seguro de portadas temporales de eventos", () => {
  it("exige sesión editorial y no escribe asociaciones públicas", () => {
    expect(server).toContain("resolveSafeEventCoverPreview");
    expect(server).toContain("requireSupabaseAuth");
    expect(server).toContain("assertEditorial(context)");
  });
  it("acepta únicamente activos IA temporales y exclusivos de preview", () => {
    expect(server).toContain('rights.nature === "ai_generated"');
    expect(server).toContain("rights.ai_generated === true");
    expect(server).toContain("lifecycle.temporary === true");
    expect(server).toContain("lifecycle.production_eligible === false");
    expect(server).toContain('lifecycle.usage === "preview_only"');
  });
  it("vive bajo CMS autenticado y permanece noindex", () => {
    expect(route).toContain("/_authenticated/cms/eventos/$eventId/portada-preview");
    expect(route).toContain("noindex,nofollow,noarchive");
    expect(route).toContain("no asociada · no publicada");
  });
  it("no modifica la ruta pública canónica de eventos", () => {
    expect(publicEvent).not.toContain("resolveSafeEventCoverPreview");
    expect(publicEvent).not.toContain("mediaId");
  });
});
