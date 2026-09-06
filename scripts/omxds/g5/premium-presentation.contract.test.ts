import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  canManagePremiumPresentation,
  isPremiumPresentation,
  resolvePremiumPresentation,
} from "../../../src/lib/omxds/presentation/presentation";

assert.equal(isPremiumPresentation("editorial"), true);
assert.equal(isPremiumPresentation("cinematic"), true);
assert.equal(isPremiumPresentation("cinematografica"), false);
assert.equal(isPremiumPresentation("premium-v2"), false);

assert.equal(resolvePremiumPresentation("cinematic"), "cinematic");
assert.equal(resolvePremiumPresentation(null), "editorial");
assert.equal(resolvePremiumPresentation("unknown"), "editorial");

assert.equal(canManagePremiumPresentation(["admin"]), true);
assert.equal(canManagePremiumPresentation(["owner"]), true);
assert.equal(canManagePremiumPresentation(["editor"]), true);
assert.equal(canManagePremiumPresentation(["traveler"]), false);
assert.equal(canManagePremiumPresentation([]), false);

const previews = [
  "g4-home-premium-preview.tsx",
  "g4-destination-microsite-preview.tsx",
  "g4-hotel-premium-preview.tsx",
  "g4-restaurant-premium-preview.tsx",
  "g4-experience-premium-preview.tsx",
  "g4-event-premium-preview.tsx",
];

// Lote 1 · contrato reforzado. Por directiva Founder el selector público
// Editorial/Cinematográfica se retiró de las previews que delegan por completo
// en su autoridad visual compartida (la afinación vive en administrador/
// constructor). El gate es fail-closed: una preview sólo queda exenta del
// control si acredita un delegado REAL y verificable, y ese delegado se
// inspecciona con las mismas obligaciones aplicables.
const PRESENTATION_DELEGATED: Record<string, string> = {
  "g4-destination-microsite-preview.tsx":
    "src/components/destination-premium/DestinationMicrositeReviewSurface.tsx",
  "g4-experience-premium-preview.tsx":
    "src/components/experience-premium/ExperiencePremiumSurface.tsx",
  "g4-event-premium-preview.tsx": "src/components/surfaces/EventPremiumSurface.tsx",
};

/**
 * Regla de marca uniforme (sin excepciones por archivo): "Oriente Maya" sólo
 * puede aparecer como etiqueta de miga territorial hacia `/oriente-maya`.
 * En cualquier otro copy visible debe usarse la marca larga.
 */
function stripTerritorialCrumbLabels(source: string): string {
  return source
    .replace(/label:\s*"Oriente Maya"/g, "")
    .replace(/href="\/oriente-maya"[\s\S]{0,120}?Oriente Maya/g, "");
}

function assertBrandCopy(source: string, where: string) {
  assert.doesNotMatch(
    stripTerritorialCrumbLabels(source),
    /Oriente Maya(?! de\s+Yucatán)/,
    `${where} usa la marca corta fuera de una miga territorial`,
  );
}

for (const preview of previews) {
  const source = readFileSync(resolve("src/routes/lovable", preview), "utf8");
  const delegate = PRESENTATION_DELEGATED[preview];
  if (delegate === undefined) {
    assert.match(source, /PremiumPresentation/);
    assert.match(source, /PremiumPresentationControl/);
  } else {
    // La preview delega su JSX: el delegado debe existir, ser el acreditado y
    // contener realmente la autoridad visual compartida (shell + breadcrumb).
    assert.ok(
      delegate.trim().length > 0,
      `la preview ${preview} no puede quedar exenta sin delegado acreditado`,
    );
    assert.ok(
      source.includes(delegate.replace(/^src\//, "@/").replace(/\.tsx$/, "")),
      `la preview ${preview} no importa su delegado acreditado ${delegate}`,
    );
    const delegateSource = readFileSync(resolve(delegate), "utf8");
    assert.match(
      delegateSource,
      /PublicShell|PremiumSurface|PremiumTerritorialBreadcrumb|BreadcrumbTerritorial|<nav/,
      `el delegado ${delegate} no compone la autoridad visual compartida`,
    );
    assert.doesNotMatch(delegateSource, /PremiumPresentationControl/);
    assertBrandCopy(delegateSource, delegate);
  }
  assert.doesNotMatch(source, /type VisualDirection = "editorial"/);
  assert.doesNotMatch(source, /["']cinematografico["']|["']cinematografica["']/);
  assertBrandCopy(source, preview);
}

for (const preview of previews.filter((name) => name !== "g4-home-premium-preview.tsx")) {
  const source = readFileSync(resolve("src/routes/lovable", preview), "utf8");
  const delegate = PRESENTATION_DELEGATED[preview];
  // G8-E · el breadcrumb territorial puede vivir en la preview o en su
  // delegado acreditado, pero debe existir en alguno de los dos.
  const chrome = delegate ? `${source}\n${readFileSync(resolve(delegate), "utf8")}` : source;
  assert.match(
    chrome,
    /PremiumTerritorialBreadcrumb|PremiumSurface|PublicShell|aria-label="Ubicación territorial"/,
    `${preview} no acredita breadcrumb territorial ni en la preview ni en su delegado`,
  );
  assert.doesNotMatch(source, /aria-label="Ruta territorial"/);
}

console.log("G5 premium presentation contract: PASS");
