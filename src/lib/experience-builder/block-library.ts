/**
 * Experience Builder · Block Library (Etapa 15.10.1)
 *
 * Catálogo inicial de bloques reutilizables. Cada entrada es una declaración
 * del Block Contract — NO se construye editor ni se modifican páginas
 * públicas en esta etapa.
 *
 * Esta lista es la fuente verdadera del catálogo. El servidor la sincroniza a
 * las tablas `block_definitions` / `block_versions` vía `syncBlockLibrary`
 * (admin only) emitiendo eventos BEA `Block.Registered` /
 * `Block.VersionPublished` en `content_audit_log`.
 *
 * Agregar un nuevo bloque consiste exclusivamente en añadir una entrada
 * aquí (Block Marketplace Readiness).
 */

import { registerBlock } from "./block-registry";
import type { BlockContract } from "./block-contract";

/* ------------------------------------------------------------------ *
 * 1. Bloques de Layout fundacionales (Static)
 * ------------------------------------------------------------------ */

const containerBlock: BlockContract = {
  type: "vmx.layout.container",
  category: "static",
  version: "1.0.0",
  display_name: "Contenedor",
  description: "Contenedor base con ancho máximo y padding controlados por tokens.",
  schema: {
    max_width: {
      type: "select",
      label: "Ancho máximo",
      default: "xl",
      options: [
        { value: "md", label: "Medio" },
        { value: "lg", label: "Grande" },
        { value: "xl", label: "Extra grande" },
        { value: "full", label: "Completo" },
      ],
    },
    padding: {
      type: "select",
      label: "Padding",
      default: "normal",
      options: [
        { value: "tight", label: "Reducido" },
        { value: "normal", label: "Normal" },
        { value: "spacious", label: "Amplio" },
      ],
    },
  },
  capabilities: {
    soporta_responsive: true,
    soporta_preview: true,
    soporta_cache: true,
  },
  constraints: {
    surfaces: ["home", "landing", "institutional", "destination", "business", "product"],
    max_nesting_depth: 3,
  },
  responsive: {
    breakpoints: ["desktop", "tablet", "mobile"],
    overridable_fields: ["padding"],
  },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

const sectionBlock: BlockContract = {
  type: "vmx.layout.section",
  category: "static",
  version: "1.0.0",
  display_name: "Sección",
  description: "Sección semántica con encabezado opcional.",
  schema: {
    heading: { type: "text", label: "Encabezado", translatable: true },
    subheading: { type: "text", label: "Subencabezado", translatable: true },
    tone: {
      type: "select",
      label: "Tono",
      default: "default",
      options: [
        { value: "default", label: "Por defecto" },
        { value: "muted", label: "Atenuado" },
        { value: "accent", label: "Acentuado" },
      ],
    },
  },
  capabilities: {
    soporta_i18n: true,
    soporta_seo: true,
    soporta_preview: true,
    soporta_responsive: true,
    soporta_cache: true,
  },
  constraints: {
    surfaces: ["home", "landing", "institutional", "destination", "business", "product"],
  },
  responsive: {
    breakpoints: ["desktop", "tablet", "mobile"],
    overridable_fields: ["tone"],
  },
  i18n: { translatable_fields: ["heading", "subheading"], fallback: "base_language" },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

const spacerBlock: BlockContract = {
  type: "vmx.layout.spacer",
  category: "static",
  version: "1.0.0",
  display_name: "Espaciador",
  schema: {
    size: {
      type: "select",
      label: "Tamaño",
      default: "md",
      options: [
        { value: "sm", label: "Pequeño" },
        { value: "md", label: "Medio" },
        { value: "lg", label: "Grande" },
      ],
    },
  },
  capabilities: { soporta_responsive: true, soporta_preview: true },
  responsive: { breakpoints: ["desktop", "tablet", "mobile"], overridable_fields: ["size"] },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

const dividerBlock: BlockContract = {
  type: "vmx.layout.divider",
  category: "static",
  version: "1.0.0",
  display_name: "Separador",
  schema: {
    style: {
      type: "select",
      label: "Estilo",
      default: "line",
      options: [
        { value: "line", label: "Línea" },
        { value: "dotted", label: "Punteado" },
      ],
    },
  },
  capabilities: { soporta_responsive: true, soporta_preview: true },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

/* ------------------------------------------------------------------ *
 * 2. Envoltura de componentes públicos existentes (Static)
 *    Solo declaración de contrato — NO se altera el render actual.
 * ------------------------------------------------------------------ */

const heroBlock: BlockContract = {
  type: "vmx.hero",
  category: "static",
  version: "1.1.0",
  display_name: "Hero",
  description: "Bloque hero principal de la Home y de Landing Pages.",
  schema: {
    eyebrow: { type: "text", label: "Frase superior", translatable: true },
    title: { type: "text", label: "Título", required: true, translatable: true },
    subtitle: { type: "text", label: "Subtítulo", translatable: true },
    background_image: { type: "media", label: "Imagen de fondo", accepts: ["image/*"] },
    background_position: {
      type: "select",
      label: "Posición de la imagen",
      default: "center",
      options: [
        { value: "center", label: "Centro" },
        { value: "top", label: "Arriba" },
        { value: "bottom", label: "Abajo" },
        { value: "left", label: "Izquierda" },
        { value: "right", label: "Derecha" },
      ],
    },
    cta_label: { type: "text", label: "Botón principal — texto", translatable: true },
    cta_href: { type: "url", label: "Botón principal — enlace" },
    cta_secondary_label: { type: "text", label: "Botón secundario — texto", translatable: true },
    cta_secondary_href: { type: "url", label: "Botón secundario — enlace" },
    cta_alignment: {
      type: "select",
      label: "Posición de botones",
      default: "left",
      options: [
        { value: "left", label: "Izquierda" },
        { value: "center", label: "Centro" },
        { value: "right", label: "Derecha" },
      ],
    },
  },
  capabilities: {
    soporta_i18n: true,
    soporta_seo: true,
    soporta_preview: true,
    soporta_responsive: true,
    soporta_cache: true,
  },
  constraints: { surfaces: ["home", "landing"], unique_per_page: true },
  responsive: { breakpoints: ["desktop", "tablet", "mobile"], overridable_fields: ["background_image", "background_position", "cta_alignment"] },
  i18n: {
    translatable_fields: ["eyebrow", "title", "subtitle", "cta_label", "cta_secondary_label"],
    fallback: "base_language",
  },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

const destinosBlock: BlockContract = {
  type: "vmx.section.destinos",
  category: "static",
  version: "1.0.0",
  display_name: "Sección Destinos",
  schema: {
    heading: { type: "text", label: "Encabezado", translatable: true },
  },
  capabilities: {
    soporta_i18n: true,
    soporta_seo: true,
    soporta_preview: true,
    soporta_responsive: true,
    soporta_cache: true,
  },
  constraints: { surfaces: ["home", "landing", "institutional"] },
  responsive: { breakpoints: ["desktop", "tablet", "mobile"] },
  i18n: { translatable_fields: ["heading"] },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

const categoriasBlock: BlockContract = {
  type: "vmx.section.categorias",
  category: "static",
  version: "1.0.0",
  display_name: "Sección Categorías",
  schema: { heading: { type: "text", label: "Encabezado", translatable: true } },
  capabilities: {
    soporta_i18n: true,
    soporta_preview: true,
    soporta_responsive: true,
    soporta_cache: true,
  },
  constraints: { surfaces: ["home", "landing"] },
  i18n: { translatable_fields: ["heading"] },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

const rutasBlock: BlockContract = {
  type: "vmx.section.rutas",
  category: "static",
  version: "1.0.0",
  display_name: "Sección Rutas",
  schema: { heading: { type: "text", label: "Encabezado", translatable: true } },
  capabilities: {
    soporta_i18n: true,
    soporta_preview: true,
    soporta_responsive: true,
    soporta_cache: true,
  },
  constraints: { surfaces: ["home", "landing"] },
  i18n: { translatable_fields: ["heading"] },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

const consejoAluxBlock: BlockContract = {
  type: "vmx.section.consejo-alux",
  category: "static",
  version: "1.0.0",
  display_name: "Consejo Alux",
  description: "Sección consultiva con sugerencias de Alux (modo read-only).",
  schema: { heading: { type: "text", label: "Encabezado", translatable: true } },
  capabilities: {
    soporta_i18n: true,
    soporta_preview: true,
    soporta_responsive: true,
  },
  constraints: { surfaces: ["home", "landing"] },
  i18n: { translatable_fields: ["heading"] },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

const armaTuViajeBlock: BlockContract = {
  type: "vmx.section.arma-tu-viaje",
  category: "static",
  version: "1.0.0",
  display_name: "CTA Arma tu Viaje",
  schema: {
    heading: { type: "text", label: "Encabezado", translatable: true },
    body: { type: "rich_text", label: "Cuerpo", translatable: true },
    cta_label: { type: "text", label: "Etiqueta CTA", translatable: true },
  },
  capabilities: {
    soporta_i18n: true,
    soporta_seo: true,
    soporta_preview: true,
    soporta_responsive: true,
  },
  constraints: { surfaces: ["home", "landing", "institutional"] },
  i18n: { translatable_fields: ["heading", "body", "cta_label"] },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

const enVivoBlock: BlockContract = {
  type: "vmx.section.en-vivo",
  category: "static",
  version: "1.0.0",
  display_name: "Oriente Maya EN VIVO",
  schema: { heading: { type: "text", label: "Encabezado", translatable: true } },
  capabilities: {
    soporta_i18n: true,
    soporta_preview: true,
    soporta_responsive: true,
    soporta_cache: true,
  },
  constraints: { surfaces: ["home"] },
  i18n: { translatable_fields: ["heading"] },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

const empresasSectionBlock: BlockContract = {
  type: "vmx.section.empresas",
  category: "static",
  version: "1.0.0",
  display_name: "Sección Empresas",
  schema: { heading: { type: "text", label: "Encabezado", translatable: true } },
  capabilities: {
    soporta_i18n: true,
    soporta_preview: true,
    soporta_responsive: true,
    soporta_cache: true,
  },
  constraints: { surfaces: ["home", "landing"] },
  i18n: { translatable_fields: ["heading"] },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

const resenasSectionBlock: BlockContract = {
  type: "vmx.section.resenas",
  category: "static",
  version: "1.0.0",
  display_name: "Sección Reseñas",
  schema: { heading: { type: "text", label: "Encabezado", translatable: true } },
  capabilities: {
    soporta_i18n: true,
    soporta_preview: true,
    soporta_responsive: true,
    soporta_cache: true,
  },
  constraints: { surfaces: ["home", "landing", "destination", "business"] },
  i18n: { translatable_fields: ["heading"] },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

/* ------------------------------------------------------------------ *
 * 3. Tarjetas reutilizables (Static)
 * ------------------------------------------------------------------ */

const cardSchemaCommon = {
  reference: {
    type: "reference" as const,
    label: "Referencia",
    required: true,
  },
};

const destinoCardBlock: BlockContract = {
  type: "vmx.card.destino",
  category: "static",
  version: "1.0.0",
  display_name: "Tarjeta de Destino",
  schema: { reference: { ...cardSchemaCommon.reference, references: "destination" } },
  capabilities: { soporta_i18n: true, soporta_preview: true, soporta_responsive: true, soporta_cache: true },
  constraints: { surfaces: ["home", "landing", "destination", "institutional"] },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

const empresaCardBlock: BlockContract = {
  type: "vmx.card.empresa",
  category: "static",
  version: "1.0.0",
  display_name: "Tarjeta de Empresa",
  schema: { reference: { ...cardSchemaCommon.reference, references: "business" } },
  capabilities: { soporta_i18n: true, soporta_preview: true, soporta_responsive: true, soporta_cache: true },
  constraints: { surfaces: ["home", "landing", "business", "institutional"] },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

const categoriaCardBlock: BlockContract = {
  type: "vmx.card.categoria",
  category: "static",
  version: "1.0.0",
  display_name: "Tarjeta de Categoría",
  schema: { reference: { ...cardSchemaCommon.reference, references: "business" } },
  capabilities: { soporta_i18n: true, soporta_preview: true, soporta_responsive: true },
  constraints: { surfaces: ["home", "landing"] },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

const rutaCardBlock: BlockContract = {
  type: "vmx.card.ruta",
  category: "static",
  version: "1.0.0",
  display_name: "Tarjeta de Ruta",
  schema: { reference: { ...cardSchemaCommon.reference, references: "destination" } },
  capabilities: { soporta_i18n: true, soporta_preview: true, soporta_responsive: true },
  constraints: { surfaces: ["home", "landing"] },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

const resenaCardBlock: BlockContract = {
  type: "vmx.card.resena",
  category: "static",
  version: "1.0.0",
  display_name: "Tarjeta de Reseña",
  schema: { reference: { ...cardSchemaCommon.reference, references: "business" } },
  capabilities: { soporta_i18n: true, soporta_preview: true, soporta_responsive: true },
  constraints: { surfaces: ["home", "landing", "destination", "business"] },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

/* ------------------------------------------------------------------ *
 * 4. Cockpit Fundador — Smart Blocks (Etapa 15.10.4c)
 * Principio "Founder Cockpit Composable": el Cockpit se compone vía
 * Block Registry; nuevos widgets se añaden registrando un nuevo
 * contrato — sin modificar código de presentación.
 * ------------------------------------------------------------------ */

const cockpitKpiGridBlock: BlockContract = {
  type: "vmx.cockpit.kpi-grid",
  category: "smart",
  version: "1.0.0",
  display_name: "Cockpit · KPIs",
  description:
    "Cuadrícula de KPIs globales del Fundador (empresas, viajeros, casos, ventas).",
  schema: {
    title: { type: "text", label: "Título", translatable: true, default: "Visión global" },
    window: {
      type: "select",
      label: "Ventana temporal",
      default: "30d",
      options: [
        { value: "7d", label: "7 días" },
        { value: "30d", label: "30 días" },
        { value: "90d", label: "90 días" },
        { value: "ytd", label: "Año en curso" },
      ],
    },
    domain: {
      type: "select",
      label: "Dominio",
      default: "all",
      options: [
        { value: "all", label: "Todos" },
        { value: "marketplace", label: "Marketplace" },
        { value: "concierge", label: "Concierge" },
        { value: "portal", label: "Portal" },
        { value: "cms", label: "CMS" },
      ],
    },
  },
  capabilities: {
    soporta_i18n: true,
    soporta_datos_dinamicos: true,
    soporta_personalizacion: true,
    soporta_cache: true,
    soporta_preview: true,
    soporta_responsive: true,
  },
  data_sources: [
    { domain: "bea", reader: "admin.getFounderKpis", read_only: true },
  ],
  i18n: { translatable_fields: ["title"], fallback: "base_language" },
  responsive: { breakpoints: ["desktop", "tablet", "mobile"], overridable_fields: [] },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

const cockpitAlertsBlock: BlockContract = {
  type: "vmx.cockpit.alerts",
  category: "smart",
  version: "1.0.0",
  display_name: "Cockpit · Alertas",
  description:
    "Stream de alertas críticas del Fundador (umbral KPI, SLA, pagos, accesos).",
  schema: {
    title: { type: "text", label: "Título", translatable: true, default: "Alertas" },
    limit: { type: "number", label: "Máximo de items", default: 10 },
  },
  capabilities: {
    soporta_i18n: true,
    soporta_datos_dinamicos: true,
    soporta_personalizacion: true,
    soporta_cache: true,
    soporta_preview: true,
    soporta_responsive: true,
  },
  data_sources: [
    { domain: "bea", reader: "notifications.listMyDeliveries", read_only: true },
  ],
  i18n: { translatable_fields: ["title"], fallback: "base_language" },
  responsive: { breakpoints: ["desktop", "tablet", "mobile"], overridable_fields: [] },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

const cockpitActivityStreamBlock: BlockContract = {
  type: "vmx.cockpit.activity-stream",
  category: "smart",
  version: "1.0.0",
  display_name: "Cockpit · Actividad",
  description: "Flujo cronológico de eventos operativos relevantes.",
  schema: {
    title: { type: "text", label: "Título", translatable: true, default: "Actividad reciente" },
    limit: { type: "number", label: "Máximo de items", default: 20 },
  },
  capabilities: {
    soporta_i18n: true,
    soporta_datos_dinamicos: true,
    soporta_personalizacion: true,
    soporta_cache: true,
    soporta_preview: true,
    soporta_responsive: true,
  },
  data_sources: [
    { domain: "bea", reader: "observability.activityStream", read_only: true },
  ],
  i18n: { translatable_fields: ["title"], fallback: "base_language" },
  responsive: { breakpoints: ["desktop", "tablet", "mobile"], overridable_fields: [] },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

/* ------------------------------------------------------------------ *
 * 5. Acciones — grupo de botones editable (Static)                    *
 *    Añadido en la corrección US-01 (15.10.4d): permite al Founder    *
 *    componer CTAs sin editar código.                                 *
 * ------------------------------------------------------------------ */

const actionsButtonsBlock: BlockContract = {
  type: "vmx.actions.buttons",
  category: "static",
  version: "1.0.0",
  display_name: "Grupo de botones",
  description: "Fila de botones (CTAs) editables desde el Studio.",
  schema: {
    alignment: {
      type: "select",
      label: "Alineación",
      default: "center",
      options: [
        { value: "left", label: "Izquierda" },
        { value: "center", label: "Centro" },
        { value: "right", label: "Derecha" },
      ],
    },
    items: {
      type: "list",
      label: "Botones",
      item: {
        type: "object",
        label: "Botón",
        fields: {
          label: { type: "text", label: "Texto", translatable: true, required: true },
          href: { type: "url", label: "Enlace", required: true },
          variant: {
            type: "select",
            label: "Estilo",
            default: "primary",
            options: [
              { value: "primary", label: "Primario" },
              { value: "secondary", label: "Secundario" },
              { value: "ghost", label: "Fantasma" },
            ],
          },
        },
      },
    },
  },
  capabilities: {
    soporta_i18n: true,
    soporta_preview: true,
    soporta_responsive: true,
  },
  constraints: {
    surfaces: ["home", "landing", "institutional", "destination", "business", "product"],
  },
  i18n: { translatable_fields: ["items"] },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

/* ------------------------------------------------------------------ *
 * Registro
 * ------------------------------------------------------------------ */

export const INITIAL_BLOCK_LIBRARY: BlockContract[] = [
  containerBlock,
  sectionBlock,
  spacerBlock,
  dividerBlock,
  heroBlock,
  destinosBlock,
  categoriasBlock,
  rutasBlock,
  consejoAluxBlock,
  armaTuViajeBlock,
  enVivoBlock,
  empresasSectionBlock,
  resenasSectionBlock,
  destinoCardBlock,
  empresaCardBlock,
  categoriaCardBlock,
  rutaCardBlock,
  resenaCardBlock,
  // Etapa 15.10.4c · Founder Cockpit Composable — bloques cockpit
  cockpitKpiGridBlock,
  cockpitAlertsBlock,
  cockpitActivityStreamBlock,
  // Corrección US-01 (15.10.4d)
  actionsButtonsBlock,
  customHtmlBlock,
  customFormBlock,
];

/* ------------------------------------------------------------------ *
 * Bloques avanzados (Modo Profesional) — HTML embebido y Formulario.
 * Registrados globalmente para todas las superficies.
 * ------------------------------------------------------------------ */

const customHtmlBlock: BlockContract = {
  type: "vmx.custom.html",
  category: "static",
  version: "1.0.0",
  display_name: "HTML / Código embebido",
  description:
    "Bloque avanzado: inserta HTML crudo (embeds, scripts de terceros, widgets).",
  schema: {
    html: {
      type: "rich_text",
      label: "HTML",
      description:
        "Se renderiza tal cual. Sólo pega código de fuentes en las que confíes.",
      default: "<p>Escribe o pega tu HTML aquí.</p>",
    },
    max_width: {
      type: "select",
      label: "Ancho",
      default: "container",
      options: [
        { value: "container", label: "Contenedor" },
        { value: "full", label: "Ancho completo" },
      ],
    },
  },
  capabilities: { soporta_preview: true },
  constraints: {
    surfaces: ["home", "landing", "institutional", "destination", "business", "product", "campaign"],
  },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

const customFormBlock: BlockContract = {
  type: "vmx.custom.form",
  category: "interactive",
  version: "1.0.0",
  display_name: "Formulario",
  description:
    "Formulario configurable. Envía los datos a un webhook (Zapier, Make, correo…).",
  schema: {
    heading: { type: "text", label: "Título", default: "Contáctanos" },
    subheading: { type: "text", label: "Subtítulo", default: "" },
    submit_label: { type: "text", label: "Texto del botón", default: "Enviar" },
    success_message: {
      type: "text",
      label: "Mensaje de éxito",
      default: "¡Gracias! Recibimos tu mensaje.",
    },
    webhook_url: {
      type: "url",
      label: "URL de webhook (opcional)",
      description:
        "Recibe los datos por POST JSON. Déjalo vacío para sólo mostrar el mensaje de éxito.",
    },
    fields: {
      type: "list",
      label: "Campos",
      default: [
        { key: "name", label: "Nombre", type: "text", required: true },
        { key: "email", label: "Email", type: "email", required: true },
        { key: "message", label: "Mensaje", type: "textarea", required: false },
      ],
      item: {
        type: "object",
        label: "Campo",
        fields: {
          key: { type: "text", label: "Nombre técnico", required: true },
          label: { type: "text", label: "Etiqueta visible", required: true },
          type: {
            type: "select",
            label: "Tipo",
            default: "text",
            options: [
              { value: "text", label: "Texto" },
              { value: "email", label: "Email" },
              { value: "tel", label: "Teléfono" },
              { value: "textarea", label: "Área de texto" },
            ],
          },
          required: { type: "boolean", label: "Obligatorio", default: false },
        },
      },
    },
  },
  capabilities: { soporta_preview: true, soporta_i18n: true },
  constraints: {
    surfaces: ["home", "landing", "institutional", "destination", "business", "product", "campaign"],
  },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

let bootstrapped = false;

/** Carga el catálogo inicial al Registry. Idempotente. */
export function bootstrapBlockLibrary(): void {
  if (bootstrapped) return;
  for (const c of INITIAL_BLOCK_LIBRARY) registerBlock(c);
  bootstrapped = true;
}

// Auto-bootstrap al importar el módulo. Esto NO toca la base de datos;
// la sincronización a `block_definitions` la realiza el server function
// `syncBlockLibrary` ejecutado por un administrador.
bootstrapBlockLibrary();