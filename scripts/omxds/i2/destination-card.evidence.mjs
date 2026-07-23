import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";

const migration = readFileSync(
  "supabase/migrations/20260723093000_omxds_visual_v1_contracts_flag.sql",
  "utf8",
);
assert.match(migration, /omxds_visual_v1_contracts_enabled/);
assert.match(migration, /to_jsonb\(false\)/);
assert.match(migration, /ON CONFLICT \(key\) DO NOTHING/);

const card = readFileSync("src/components/cards/DestinoCard.tsx", "utf8");
assert.match(card, /Descubrir destino/);
assert.doesNotMatch(card, /Zazil Tunich/);

for (const state of ["loading", "empty", "partial_error", "total_error", "offline", "no_media"]) {
  const source = readFileSync("src/lib/omxds/cards/card-states.ts", "utf8");
  assert.match(source, new RegExp(`"${state}"`));
}

console.log("I2-A contract evidence: PASS (fixtures fictitious; flag OFF).");
