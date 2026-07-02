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
const MAX_BATCH = 40;
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

interface CacheState {
  locale: string;
  map: Record<string, string>; // sourceText → translation
  dirty: boolean;
}

function loadCache(locale: string): CacheState {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY_PREFIX + locale);
    if (raw) return { locale, map: JSON.parse(raw), dirty: false };
  } catch {
    /* noop */
  }
  return { locale, map: {}, dirty: false };
}

function saveCache(state: CacheState) {
  if (!state.dirty) return;
  try {
    window.localStorage.setItem(
      CACHE_KEY_PREFIX + state.locale,
      JSON.stringify(state.map),
    );
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
  const scope = root.nodeType === Node.DOCUMENT_NODE ? (root as Document).body : (root as HTMLElement);
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

  function schedule() {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      void flush();
    }, DEBOUNCE_MS);
  }

  async function flush() {
    if (locale === SOURCE_LOCALE) return;
    if (inflight) {
      schedule();
      return;
    }
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
      } else if (tr === undefined) {
        misses.add(text);
      }
    }
    for (const [el, attrs] of pendingAttrs) {
      for (const [attr, val] of attrs) {
        const tr = cache.map[val];
        if (tr && tr !== val) {
          el.setAttribute(`${ATTR_ORIGINAL}-${attr}`, val);
          el.setAttribute(attr, tr);
        } else if (tr === undefined) {
          misses.add(val);
        }
      }
    }

    if (misses.size === 0) return;

    // Batch remote translation
    const batchList = Array.from(misses).slice(0, MAX_BATCH);
    inflight = true;
    try {
      const result = await translateUiBatch({
        data: { locale, texts: batchList },
      });
      // result: hash → translation. We don't know the hash mapping here,
      // but we sent texts; server persists by hash. Do a simple mapping
      // by re-requesting with a client-side mapping via matching values.
      // Simpler: server returns hash→tr, but we can also re-derive: we
      // rely on the returned map having entries whose values differ from
      // sources. Instead re-do a local mapping by hashing text→locale.
      // For simplicity we treat result values as translations and map
      // by using a second server call semantic: return object keyed by
      // source text. To avoid a client-side sha256, we do a linear pass
      // matching entries by longest first.
      // → Adjust: the server returns hash→translation. We build the map
      //   client-side using a lightweight hash equivalent to server.
      const enriched = await mapByHash(batchList, result, locale);
      let added = 0;
      for (const [src, tr] of Object.entries(enriched)) {
        if (tr && tr !== src && cache.map[src] !== tr) {
          cache.map[src] = tr;
          cache.dirty = true;
          added++;
        }
      }
      if (added > 0) saveCache(cache);
    } catch {
      // best-effort; will retry on next scan
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
    }
    for (const [el, attrs] of pendingAttrs) {
      for (const [attr, val] of attrs) {
        const tr = cache.map[val];
        if (!tr || tr === val) continue;
        if (el.getAttribute(`${ATTR_ORIGINAL}-${attr}`) === val) continue;
        el.setAttribute(`${ATTR_ORIGINAL}-${attr}`, val);
        el.setAttribute(attr, tr);
      }
    }

    if (misses.size > MAX_BATCH) schedule();
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
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 20);
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