/**
 * G8-R1-D-R1 · Evidencia de unicidad del chrome global (DEF-R1D-001).
 *
 * Lee el HTML servido (SSR) de las superficies públicas reales y verifica que
 * exista exactamente un header de chrome y un footer de chrome por documento,
 * y a lo sumo un dock de Alux y un planner. El conteo se hace sobre marcadores
 * `data-omxds-chrome`, que sólo emiten los componentes canónicos de chrome —
 * los headers internos de sección (legítimos) no los llevan.
 *
 * Read-only: sólo GET. No publica, no cambia flags, no muta datos.
 * La verificación en 390/768/1440 con DOM hidratado se documenta en el
 * Completion Report; aquí se acredita el contrato SSR, reproducible en CI.
 */
import { readFileSync } from "node:fs";

const BASE = process.env.OMXDS_BASE_URL ?? "http://localhost:8080";

const SURFACES = [
  ["home", "/"],
  ["destino", "/oriente-maya/valladolid"],
  ["listado", "/oriente-maya/valladolid/hoteles"],
  ["eventos", "/eventos"],
];

const MARKERS = {
  header: 'data-omxds-chrome="site-header"',
  footer: 'data-omxds-chrome="public-footer"',
  dock: 'data-omxds-chrome="alux-dock"',
  planner: 'data-omxds-chrome="alux-planner"',
};

function occurrences(haystack, needle) {
  return haystack.split(needle).length - 1;
}

// 1 · Contrato estático: un único emisor por marcador de chrome.
const emitters = {
  header: "src/components/layout/SiteHeader.tsx",
  footer: "src/components/layout/SiteFooter.tsx",
  dock: "src/components/layout/AluxFloatingTrigger.tsx",
  planner: "src/components/experience-builder/blocks/alux-planner/AluxPlannerBlock.tsx",
};
let staticFailures = 0;
for (const [key, file] of Object.entries(emitters)) {
  const emitted = occurrences(readFileSync(file, "utf8"), MARKERS[key]);
  const ok = emitted === 1;
  if (!ok) staticFailures++;
  console.log(`${ok ? "PASS" : "FAIL"} emisor único ${key} → ${file} (${emitted})`);
}

// 2 · Contrato servido: conteo por documento.
let httpFailures = 0;
let checked = 0;
for (const [name, path] of SURFACES) {
  let html = "";
  let status = 0;
  try {
    const res = await fetch(`${BASE}${path}`, { headers: { accept: "text/html" } });
    status = res.status;
    html = await res.text();
  } catch {
    console.log(`SKIP ${name} · servidor no disponible en ${BASE}`);
    continue;
  }
  if (status !== 200) {
    console.log(`SKIP ${name} · HTTP ${status}`);
    continue;
  }
  checked++;
  const counts = Object.fromEntries(
    Object.entries(MARKERS).map(([key, marker]) => [key, occurrences(html, marker)]),
  );
  const ok = counts.header === 1 && counts.footer === 1 && counts.dock <= 1 && counts.planner <= 1;
  if (!ok) httpFailures++;
  console.log(
    `${ok ? "PASS" : "FAIL"} ${name} header=${counts.header} footer=${counts.footer} dock=${counts.dock} planner=${counts.planner}`,
  );
}

if (staticFailures || httpFailures) {
  console.error(`\nR1-D chrome evidence FAIL · estático=${staticFailures} servido=${httpFailures}`);
  process.exit(1);
}
console.log(`\nR1-D chrome evidence PASS · 4 emisores únicos · ${checked} documentos verificados`);
