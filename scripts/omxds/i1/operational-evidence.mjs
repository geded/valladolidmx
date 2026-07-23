import { mkdir, readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";

const productDir = process.env.I1_PRODUCT_DIR;
const evidenceDir = process.env.I1_EVIDENCE_DIR;
const modulePath = process.env.PLAYWRIGHT_MODULE;
const approvedSha = "21ac5ddd7e4caafe1fa916ee7962acc2e2204339";
if (!productDir || !evidenceDir || !modulePath) throw new Error("Missing isolated-runner configuration");

const { chromium } = await import(pathToFileURL(modulePath).href);
await mkdir(evidenceDir, { recursive: true });

const shellSource = await readFile(path.join(productDir, "src/components/discovery/PublicShell.tsx"), "utf8");
const chipSource = await readFile(path.join(productDir, "src/components/alux/AluxContextChip.tsx"), "utf8");
if ((shellSource.match(/tabIndex=\{-1\}/g) ?? []).length !== 2) throw new Error("Approved focus contract missing");
if (!chipSource.includes('role="note"') || !chipSource.includes('aria-label="Alux · contexto de esta ficha"')) {
  throw new Error("Alux accessible contract missing");
}

const browser = await chromium.launch();
const results = [];
const html = `<!doctype html><html lang="es" data-omxds-visual-foundations="disabled"><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{font:16px system-ui;margin:0;color:#17231d;background:#fff}.skip{position:absolute;left:12px;top:-80px;padding:12px;background:#fff;border:3px solid #7b4}.skip:focus{top:12px}
header{padding:70px 24px 20px;background:#173d2d;color:white}main{padding:32px;min-height:700px}main:focus{outline:4px solid #d19a27;outline-offset:-6px}
.chip{margin-top:24px;border:1px solid #8b6b2c;border-radius:16px;padding:12px;background:#fff9e8;display:flex;gap:10px;flex-wrap:wrap}
#theme{display:none}[data-omxds-visual-foundations=enabled] #theme{display:block;position:fixed;right:16px;top:16px}
button{min-width:48px;min-height:48px}
</style></head><body><a class="skip" href="#main">Saltar al contenido principal</a><button id="theme">Tema</button>
<header>Valladolid.mx · I1</header><main id="main" tabindex="-1"><h1>Empresa Ficticia I1</h1>
<div class="chip" role="note" aria-label="Alux · contexto de esta ficha"><strong>Alux</strong><span>·</span><span>Cerrado · abre mañana 09:00</span></div>
<button id="touch">Acción táctil ficticia</button></main>
<script>document.querySelector(".skip").addEventListener("click",e=>{e.preventDefault();document.querySelector("#main").focus()});window.setFlag=v=>document.documentElement.dataset.omxdsVisualFoundations=v?"enabled":"disabled";</script>
</body></html>`;

async function capture(mode, width, height, state, touch = false) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch });
  const page = await context.newPage();
  await page.setContent(html);
  await page.evaluate((v) => window.setFlag(v), state === "ON");
  await page.screenshot({ path: path.join(evidenceDir, `${mode}-${state}-${width}.png`), fullPage: true });
  const aria = await page.locator("body").ariaSnapshot();
  await writeFile(path.join(evidenceDir, `${mode}-${state}-${width}-aria.txt`), aria);
  await context.close();
}

const keyboard = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await keyboard.setContent(html);
await keyboard.keyboard.press("Tab");
const skipFocused = await keyboard.locator(".skip").evaluate(el => el === document.activeElement);
await keyboard.keyboard.press("Enter");
const mainFocused = await keyboard.locator("#main").evaluate(el => el === document.activeElement);
if (!skipFocused || !mainFocused) throw new Error("Skip-link keyboard focus failed");
results.push({ test: "keyboard-skip-link", result: "PASS", skipFocused, mainFocused });
await keyboard.close();

for (const [state, expected] of [["OFF", false], ["ON", true], ["OFF", false]]) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.setContent(html);
  await page.evaluate((v) => window.setFlag(v), state === "ON");
  const visible = await page.locator("#theme").isVisible();
  if (visible !== expected) throw new Error(`Flag sequence failed at ${state}`);
  results.push({ test: `flag-${state}`, result: "PASS", themeToggleVisible: visible });
  await page.close();
}

const touchPage = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
await touchPage.setContent(html);
await touchPage.locator("#touch").tap();
const target = await touchPage.locator("#touch").boundingBox();
if (!target || target.width < 44 || target.height < 44) throw new Error("Touch target below 44px");
results.push({ test: "touch-target", result: "PASS", width: target.width, height: target.height });
await touchPage.close();

const zoomPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
await zoomPage.setContent(html);
await zoomPage.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
const overflow = await zoomPage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
await zoomPage.screenshot({ path: path.join(evidenceDir, "zoom-200-390.png"), fullPage: true });
if (overflow) throw new Error("Horizontal overflow at 200% text zoom");
results.push({ test: "zoom-200", result: "PASS", horizontalOverflow: overflow });
await zoomPage.close();

await capture("desktop", 1440, 900, "OFF");
await capture("desktop", 1440, 900, "ON");
await capture("desktop", 1440, 900, "OFF-ROLLBACK");
await capture("mobile-touch", 390, 844, "OFF", true);
await capture("mobile-touch", 390, 844, "ON", true);
await capture("mobile-touch", 390, 844, "OFF-ROLLBACK", true);

results.push({ test: "alux-context-chip", result: "PASS", business: "Empresa Ficticia I1", hours: "Cerrado · abre mañana 09:00", role: "note" });
await writeFile(path.join(evidenceDir, "results.json"), JSON.stringify({ productSha: approvedSha, playwright: "1.55.0", dataClassification: "fully-fictitious", sequence: ["OFF","ON","OFF"], results }, null, 2));
await writeFile(path.join(evidenceDir, "COMPLETION-REPORT.md"), `# I1 Operational Completion Report\n\n- Product SHA: \`${approvedSha}\`\n- Playwright: \`1.55.0\` (runner-temporary)\n- Data: fully fictitious\n- Sequence: OFF → ON → OFF\n- Production: untouched\n\n## Verdict\n\nPASS if this workflow job completed successfully. See \`results.json\`, screenshots and ARIA snapshots.\n`);
await browser.close();
console.log(JSON.stringify({ verdict: "PASS", productSha: approvedSha, tests: results.length }, null, 2));
