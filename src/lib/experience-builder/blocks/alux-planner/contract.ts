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

export const ALUX_PLANNER_CONTRACT_VERSION = "1.0.0";

/** Variantes gobernadas del bloque. */
export type AluxPlannerVariant = "compact" | "editorial" | "panel";

/** Destino de la acción principal. Siempre una superficie productiva. */
export const ALUX_PLANNER_DEFAULT_HREF = "/arma-tu-viaje";

export interface AluxPlannerPromptChip {
  /** Texto visible del chip sugerido. */
  label: string;
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
}

export const aluxPlannerVariantSchema = z.enum([
  "compact",
  "editorial",
  "panel",
]) satisfies z.ZodType<AluxPlannerVariant>;

export const aluxPlannerPromptChipSchema = z.object({
  label: z.string().min(1).max(80),
}) satisfies z.ZodType<AluxPlannerPromptChip>;

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
};

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

  const rawPrompts = cfg.prompts;
  const prompts = Array.isArray(rawPrompts)
    ? rawPrompts
        .map((it) =>
          typeof it === "string"
            ? { label: it }
            : { label: String((it as { label?: unknown } | null)?.label ?? "") },
        )
        .filter((p) => p.label.trim().length > 0)
        .slice(0, 8)
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
    cta_href: str("cta_href", ALUX_PLANNER_DEFAULTS.cta_href),
    prompts,
    show_prompts: bool("show_prompts", ALUX_PLANNER_DEFAULTS.show_prompts),
    show_disclaimer: bool("show_disclaimer", ALUX_PLANNER_DEFAULTS.show_disclaimer),
    disclaimer: str("disclaimer", ALUX_PLANNER_DEFAULTS.disclaimer),
  };
}
