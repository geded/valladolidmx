/**
 * Experience Builder · Variables Dinámicas (Etapa 15.10.4b · Fase 2)
 *
 * Sistema declarativo y SEGURO de variables `${scope.field}` resolubles
 * por el mismo renderer en Studio y producción.
 *
 * Principios:
 *  - **Whitelist estricta**: solo se resuelven `scope.field` registrados
 *    en el catálogo. Cualquier otro token se devuelve sin tocar.
 *  - **Sin acceso arbitrario**: el resolver NUNCA evalúa expresiones ni
 *    accede a propiedades fuera de `VARIABLE_CATALOG`.
 *  - **Extensible**: nuevos dominios se añaden con `registerVariableScope`
 *    sin tocar el motor.
 *  - **Sin datos sensibles**: campos como tokens, emails internos,
 *    direcciones privadas o IDs internos NO se exponen — el catálogo es
 *    la única fuente de verdad sobre qué se puede inyectar.
 */

export type VariableScope =
  | "business"
  | "destination"
  | "experience"
  | "product"
  | "event"
  | "user"
  | "i18n"
  | "currency"
  | "site";

export interface VariableDescriptor {
  field: string;
  label: string;
  description: string;
  /** Valor demo usado por el Studio cuando no hay contexto real. */
  demoValue: string;
}

const CATALOG: Record<string, VariableDescriptor[]> = {
  business: [
    { field: "name", label: "Nombre", description: "Nombre comercial", demoValue: "Hotel Demo" },
    { field: "tagline", label: "Tagline", description: "Frase corta", demoValue: "Tu lugar en Oriente Maya" },
    { field: "city", label: "Ciudad", description: "Ciudad principal", demoValue: "Valladolid" },
    { field: "phone_public", label: "Teléfono público", description: "Solo si la empresa lo publicó", demoValue: "" },
  ],
  destination: [
    { field: "name", label: "Nombre", description: "Nombre del destino", demoValue: "Cenote Demo" },
    { field: "region", label: "Región", description: "Región turística", demoValue: "Oriente Maya" },
  ],
  experience: [
    { field: "title", label: "Título", description: "Título de la experiencia", demoValue: "Tour Demo" },
    { field: "duration", label: "Duración", description: "Duración en texto", demoValue: "3 horas" },
  ],
  product: [
    { field: "name", label: "Nombre", description: "Nombre del producto", demoValue: "Producto Demo" },
    { field: "price_label", label: "Precio (etiqueta)", description: "Precio formateado", demoValue: "$1,200 MXN" },
  ],
  event: [
    { field: "title", label: "Título", description: "Título del evento", demoValue: "Festival Demo" },
    { field: "date_label", label: "Fecha", description: "Fecha formateada", demoValue: "12 de octubre" },
  ],
  user: [
    { field: "display_name", label: "Nombre visible", description: "Nombre del visitante autenticado", demoValue: "Visitante" },
    { field: "language", label: "Idioma preferido", description: "Código ISO 639-1", demoValue: "es" },
  ],
  i18n: [
    { field: "cta_label", label: "CTA traducido", description: "Etiqueta CTA en idioma actual", demoValue: "Reservar" },
    { field: "learn_more", label: "Saber más", description: "Etiqueta 'Saber más' traducida", demoValue: "Saber más" },
  ],
  currency: [
    { field: "code", label: "Código", description: "Código de moneda actual", demoValue: "MXN" },
    { field: "symbol", label: "Símbolo", description: "Símbolo de moneda", demoValue: "$" },
  ],
  site: [
    { field: "name", label: "Nombre del sitio", description: "Nombre comercial del sitio", demoValue: "Valladolid.mx" },
    { field: "tagline", label: "Tagline", description: "Tagline institucional", demoValue: "Vive Oriente Maya" },
  ],
};

/** Registra (o extiende) un scope con nuevos campos. */
export function registerVariableScope(
  scope: string,
  descriptors: VariableDescriptor[],
): void {
  CATALOG[scope] = [...(CATALOG[scope] ?? []), ...descriptors];
}

/** Devuelve el catálogo (read-only) para la UI del Studio. */
export function listVariables(): Record<string, VariableDescriptor[]> {
  return CATALOG;
}

export type VariableContext = Partial<Record<string, Record<string, string>>>;

/** Contexto demo construido automáticamente desde el catálogo. */
export function buildDemoContext(): VariableContext {
  const ctx: VariableContext = {};
  for (const [scope, fields] of Object.entries(CATALOG)) {
    ctx[scope] = Object.fromEntries(fields.map((f) => [f.field, f.demoValue]));
  }
  return ctx;
}

const TOKEN_RE = /\$\{([a-z_]+)\.([a-z0-9_]+)\}/g;

/**
 * Resuelve tokens `${scope.field}` dentro de un string. Devuelve el token
 * intacto si:
 *  - el scope no está registrado;
 *  - el field no está registrado en ese scope;
 *  - el contexto no contiene el valor (preferible a falsificarlo).
 */
export function resolveVariables(input: unknown, ctx: VariableContext): unknown {
  if (typeof input === "string") return resolveString(input, ctx);
  if (Array.isArray(input)) return input.map((v) => resolveVariables(v, ctx));
  if (input && typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      out[k] = resolveVariables(v, ctx);
    }
    return out;
  }
  return input;
}

function resolveString(s: string, ctx: VariableContext): string {
  return s.replace(TOKEN_RE, (match, scope: string, field: string) => {
    const allowed = CATALOG[scope]?.some((d) => d.field === field);
    if (!allowed) return match;
    const value = ctx[scope]?.[field];
    return value ?? match;
  });
}