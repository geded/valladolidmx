/**
 * G8-R1-D-R1 · Evidencia DOM: unicidad de chrome global y del dock de Alux
 * en 390 / 768 / 1440 px sobre las superficies públicas reales.
 *
 * Read-only: sólo navega y mide. No publica, no cambia flags, no muta datos.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.OMXDS_BASE_URL ?? "http://localhost:8080";
const WIDTHS = [390, 768, 1440];
const OUT = "scripts/omxds/r1-d/evidence";

const SURFACES = [
  ["home", "/"],
  ["destino", "/oriente-maya/valladolid"],
  ["listado", "/oriente-maya/valladolid/hoteles"],
  ["lugar", "/oriente-maya/valladolid/lugares/convento-de-san-bernardino-de-siena"],
  ["eventos", "/eventos"],
];

const count = (page, selector) => page.locator(selector).count();

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const rows = [];
  let failures = 0;

  for (const width of WIDTHS) {
    const context = await browser.newContext({ viewport: { width, height: 1400 } });
    const page = await context.newPage();
    for (const [name, path] of SURFACES) {
      const res = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(900);
      const status = res?.status() ?? 0;
      const header = await count(page, '[data-omxds-chrome="site-header"]');
      const footer = await count(page, '[data-omxds-chrome="public-footer"]');
      const dock = await count(page, '[data-omxds-chrome="alux-dock"]');
      const planner = await count(page, '[data-omxds-chrome="alux-planner"]');
      const ctxVersion = await page
        .locator("[data-alux-context-version]")
        .first()
        .getAttribute("data-alux-context-version")
        .catch(() => null);
      const overflow = await page.evaluate(
        () => Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      );
      const ok =
        status === 200 &&
        header === 1 &&
        footer === 1 &&
        dock <= 1 &&
        planner <= 1 &&
        overflow === 0;
      if (!ok) failures++;
      rows.push({ width, name, status, header, footer, dock, planner, ctxVersion, overflow, ok });
      console.log(
        `${ok ? "PASS" : "FAIL"} ${width}px ${name} status=${status} header=${header} footer=${footer} dock=${dock} planner=${planner} overflow=${overflow} ctx=${ctxVersion ?? "-"}`,
      );
    }
    await context.close();
  }

  await browser.close();
  writeFileSync(`${OUT}/chrome-uniqueness.json`, JSON.stringify(rows, null, 2));
  if (failures) {
    console.error(`\nR1-D chrome evidence FAIL · ${failures} caso(s)`);
    process.exit(1);
  }
  console.log(`\nR1-D chrome evidence PASS · ${rows.length} casos`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
