/**
 * cms/alux-autofill.functions.ts — Asistente "Alux" de alta de fichas del CMS.
 *
 * Reglas de gobierno:
 *  · Sólo editores y administradores (`is_editor_or_admin`). Nunca el Portal
 *    Empresarial ni ninguna superficie pública.
 *  · Nunca escribe en la base de datos: devuelve una propuesta que el editor
 *    acepta, corrige u omite campo por campo, y guarda con el flujo de siempre.
 *  · Los hechos verificables (dirección, teléfono, sitio, horarios, coordenadas)
 *    sólo salen de la ficha de Google Places, con su enlace de origen. Lo que no
 *    se puede acreditar queda vacío; nunca se inventa.
 *  · Las fotos candidatas sólo provienen de acervos de licencia libre
 *    verificable (Wikimedia Commons y Openverse) y viajan con autor, licencia y
 *    enlace a la fuente para que el ingreso gobernado conserve los derechos.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MODEL = "google/gemini-3-flash-preview";
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";
/** Techo defensivo al descargar una foto candidata (bytes). */
const MAX_PHOTO_BYTES = 12 * 1024 * 1024;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertEditorial(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("is_editor_or_admin", {
    _user_id: context.userId,
  });
  if (error) throw new Error(`role_check_failed: ${error.message}`);
  if (!data) throw new Error("forbidden");
}

/* ------------------------------------------------------------------ *
 * Google Places (a través del conector ya conectado del proyecto)
 * ------------------------------------------------------------------ */

export interface PlaceFacts {
  placeId: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  website: string | null;
  hours: string[];
  summary: string | null;
  typeLabel: string | null;
  mapsUrl: string;
}

interface GooglePlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  nationalPhoneNumber?: string;
  websiteUri?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  editorialSummary?: { text?: string };
  primaryTypeDisplayName?: { text?: string };
}

async function lookupPlace(query: string): Promise<PlaceFacts | null> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!lovableKey || !mapsKey) return null;

  const res = await fetch(`${GATEWAY_URL}/places/v1/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": mapsKey,
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.location",
        "places.nationalPhoneNumber",
        "places.websiteUri",
        "places.regularOpeningHours",
        "places.editorialSummary",
        "places.primaryTypeDisplayName",
      ].join(","),
    },
    body: JSON.stringify({ textQuery: query, languageCode: "es", maxResultCount: 1 }),
  });

  if (!res.ok) {
    console.error("[alux.autofill] places", res.status, (await res.text()).slice(0, 300));
    return null;
  }

  const json = (await res.json()) as { places?: GooglePlace[] };
  const p = json.places?.[0];
  if (!p?.id) return null;

  return {
    placeId: p.id,
    name: p.displayName?.text ?? "",
    address: p.formattedAddress ?? null,
    latitude: p.location?.latitude ?? null,
    longitude: p.location?.longitude ?? null,
    phone: p.nationalPhoneNumber ?? null,
    website: p.websiteUri ?? null,
    hours: p.regularOpeningHours?.weekdayDescriptions ?? [],
    summary: p.editorialSummary?.text ?? null,
    typeLabel: p.primaryTypeDisplayName?.text ?? null,
    mapsUrl: `https://www.google.com/maps/place/?q=place_id:${p.id}`,
  };
}

/* ------------------------------------------------------------------ *
 * Propuesta de contenido de la ficha
 * ------------------------------------------------------------------ */

export interface AutofillField {
  key: string;
  label: string;
  value: string;
  /** Enlace de origen cuando el dato es un hecho verificable. */
  sourceUrl: string | null;
  /** Nota corta para el editor: de dónde sale o por qué queda vacío. */
  note: string | null;
}

interface DraftInput {
  /** Tipo de ficha en lenguaje del CMS: "lugar", "restaurante", "evento"… */
  entityKind: string;
  name: string;
  destination?: string;
  zone?: string;
  /** Campos de texto del formulario que Alux puede proponer. */
  fields: Array<{ name: string; label: string; help?: string }>;
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced?.[1] ?? text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

const SYSTEM = [
  "Eres Alux, asistente editorial de Valladolid.mx (Oriente Maya de Yucatán).",
  "Redactas fichas turísticas en español de México, con tono cálido, concreto y sin publicidad hueca.",
  "Trabajas sólo con los HECHOS que recibes. Está terminantemente prohibido inventar teléfonos, horarios, precios, direcciones, premios o datos históricos.",
  "Si un campo no se puede redactar con los hechos disponibles, devuélvelo con value vacío.",
  "Descripción corta: una o dos frases (máx. 200 caracteres). Descripción larga: 2 o 3 párrafos breves.",
  'Responde SIEMPRE y SÓLO con JSON: {"fields":[{"key":"...","value":"...","note":"..."}]}',
].join(" ");

export const aluxDraftEntity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: DraftInput) => {
    if (!d?.name || d.name.trim().length < 2) throw new Error("invalid_input");
    if (!Array.isArray(d.fields) || d.fields.length === 0) throw new Error("invalid_input");
    return {
      entityKind: String(d.entityKind || "ficha").slice(0, 60),
      name: d.name.trim().slice(0, 160),
      destination: d.destination?.trim().slice(0, 120) || undefined,
      zone: d.zone?.trim().slice(0, 120) || undefined,
      fields: d.fields.slice(0, 24).map((f) => ({
        name: String(f.name).slice(0, 60),
        label: String(f.label).slice(0, 120),
        help: f.help ? String(f.help).slice(0, 200) : undefined,
      })),
    } satisfies DraftInput;
  })
  .handler(async ({ data, context }) => {
    await assertEditorial(context);

    const query = [data.name, data.zone, data.destination, "Yucatán, México"]
      .filter(Boolean)
      .join(", ");
    const facts = await lookupPlace(query);

    const proposals: AutofillField[] = [];
    const apiKey = process.env.LOVABLE_API_KEY;

    if (apiKey) {
      const [{ generateText }, { createLovableAiGatewayProvider }] = await Promise.all([
        import("ai"),
        import("@/lib/ai-gateway.server"),
      ]);

      const factBlock = facts
        ? [
            `Nombre en Google: ${facts.name}`,
            facts.typeLabel ? `Tipo según Google: ${facts.typeLabel}` : null,
            facts.address ? `Dirección: ${facts.address}` : null,
            facts.summary ? `Resumen de Google: ${facts.summary}` : null,
            facts.hours.length ? `Horarios: ${facts.hours.join(" | ")}` : null,
          ]
            .filter(Boolean)
            .join("\n")
        : "No hay ficha de Google para este nombre. Redacta sólo lo que pueda escribirse sin datos duros.";

      try {
        const res = await generateText({
          model: createLovableAiGatewayProvider(apiKey)(MODEL),
          system: SYSTEM,
          prompt: [
            `TIPO DE FICHA\n${data.entityKind}`,
            `NOMBRE\n${data.name}`,
            `TERRITORIO\n${[data.zone, data.destination].filter(Boolean).join(", ") || "Oriente Maya de Yucatán"}`,
            `HECHOS DISPONIBLES\n${factBlock}`,
            `CAMPOS A PROPONER\n${data.fields
              .map((f) => `- ${f.name}: ${f.label}${f.help ? ` (${f.help})` : ""}`)
              .join("\n")}`,
          ].join("\n\n"),
          temperature: 0.4,
          maxOutputTokens: 1200,
          abortSignal: AbortSignal.timeout(30_000),
        });

        const parsed = extractJson(res.text ?? "") as { fields?: unknown } | null;
        const rows = Array.isArray(parsed?.fields) ? parsed.fields : [];
        for (const row of rows) {
          if (!row || typeof row !== "object") continue;
          const r = row as Record<string, unknown>;
          const key = typeof r.key === "string" ? r.key : "";
          const field = data.fields.find((f) => f.name === key);
          if (!field) continue;
          const value = typeof r.value === "string" ? r.value.trim() : "";
          if (!value) continue;
          proposals.push({
            key,
            label: field.label,
            value: value.slice(0, 4000),
            sourceUrl: facts?.mapsUrl ?? null,
            note: typeof r.note === "string" ? r.note.slice(0, 160) : "Redactado por Alux",
          });
        }
      } catch (err) {
        console.error(
          "[alux.autofill] proveedor no disponible",
          err instanceof Error ? err.message : err,
        );
      }
    }

    /* Hechos verificables: entran directos desde Google, no desde el modelo. */
    const wanted = new Set(data.fields.map((f) => f.name));
    const pushFact = (key: string, value: string | null, label: string) => {
      if (!value || !wanted.has(key)) return;
      const existing = proposals.findIndex((p) => p.key === key);
      const entry: AutofillField = {
        key,
        label,
        value,
        sourceUrl: facts?.mapsUrl ?? null,
        note: "Dato tomado de la ficha de Google",
      };
      if (existing >= 0) proposals[existing] = entry;
      else proposals.push(entry);
    };

    if (facts) {
      pushFact("address_line", facts.address, "Dirección");
      pushFact("address", facts.address, "Dirección");
      pushFact("contact_phone", facts.phone, "Teléfono");
      pushFact("phone", facts.phone, "Teléfono");
      pushFact("contact_website", facts.website, "Sitio web");
      pushFact("website", facts.website, "Sitio web");
      pushFact("google_place_id", facts.placeId, "Google Place ID");
    }

    return {
      ok: true as const,
      facts,
      fields: proposals,
      /** Aviso para la interfaz cuando no hubo ficha de Google. */
      warning: facts
        ? null
        : "No encontramos este lugar en Google. Alux sólo redactó texto; teléfono, horarios y coordenadas quedan vacíos.",
    };
  });

/* ------------------------------------------------------------------ *
 * Fotografías de licencia libre verificable
 * ------------------------------------------------------------------ */

export interface PhotoCandidate {
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
  title: string;
  author: string;
  license: string;
  sourceUrl: string;
  provider:
    | "Wikimedia Commons"
    | "Openverse"
    | "Sitio del negocio"
    | "Enlace directo"
    | "Google"
    | "Web";
}

/**
 * Búsqueda abierta de imágenes en la web sobre el tema escrito por el editor
 * (mismo resultado que un buscador de imágenes). Cada resultado conserva la
 * página de origen para que el editor verifique el permiso antes de usarla.
 */
async function searchWebImages(query: string): Promise<PhotoCandidate[]> {
  const UA =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
  const base = { "User-Agent": UA, "Accept-Language": "es-MX,es;q=0.9" };
  const seed = await fetch(
    `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iar=images&iax=images&ia=images`,
    { headers: base },
  ).catch(() => null);
  if (!seed || !seed.ok) return [];
  const vqd = (/vqd=["']?([\d-]+)["']?/.exec(await seed.text()) ?? [])[1];
  if (!vqd) return [];
  const res = await fetch(
    `https://duckduckgo.com/i.js?l=es-es&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,,,&p=1`,
    {
      headers: {
        ...base,
        Referer: "https://duckduckgo.com/",
        Accept: "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
      },
    },
  ).catch(() => null);
  if (!res || !res.ok) return [];
  const json = (await res.json().catch(() => null)) as {
    results?: Array<Record<string, unknown>>;
  } | null;
  const out: PhotoCandidate[] = [];
  for (const r of json?.results ?? []) {
    const url = String(r.image ?? "");
    if (!url.startsWith("https://")) continue;
    const width = Number(r.width ?? 0);
    const height = Number(r.height ?? 0);
    if (width && height && (width < 600 || height < 400)) continue;
    const sourceUrl = String(r.url ?? "");
    let host = "";
    try {
      host = new URL(sourceUrl || url).hostname.replace(/^www\./, "");
    } catch {
      host = "";
    }
    out.push({
      url,
      thumbUrl: String(r.thumbnail ?? url),
      width,
      height,
      title: String(r.title ?? query).slice(0, 120),
      author: String(r.source ?? host),
      license: "Requiere permiso del titular",
      sourceUrl: sourceUrl || url,
      provider: "Web",
    });
    if (out.length >= 30) break;
  }
  return out;
}

/**
 * Fotos publicadas por el propio negocio en su sitio web. Es material que la
 * empresa difunde para promocionarse y que el editor incorpora a la ficha que
 * le construimos; se conserva siempre el enlace a la fuente.
 */
async function searchBusinessSite(website: string): Promise<PhotoCandidate[]> {
  let base: URL;
  try {
    base = new URL(website);
  } catch {
    return [];
  }
  if (base.protocol !== "https:") return [];
  const res = await fetch(base.toString(), {
    headers: { "User-Agent": "ValladolidMX-CMS/1.0" },
  }).catch(() => null);
  if (!res || !res.ok) return [];
  const html = (await res.text()).slice(0, 400_000);
  const urls = new Set<string>();
  const push = (raw: string) => {
    try {
      const abs = new URL(raw.trim(), base);
      if (abs.protocol !== "https:") return;
      if (!/\.(jpe?g|png|webp|avif)(\?|$)/i.test(abs.pathname + abs.search)) return;
      urls.add(abs.toString());
    } catch {
      /* enlace inválido */
    }
  };
  for (const m of html.matchAll(
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi,
  )) {
    push(m[1]);
  }
  for (const m of html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) push(m[1]);
  return [...urls].slice(0, 12).map((url) => ({
    url,
    thumbUrl: url,
    width: 0,
    height: 0,
    title: decodeURIComponent(url.split("/").pop() ?? "foto").slice(0, 120),
    author: base.hostname.replace(/^www\./, ""),
    license: "Publicada por el negocio",
    sourceUrl: base.toString(),
    provider: "Sitio del negocio" as const,
  }));
}

async function searchCommons(query: string): Promise<PhotoCandidate[]> {
  const url =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*" +
    "&generator=search&gsrnamespace=6&gsrlimit=20&prop=imageinfo" +
    "&iiprop=url|size|extmetadata&iiurlwidth=400&gsrsearch=" +
    encodeURIComponent(`filetype:bitmap ${query}`);
  const res = await fetch(url, { headers: { "User-Agent": "ValladolidMX-CMS/1.0" } });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    query?: { pages?: Record<string, Record<string, unknown>> };
  };
  const pages = Object.values(json.query?.pages ?? {});
  const out: PhotoCandidate[] = [];
  for (const page of pages) {
    const info = (page.imageinfo as Array<Record<string, unknown>> | undefined)?.[0];
    if (!info) continue;
    const meta = (info.extmetadata ?? {}) as Record<string, { value?: string }>;
    const license = String(meta.LicenseShortName?.value ?? "").trim();
    const width = Number(info.width ?? 0);
    const height = Number(info.height ?? 0);
    if (width < 600 || height < 400) continue;
    out.push({
      url: String(info.url ?? ""),
      thumbUrl: String(info.thumburl ?? info.url ?? ""),
      width,
      height,
      title: String(page.title ?? "").replace(/^File:/, ""),
      author: String(meta.Artist?.value ?? "")
        .replace(/<[^>]*>/g, "")
        .trim()
        .slice(0, 120),
      license,
      sourceUrl: String(info.descriptionurl ?? ""),
      provider: "Wikimedia Commons",
    });
  }
  return out;
}

async function searchOpenverse(query: string): Promise<PhotoCandidate[]> {
  const url = "https://api.openverse.org/v1/images/?page_size=20&q=" + encodeURIComponent(query);
  const res = await fetch(url, { headers: { "User-Agent": "ValladolidMX-CMS/1.0" } });
  if (!res.ok) return [];
  const json = (await res.json()) as { results?: Array<Record<string, unknown>> };
  const out: PhotoCandidate[] = [];
  for (const r of json.results ?? []) {
    const width = Number(r.width ?? 0);
    const height = Number(r.height ?? 0);
    if (width < 600 || height < 400) continue;
    const license = String(r.license ?? "").toUpperCase();
    out.push({
      url: String(r.url ?? ""),
      thumbUrl: String(r.thumbnail ?? r.url ?? ""),
      width,
      height,
      title: String(r.title ?? "Sin título").slice(0, 120),
      author: String(r.creator ?? "").slice(0, 120),
      license: `${license} ${String(r.license_version ?? "")}`.trim(),
      sourceUrl: String(r.foreign_landing_url ?? r.url ?? ""),
      provider: "Openverse",
    });
  }
  return out;
}

const SEARCH_FILLER_WORDS = new Set([
  "a",
  "al",
  "con",
  "de",
  "del",
  "el",
  "en",
  "la",
  "las",
  "los",
  "para",
  "por",
  "una",
  "unas",
  "uno",
  "unos",
  "y",
]);

/**
 * Términos territoriales frecuentes que dan contexto, pero que por sí solos
 * no acreditan que una foto corresponda al tema solicitado.
 */
const SEARCH_CONTEXT_WORDS = new Set([
  "centro",
  "historico",
  "mexico",
  "oriente",
  "maya",
  "yucatan",
  "valladolid",
  "izamal",
  "espita",
  "tizimin",
  "temozon",
  "chichen",
  "itza",
  "ekbalam",
]);

/**
 * Variantes equivalentes del mismo concepto turístico (español/inglés,
 * singular/plural y formas compuestas). Permiten reconocer la misma foto
 * aunque la página la titule de otra manera.
 */
const SEARCH_SYNONYMS: Record<string, string[]> = {
  video: ["video", "videomapping", "mapping"],
  mapping: ["mapping", "videomapping", "proyeccion", "proyecciones", "proyectado"],
  proyeccion: ["proyeccion", "proyecciones", "mapping", "videomapping"],
  espectaculo: ["espectaculo", "show", "funcion"],
  cenote: ["cenote", "cenotes"],
  hotel: ["hotel", "hoteles", "hospedaje", "hostal"],
  restaurante: ["restaurante", "restaurant", "restaurantes", "cocina", "comida"],
  iglesia: ["iglesia", "templo", "parroquia", "convento", "catedral"],
  museo: ["museo", "museum"],
  ruinas: ["ruinas", "arqueologica", "arqueologico", "zona"],
  fiesta: ["fiesta", "festival", "feria", "carnaval"],
  noche: ["noche", "nocturno", "nocturna", "night", "iluminado", "iluminada"],
  artesania: ["artesania", "artesanias", "artesanal"],
  gastronomia: ["gastronomia", "gastronomico", "culinario"],
};

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function searchTokens(value: string): string[] {
  return [
    ...new Set(
      normalizeSearchText(value)
        .split(/\s+/)
        .filter((token) => token.length > 1 && !SEARCH_FILLER_WORDS.has(token)),
    ),
  ];
}

interface QueryPlan {
  /** Tokens que identifican el tema central (sin relleno ni territorio). */
  subject: string[];
  /** Tokens territoriales presentes en la frase del editor. */
  place: string[];
  /** Frase del tema, normalizada, para detectar coincidencia exacta. */
  subjectPhrase: string;
  /** Consultas a lanzar en las fuentes abiertas, de la más precisa a la más amplia. */
  variants: string[];
}

/**
 * Descompone la frase del editor en tema + territorio y arma consultas
 * complementarias al estilo de un buscador de imágenes. El destino de trabajo
 * (`place`) se añade siempre, aunque el editor no lo escriba: si ya entró a
 * Valladolid, no tiene que repetirlo en cada búsqueda.
 */
function buildQueryPlan(query: string, place?: string | null): QueryPlan {
  const all = searchTokens(query);
  const contextTokens = place ? searchTokens(place) : [];
  const subject = all.filter(
    (token) => !SEARCH_CONTEXT_WORDS.has(token) && !contextTokens.includes(token),
  );
  const place_ = [...new Set([...all.filter((t) => SEARCH_CONTEXT_WORDS.has(t)), ...contextTokens])];
  const subjectPhrase = subject.join(" ");
  const placePhrase = (place?.trim() || place_.join(" ")).trim();

  const variants = new Set<string>();
  if (subjectPhrase && placePhrase) {
    variants.add(`"${subjectPhrase}" ${placePhrase}`);
    variants.add(`${subjectPhrase} ${placePhrase} fotos`);
    variants.add(`${subjectPhrase} ${placePhrase}`);
  }
  variants.add(query.trim());
  if (subjectPhrase && subject.length > 1) variants.add(`"${subjectPhrase}"`);
  if (subjectPhrase && !placePhrase) variants.add(subjectPhrase);

  return { subject, place: place_, subjectPhrase, variants: [...variants].slice(0, 4) };
}


/** Un token cuenta como presente si aparece igual, como sinónimo o como raíz. */
function tokenPresent(token: string, available: Set<string>, haystack: string): boolean {
  if (available.has(token)) return true;
  for (const alt of SEARCH_SYNONYMS[token] ?? []) {
    if (available.has(alt)) return true;
  }
  if (token.length >= 5) {
    const root = token.slice(0, Math.max(5, token.length - 2));
    if (haystack.includes(root)) return true;
  }
  return false;
}

export interface PhotoMatch {
  relevance: number;
  placeMatch: boolean;
}

/**
 * Evita que una coincidencia territorial amplia (p. ej. "Valladolid") haga
 * pasar una foto que no contiene el asunto buscado (p. ej. "video mapping"),
 * y prioriza las que sí nombran el territorio.
 */
function photoMatch(photo: PhotoCandidate, plan: QueryPlan): PhotoMatch {
  if (photo.provider === "Sitio del negocio" || photo.provider === "Enlace directo") {
    return { relevance: 100, placeMatch: true };
  }

  const haystack = normalizeSearchText(
    [photo.title, photo.author, photo.sourceUrl, photo.url].filter(Boolean).join(" "),
  );
  const available = new Set(haystack.split(/\s+/).filter(Boolean));

  const subjectMatches = plan.subject.filter((t) => tokenPresent(t, available, haystack)).length;
  const placeMatches = plan.place.filter((t) => tokenPresent(t, available, haystack)).length;
  const required =
    plan.subject.length === 0 ? 0 : Math.max(1, Math.ceil(plan.subject.length * 0.6));

  if (subjectMatches < required) return { relevance: 0, placeMatch: false };
  if (plan.subject.length === 0 && placeMatches === 0) return { relevance: 0, placeMatch: false };

  let relevance = subjectMatches * 10 + placeMatches * 4;
  if (plan.subjectPhrase && haystack.includes(plan.subjectPhrase)) relevance += 25;
  if (photo.provider === "Google") relevance += 6;
  if (photo.width >= 1200 && photo.height >= 800) relevance += 3;

  return { relevance, placeMatch: placeMatches > 0 };
}

/**
 * Fotos del propio lugar o sede publicadas en Google (ficha del negocio o del
 * sitio). Es la fuente que de verdad corresponde al territorio: se resuelve la
 * sede por nombre y se descargan sus fotos por el mismo flujo gobernado.
 */
async function searchGooglePhotos(query: string): Promise<PhotoCandidate[]> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!lovableKey || !mapsKey) return [];
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": mapsKey,
  };
  const res = await fetch(`${GATEWAY_URL}/places/v1/places:searchText`, {
    method: "POST",
    headers: {
      ...headers,
      "X-Goog-FieldMask": "places.id,places.displayName,places.photos",
    },
    body: JSON.stringify({ textQuery: query, languageCode: "es", maxResultCount: 3 }),
  }).catch(() => null);
  if (!res || !res.ok) return [];
  const json = (await res.json()) as {
    places?: Array<{
      displayName?: { text?: string };
      id?: string;
      photos?: Array<{
        name?: string;
        widthPx?: number;
        heightPx?: number;
        authorAttributions?: Array<{ displayName?: string; uri?: string }>;
      }>;
    }>;
  };
  const out: PhotoCandidate[] = [];
  for (const place of json.places ?? []) {
    for (const photo of (place.photos ?? []).slice(0, 6)) {
      if (!photo.name) continue;
      const media = await fetch(
        `${GATEWAY_URL}/places/v1/${photo.name}/media?maxWidthPx=1600&skipHttpRedirect=true`,
        { headers },
      ).catch(() => null);
      if (!media || !media.ok) continue;
      const body = (await media.json()) as { photoUri?: string };
      if (!body.photoUri) continue;
      const attr = photo.authorAttributions?.[0];
      out.push({
        url: body.photoUri,
        thumbUrl: body.photoUri,
        width: Number(photo.widthPx ?? 0),
        height: Number(photo.heightPx ?? 0),
        title: place.displayName?.text ?? query,
        author: attr?.displayName ?? "Google",
        license: "Publicada en Google por el negocio o visitantes",
        sourceUrl: attr?.uri ?? `https://www.google.com/maps/place/?q=place_id:${place.id ?? ""}`,
        provider: "Google",
      });
    }
  }
  return out;
}

export interface OwnerContact {
  host: string;
  sourceUrl: string;
  emails: string[];
  phones: string[];
}

/**
 * Datos de contacto publicados en las mismas páginas de origen de las fotos,
 * para que el editor pueda pedir permiso al titular. Sólo se lee lo que la
 * página ya publica; no se almacena nada.
 */
async function extractOwnerContacts(pages: string[]): Promise<OwnerContact[]> {
  const out: OwnerContact[] = [];
  await Promise.all(
    pages.map(async (page) => {
      let base: URL;
      try {
        base = new URL(page);
      } catch {
        return;
      }
      if (base.protocol !== "https:") return;
      const res = await fetch(base.toString(), {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          "Accept-Language": "es-MX,es;q=0.9",
        },
      }).catch(() => null);
      if (!res || !res.ok) return;
      const html = (await res.text().catch(() => "")).slice(0, 400_000);
      if (!html) return;
      const emails = new Set<string>();
      for (const m of html.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)) {
        const value = m[0].toLowerCase();
        if (/\.(png|jpe?g|webp|gif|svg)$/i.test(value)) continue;
        if (/(sentry|wixpress|example|noreply|no-reply)/i.test(value)) continue;
        emails.add(value);
        if (emails.size >= 4) break;
      }
      const phones = new Set<string>();
      for (const m of html.matchAll(
        /(?:tel:|whatsapp[^0-9+]{0,20})?(\+?52[\s.-]?)?(\(?\d{2,3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/gi,
      )) {
        const digits = `${m[1] ?? ""}${m[2]}`.replace(/[^\d+]/g, "");
        if (digits.replace(/\D/g, "").length < 10) continue;
        phones.add(digits);
        if (phones.size >= 4) break;
      }
      if (!emails.size && !phones.size) return;
      out.push({
        host: base.hostname.replace(/^www\./, ""),
        sourceUrl: base.toString(),
        emails: [...emails],
        phones: [...phones],
      });
    }),
  );
  return out;
}

/* ------------------------------------------------------------------ *
 * Alux IA aplicado a la búsqueda de fotos
 *
 * Dos pasos, ambos opcionales: si el proveedor no responde, la búsqueda
 * sigue funcionando con el plan y el filtro determinista de siempre.
 *  1. Entender la frase del editor y escribirla como la escribiría alguien
 *     experto en buscar imágenes (frase exacta, sinónimos, español/inglés).
 *  2. Revisar las candidatas y quedarse sólo con las que de verdad muestran
 *     lo pedido, en el orden en que conviene verlas.
 * ------------------------------------------------------------------ */

const PHOTO_AI_MODEL = "openai/gpt-6-astra";

async function askAlux(system: string, prompt: string): Promise<string | null> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return null;
  try {
    const [{ streamText }, { createLovableAiGatewayProvider }] = await Promise.all([
      import("ai"),
      import("@/lib/ai-gateway.server"),
    ]);
    const result = streamText({
      model: createLovableAiGatewayProvider(apiKey)(PHOTO_AI_MODEL),
      system,
      prompt,
      providerOptions: { lovable: { reasoningEffort: "low" } },
    });
    return await result.text;
  } catch (err) {
    console.error("[alux.photos] IA no disponible", err instanceof Error ? err.message : err);
    return null;
  }
}

interface AiSearchPlan {
  subject: string;
  queries: string[];
}

/** Paso 1: convertir la frase del editor en consultas de buscador de imágenes. */
async function planWithAi(query: string, place: string | null): Promise<AiSearchPlan | null> {
  const text = await askAlux(
    [
      "Eres experto en buscar fotografías en buscadores de imágenes.",
      "Devuelves SOLO JSON válido con la forma:",
      '{"subject":"tema central en pocas palabras","queries":["consulta 1","consulta 2","consulta 3","consulta 4"]}',
      "Reglas: la primera consulta lleva el tema entre comillas junto al lugar;",
      "incluye una variante con el nombre propio del sitio o sede si se deduce del tema;",
      "incluye una variante en inglés; no inventes lugares de otra región.",
    ].join(" "),
    [
      `FRASE DEL EDITOR: ${query}`,
      `LUGAR DE TRABAJO: ${place ?? "Oriente Maya de Yucatán, México"}`,
    ].join("\n"),
  );
  const parsed = extractJson(text ?? "") as { subject?: unknown; queries?: unknown } | null;
  const queries = Array.isArray(parsed?.queries)
    ? parsed.queries.filter((q): q is string => typeof q === "string" && q.trim().length > 2)
    : [];
  if (!queries.length) return null;
  return {
    subject: typeof parsed?.subject === "string" ? parsed.subject.trim() : query,
    queries: queries.slice(0, 4).map((q) => q.trim().slice(0, 160)),
  };
}

/** Paso 2: quedarse sólo con las fotos que muestran lo pedido, ya ordenadas. */
async function rankWithAi(
  query: string,
  place: string | null,
  candidates: PhotoCandidate[],
): Promise<PhotoCandidate[] | null> {
  if (candidates.length < 2) return null;
  const listed = candidates.slice(0, 40);
  const text = await askAlux(
    [
      "Filtras resultados de búsqueda de imágenes para una guía turística.",
      "Recibes candidatas con su título, autor y página de origen.",
      "Devuelves SOLO JSON válido: {\"keep\":[índices en orden de utilidad]}.",
      "Conserva únicamente las que razonablemente muestran lo pedido en el lugar indicado.",
      "Descarta lo ajeno al tema aunque mencione el lugar, y lo de otra ciudad o país.",
      "Si ninguna sirve, devuelve una lista vacía.",
    ].join(" "),
    [
      `SE BUSCA: ${query}`,
      `LUGAR: ${place ?? "Oriente Maya de Yucatán, México"}`,
      "CANDIDATAS:",
      ...listed.map(
        (p, i) =>
          `${i}. ${p.title} | autor: ${p.author} | origen: ${p.sourceUrl} | fuente: ${p.provider}`,
      ),
    ].join("\n"),
  );
  const parsed = extractJson(text ?? "") as { keep?: unknown } | null;
  if (!Array.isArray(parsed?.keep)) return null;
  const kept = parsed.keep
    .map((i) => Number(i))
    .filter((i) => Number.isInteger(i) && i >= 0 && i < listed.length)
    .map((i) => listed[i]!);
  return kept.length ? kept : null;
}


export const aluxFindPhotos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { query: string; website?: string | null; place?: string | null }) => {
    if (!d?.query || d.query.trim().length < 3) throw new Error("invalid_input");
    return {
      query: d.query.trim().slice(0, 160),
      website: typeof d.website === "string" && d.website.trim() ? d.website.trim() : null,
      place: typeof d.place === "string" && d.place.trim() ? d.place.trim().slice(0, 120) : null,
    };
  })
  .handler(async ({ data, context }) => {
    await assertEditorial(context);
    const site = data.website
      ? await searchBusinessSite(data.website).catch(() => [] as PhotoCandidate[])
      : [];

    // Paso 1: Alux entiende la frase y la escribe como un experto en buscar
    // imágenes. Si la IA no responde, se usa el plan determinista de siempre.
    const plan = buildQueryPlan(data.query, data.place);
    const ai = await planWithAi(data.query, data.place).catch(() => null);
    const variants = [...new Set([...(ai?.queries ?? []), ...plan.variants])].slice(0, 5);
    const placeQuery = [ai?.subject || plan.subjectPhrase || data.query, data.place]
      .filter(Boolean)
      .join(" ");

    const webBatches = await Promise.all(
      variants.map((variant) => searchWebImages(variant).catch(() => [] as PhotoCandidate[])),
    );
    const [google, commons, openverse] = await Promise.all([
      searchGooglePhotos(placeQuery).catch(() => [] as PhotoCandidate[]),
      searchCommons(placeQuery).catch(() => [] as PhotoCandidate[]),
      searchOpenverse(placeQuery).catch(() => [] as PhotoCandidate[]),
    ]);

    const seen = new Set<string>();
    const pool: PhotoCandidate[] = [];
    for (const photo of [...site, ...webBatches.flat(), ...google, ...commons, ...openverse]) {
      if (!photo.url || seen.has(photo.url)) continue;
      seen.add(photo.url);
      pool.push(photo);
    }

    const scored = pool
      .map((photo) => ({ photo, ...photoMatch(photo, plan) }))
      .filter((entry) => entry.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance);

    // Si alguna foto sí nombra el territorio, se descartan las que sólo
    // coinciden con el tema: es material de otro lugar.
    const territorial = scored.filter((entry) => entry.placeMatch);
    const heuristic = (plan.place.length && territorial.length ? territorial : scored).map(
      ({ photo }) => photo,
    );

    // Paso 2: Alux revisa las candidatas y conserva sólo las que muestran lo
    // pedido. El orden por palabras clave queda como respaldo.
    const ordered = heuristic.length ? heuristic : pool;
    const curated = await rankWithAi(data.query, data.place, ordered).catch(() => null);
    const visible = (curated ?? heuristic).slice(0, 24);

    // Contacto publicado por el titular en las páginas de origen, para pedirle
    // permiso. Se lee sólo lo que ya está publicado; no se guarda nada.
    const pageSet = new Set<string>();
    if (data.website) pageSet.add(data.website);
    for (const p of visible) {
      if (p.provider === "Web" && p.sourceUrl?.startsWith("https://")) {
        pageSet.add(p.sourceUrl);
      }
      if (pageSet.size >= 6) break;
    }
    const contacts = await extractOwnerContacts([...pageSet]).catch(() => [] as OwnerContact[]);

    return {
      ok: true as const,
      photos: visible,
      contacts,
      usedQuery: data.query,
      relaxed: false,
    };
  });

/**
 * Descarga la foto elegida en el servidor (evita CORS) y la entrega en base64
 * para que el cliente la pase por el mismo ingreso gobernado: optimización,
 * ampliación opcional con Alux IA, original inmutable y variantes.
 */
export const aluxFetchPhotoBytes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { url: string }) => {
    if (!d?.url) throw new Error("invalid_input");
    let parsed: URL;
    try {
      parsed = new URL(d.url);
    } catch {
      throw new Error("invalid_input");
    }
    if (parsed.protocol !== "https:") throw new Error("invalid_input");
    return { url: parsed.toString() };
  })
  .handler(async ({ data, context }) => {
    await assertEditorial(context);
    const res = await fetch(data.url, { headers: { "User-Agent": "ValladolidMX-CMS/1.0" } });
    if (!res.ok) throw new Error("photo_download_failed");
    const mime = res.headers.get("content-type") ?? "image/jpeg";
    if (!mime.startsWith("image/")) throw new Error("photo_not_an_image");
    const buffer = new Uint8Array(await res.arrayBuffer());
    if (buffer.byteLength > MAX_PHOTO_BYTES) throw new Error("photo_too_large");
    let binary = "";
    for (let offset = 0; offset < buffer.length; offset += 32_768) {
      binary += String.fromCharCode(...buffer.subarray(offset, offset + 32_768));
    }
    return { ok: true as const, mime, bytesBase64: btoa(binary) };
  });
