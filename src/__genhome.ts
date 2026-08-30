import { homePremiumG4DefaultConfig, HOME_PREMIUM_G4_CONTRACT_VERSION } from "/dev-server/src/components/home-premium/home-premium-config";
const cfg: any = homePremiumG4DefaultConfig();
// G8-R1-F1L · neutraliza todo medio no acreditado G8-M1 (fixtures demo).
const neutralize = (v: any): any => {
  if (Array.isArray(v)) return v.map(neutralize);
  if (v && typeof v === "object") {
    const out: any = {};
    for (const [k, val] of Object.entries(v)) out[k] = k.endsWith("media_url") ? "" : neutralize(val);
    return out;
  }
  return v;
};
const clean = neutralize(cfg);
if ("eventos_media_url" in clean) clean.eventos_media_url = "";
console.log(JSON.stringify({ version: HOME_PREMIUM_G4_CONTRACT_VERSION, config: clean }));
