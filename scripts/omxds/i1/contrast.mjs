import fs from "node:fs";

const css = fs.readFileSync(new URL("../../../src/styles.css", import.meta.url), "utf8");

function block(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{`, "m").exec(css);
  if (!match) throw new Error(`Missing CSS block: ${selector}`);
  const open = css.indexOf("{", match.index);
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}") depth -= 1;
    if (depth === 0) return css.slice(open + 1, i);
  }
  throw new Error(`Unclosed CSS block: ${selector}`);
}

function variables(source) {
  return Object.fromEntries(
    [...source.matchAll(/--([\w-]+):\s*(oklch\([^;]+\))/g)].map((match) => [match[1], match[2]]),
  );
}

function luminance(value) {
  const match = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/.exec(value);
  if (!match) throw new Error(`Unsupported color: ${value}`);
  const L = Number(match[1]);
  const C = Number(match[2]);
  const h = Number(match[3]) * Math.PI / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l3 = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m3 = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s3 = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clamp = (channel) => Math.max(0, Math.min(1, channel));
  const red = clamp(4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3);
  const green = clamp(-1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3);
  const blue = clamp(-0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function ratio(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const pairs = [
  ["background", "foreground"],
  ["card", "card-foreground"],
  ["popover", "popover-foreground"],
  ["primary", "primary-foreground"],
  ["accent", "accent-foreground"],
  ["destructive", "destructive-foreground"],
  ["badge-pueblo-magico", "badge-pueblo-magico-fg"],
  ["badge-oriente-maya", "badge-oriente-maya-fg"],
  ["badge-verified", "badge-verified-fg"],
  ["badge-certification", "badge-certification-fg"],
];

const themes = { sol: variables(block(":root")), luna: variables(block(".dark")) };
const failures = [];
const results = [];
for (const [theme, tokens] of Object.entries(themes)) {
  for (const [background, foreground] of pairs) {
    if (!tokens[background] || !tokens[foreground]) continue;
    const value = ratio(tokens[background], tokens[foreground]);
    results.push({ theme, pair: `${background}/${foreground}`, ratio: Number(value.toFixed(2)) });
    if (value < 4.5) failures.push(`${theme}:${background}/${foreground}=${value.toFixed(2)}`);
  }
}
console.log(JSON.stringify({ result: failures.length ? "FAIL" : "PASS", standard: "WCAG 2.2 AA", results }, null, 2));
if (failures.length) throw new Error(`Contrast failures: ${failures.join(", ")}`);
