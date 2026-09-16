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
  const url =
    "https://api.openverse.org/v1/images/?page_size=20&q=" +
    encodeURIComponent(query);
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
      for (const m of html.matchAll(
        /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
      )) {
        const value = m[0].toLowerCase();
        if (/\.(png|jpe?g|webp|gif|svg)$/i.test(value)) continue;
        if (/(sentry|wixpress|example|noreply|no-reply)/i.test(value)) continue;
        emails.add(value);
        if (emails.size >= 4) break;
      }
      const phones = new Set<string>();
      for (const m of html.matchAll(/(?:tel:|whatsapp[^0-9+]{0,20})?(\+?52[\s.-]?)?(\(?\d{2,3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/gi)) {
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

export const aluxFindPhotos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { query: string; website?: string | null }) => {
    if (!d?.query || d.query.trim().length < 3) throw new Error("invalid_input");
    return {
      query: d.query.trim().slice(0, 160),
      website: typeof d.website === "string" && d.website.trim() ? d.website.trim() : null,
    };
  })
  .handler(async ({ data, context }) => {
    await assertEditorial(context);
    const site = data.website
      ? await searchBusinessSite(data.website).catch(() => [] as PhotoCandidate[])
      : [];

    // Consulta literal en todas las fuentes: nunca se amplía la búsqueda, para
    // no mostrar material ajeno al lugar o al evento solicitado.
    const [web, google, commons, openverse] = await Promise.all([
      searchWebImages(data.query).catch(() => [] as PhotoCandidate[]),
      searchGooglePhotos(data.query).catch(() => [] as PhotoCandidate[]),
      searchCommons(data.query).catch(() => [] as PhotoCandidate[]),
      searchOpenverse(data.query).catch(() => [] as PhotoCandidate[]),
    ]);

    const seen = new Set<string>();
    const photos = [...site, ...google, ...web, ...commons, ...openverse].filter((p) => {
      if (!p.url || seen.has(p.url)) return false;
      seen.add(p.url);
      return true;
    });
    return {
      ok: true as const,
      photos: photos.slice(0, 24),
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
