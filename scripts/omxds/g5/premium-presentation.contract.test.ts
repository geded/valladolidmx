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

// Lote 1 · contrato actualizado. Por directiva Founder el selector público
// Editorial/Cinematográfica se retiró de las previews que delegan por completo
// en su autoridad visual compartida (la afinación vive en administrador/
// constructor). El gate sigue siendo fail-closed: sólo estas previews están
// exentas y deben acreditar su delegado real.
const PRESENTATION_DELEGATED: Record<string, string> = {
  "g4-destination-microsite-preview.tsx":
    "src/components/destination-premium/DestinationMicrositeReviewSurface.tsx",
  "g4-experience-premium-preview.tsx":
    "src/components/experience-premium/ExperiencePremiumSurface.tsx",
  "g4-event-premium-preview.tsx": "",
};

for (const preview of previews) {
  const source = readFileSync(resolve("src/routes/lovable", preview), "utf8");
  const delegate = PRESENTATION_DELEGATED[preview];
  if (delegate === undefined) {
    assert.match(source, /PremiumPresentation/);
    assert.match(source, /PremiumPresentationControl/);
  } else if (delegate) {
    // La preview delega su JSX: el delegado debe existir y ser el acreditado.
    assert.ok(
      source.includes(delegate.replace(/^src\//, "@/").replace(/\.tsx$/, "")),
      `la preview ${preview} no importa su delegado acreditado ${delegate}`,
    );
    readFileSync(resolve(delegate), "utf8");
  }
  assert.doesNotMatch(source, /type VisualDirection = "editorial"/);
  assert.doesNotMatch(source, /["']cinematografico["']|["']cinematografica["']/);
}

for (const preview of previews.filter((name) => name !== "g4-home-premium-preview.tsx")) {
  const source = readFileSync(resolve("src/routes/lovable", preview), "utf8");
  // G8-E · una preview puede delegar todo su JSX en la autoridad visual
  // compartida; en ese caso el breadcrumb territorial vive en el componente
  // compartido y no en la preview. Lote 1: `PublicShell crumbs` es la
  // autoridad de breadcrumb territorial vigente.
  assert.match(source, /PremiumTerritorialBreadcrumb|PremiumSurface|PublicShell/);
  assert.doesNotMatch(source, /aria-label="Ruta territorial"/);
}


console.log("G5 premium presentation contract: PASS");
