/**
 * G7 · `vmx.alux.planner` — Contrato del bloque visual del Planificador Alux.
 *
 * Bloque RENDER-ONLY: representa visualmente la entrada al planificador de
 * Alux dentro de una composición del Experience Builder. NO ejecuta modelos,
 * NO persiste estado, NO crea sesiones ni planes. Toda acción real ocurre en
 * la superficie productiva existente (`/arma-tu-viaje`).
 *
 * Regla de Compatibilidad Evolutiva (H-03): esta familia crece sólo por
 * `variant`, `capabilities` y `config`. Prohibido `-pro`, `-v2`, `-lite`.
 */
import { z } from "zod";

export const ALUX_PLANNER_CONTRACT_VERSION = "1.1.0";

/** Variantes gobernadas del bloque. */
export type AluxPlannerVariant = "compact" | "editorial" | "panel";

/** Destino de la acción principal. Siempre una superficie productiva. */
export const ALUX_PLANNER_DEFAULT_HREF = "/arma-tu-viaje";

export interface AluxPlannerPromptChip {
  /** Texto visible del chip sugerido. */
  label: string;
}

/**
 * G8-R1-C+L · GAP-03 — Contexto REAL que recibe Alux desde la superficie.
 *
 * Se propaga a `/arma-tu-viaje` como parámetros de consulta para que la
 * conversación arranque con entidad, territorio y relaciones reales.
 * Cero inferencia: lo que no venga del CMS no se envía ni se muestra.
 */
export interface AluxPlannerContext {
  /** `business:<id>`, `place:<id>`, `event:<id>`, `product:<id>`… */
  entityRef?: string;
  /** Nombre real de la entidad (para el chip de contexto). */
  entityLabel?: string;
  /** Destino territorial real al que pertenece la entidad. */
  destinationSlug?: string;
  destinationName?: string;
  /** Zona territorial dependiente del destino, si existe. */
  zoneName?: string;
  /** Relaciones reales ya resueltas (categorías, temas, entidades cercanas). */
  relations?: string[];
}

export interface AluxPlannerDTO {
  variant: AluxPlannerVariant;
  eyebrow?: string;
  heading: string;
  subheading?: string;
  placeholder: string;
  cta_label: string;
  cta_href: string;
  prompts: AluxPlannerPromptChip[];
  show_prompts: boolean;
  show_disclaimer: boolean;
  disclaimer: string;
  /** Contexto real. `null` cuando la superficie no aporta datos. */
  context: AluxPlannerContext | null;
}

export const aluxPlannerVariantSchema = z.enum([
  "compact",
  "editorial",
  "panel",
]) satisfies z.ZodType<AluxPlannerVariant>;

export const aluxPlannerPromptChipSchema = z.object({
  label: z.string().min(1).max(80),
}) satisfies z.ZodType<AluxPlannerPromptChip>;

export const aluxPlannerContextSchema = z.object({
  entityRef: z.string().min(1).max(120).optional(),
  entityLabel: z.string().min(1).max(140).optional(),
  destinationSlug: z.string().min(1).max(120).optional(),
  destinationName: z.string().min(1).max(140).optional(),
  zoneName: z.string().min(1).max(140).optional(),
  relations: z.array(z.string().min(1).max(80)).max(12).optional(),
}) satisfies z.ZodType<AluxPlannerContext>;

export const aluxPlannerDTOSchema = z.object({
  variant: aluxPlannerVariantSchema,
  eyebrow: z.string().max(80).optional(),
  heading: z.string().min(1).max(140),
  subheading: z.string().max(280).optional(),
  placeholder: z.string().min(1).max(140),
  cta_label: z.string().min(1).max(60),
  cta_href: z.string().min(1).max(300),
  prompts: z.array(aluxPlannerPromptChipSchema).max(8),
  show_prompts: z.boolean(),
  show_disclaimer: z.boolean(),
  disclaimer: z.string().max(200),
  context: aluxPlannerContextSchema.nullable(),
}) satisfies z.ZodType<AluxPlannerDTO>;

export const ALUX_PLANNER_DEFAULTS: AluxPlannerDTO = {
  variant: "editorial",
  eyebrow: "Copiloto de viaje",
  heading: "Cuéntale a Alux cómo quieres vivir Valladolid",
  subheading:
    "Alux escucha tu ritmo, tus días y tus antojos, y arma contigo un plan hecho a tu medida.",
  placeholder: "Quiero cenotes tranquilos y buena cocina yucateca…",
  cta_label: "Armar mi viaje con Alux",
  cta_href: ALUX_PLANNER_DEFAULT_HREF,
  prompts: [
    { label: "Tres días en pareja" },
    { label: "Cenotes poco visitados" },
    { label: "Cocina yucateca auténtica" },
    { label: "Viaje con niños" },
  ],
  show_prompts: true,
  show_disclaimer: true,
  disclaimer: "Vista previa visual. La conversación real ocurre en Arma tu viaje.",
  context: null,
};

/** Normaliza el contexto real recibido (fail-closed: sin datos ⇒ `null`). */
export function readAluxPlannerContext(raw: unknown): AluxPlannerContext | null {
  if (!raw || typeof raw !== "object") return null;
  const parsed = aluxPlannerContextSchema.safeParse(raw);
  if (!parsed.success) return null;
  const ctx = parsed.data;
  const relations = (ctx.relations ?? []).map((r) => r.trim()).filter(Boolean);
  const clean: AluxPlannerContext = {
    ...ctx,
    ...(relations.length > 0 ? { relations } : {}),
  };
  if (relations.length === 0) delete clean.relations;
  return Object.values(clean).some((v) => v !== undefined) ? clean : null;
}

/**
 * Construye el destino de la acción principal propagando SÓLO contexto real.
 * Sin contexto devuelve la superficie productiva sin parámetros.
 */
export function buildAluxPlannerHref(base: string, ctx: AluxPlannerContext | null): string {
  if (!ctx) return base;
  const params = new URLSearchParams();
  if (ctx.entityRef) params.set("entity", ctx.entityRef);
  if (ctx.destinationSlug) params.set("destino", ctx.destinationSlug);
  const q = params.toString();
  if (!q) return base;
  return base.includes("?") ? `${base}&${q}` : `${base}?${q}`;
}

/** Normaliza la config del Studio contra los defaults gobernados. */
export function applyAluxPlannerDefaults(
  config: Record<string, unknown> | undefined,
): AluxPlannerDTO {
  const cfg = config ?? {};
  const str = (key: string, fallback: string): string => {
    const v = cfg[key];
    return typeof v === "string" && v.trim() ? v : fallback;
  };
  const bool = (key: string, fallback: boolean): boolean =>
    typeof cfg[key] === "boolean" ? (cfg[key] as boolean) : fallback;

  const context = readAluxPlannerContext(cfg.context);

  const rawPrompts = cfg.prompts;
  // Cero contenido inventado: en una superficie CON contexto real, los chips
  // sólo pueden provenir de relaciones reales de esa entidad. Los prompts
  // genéricos de marca quedan reservados a superficies sin contexto.
  const contextPrompts = (context?.relations ?? []).map((label) => ({ label }));
  const prompts = Array.isArray(rawPrompts)
    ? rawPrompts
        .map((it) =>
          typeof it === "string"
            ? { label: it }
            : { label: String((it as { label?: unknown } | null)?.label ?? "") },
        )
        .filter((p) => p.label.trim().length > 0)
        .slice(0, 8)
    : context
      ? contextPrompts.slice(0, 8)
      : ALUX_PLANNER_DEFAULTS.prompts;

  const variantRaw = typeof cfg.variant === "string" ? cfg.variant : "";
  const variant = aluxPlannerVariantSchema.safeParse(variantRaw);

  return {
    variant: variant.success ? variant.data : ALUX_PLANNER_DEFAULTS.variant,
    eyebrow: str("eyebrow", ALUX_PLANNER_DEFAULTS.eyebrow ?? ""),
    heading: str("heading", ALUX_PLANNER_DEFAULTS.heading),
    subheading: str("subheading", ALUX_PLANNER_DEFAULTS.subheading ?? ""),
    placeholder: str("placeholder", ALUX_PLANNER_DEFAULTS.placeholder),
    cta_label: str("cta_label", ALUX_PLANNER_DEFAULTS.cta_label),
    cta_href: buildAluxPlannerHref(str("cta_href", ALUX_PLANNER_DEFAULTS.cta_href), context),
    prompts,
    show_prompts: bool("show_prompts", ALUX_PLANNER_DEFAULTS.show_prompts),
    show_disclaimer: bool("show_disclaimer", ALUX_PLANNER_DEFAULTS.show_disclaimer),
    disclaimer: str("disclaimer", ALUX_PLANNER_DEFAULTS.disclaimer),
    context,
  };
}
