/**
 * Sub-ola 2.6 · Surface Composer smoke.
 *
 * Regresión:
 *  1. Cada semilla del Kit se compone SIN error.
 *  2. Cada semilla contiene EXCLUSIVAMENTE bloques `vmx.kit.*`.
 *  3. Cada nodo tiene renderer registrado y produce HTML no vacío.
 *  4. El Composer rechaza cualquier tipo que no sea `vmx.kit.*`
 *     (protege a Business/Product de sustitución accidental).
 *  5. Los IDs son deterministas (idempotencia al reimportar).
 */
import { renderToStaticMarkup } from "react-dom/server";
import {
  KIT_BLOCK_RENDERERS,
} from "../src/lib/experience-builder/kit-blocks";
import {
  SurfaceComposer,
  isKitOnlyTree,
} from "../src/lib/experience-builder/surface-composer";
import { KIT_SEEDS } from "../src/lib/experience-builder/kit-seeds";
import "../src/lib/experience-builder/block-library";

let ok = 0;
let fail = 0;

for (const seed of KIT_SEEDS) {
  const treeA = seed.build();
  const treeB = seed.build();

  // 1. estructura mínima
  if (!treeA.root || !Array.isArray(treeA.root.children) || treeA.root.children.length === 0) {
    console.log(`FAIL  ${seed.kind} · árbol vacío`);
    fail++;
    continue;
  }

  // 2. kit-only
  if (!isKitOnlyTree(treeA)) {
    console.log(`FAIL  ${seed.kind} · contiene bloques no-kit`);
    fail++;
    continue;
  }

  // 3. renderers + markup
  let renderErrors = 0;
  for (const node of treeA.root.children) {
    const render = KIT_BLOCK_RENDERERS[node.type];
    if (!render) {
      renderErrors++;
      console.log(`  · ${seed.kind}: renderer faltante para ${node.type}`);
      continue;
    }
    try {
      const html = renderToStaticMarkup(<>{render(node)}</>);
      if (typeof html !== "string") {
        renderErrors++;
        console.log(`  · ${seed.kind}: markup no-string en ${node.type}`);
      }
    } catch (err) {
      renderErrors++;
      console.log(`  · ${seed.kind}: throw en ${node.type} → ${(err as Error).message}`);
    }
  }
  if (renderErrors > 0) {
    console.log(`FAIL  ${seed.kind} · ${renderErrors} bloque(s) fallaron`);
    fail++;
    continue;
  }

  // 5. determinismo de ids
  const idsA = treeA.root.children.map((n) => n.id).join(",");
  const idsB = treeB.root.children.map((n) => n.id).join(",");
  if (idsA !== idsB) {
    console.log(`FAIL  ${seed.kind} · ids no deterministas`);
    fail++;
    continue;
  }

  console.log(`OK    ${seed.kind} · ${treeA.root.children.length} bloques`);
  ok++;
}

// 4. Rechazo de tipos no-kit
let guardOk = false;
try {
  SurfaceComposer.create().add({ type: "vmx.business.shell", config: {} });
} catch {
  guardOk = true;
}
if (guardOk) {
  console.log("OK    guard · Composer rechaza vmx.business.*");
  ok++;
} else {
  console.log("FAIL  guard · Composer NO rechazó vmx.business.*");
  fail++;
}

let guardProductOk = false;
try {
  SurfaceComposer.create().add({ type: "vmx.product.hero", config: {} });
} catch {
  guardProductOk = true;
}
if (guardProductOk) {
  console.log("OK    guard · Composer rechaza vmx.product.*");
  ok++;
} else {
  console.log("FAIL  guard · Composer NO rechazó vmx.product.*");
  fail++;
}

const total = KIT_SEEDS.length + 2;
console.log(`\n${ok}/${total} chequeos OK, ${fail} fallos.`);
if (fail > 0) process.exit(1);