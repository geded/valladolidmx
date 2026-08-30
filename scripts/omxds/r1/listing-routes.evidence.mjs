#!/usr/bin/env node
/**
 * G8-R1 · R1-B — evidencia estática de la vía canónica única (H-R1-01).
 *
 * Verifica que las 6 rutas públicas de listado consuman exclusivamente
 * `getPublicListing` (contrato R1-A) y rendericen con la superficie
 * premium única, sin fixtures ni lecturas paralelas.
 */
import { readFileSync } from "node:fs";

const ROUTES = [
  ["src/routes/hoteles.tsx", "hoteles"],
  ["src/routes/restaurantes.tsx", "restaurantes"],
  ["src/routes/experiencias.tsx", "experiencias"],
  ["src/routes/casas-de-vacaciones.tsx", "casas-de-vacaciones"],
  ["src/routes/eventos.index.tsx", "eventos"],
  ["src/routes/que-hacer.tsx", "que-hacer"],
];

const FORBIDDEN = ["listing-premium-content", "listMarketplaceBusinesses", "businessToTourismCard"];

let failed = false;
const ok = (m) => console.log(`✔ ${m}`);
const bad = (m) => {
  failed = true;
  console.error(`✘ ${m}`);
};

for (const [file, family] of ROUTES) {
  let src;
  try {
    src = readFileSync(file, "utf8");
  } catch {
    bad(`${file} no existe`);
    continue;
  }
  if (!src.includes("getPublicListing")) bad(`${file} no consume getPublicListing`);
  else if (!src.includes(`family: "${family}"`)) bad(`${file} no declara family "${family}"`);
  else if (!src.includes("ListingPremiumSurfaceFromDTO"))
    bad(`${file} no renderiza la superficie premium única`);
  else {
    const hit = FORBIDDEN.find((t) => src.includes(t));
    if (hit) bad(`${file} conserva la vía paralela "${hit}"`);
    else ok(`${file} · vía canónica única (${family})`);
  }
}

const surface = readFileSync("src/components/listing-premium/ListingPremiumSurface.tsx", "utf8");
if (!surface.includes("PublicListingDTO")) bad("La superficie premium no consume el DTO público");
else ok("ListingPremiumSurface consume PublicListingDTO");

console.log(
  failed
    ? "✘ G8-R1 · R1-B · evidencia incompleta."
    : "✔ G8-R1 · R1-B · evidencia estática completa.",
);
process.exit(failed ? 1 : 0);
