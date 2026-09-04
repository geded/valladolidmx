/** Lote 3B·A — emite la config materializada de la Home para la revisión CMS. */
import { materializeHomePremiumConfig } from "../../../src/lib/experience-builder/home-materialization";
const CURRENT = {
  variant: "premium-g4-approved",
  hero_slides: [{ media_url: "" }, { media_url: "" }],
  rutas_items: [{ media_url: "" }, { media_url: "" }, { media_url: "" }],
  destinos_items: [{ media_url: "" }, { media_url: "" }, { media_url: "" }, { media_url: "" }],
  servicios_food: [{ media_url: "" }, { media_url: "" }],
  que_hacer_items: [{ media_url: "" }, { media_url: "" }, { media_url: "" }],
  servicios_stays: [{ media_url: "" }, { media_url: "" }],
  eventos_media_url: "",
  experiencias_items: [{ media_url: "" }, { media_url: "" }, { media_url: "" }, { media_url: "" }],
};
const json = JSON.stringify(materializeHomePremiumConfig(CURRENT));
await Bun.write("/tmp/l3ba/config.json", json);
console.log("bytes", json.length);
