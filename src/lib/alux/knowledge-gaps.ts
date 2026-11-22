/**
 * Entrenamiento de Alux · preguntas que no supo contestar y ficha oficial
 * de cada destino (reglas puras, sin servidor ni navegador).
 *
 * - Una pregunta se registra solo si tiene sustancia (no saludos) y Alux
 *   no tenía datos publicados o él mismo dijo no tenerlos.
 * - Nunca se guardan teléfonos, correos ni enlaces: se quitan antes.
 * - La ficha oficial del destino vive en la Base de conocimiento
 *   (categoría «destinos», slug `destino-<slug>`) y se inyecta tal cual
 *   en la web y en WhatsApp: editarla aplica en la siguiente respuesta.
 */

export type GapChannel = "web" | "whatsapp" | "chat";
export type GapReason = "sin_datos" | "no_supo";
export type GapStatus = "abierta" | "resuelta" | "ignorada";

export const GAP_REASON_LABEL: Record<GapReason, string> = {
  sin_datos: "No había nada publicado",
  no_supo: "Alux dijo no tener el dato",
};
export const GAP_CHANNEL_LABEL: Record<GapChannel, string> = {
  web: "Ventana de Alux",
  whatsapp: "WhatsApp",
  chat: "Página de Alux",
};

/** Quita correos, teléfonos y enlaces; deja la pregunta en una línea. */
export function scrubGapQuestion(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, "[correo]")
    .replace(/https?:\/\/\S+|www\.\S+/gi, "[enlace]")
    .replace(/\+?\d[\d\s().-]{6,}\d/g, "[número]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

/** Clave para juntar la misma pregunta escrita distinto (acentos, signos, mayúsculas). */
export function gapQuestionKey(text: string): string {
  return scrubGapQuestion(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

const SMALL_TALK =
  /^(hola|buen[oa]s?( dias| tardes| noches)?|hi|hello|hey|bonjour|ciao|ola|oi|hallo|gracias|muchas gracias|thanks|thank you|ok|okay|vale|si|no|perfecto|listo|adios|bye)$/;

/** ¿Vale la pena guardarla? Al menos 3 palabras y no es saludo ni cortesía. */
export function isGapWorthy(question: string): boolean {
  const key = gapQuestionKey(question);
  if (key.length < 8 || SMALL_TALK.test(key)) return false;
  return key.split(" ").filter((w) => w.length > 1).length >= 3;
}

/** Frases con las que Alux admite no tener el dato, en los 6 idiomas. */
const NO_DATA =
  /(no (tengo|cuento con|encuentro|dispongo de)( a(u|ú)n)? (esa |ese |la |el |los |las )?(informaci(o|ó)n|datos?|detalles?)|no tengo publicad|no aparece (publicad|en (mis|los) datos)|i (don't|do not) have (that |any |the )?(information|details|data)|i couldn't find|je n'ai pas (cette |d')?information|non ho (questa |informazioni|dati)|n(ã|a)o tenho (essa |informa(ç|c)(õ|o)es|dados)|ich habe (dazu )?keine (informationen|daten))/i;

export function replyAdmitsNoData(reply: string): boolean {
  return NO_DATA.test(reply);
}

/** Decide si la plática deja una pregunta para entrenar a Alux. */
export function detectKnowledgeGap(input: {
  readonly question: string;
  readonly reply: string;
  readonly candidateCount: number;
  readonly knowledgeMatches?: number;
}): GapReason | null {
  if (!isGapWorthy(input.question)) return null;
  if (replyAdmitsNoData(input.reply)) return "no_supo";
  if (input.candidateCount === 0 && (input.knowledgeMatches ?? 0) === 0) return "sin_datos";
  return null;
}

/* ── Ficha oficial del destino ─────────────────────────────────────────── */

export const DESTINATION_BRIEF_CATEGORY = "destinos" as const;

export function destinationBriefSlug(destinationSlug: string): string {
  return `destino-${destinationSlug}`.slice(0, 96);
}

export function parseBriefTags(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of raw.split(/[,\n]/)) {
    const tag = t.trim().replace(/^#/, "").slice(0, 40);
    const k = tag.toLowerCase();
    if (tag && !seen.has(k)) {
      seen.add(k);
      out.push(tag);
    }
    if (out.length >= 20) break;
  }
  return out;
}

/** Bloque que recibe el modelo. Describe; no autoriza precios ni lugares nuevos. */
export function formatDestinationBrief(brief: {
  readonly title: string;
  readonly summary: string | null;
  readonly body: string;
  readonly tags: readonly string[];
}): string {
  const lines = [
    `FICHA OFICIAL DEL DESTINO «${brief.title}» (escrita por el equipo de Valladolid.mx; úsala para describir el destino con estas ideas y este tono; no autoriza precios ni recomendar lugares que no estén en los datos):`,
  ];
  if (brief.summary) lines.push(brief.summary.slice(0, 600));
  lines.push(brief.body.slice(0, 1500));
  if (brief.tags.length) lines.push(`Etiquetas clave: ${brief.tags.slice(0, 20).join(", ")}`);
  return lines.join("\n");
}
