import { getBlock, listAuthorableBlocks } from "@/lib/experience-builder/block-registry";
import "@/lib/experience-builder/block-library";
import { canListEditorialBlock } from "@/lib/experience-builder/editorial-builder-policy";
import { resolveHomePremiumG4, homePremiumG4DefaultConfig } from "@/components/home-premium/home-premium-config";

const b = getBlock("vmx.home.premium-g4");
console.log("registered:", !!b, b?.version, b?.editorial?.mode, Object.keys(b?.schema ?? {}).length, "campos");
console.log("home/founder_admin:", canListEditorialBlock("vmx.home.premium-g4","home","founder_admin"));
console.log("home/territorial_editor:", canListEditorialBlock("vmx.home.premium-g4","home","territorial_editor"));
console.log("home/business_author:", canListEditorialBlock("vmx.home.premium-g4","home","business_author"));
console.log("landing/founder_admin:", canListEditorialBlock("vmx.home.premium-g4","landing","founder_admin"));
console.log("en biblioteca home:", listAuthorableBlocks("home","founder_admin").some(x=>x.type==="vmx.home.premium-g4"));
const empty = resolveHomePremiumG4({});
const custom = resolveHomePremiumG4({ ...homePremiumG4DefaultConfig(), hero_title: "X", show_eventos: false, rutas_max_items: 2 });
console.log("fail-closed hero:", empty.content.hero.title.slice(0,30), "| secciones:", empty.order.length);
console.log("editable:", custom.content.hero.title, "| rutas:", custom.content.rutas.items.length, "| eventos visible:", custom.sections.eventos);
