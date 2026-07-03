/**
 * Sub-ola 2.5d · vmx.kit.* smoke.
 *
 * Verifica que:
 *  1. Cada contrato `vmx.kit.*` esté registrado en el Block Registry.
 *  2. Cada renderer produzca HTML no vacío a partir de un `config`
 *     mínimo (sin depender de ningún SurfaceContext).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { getBlock } from "../src/lib/experience-builder/block-registry";
import {
  KIT_BLOCK_CONTRACTS,
  KIT_BLOCK_RENDERERS,
} from "../src/lib/experience-builder/kit-blocks";
import "../src/lib/experience-builder/block-library"; // auto-bootstrap
import type { CompositionNode } from "../src/lib/experience-builder/composition-tree";

const FIXTURES: Record<string, Record<string, unknown>> = {
  "vmx.kit.hero": { title: "Hola", subtitle: "Neutro", eyebrow: "Kit" },
  "vmx.kit.rich-text": { heading: "H", body: "Cuerpo" },
  "vmx.kit.gallery": {
    cover_url: "https://x/c.jpg",
    cover_alt: "c",
    items: [{ url: "https://x/1.jpg", alt: "1" }],
  },
  "vmx.kit.info-table": {
    rows: [{ label: "A", value: "1" }, { label: "B", value: "2" }],
  },
  "vmx.kit.badges": { items: [{ label: "OK", tone: "success" }] },
  "vmx.kit.contact": { contact_type: "email", value: "hola@x" },
  "vmx.kit.location": { address_line1: "Calle 40 #1" },
  "vmx.kit.reviews": {
    items: [{ author: "Ana", rating: 5, body: "Excelente" }],
  },
  "vmx.kit.faq": { items: [{ question: "¿?", answer: "Sí." }] },
  "vmx.kit.promos": {
    items: [{ title: "Verano", description: "20%", discount_percent: 20 }],
  },
  "vmx.kit.card-grid": {
    columns: "2",
    items: [{ title: "C1", tagline: "T1" }, { title: "C2" }],
  },
};

let ok = 0;
let fail = 0;
for (const contract of KIT_BLOCK_CONTRACTS) {
  const registered = getBlock(contract.type);
  if (!registered) {
    console.log(`FAIL  ${contract.type} · not registered`);
    fail++;
    continue;
  }
  const render = KIT_BLOCK_RENDERERS[contract.type];
  if (!render) {
    console.log(`FAIL  ${contract.type} · missing renderer`);
    fail++;
    continue;
  }
  const node: CompositionNode = {
    id: "n1",
    type: contract.type,
    config: FIXTURES[contract.type] ?? {},
    children: [],
  } as CompositionNode;
  const html = renderToStaticMarkup(<>{render(node)}</>);
  if (!html || html.length === 0) {
    console.log(`FAIL  ${contract.type} · empty markup`);
    fail++;
    continue;
  }
  console.log(`OK    ${contract.type}`);
  ok++;
}
console.log(`\n${ok}/${KIT_BLOCK_CONTRACTS.length} bloques OK, ${fail} fallos.`);
process.exit(fail === 0 ? 0 : 1);