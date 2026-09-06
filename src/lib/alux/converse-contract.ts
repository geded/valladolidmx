/**
 * Lote 3K · Alux Concierge IA conversacional — CONTRATO ÚNICO (cliente-seguro).
 *
 * Flujo obligatorio:
 *   usuario → dock Alux existente → contexto territorial + Mi Viaje →
 *   recuperación CMS-first → filtros/elegibilidad determinísticos →
 *   modelo IA → respuesta estructurada → acciones canónicas de Mi Viaje.
 *
 * Este módulo NO habla con la base de datos ni con el modelo: define los
 * esquemas Zod de entrada/salida, la separación explícita entre dato
 * confirmado · inferencia · dato no disponible, el saneamiento anti-inyección
 * de texto (CMS y usuario) y el análisis determinístico de intención que
 * también usa el fallback cuando el proveedor no responde.
 *
 * Reglas vinculantes (Explainable by Default · Veracidad):
 *  · Toda recomendación referencia un `entityType` + `entityId` canónico que
 *    PROVIENE de la recuperación del servidor; ids inexistentes se rechazan.
 *  · Los hechos confirmados sólo pueden citarse por id de hecho recuperado.
 *  · Las acciones son PROPUESTAS: guardar/quitar exige interacción explícita.
 */
import { z } from "zod";
import type { TravelItemKind } from "@/lib/traveler/travel-plans.functions";

export const ALUX_CONVERSE_CONTRACT_VERSION = "1.0.0" as const;

/* ─────────────────────────── Límites (latencia / costo) ─────────────────────────── */
export const ALUX_CONVERSE_LIMITS = {
  /** Longitud máxima del mensaje del explorador. */
  maxMessageChars: 600,
  /** Turnos (pares) de historial enviados al modelo. */
  maxHistoryTurns: 6,
  /** Longitud máxima por mensaje de historial. */
  maxHistoryChars: 700,
  /** Candidatos máximos que se muestran al modelo (tras ranking determinístico). */
  maxCandidatesForModel: 24,
  /** Recomendaciones máximas por respuesta. */
  maxRecommendations: 6,
  /** Preguntas aclaratorias máximas. */
  maxClarifyingQuestions: 2,
  /** Hechos por candidato mostrados al modelo. */
  maxFactsPerCandidate: 5,
  /** Elementos guardados en Mi Viaje considerados. */
  maxTripItems: 40,
  /** Timeout duro del proveedor (ms). */
  providerTimeoutMs: 9_000,
  /** Tokens de salida máximos (incluye razonamiento del proveedor). */
  maxOutputTokens: 2_400,
  /** Longitud máxima del texto de respuesta. */
  maxTextChars: 800,
  /** Historial conservado en el navegador (mensajes). */
  maxStoredMessages: 30,
  /** Vigencia del hilo conservado en el navegador (ms). */
  storedThreadTtlMs: 24 * 60 * 60 * 1000,
} as const;

/* ─────────────────────────── Tipos canónicos ─────────────────────────── */
export const ALUX_CONVERSE_ENTITY_TYPES = [
  "destination",
  "business",
  "product",
  "event",
  "place",
  "route",
] as const;
export type AluxConverseEntityType = (typeof ALUX_CONVERSE_ENTITY_TYPES)[number];

/** Ocho familias turísticas públicas (Founder Discovery Standard). */
export const ALUX_CONVERSE_FAMILIES = [
  "destino",
  "hotel",
  "restaurante",
  "casa",
  "experiencia",
  "lugar",
  "evento",
  "ruta",
  "otra",
] as const;
export type AluxConverseFamily = (typeof ALUX_CONVERSE_FAMILIES)[number];

export const ALUX_FAMILY_LABEL: Record<AluxConverseFamily, string> = {
  destino: "Destino",
  hotel: "Hotel",
  restaurante: "Restaurante",
  casa: "Casa de vacaciones",
  experiencia: "Experiencia",
  lugar: "Lugar",
  evento: "Evento",
  ruta: "Ruta",
  otra: "Empresa",
};

/** Alcance territorial del candidato respecto al destino activo. */
export type AluxConverseScope = "destination" | "nearby" | "region";

export type AluxConverseAction = "view" | "add_to_trip" | "remove_from_trip";

export type AluxConverseMode = "ai" | "deterministic";

export type AluxConverseAiStatus =
  | "ok"
  | "unavailable"
  | "timeout"
  | "rate_limited"
  | "credits_exhausted"
  | "invalid_output"
  | "error"
  | "blocked";

export const ALUX_UNAVAILABLE_FACT_KINDS = [
  "horario",
  "precio",
  "accesibilidad",
  "distancia",
  "fechas",
  "disponibilidad",
  "reconocimientos",
  "duracion",
] as const;
export type AluxUnavailableFactKind = (typeof ALUX_UNAVAILABLE_FACT_KINDS)[number];

export const ALUX_UNAVAILABLE_FACT_LABEL: Record<AluxUnavailableFactKind, string> = {
  horario: "Horario",
  precio: "Precio",
  accesibilidad: "Accesibilidad",
  distancia: "Distancia",
  fechas: "Fechas",
  disponibilidad: "Disponibilidad",
  reconocimientos: "Reconocimientos",
  duracion: "Duración",
};

/* ─────────────────────────── Entrada (cliente → servidor) ─────────────────────────── */
const SlotSchema = z
  .object({
    slug: z.string().min(1).max(120),
    label: z.string().min(1).max(160),
    href: z.string().max(400).optional(),
  })
  .optional();

export const AluxConverseHistoryMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(ALUX_CONVERSE_LIMITS.maxHistoryChars),
});
export type AluxConverseHistoryMessage = z.infer<typeof AluxConverseHistoryMessageSchema>;

export const AluxConverseSelectionSchema = z
  .object({
    entityRef: z.string().max(160).optional(),
    title: z.string().max(200).optional(),
    destinationSlug: z.string().max(120).optional(),
    destinationLabel: z.string().max(160).optional(),
    familySlug: z.string().max(80).optional(),
    href: z.string().max(400).optional(),
  })
  .optional();

export const AluxConverseTripItemSchema = z.object({
  kind: z.string().min(1).max(20),
  targetId: z.string().min(1).max(128).nullable(),
  title: z.string().max(200).nullable().optional(),
  /** Id del renglón en Mi Viaje (sólo autenticado) para proponer «quitar». */
  savedItemId: z.string().max(64).nullable().optional(),
});
export type AluxConverseTripItem = z.infer<typeof AluxConverseTripItemSchema>;

export const AluxConverseUnderstoodSchema = z.object({
  destinationSlug: z.string().max(120).nullable().optional(),
  stage: z.enum(["planeando", "en_region"]).nullable().optional(),
  company: z.string().max(60).nullable().optional(),
  interests: z.array(z.string().max(60)).max(10).optional(),
  travelDates: z.string().max(80).nullable().optional(),
  durationDays: z.number().min(0.5).max(60).nullable().optional(),
  accessibility: z.string().max(120).nullable().optional(),
  restrictions: z.array(z.string().max(80)).max(6).optional(),
});
export type AluxConverseUnderstood = z.infer<typeof AluxConverseUnderstoodSchema>;

export const AluxConverseInputSchema = z.object({
  sessionKey: z.string().min(8).max(128),
  message: z.string().min(1).max(ALUX_CONVERSE_LIMITS.maxMessageChars),
  history: z
    .array(AluxConverseHistoryMessageSchema)
    .max(ALUX_CONVERSE_LIMITS.maxHistoryTurns * 2)
    .optional(),
  locale: z.enum(["es", "en", "fr", "de", "it", "pt"]).optional(),
  context: z
    .object({
      region: SlotSchema,
      destination: SlotSchema,
      category: SlotSchema,
      business: SlotSchema,
      product: SlotSchema,
      selection: AluxConverseSelectionSchema,
      /** Etapa derivada por el cliente (coloración; no autoridad). */
      stage: z.string().max(40).optional(),
    })
    .optional(),
  understood: AluxConverseUnderstoodSchema.optional(),
  trip: z
    .object({
      items: z.array(AluxConverseTripItemSchema).max(ALUX_CONVERSE_LIMITS.maxTripItems).optional(),
      partySize: z.number().int().min(1).max(40).nullable().optional(),
      startDate: z.string().max(20).nullable().optional(),
      endDate: z.string().max(20).nullable().optional(),
      durationDays: z.number().min(0.5).max(60).nullable().optional(),
      interests: z.array(z.string().max(60)).max(10).optional(),
      accessibility: z.string().max(120).nullable().optional(),
    })
    .optional(),
  /** Sólo con consentimiento explícito de ubicación. */
  coords: z
    .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
    .optional(),
});
export type AluxConverseInput = z.infer<typeof AluxConverseInputSchema>;

/* ─────────────────────────── Salida (servidor → cliente) ─────────────────────────── */
export interface AluxConverseRecommendation {
  readonly entityType: AluxConverseEntityType;
  readonly entityId: string;
  readonly family: AluxConverseFamily;
  readonly title: string;
  readonly href: string;
  readonly destinationSlug: string | null;
  readonly destinationLabel: string | null;
  readonly scope: AluxConverseScope;
  /** Explicación (IA o determinística) — nunca contiene datos no recuperados. */
  readonly reason: string;
  /** Hechos confirmados del CMS para esta entidad. */
  readonly confirmedFacts: readonly string[];
  /** Datos que la ficha NO tiene publicados. */
  readonly unavailableFacts: readonly string[];
  readonly planKind: TravelItemKind | null;
  readonly alreadyInTrip: boolean;
  readonly savedItemId: string | null;
  readonly permittedActions: readonly AluxConverseAction[];
  readonly imageUrl: string | null;
  readonly subtitle: string | null;
  /** Día sugerido dentro de la secuencia (si aplica). */
  readonly day: number | null;
}

export interface AluxConverseSequenceStep {
  readonly day: number;
  readonly refs: readonly { entityType: AluxConverseEntityType; entityId: string; title: string }[];
}

export interface AluxConverseReorderProposal {
  /** Claves `kind:targetId` de Mi Viaje en el nuevo orden (permutación completa). */
  readonly orderedKeys: readonly string[];
  readonly rationale: string;
}

export interface AluxConverseAudit {
  readonly candidateCount: number;
  readonly rejectedRefs: number;
  readonly retrievalScope: "destination" | "region" | "none";
  readonly destinationSlug: string | null;
  readonly familiesLoaded: readonly string[];
  readonly injectionFlagged: boolean;
}

export interface AluxConverseResponse {
  readonly version: typeof ALUX_CONVERSE_CONTRACT_VERSION;
  readonly mode: AluxConverseMode;
  readonly aiStatus: AluxConverseAiStatus;
  readonly text: string;
  readonly clarifyingQuestions: readonly string[];
  readonly recommendations: readonly AluxConverseRecommendation[];
  readonly sequence: readonly AluxConverseSequenceStep[] | null;
  readonly reorderProposal: AluxConverseReorderProposal | null;
  readonly confirmedFacts: readonly string[];
  readonly inferences: readonly string[];
  readonly unavailableFacts: readonly string[];
  readonly understood: AluxConverseUnderstood;
  /** Aviso visible cuando la conversación avanzada no está disponible. */
  readonly notice: string | null;
  readonly model: string | null;
  readonly latencyMs: number;
  readonly rateLimited: boolean;
  readonly audit: AluxConverseAudit;
}

/* ─────────────────────────── Salida del modelo (validada en servidor) ─────────────────────────── */
/**
 * Validación TOLERANTE: el modelo no controla el contrato. Los campos
 * fuera de rango se recortan o se descartan campo a campo (`catch`) en vez
 * de invalidar toda la respuesta; sólo `text` es obligatorio. Los ids se
 * verifican después contra los candidatos recuperados (grounding).
 */
const clampStr = (max: number) =>
  z.preprocess((v) => (typeof v === "string" ? v.trim().slice(0, max) : v), z.string().max(max));
const clampStrOrNull = (max: number) =>
  z
    .preprocess(
      (v) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null),
      z.string().max(max).nullable(),
    )
    .catch(null);
/**
 * Recorta un arreglo elemento a elemento: los items inválidos se descartan
 * individualmente y NUNCA invalidan el arreglo completo.
 */
const clampArr = <T extends z.ZodTypeAny>(item: T, max: number) =>
  z
    .preprocess(
      (v) =>
        Array.isArray(v)
          ? v
              .map((entry) => item.safeParse(entry))
              .filter((r) => r.success)
              .map((r) => r.data)
              .slice(0, max)
          : [],
      z.array(item).max(max),
    )
    .catch([] as z.infer<T>[]);

const numOrNull = (min: number, max: number, int = false) =>
  z
    .preprocess(
      (v) =>
        typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : v,
      (int ? z.number().int() : z.number()).min(min).max(max).nullable(),
    )
    .catch(null);

const ModelStageSchema = z
  .preprocess(
    (v) => {
      if (typeof v !== "string") return null;
      const s = v.toLowerCase();
      if (
        /(en[_ -]?regi|en el destino|on[_ -]?site|in[_ -]?region|ya (estoy|estamos)|during)/.test(s)
      )
        return "en_region";
      if (/(plane|plann|antes|before|pre)/.test(s)) return "planeando";
      return null;
    },
    z.enum(["planeando", "en_region"]).nullable(),
  )
  .catch(null);

const ModelUnavailableItemSchema = z.object({
  id: clampStrOrNull(64),
  kind: z.enum(ALUX_UNAVAILABLE_FACT_KINDS),
});

export const AluxModelOutputSchema = z.object({
  text: z.preprocess(
    (v) => (typeof v === "string" ? v.trim().slice(0, ALUX_CONVERSE_LIMITS.maxTextChars) : v),
    z.string().min(1).max(ALUX_CONVERSE_LIMITS.maxTextChars),
  ),
  clarifyingQuestions: clampArr(clampStr(200), ALUX_CONVERSE_LIMITS.maxClarifyingQuestions),
  recommendations: clampArr(
    z.object({
      id: clampStr(64).pipe(z.string().min(1)),
      reason: clampStrOrNull(200),
      day: numOrNull(1, 14, true),
    }),
    ALUX_CONVERSE_LIMITS.maxRecommendations,
  ),
  sequence: z
    .preprocess(
      (v) =>
        Array.isArray(v)
          ? v
              .filter(
                (s) => s && typeof s === "object" && Array.isArray((s as { ids?: unknown }).ids),
              )
              .slice(0, 7)
          : null,
      z.array(z.object({ day: numOrNull(1, 14, true), ids: clampArr(clampStr(64), 6) })).nullable(),
    )
    .catch(null),
  reorder: z
    .object({ orderedSavedKeys: clampArr(clampStr(160), 40), rationale: clampStrOrNull(200) })
    .nullable()
    .catch(null),
  understood: z
    .object({
      destinationSlug: clampStrOrNull(120),
      stage: ModelStageSchema,
      company: clampStrOrNull(60),
      interests: clampArr(clampStr(60), 10),
      travelDates: clampStrOrNull(80),
      durationDays: numOrNull(0.5, 60),
      accessibility: clampStrOrNull(120),
      restrictions: clampArr(clampStr(80), 6),
    })
    .catch({
      destinationSlug: null,
      stage: null,
      company: null,
      interests: [],
      travelDates: null,
      durationDays: null,
      accessibility: null,
      restrictions: [],
    }),
  citedFactIds: clampArr(clampStr(12), 12),
  inferences: clampArr(clampStr(160), 3),
  unavailable: z
    .preprocess(
      (v) =>
        Array.isArray(v)
          ? v
              .filter(
                (u) =>
                  u &&
                  typeof u === "object" &&
                  (ALUX_UNAVAILABLE_FACT_KINDS as readonly string[]).includes(
                    String((u as { kind?: unknown }).kind),
                  ),
              )
              .slice(0, 8)
          : [],
      z.array(ModelUnavailableItemSchema).max(8),
    )
    .catch([]),
});
export type AluxModelOutput = z.infer<typeof AluxModelOutputSchema>;

/* ─────────────────────────── Candidato recuperado (servidor) ─────────────────────────── */
export interface AluxConverseFact {
  readonly id: string;
  readonly text: string;
}

export interface AluxConverseCandidate {
  readonly entityType: AluxConverseEntityType;
  readonly entityId: string;
  readonly family: AluxConverseFamily;
  readonly title: string;
  readonly href: string;
  readonly destinationSlug: string | null;
  readonly destinationLabel: string | null;
  readonly scope: AluxConverseScope;
  readonly summary: string | null;
  readonly facts: readonly AluxConverseFact[];
  readonly unavailable: readonly AluxUnavailableFactKind[];
  /** Etiquetas normalizadas para el ranking determinístico (sin acentos). */
  readonly tags: readonly string[];
  readonly planKind: TravelItemKind | null;
  readonly imageUrl: string | null;
  readonly subtitle: string | null;
  readonly coords: { lat: number; lng: number } | null;
  /** Estado de horario ya calculado en TZ del destino (null si no hay horario). */
  readonly openState: "open" | "closed" | null;
}

/* ─────────────────────────── Saneamiento anti-inyección ─────────────────────────── */
const INJECTION_PATTERNS: readonly RegExp[] = [
  /ignor(a|e|es|en|ar)\s+(todas?\s+)?(las?\s+)?(instrucciones|reglas|indicaciones)( anteriores| previas| del sistema)?/i,
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|rules)/i,
  /olvida\s+(todo|tus|las)\s+(lo\s+anterior|instrucciones|reglas)/i,
  /(system|developer)\s*prompt/i,
  /prompt\s+del\s+sistema/i,
  /eres\s+ahora\s+(un|una|el|la)\b/i,
  /you\s+are\s+now\s+(a|an|the)\b/i,
  /act(úa|ua)\s+como\s+(si\s+fueras\s+)?(un|una|el|la)\s+(modelo|ia|sistema|administrador|admin)/i,
  /revela|muestra|imprime\s+(tu|el)\s+(prompt|clave|api\s*key|token|secreto)/i,
  /(api[\s_-]?key|lovable[\s_-]?api|service[\s_-]?role|secret\s*key)/i,
  /modo\s+(desarrollador|developer|dios|sin\s+restricciones)/i,
  /jailbreak|DAN\b/i,
  /agrega(lo)?\s+autom[aá]ticamente\s+a\s+mi\s+viaje/i,
  /(add|save)\s+(this|it)\s+to\s+(the|my)\s+trip\s+automatically/i,
  /\[\s*(system|assistant|tool)\s*\]/i,
  /<\/?\s*(system|instructions?|tool|prompt)\s*>/i,
];

/** Marca si un texto (usuario o CMS) contiene un intento de alterar instrucciones. */
export function detectInjectionAttempt(text: string): boolean {
  if (!text) return false;
  // Se evalúa el texto original y su forma sin acentos: "agrégalo" ≡ "agregalo".
  const folded = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return INJECTION_PATTERNS.some((re) => re.test(text) || re.test(folded));
}

/**
 * Sanea texto proveniente del CMS antes de exponerlo al modelo:
 * quita caracteres de control, colapsa espacios, elimina líneas que
 * parezcan instrucciones y trunca. El texto queda como DATO, nunca como orden.
 */
export function sanitizeCmsText(value: unknown, maxLen = 180): string {
  if (typeof value !== "string") return "";
  const lines = value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/[`{}<>[\]]/g, " ")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !detectInjectionAttempt(l));
  const joined = lines.join(" ").replace(/\s+/g, " ").trim();
  if (joined.length <= maxLen) return joined;
  return `${joined.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`;
}

/** Sanea el mensaje del explorador (se conserva el contenido; sólo se acota). */
export function sanitizeUserText(
  value: unknown,
  maxLen: number = ALUX_CONVERSE_LIMITS.maxMessageChars,
): string {
  if (typeof value !== "string") return "";
  const clean = value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return clean.length > maxLen ? clean.slice(0, maxLen) : clean;
}

/** Patrones que jamás deben salir del modelo hacia el explorador. */
const LEAK_PATTERNS: readonly RegExp[] = [
  /lovable[\s_-]?api[\s_-]?key/i,
  /sb_secret_[a-z0-9]+/i,
  /service[\s_-]?role/i,
  /eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{16,}/,
  /Reglas obligatorias:/i,
];

/** Elimina cualquier fuga de secretos o del prompt en el texto del modelo. */
export function scrubModelText(text: string): { text: string; scrubbed: boolean } {
  let scrubbed = false;
  let out = text;
  for (const re of LEAK_PATTERNS) {
    if (re.test(out)) {
      scrubbed = true;
      out = out.replace(
        new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`),
        "[omitido]",
      );
    }
  }
  return { text: out.trim(), scrubbed };
}

/* ─────────────────────────── Normalización e intención determinística ─────────────────────────── */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface AluxTravelIntent {
  readonly company: string | null;
  readonly durationDays: number | null;
  readonly timeOfDay: "manana" | "tarde" | "noche" | null;
  readonly interests: readonly string[];
  readonly families: readonly AluxConverseFamily[];
  readonly wantsAccessibility: boolean;
  readonly asksHours: boolean;
  readonly asksPrice: boolean;
  readonly asksReplan: boolean;
  readonly asksRemove: boolean;
  readonly stage: "planeando" | "en_region" | null;
  readonly mentionedDestinationSlugs: readonly string[];
}

const INTEREST_RULES: ReadonlyArray<{ tag: string; families: AluxConverseFamily[]; re: RegExp }> = [
  {
    tag: "cultura-maya",
    families: ["lugar", "experiencia", "ruta"],
    re: /\b(cultura|maya|mayas|arqueolog\w*|zona arqueologica|piramide\w*|historia|historico|convento|iglesia|patrimonio|museo)\b/,
  },
  {
    tag: "gastronomia",
    families: ["restaurante"],
    re: /\b(comer|comida|comidas|restaurante\w*|gastronom\w*|cochinita|antojito\w*|cena\w*|desayun\w*|almorzar|almuerzo|yucateca|cocina|mariscos|cafe)\b/,
  },
  {
    tag: "naturaleza",
    families: ["lugar", "experiencia", "ruta"],
    re: /\b(cenote\w*|naturaleza|selva|aves|flamenco\w*|laguna|manglar\w*|ecoturis\w*|bicicleta|senderismo|kayak)\b/,
  },
  {
    tag: "hospedaje",
    families: ["hotel", "casa"],
    re: /\b(hotel\w*|hospedaje|hospedar\w*|dormir|alojamiento|alojar\w*|villa|posada|habitacion\w*|donde quedarme|quedarnos)\b/,
  },
  {
    tag: "casa-vacaciones",
    families: ["casa"],
    re: /\b(casa\w*( de vacaciones| completa| rural)?|renta\w* vacacional\w*|airbnb)\b/,
  },
  {
    tag: "experiencias",
    families: ["experiencia"],
    re: /\b(tour\w*|experiencia\w*|taller\w*|caminata\w*|paseo\w*|recorrido guiado|guia|actividad\w*|nocturn\w*)\b/,
  },
  {
    tag: "eventos",
    families: ["evento"],
    re: /\b(evento\w*|festival\w*|fiesta\w*|concierto\w*|feria\w*|vaqueria|cartelera|que hay hoy|esta noche)\b/,
  },
  {
    tag: "rutas",
    families: ["ruta"],
    re: /\b(ruta\w*|itinerario\w*|recorrido\w*|circuito\w*|plan de viaje)\b/,
  },
  {
    tag: "lugares",
    families: ["lugar"],
    re: /\b(lugar\w*|mirador\w*|parque\w*|plaza\w*|atractivo\w*|que visitar|que ver|sitio\w*)\b/,
  },
  {
    tag: "artesania",
    families: ["experiencia", "evento"],
    re: /\b(artesan\w*|mercado\w*|bordado\w*|hamaca\w*|compras)\b/,
  },
  {
    tag: "familia",
    families: [],
    re: /\b(familia\w*|ninos|ninas|hijos|hijas|bebe\w*|peques|pequenos)\b/,
  },
  {
    tag: "pareja",
    families: [],
    re: /\b(pareja|romantic\w*|novia|novio|esposa|esposo|luna de miel|aniversario)\b/,
  },
  {
    tag: "relax",
    families: ["hotel", "casa", "experiencia"],
    re: /\b(relaj\w*|descans\w*|tranquil\w*|spa)\b/,
  },
];

const DESTINATION_ALIASES: Record<string, string> = {
  valladolid: "valladolid",
  izamal: "izamal",
  espita: "espita",
  uayma: "uayma",
  "ek balam": "ek-balam",
  "ek-balam": "ek-balam",
  "rio lagartos": "rio-lagartos",
  "rio-lagartos": "rio-lagartos",
  "las coloradas": "las-coloradas",
  "las-coloradas": "las-coloradas",
};

const NUMBER_WORDS: Record<string, number> = {
  un: 1,
  una: 1,
  uno: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
};

/**
 * Análisis determinístico de intención (español). Se usa para el ranking de
 * recuperación, para reforzar el prompt y para componer el fallback cuando el
 * proveedor no está disponible. Nunca inventa: sólo reconoce señales.
 */
export function parseTravelIntent(
  message: string,
  opts: { knownDestinationSlugs?: readonly string[] } = {},
): AluxTravelIntent {
  const n = normalizeText(message);
  const interests = new Set<string>();
  const families = new Set<AluxConverseFamily>();
  for (const rule of INTEREST_RULES) {
    if (rule.re.test(n)) {
      interests.add(rule.tag);
      for (const f of rule.families) families.add(f);
    }
  }

  let company: string | null = null;
  if (/\b(familia\w*|ninos|ninas|hijos|hijas|peques|bebe\w*)\b/.test(n)) company = "familia";
  else if (/\b(pareja|novia|novio|esposa|esposo|luna de miel)\b/.test(n)) company = "pareja";
  else if (/\b(amigos|amigas|grupo)\b/.test(n)) company = "amigos";
  else if (/\b(solo|sola|por mi cuenta)\b/.test(n)) company = "solo";

  let durationDays: number | null = null;
  const durMatch = n.match(
    /\b(\d{1,2}|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+(dia|dias|noche|noches)\b/,
  );
  if (durMatch) {
    const raw = durMatch[1]!;
    const num = /^\d+$/.test(raw) ? Number(raw) : (NUMBER_WORDS[raw] ?? null);
    if (num && num >= 1 && num <= 60) durationDays = num;
  } else if (/\bfin de semana\b/.test(n)) durationDays = 2;

  let timeOfDay: AluxTravelIntent["timeOfDay"] = null;
  if (/\b(manana|amanecer|temprano)\b/.test(n) && !/\bpasado manana\b/.test(n))
    timeOfDay = "manana";
  if (/\b(tarde|atardecer|mediodia)\b/.test(n)) timeOfDay = "tarde";
  if (/\b(noche|nocturn\w*|cenar)\b/.test(n)) timeOfDay = "noche";

  const wantsAccessibility =
    /\b(silla de ruedas|accesib\w*|movilidad reducida|baston|andadera|sin escalones|rampa\w*|discapacidad)\b/.test(
      n,
    );
  const asksHours =
    /\b(horario\w*|abre\w*|abren|cierra\w*|cierran|a que hora|hora de apertura|hasta que hora)\b/.test(
      n,
    );
  const asksPrice =
    /\b(precio\w*|cuesta\w*|costo\w*|barato\w*|economic\w*|presupuesto|tarifa\w*|cuanto)\b/.test(n);
  const asksReplan =
    /\b(reorden\w*|reorganiz\w*|replanific\w*|cambia\w* el orden|otro orden|reacomod\w*|ajusta\w* el plan|mejor orden|optimiza\w*)\b/.test(
      n,
    );
  const asksRemove = /\b(quita\w*|elimina\w*|borra\w*|saca\w*|retira\w*)\b/.test(n);

  let stage: AluxTravelIntent["stage"] = null;
  if (/\b(estoy en|estamos en|ya llegamos|ya estoy|ya estamos|aqui en|acabo de llegar)\b/.test(n))
    stage = "en_region";
  else if (
    /\b(voy a|vamos a|planeo|planeamos|quiero ir|queremos ir|viajar\w*|viajo|viajamos|visitar\w* pronto|proximo)\b/.test(
      n,
    )
  )
    stage = "planeando";

  const known = new Set((opts.knownDestinationSlugs ?? []).map((s) => s.toLowerCase()));
  const mentioned: string[] = [];
  for (const [alias, slug] of Object.entries(DESTINATION_ALIASES)) {
    if (known.size > 0 && !known.has(slug)) continue;
    if (
      new RegExp(`\\b${alias.replace(/[-\s]/g, "[-\\s]")}\\b`).test(n) &&
      !mentioned.includes(slug)
    ) {
      mentioned.push(slug);
    }
  }
  for (const slug of known) {
    if (mentioned.includes(slug)) continue;
    const alias = slug.replace(/-/g, "[-\\s]");
    if (new RegExp(`\\b${alias}\\b`).test(n)) mentioned.push(slug);
  }

  return {
    company,
    durationDays,
    timeOfDay,
    interests: Array.from(interests),
    families: Array.from(families),
    wantsAccessibility,
    asksHours,
    asksPrice,
    asksReplan,
    asksRemove,
    stage,
    mentionedDestinationSlugs: mentioned,
  };
}

/** Clave estable de un elemento de Mi Viaje (`kind:targetId`). */
export function tripItemKey(kind: string, targetId: string | null | undefined): string {
  return `${kind}:${targetId ?? ""}`;
}

/** Clave estable de una recomendación/candidato. */
export function candidateKey(entityType: AluxConverseEntityType, entityId: string): string {
  return `${entityType}:${entityId}`;
}

/** Copy oficial de estados (Concierge Voice · sin jerga técnica). */
export const ALUX_CONVERSE_COPY = {
  thinking: "Alux está pensando…",
  fallbackNotice:
    "La conversación avanzada no está disponible por el momento. Te muestro opciones reales del catálogo publicado.",
  rateLimitedNotice:
    "Alcanzaste el límite de conversación por ahora. Sigo aquí con sugerencias del catálogo; crea tu cuenta para continuar sin límites.",
  errorNotice: "No pude completar la respuesta. Puedes intentar de nuevo.",
  blockedNotice:
    "Puedo ayudarte con tu viaje por el Oriente Maya; no cambio mis reglas ni comparto información interna.",
  noCatalog: "Aún no hay publicaciones suficientes para recomendarte con certeza en este destino.",
  askDestination:
    "¿A qué destino del Oriente Maya quieres ir? (Valladolid, Izamal, Espita, Uayma…)",
} as const;
