/**
 * ui-auto-translate.ts — Traductor DOM en runtime.
 *
 * Cuando el idioma activo ≠ es, recorre los nodos de texto visibles y los
 * traduce vía `translateUiBatch` (Gemini Flash + caché en BD). Cachea
 * también en localStorage para hidratación instantánea entre navegaciones.
 *
 * Cero pintadas del texto original (excepto la primera vez que se ve una
 * frase en un idioma nuevo, mientras espera la respuesta).
 */
import { translateUiBatch } from "./ui-translate.functions";

const SOURCE_LOCALE = "es";
const ATTR_TRANSLATED = "data-vlx-tr";
const ATTR_ORIGINAL = "data-vlx-tr-src";
const CACHE_KEY_PREFIX = "vlx.i18n.cache.";
const MAX_BATCH = 30;
const PARALLEL_BATCHES = 4;
const DEBOUNCE_MS = 250;
const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "CODE",
  "PRE",
  "TEXTAREA",
  "INPUT",
  "NOSCRIPT",
  "SVG",
  "PATH",
  "TEMPLATE",
]);
const TRANSLATABLE_ATTRS = ["placeholder", "aria-label", "title", "alt"] as const;

// Regex to skip: URLs, slugs-only, pure numbers/symbols, JSON-looking, UUIDs.
const RE_URL = /^https?:\/\//i;
const RE_SLUG_ONLY = /^[a-z0-9]+(?:[-_.\/][a-z0-9]+)+$/;
const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RE_LETTERS = /\p{L}/u;

function isSkippableText(text: string): boolean {
  const t = text.trim();
  if (t.length < 2) return true;
  if (!RE_LETTERS.test(t)) return true;
  if (RE_URL.test(t)) return true;
  if (RE_SLUG_ONLY.test(t)) return true;
  if (RE_UUID.test(t)) return true;
  return false;
}

function isSkippableAncestor(node: Node): boolean {
  let cur: Node | null = node;
  while (cur && cur !== document.body) {
    if (cur.nodeType === Node.ELEMENT_NODE) {
      const el = cur as HTMLElement;
      if (SKIP_TAGS.has(el.tagName)) return true;
      if (el.getAttribute("data-no-translate") !== null) return true;
      if (el.getAttribute("contenteditable") === "true") return true;
      // Skip inspector/editor code fields inside the Studio.
      if (el.getAttribute("data-eb-code-field") !== null) return true;
    }
    cur = cur.parentNode;
  }
  return false;
}

// Valor que el traductor escribió en cada nodo de texto (débil: no retiene nodos).
const writtenNodes = new WeakMap<Text, string>();
const writtenAttrs = new WeakMap<HTMLElement, Map<string, string>>();
function rememberAttr(el: HTMLElement, attr: string, value: string) {
  let m = writtenAttrs.get(el);
  if (!m) {
    m = new Map();
    writtenAttrs.set(el, m);
  }
  m.set(attr, value);
}

interface CacheState {
  locale: string;
  map: Record<string, string>; // sourceText → translation
  dirty: boolean;
}

function loadCache(locale: string): CacheState {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY_PREFIX + locale);
    if (raw) {
      const map = JSON.parse(raw) as Record<string, string>;
      // Limpia entradas envenenadas: un texto ya traducido nunca es fuente.
      // (Antes el traductor re-traducía su propia salida y guardaba
      // alemán→español, provocando el parpadeo entre idiomas.)
      const outputs = new Set<string>();
      for (const [src, tr] of Object.entries(map)) if (tr !== src) outputs.add(tr);
      let dirty = false;
      for (const key of Object.keys(map)) {
        if (outputs.has(key) && map[key] !== key) {
          delete map[key];
          dirty = true;
        }
      }
      return { locale, map, dirty };
    }
  } catch {
    /* noop */
  }
  return { locale, map: {}, dirty: false };
}

function saveCache(state: CacheState) {
  if (!state.dirty) return;
  try {
    window.localStorage.setItem(CACHE_KEY_PREFIX + state.locale, JSON.stringify(state.map));
    state.dirty = false;
  } catch {
    /* quota */
  }
}

function collectTextNodes(root: Node, pending: Map<Text, string>) {
  if (isSkippableAncestor(root)) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      const parent = n.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (isSkippableAncestor(parent)) return NodeFilter.FILTER_REJECT;
      // Already translated? Skip unless original text changed.
      const marker = parent.getAttribute(ATTR_ORIGINAL);
      const raw = n.nodeValue ?? "";
      if (marker !== null && marker === raw) return NodeFilter.FILTER_REJECT;
      // Nuestra propia traducción ya pintada: nunca se vuelve a traducir.
      if (writtenNodes.get(n as Text) === raw) return NodeFilter.FILTER_REJECT;
      if (isSkippableText(raw)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let node: Node | null = walker.nextNode();
  while (node) {
    const text = (node.nodeValue ?? "").trim();
    if (text) pending.set(node as Text, text);
    node = walker.nextNode();
  }
}

function collectAttrs(root: Node, pendingAttrs: Map<HTMLElement, Map<string, string>>) {
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
  const scope =
    root.nodeType === Node.DOCUMENT_NODE ? (root as Document).body : (root as HTMLElement);
  if (!scope) return;
  if (isSkippableAncestor(scope)) return;
  const selector = TRANSLATABLE_ATTRS.map((a) => `[${a}]`).join(",");
  const els: HTMLElement[] = [];
  if (scope.nodeType === Node.ELEMENT_NODE) {
    const el = scope as HTMLElement;
    if (el.matches?.(selector)) els.push(el);
  }
  const q = (scope as ParentNode).querySelectorAll?.(selector);
  if (q) q.forEach((e) => els.push(e as HTMLElement));
  for (const el of els) {
    if (isSkippableAncestor(el)) continue;
    for (const attr of TRANSLATABLE_ATTRS) {
      const v = el.getAttribute(attr);
      if (!v || isSkippableText(v)) continue;
      const marker = el.getAttribute(`${ATTR_ORIGINAL}-${attr}`);
      if (marker === v) continue;
      if (writtenAttrs.get(el)?.get(attr) === v) continue;
      let map = pendingAttrs.get(el);
      if (!map) {
        map = new Map();
        pendingAttrs.set(el, map);
      }
      map.set(attr, v);
    }
  }
}

export interface UiAutoTranslatorHandle {
  stop: () => void;
  rescan: () => void;
  setLocale: (l: string) => void;
}

export function startUiAutoTranslator(initialLocale: string): UiAutoTranslatorHandle {
  let locale = initialLocale;
  let cache: CacheState = loadCache(locale);
  let observer: MutationObserver | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inflight = false;
  let unresolved = new Set<string>();

  function schedule() {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      void flush();
    }, DEBOUNCE_MS);
  }

  async function flush() {
    if (locale === SOURCE_LOCALE) return;
    const pendingText = new Map<Text, string>();
    const pendingAttrs = new Map<HTMLElement, Map<string, string>>();
    collectTextNodes(document.body, pendingText);
    collectAttrs(document, pendingAttrs);

    // Apply cached translations immediately + collect misses
    const misses = new Set<string>();
    for (const [node, text] of pendingText) {
      const tr = cache.map[text];
      if (tr && tr !== text) {
        const parent = node.parentElement;
        if (parent) {
          parent.setAttribute(ATTR_ORIGINAL, text);
          parent.setAttribute(ATTR_TRANSLATED, locale);
        }
        node.nodeValue = (node.nodeValue ?? "").replace(text, tr);
        writtenNodes.set(node, node.nodeValue ?? "");
      } else if (tr === undefined && !unresolved.has(text)) {
        misses.add(text);
      }
    }
    for (const [el, attrs] of pendingAttrs) {
      for (const [attr, val] of attrs) {
        const tr = cache.map[val];
        if (tr && tr !== val) {
          el.setAttribute(`${ATTR_ORIGINAL}-${attr}`, val);
          el.setAttribute(attr, tr);
          rememberAttr(el, attr, tr);
        } else if (tr === undefined && !unresolved.has(val)) {
          misses.add(val);
        }
      }
    }

    if (misses.size === 0) return;
    // Lo ya guardado se aplica siempre al instante (arriba); sólo la consulta
    // de frases nuevas espera a que termine la anterior. Antes, mientras había
    // una consulta en curso, el texto re-pintado en español quedaba visible
    // varios segundos y la portada parpadeaba entre idiomas.
    if (inflight) {
      schedule();
      return;
    }

    // Lotes en paralelo (antes uno tras otro: una página completa tardaba minutos).
    const all = Array.from(misses).slice(0, MAX_BATCH * PARALLEL_BATCHES);
    const batches: string[][] = [];
    for (let i = 0; i < all.length; i += MAX_BATCH) batches.push(all.slice(i, i + MAX_BATCH));
    inflight = true;
    const failed: string[] = [];
    try {
      const results = await Promise.all(
        batches.map(async (batchList) => {
          try {
            const result = await translateUiBatch({ data: { locale, texts: batchList } });
            return await mapByHash(batchList, result, locale);
          } catch {
            failed.push(...batchList);
            return {} as Record<string, string>;
          }
        }),
      );
      let added = 0;
      for (const enriched of results) {
        for (const [src, tr] of Object.entries(enriched)) {
          // Nombres propios (Chichén Itzá, Ek Balam) vuelven idénticos: también
          // se guardan para no volver a consultarlos en cada cambio de la página.
          if (tr && cache.map[src] !== tr) {
            cache.map[src] = tr;
            cache.dirty = true;
            added++;
          }
        }
      }
      // Frases sin respuesta no se reintentan en esta visita (evita consultas sin fin).
      const retry = new Set(failed);
      for (const src of all)
        if (cache.map[src] === undefined && !retry.has(src)) unresolved.add(src);
      if (added > 0) saveCache(cache);
    } finally {
      inflight = false;
    }

    // Apply newly cached
    for (const [node, text] of pendingText) {
      const tr = cache.map[text];
      if (!tr || tr === text) continue;
      const parent = node.parentElement;
      if (!parent || parent.getAttribute(ATTR_ORIGINAL) === text) continue;
      parent.setAttribute(ATTR_ORIGINAL, text);
      parent.setAttribute(ATTR_TRANSLATED, locale);
      node.nodeValue = (node.nodeValue ?? "").replace(text, tr);
      writtenNodes.set(node, node.nodeValue ?? "");
    }
    for (const [el, attrs] of pendingAttrs) {
      for (const [attr, val] of attrs) {
        const tr = cache.map[val];
        if (!tr || tr === val) continue;
        if (el.getAttribute(`${ATTR_ORIGINAL}-${attr}`) === val) continue;
        el.setAttribute(`${ATTR_ORIGINAL}-${attr}`, val);
        el.setAttribute(attr, tr);
        rememberAttr(el, attr, tr);
      }
    }

    if (misses.size > all.length) schedule();
  }

  function start() {
    if (typeof window === "undefined") return;
    observer = new MutationObserver(() => schedule());
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...TRANSLATABLE_ATTRS],
    });
    schedule();
  }

  function stop() {
    observer?.disconnect();
    observer = null;
    if (timer) clearTimeout(timer);
    timer = null;
  }

  function rescan() {
    schedule();
  }

  function setLocale(l: string) {
    locale = l;
    cache = loadCache(l);
    unresolved = new Set();
    // Undo previous translations by restoring originals
    document.querySelectorAll(`[${ATTR_ORIGINAL}]`).forEach((el) => {
      const src = el.getAttribute(ATTR_ORIGINAL);
      if (src) {
        // find text node holding the translation and restore
        for (const child of Array.from(el.childNodes)) {
          if (child.nodeType === Node.TEXT_NODE) {
            child.nodeValue = src;
            break;
          }
        }
      }
      el.removeAttribute(ATTR_ORIGINAL);
      el.removeAttribute(ATTR_TRANSLATED);
    });
    for (const attr of TRANSLATABLE_ATTRS) {
      document.querySelectorAll(`[${ATTR_ORIGINAL}-${attr}]`).forEach((el) => {
        const src = el.getAttribute(`${ATTR_ORIGINAL}-${attr}`);
        if (src) el.setAttribute(attr, src);
        el.removeAttribute(`${ATTR_ORIGINAL}-${attr}`);
      });
    }
    if (l !== SOURCE_LOCALE) schedule();
  }

  start();
  if (locale !== SOURCE_LOCALE) schedule();
  return { stop, rescan, setLocale };
}

// SHA-256 in the browser (Web Crypto). Matches server hash truncated to 20 hex chars.
async function sha20(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  const arr = Array.from(new Uint8Array(buf));
  return arr
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 20);
}

async function mapByHash(
  sources: string[],
  hashMap: Record<string, string>,
  locale: string,
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  await Promise.all(
    sources.map(async (src) => {
      const h = await sha20(src + "|" + locale);
      const tr = hashMap[h];
      if (tr) out[src] = tr;
    }),
  );
  return out;
}
