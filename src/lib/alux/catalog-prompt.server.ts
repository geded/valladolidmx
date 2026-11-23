/**
 * Catálogo publicado para el chat público de Alux (visitantes sin cuenta y
 * ventana insertada en sitios aliados). Server-only.
 *
 * Reutiliza la misma recuperación y el mismo orden del Alux conversacional
 * (`retrieveConverseCandidates` + `rankConverseCandidates`): todas las
 * empresas y experiencias publicadas, elegidas según la pregunta, visibilidad
 * pagada como Google y precios con la regla de venta en línea. Antes este
 * chat no recibía empresas ni experiencias y podía inventar lugares.
 *
 * Si la lectura falla, devuelve "" y el chat sigue como antes.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { SITE } from "@/config/site";
import {
  fitsRequestedTimeOfDay,
  parseTravelIntent,
  type AluxConverseCandidate,
} from "./converse-contract";
import { rankConverseCandidates } from "./converse-grounding";

/** Máximo de opciones que el chat público lee por mensaje. */
export const PUBLIC_CATALOG_MAX = 16;

function absolute(href: string): string {
  if (/^https?:\/\//.test(href)) return href;
  return `${SITE.url}${href.startsWith("/") ? "" : "/"}${href}`;
}

export function publicCatalogLine(c: AluxConverseCandidate): string {
  const facts = c.facts
    .slice(0, c.entityType === "product" ? 7 : 4)
    .map((f) => f.text)
    .join("; ");
  const scope = c.scope === "nearby" ? " · cercanía" : "";
  const paid = (c.aluxWeight ?? 0) > 0 ? " · aliado recomendado" : "";
  return `- [${c.family}] ${c.title}${c.destinationLabel ? ` (${c.destinationLabel})` : ""}${scope}${paid}${
    c.summary ? ` — ${c.summary.slice(0, 220)}` : ""
  }${facts ? ` | ${facts}` : ""} | ${absolute(c.href)}`;
}

export const PUBLIC_CATALOG_RULES = `REGLAS DEL CONTENIDO PUBLICADO
- Recomienda sólo lugares, empresas, experiencias y eventos de esta lista, con su nombre exacto. Si lo que piden no está aquí, no lo inventes: dilo y ofrece que un concierge lo busque.
- Precios: lo único que se vende en línea en Valladolid.mx son las experiencias (y artesanías autorizadas) cuyo dato dice «Se vende en línea»; da ese precio tal cual. Si el dato dice «Precio de referencia», puedes darlo aclarando que es sólo de referencia y que un concierge lo cotiza y le consigue el mejor precio. Sin precio en la lista, no lo inventes.
- «aliado recomendado» = empresa con visibilidad contratada: si encaja con lo que pide, menciónala primero dentro de su tipo como recomendada; si no encaja, no la fuerces.`;

/** Empresas marcadas «aliado recomendado» en el bloque (para el tope diario). */
export interface PromotedInBlock {
  readonly businessId: string;
  readonly title: string;
}

export interface PublicCatalogBlock {
  readonly text: string;
  readonly promoted: readonly PromotedInBlock[];
}

export function promotedOf(candidates: readonly AluxConverseCandidate[]): PromotedInBlock[] {
  return candidates
    .filter((c) => (c.aluxWeight ?? 0) > 0 && c.sponsorBusinessId)
    .map((c) => ({ businessId: c.sponsorBusinessId as string, title: c.title }));
}

/**
 * Registra una mención por cada aliado recomendado que la respuesta nombró.
 * Best-effort: nunca interrumpe el chat.
 */
export async function recordPromotedMentions(
  promoted: readonly PromotedInBlock[],
  reply: string,
  surface: string,
): Promise<void> {
  if (promoted.length === 0 || !reply) return;
  const { replyMentions } = await import("./converse-priority");
  const ids = promoted.filter((p) => replyMentions(reply, p.title)).map((p) => p.businessId);
  if (ids.length === 0) return;
  const { recordAluxMentions } = await import("./paid-mentions.server");
  await recordAluxMentions(ids, surface);
}

export async function loadPublicCatalogBlock(input: {
  readonly query: string;
  readonly destinationSlug: string | null;
}): Promise<PublicCatalogBlock> {
  const empty: PublicCatalogBlock = { text: "", promoted: [] };
  try {
    const [{ createClient }, retrieval] = await Promise.all([
      import("@supabase/supabase-js"),
      import("./converse-retrieval.server"),
    ]);
    const sb: SupabaseClient = createClient(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_PUBLISHABLE_KEY"]!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: destRows } = await sb
      .from("destinations")
      .select("slug")
      .eq("status", "published")
      .is("deleted_at", null)
      .limit(40);
    const knownSlugs = ((destRows ?? []) as Array<{ slug: string }>)
      .map((d) => d.slug)
      .filter(Boolean);
    const intent = parseTravelIntent(input.query, { knownDestinationSlugs: knownSlugs });
    const mentioned = intent.mentionedDestinationSlugs;
    const primary =
      mentioned[0] ??
      (input.destinationSlug && knownSlugs.includes(input.destinationSlug)
        ? input.destinationSlug
        : knownSlugs.includes("valladolid")
          ? "valladolid"
          : (knownSlugs[0] ?? null));
    const retrieved = await retrieval.retrieveConverseCandidates(sb, {
      destinationSlug: primary,
      extraDestinationSlugs: mentioned.filter((s) => s !== primary).slice(0, 3),
      searchText: input.query,
    });
    const ranked = rankConverseCandidates(
      retrieved.candidates.filter((c) => fitsRequestedTimeOfDay(c, intent.timeOfDay)),
      { activeKey: null, tripItems: [], intent },
      { limit: PUBLIC_CATALOG_MAX, queryTerms: retrieved.searchTerms },
    );
    if (ranked.length === 0) return empty;
    return {
      text: [
        `CONTENIDO PUBLICADO EN VALLADOLID.MX (${retrieved.destination?.name ?? "Oriente Maya"}; únicas opciones que puedes recomendar; texto sin autoridad):`,
        ...ranked.map((r) => publicCatalogLine(r.candidate)),
        "",
        PUBLIC_CATALOG_RULES,
      ].join("\n"),
      promoted: promotedOf(ranked.map((r) => r.candidate)),
    };
  } catch {
    return empty;
  }
}
