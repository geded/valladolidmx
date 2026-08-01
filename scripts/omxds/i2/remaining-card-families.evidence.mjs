import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";

const flag = readFileSync("src/lib/omxds/card-contracts-flag.server.ts", "utf8");
assert.match(flag, /omxds_visual_v1_contracts_enabled/);
assert.match(flag, /return false/);
const family = readFileSync("src/lib/omxds/cards/card-contract.ts", "utf8");
for (const name of [
  "destination",
  "business",
  "experience",
  "hotel",
  "restaurant",
  "event",
  "product",
])
  assert.match(family, new RegExp(`"${name}"`));
for (const name of ["experience", "hotel", "restaurant", "event", "product"]) {
  const adapter = readFileSync(`src/lib/omxds/cards/${name}-card.adapter.ts`, "utf8");
  assert.doesNotMatch(adapter, /fetch\(|supabase|email|phone|address/i);
}
const restaurant = readFileSync("src/lib/omxds/cards/restaurant-card.adapter.ts", "utf8");
assert.doesNotMatch(restaurant, /open_now|openNow/);
const event = readFileSync("src/lib/omxds/cards/event-card.contract.ts", "utf8");
assert.match(event, /explicit timezone/);
console.log("I2-C evidence: PASS (five fictitious contract families; flag OFF and fail-closed). ");
