import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";

const flag = readFileSync("src/lib/omxds/card-contracts-flag.server.ts", "utf8");
assert.match(flag, /omxds_visual_v1_contracts_enabled/);
assert.match(flag, /return false/);

const migration = readFileSync(
  "supabase/migrations/20260723093000_omxds_visual_v1_contracts_flag.sql",
  "utf8",
);
assert.match(migration, /to_jsonb\(false\)/);

const adapter = readFileSync("src/lib/omxds/cards/business-card.adapter.ts", "utf8");
assert.doesNotMatch(adapter, /fetch\(|supabase|email|phone|address/i);
assert.match(adapter, /rating: null/);
assert.match(adapter, /commercialState: null/);

const card = readFileSync("src/components/cards/EmpresaCard.tsx", "utf8");
assert.match(card, /export function EmpresaCard\(\{ business \}/);
assert.match(card, /toBusinessCardContract/);
assert.doesNotMatch(card, /Zazil Tunich/);

console.log("I2-B contract evidence: PASS (fixtures fictitious; flag OFF and fail-closed).");
