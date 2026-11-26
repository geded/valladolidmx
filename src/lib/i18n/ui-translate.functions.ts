/**
 * Auto-traducción de strings de UI en runtime.
 * Usa `ui_translation_cache` para no pagar dos veces la misma frase.
 * Sólo persisten fuentes ya reconocidas por CMS/caché o diccionario oficial;
 * un texto arbitrario puede traducirse para su visitante, nunca publicarse.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { generateText } from "ai";
import { createHash } from "crypto";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import type { Database } from "@/integrations/supabase/types";
import es from "@/i18n/locales/es.json";

const MODEL = "google/gemini-3-flash-preview";
const ALLOWED_LOCALES = new Set(["en", "fr", "de", "it", "pt"]);
const MAX_TEXTS = 60;
const MAX_TOTAL_CHARS = 24_000;

function sha(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 20);
}

function collectDictionaryTexts(value: unknown, out = new Set<string>()): Set<string> {
  if (typeof value === "string") {
    if (value.trim()) out.add(value);
  } else if (value && typeof value === "object") {
    for (const child of Object.values(value)) collectDictionaryTexts(child, out);
  }
  return out;
}

const OFFICIAL_UI_TEXTS = collectDictionaryTexts(es);
const SYSTEM_PROMPT =
  'Eres editor y traductor turístico nativo del idioma destino para una plataforma de viajes del Oriente Maya de Yucatán (Valladolid). No traduzcas palabra por palabra: escribe como lo haría una guía de viajes de calidad en ese idioma, natural, cálida y clara para un viajero, sin inventar datos ni añadir información. Botones y etiquetas cortas: usa la fórmula habitual en apps de viaje de ese idioma. Conserva: mayúsculas iniciales, puntuación final, saltos de línea, emojis, íconos y nombres propios (Valladolid, Yucatán, Oriente Maya, Alux, Chichén Itzá, Cenote). NO traduzcas URLs, slugs, códigos, ni identificadores. Longitud similar (±25%). Devuelve exclusivamente JSON válido con la forma {"t":["traducción1","traducción2",...]} en el mismo orden que la entrada.';

export const translateUiBatch = createServerFn({ method: "POST" })
  .inputValidator((d: { locale: string; texts: string[] } | undefined) => {
    if (!d?.locale || !Array.isArray(d.texts)) throw new Error("invalid_input");
    if (!ALLOWED_LOCALES.has(d.locale)) throw new Error("invalid_locale");
    let totalChars = 0;
    const texts = d.texts
      .filter((t) => typeof t === "string" && t.trim().length > 0 && t.length < 5000)
      .slice(0, MAX_TEXTS)
      .filter((text) => {
        if (totalChars + text.length > MAX_TOTAL_CHARS) return false;
        totalChars += text.length;
        return true;
      });
    return { locale: d.locale, texts };
  })
  .handler(async ({ data }): Promise<Record<string, string>> => {
    if (data.texts.length === 0) return {};

    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    const aiKey = process.env["LOVABLE_API_KEY"];
    const sb =
      url && key
        ? createClient<Database>(url, key, {
            auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
          })
        : null;

    const hashOf = new Map<string, string>();
    for (const t of data.texts) hashOf.set(t, sha(t + "|" + data.locale));
    const hashes = Array.from(new Set(hashOf.values()));
    const out: Record<string, string> = {};

    // 1) Leer la caché no consume cuota ni IA.
    let cached: Array<{ source_hash: string; target_text: string }> = [];
    if (sb) {
      const { data: rows } = await sb
        .from("ui_translation_cache")
        .select("source_hash, target_text")
        .eq("locale", data.locale)
        .in("source_hash", hashes);
      cached = rows ?? [];
    }
    const cachedSet = new Set(cached.map((r) => r.source_hash));
    for (const r of cached) out[r.source_hash] = r.target_text;

    const missing = Array.from(
      new Set(data.texts.filter((text) => !cachedSet.has(hashOf.get(text)!))),
    );
    if (missing.length === 0 || !aiKey) {
      for (const text of missing) out[hashOf.get(text)!] = text;
      return out;
    }

    // Sólo las frases nuevas consumen cuota e IA.
    const { assertPlatformOrigin, enforcePublicQuota } =
      await import("@/lib/security/public-quota.server");
    assertPlatformOrigin();
    await enforcePublicQuota("i18n.ui", {
      perMinute: 8,
      perHour: 120,
      perDay: 400,
      platformPerDay: 3000,
    });

    // Una fuente conocida en otro idioma viene del CMS o de una visita ya
    // aceptada; el diccionario cubre la UI oficial. Fuentes desconocidas son
    // efímeras y se procesan aparte para no contaminar traducciones públicas.
    const trustedSources = new Set(OFFICIAL_UI_TEXTS);
    if (sb) {
      const { data: knownRows } = await sb
        .from("ui_translation_cache")
        .select("source_text")
        .in("source_text", missing);
      for (const row of knownRows ?? []) trustedSources.add(row.source_text);
    }
    const trusted = missing.filter((text) => trustedSources.has(text));
    const ephemeral = missing.filter((text) => !trustedSources.has(text));

    const translateGroup = async (texts: string[]): Promise<string[]> => {
      if (texts.length === 0) return [];
      try {
        const provider = createLovableAiGatewayProvider(aiKey);
        const prompt = `Idioma destino: ${data.locale}\n\nTextos (JSON):\n${JSON.stringify(texts)}`;
        const res = await generateText({ model: provider(MODEL), system: SYSTEM_PROMPT, prompt });
        const raw = res.text ?? "";
        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) return [];
        const parsed = JSON.parse(match[0]) as { t?: unknown };
        return Array.isArray(parsed.t)
          ? parsed.t.map((value) => (typeof value === "string" ? value : ""))
          : [];
      } catch {
        return [];
      }
    };

    // Dos grupos como máximo; compatible con el límite de 6 conexiones del Worker.
    const [trustedTranslations, ephemeralTranslations] = await Promise.all([
      translateGroup(trusted),
      translateGroup(ephemeral),
    ]);
    const toInsert: Array<{
      source_hash: string;
      locale: string;
      source_text: string;
      target_text: string;
    }> = [];

    const fill = (texts: string[], translations: string[], persist: boolean) => {
      for (let index = 0; index < texts.length; index++) {
        const source = texts[index]!;
        const translation = translations[index]?.trim();
        const sourceHash = hashOf.get(source)!;
        if (translation && translation !== source) {
          out[sourceHash] = translation;
          if (persist) {
            toInsert.push({
              source_hash: sourceHash,
              locale: data.locale,
              source_text: source,
              target_text: translation,
            });
          }
        } else {
          out[sourceHash] = source;
        }
      }
    };
    fill(trusted, trustedTranslations, true);
    fill(ephemeral, ephemeralTranslations, false);

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
