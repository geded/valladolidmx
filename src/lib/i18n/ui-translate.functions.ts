/**
 * ui-translate.functions.ts — Auto-traducción de strings de UI en runtime.
 *
 * Recibe un lote de textos en español y un idioma destino; devuelve un
 * mapa hash → traducción. Usa la tabla `ui_translation_cache` para no
 * pagar dos veces la misma frase. Si Gemini falla, devuelve los textos
 * originales para que la UI nunca quede vacía.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { generateText } from "ai";
import { createHash } from "crypto";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import type { Database } from "@/integrations/supabase/types";

const MODEL = "google/gemini-3-flash-preview";
const ALLOWED_LOCALES = new Set(["en", "fr", "de", "it", "pt"]);
const MAX_TEXTS = 60;

function sha(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 20);
}

export const translateUiBatch = createServerFn({ method: "POST" })
  .inputValidator((d: { locale: string; texts: string[] } | undefined) => {
    if (!d?.locale || !Array.isArray(d.texts)) throw new Error("invalid_input");
    if (!ALLOWED_LOCALES.has(d.locale)) throw new Error("invalid_locale");
    const texts = d.texts
      .filter((t) => typeof t === "string" && t.trim().length > 0 && t.length < 800)
      .slice(0, MAX_TEXTS);
    return { locale: d.locale, texts };
  })
  .handler(async ({ data }): Promise<Record<string, string>> => {
    if (data.texts.length === 0) return {};

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    const aiKey = process.env.LOVABLE_API_KEY;

    const hashOf = new Map<string, string>();
    for (const t of data.texts) hashOf.set(t, sha(t + "|" + data.locale));
    const hashes = Array.from(new Set(hashOf.values()));

    const out: Record<string, string> = {};

    // 1) Read cache
    let cached: Array<{ source_hash: string; target_text: string }> = [];
    if (url && key) {
      const sb = createClient<Database>(url, key, {
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      });
      const { data: rows } = await sb
        .from("ui_translation_cache")
        .select("source_hash, target_text")
        .eq("locale", data.locale)
        .in("source_hash", hashes);
      cached = rows ?? [];
    }
    const cachedSet = new Set(cached.map((r) => r.source_hash));
    for (const r of cached) out[r.source_hash] = r.target_text;

    // 2) Missing → translate via AI
    const missing = data.texts.filter((t) => !cachedSet.has(hashOf.get(t)!));
    if (missing.length === 0 || !aiKey) {
      // Fallback: echo original for missing
      for (const t of missing) out[hashOf.get(t)!] = t;
      return out;
    }

    const system =
      "Eres un traductor profesional para una plataforma turística mexicana (Valladolid, Yucatán, Oriente Maya). Traduce cada texto del español al idioma destino conservando: mayúsculas iniciales, puntuación final, saltos de línea, emojis, íconos y nombres propios (Valladolid, Yucatán, Oriente Maya, Alux, Chichén Itzá, Cenote). NO traduzcas URLs, slugs, códigos, ni identificadores. Longitud similar (±25%). Devuelve exclusivamente JSON válido con la forma {\"t\":[\"traducción1\",\"traducción2\",...]} en el mismo orden que la entrada.";
    const prompt = `Idioma destino: ${data.locale}\n\nTextos (JSON):\n${JSON.stringify(missing)}`;

    let translations: string[] = [];
    try {
      const provider = createLovableAiGatewayProvider(aiKey);
      const res = await generateText({ model: provider(MODEL), system, prompt });
      const raw = res.text ?? "";
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        const parsed = JSON.parse(m[0]) as { t?: unknown };
        if (Array.isArray(parsed.t)) {
          translations = parsed.t.map((x) => (typeof x === "string" ? x : ""));
        }
      }
    } catch {
      // fallthrough
    }

    // 3) Fill result + persist to cache
    const toInsert: Array<{
      source_hash: string;
      locale: string;
      source_text: string;
      target_text: string;
    }> = [];
    for (let i = 0; i < missing.length; i++) {
      const src = missing[i];
      const tr = translations[i]?.trim();
      const h = hashOf.get(src)!;
      if (tr && tr !== src) {
        out[h] = tr;
        toInsert.push({
          source_hash: h,
          locale: data.locale,
          source_text: src,
          target_text: tr,
        });
      } else {
        out[h] = src;
      }
    }

    if (toInsert.length > 0) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin
          .from("ui_translation_cache")
          .upsert(toInsert, { onConflict: "source_hash,locale", ignoreDuplicates: true });
      } catch {
        // best-effort
      }
    }

    return out;
  });