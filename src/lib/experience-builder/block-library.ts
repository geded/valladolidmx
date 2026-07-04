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
import { KIT_BLOCK_CONTRACTS } from "./kit-blocks";
import heroBg01Url from "@/assets/brand/hero/bg01.jpg";
import heroBg02Url from "@/assets/brand/hero/bg02.jpg";

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
  version: "1.2.0",
  display_name: "Hero",
  description: "Bloque hero principal de la Home y de Landing Pages.",
  schema: {
    eyebrow: {
      type: "text",
      label: "Frase superior",
      translatable: true,
      default: "Experiencias que emocionan",
    },
    title: {
      type: "text",
      label: "Título",
      required: true,
      translatable: true,
      default: "Despierta en Valladolid y descubre el Oriente Maya de Yucatán.",
    },
    subtitle: {
      type: "text",
      label: "Subtítulo",
      translatable: true,
      default: "Cenotes, ciudades vivas y rutas auténticas más allá de la costumbre.",
    },
    background_images: {
      type: "list",
      label: "Imágenes de fondo (carrusel)",
      description: "Agrega, edita o elimina imágenes del carrusel. Cada imagen tiene su botón para guardarla en la Biblioteca.",
      default: [{ src: heroBg01Url }, { src: heroBg02Url }],
      item: {
        type: "object",
        label: "Imagen",
        fields: {
          src: { type: "media", label: "Imagen", accepts: ["image/*"] },
        },
      },
    },
    slide_interval_seconds: {
      type: "number",
      label: "Segundos por imagen",
      default: 7,
      description: "Duración de cada imagen del carrusel (mínimo 2 s).",
    },
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
    ctas: {
      type: "list",
      label: "Botones",
      description: "Agrega, edita, reordena o elimina los botones del hero. Si la lista queda vacía se usan los botones por defecto — para ocultarlos usa el interruptor 'Mostrar botones'.",
      item: {
        type: "object",
        label: "Botón",
        fields: {
          label: { type: "text", label: "Texto", translatable: true },
          href: { type: "url", label: "Enlace" },
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
          size: {
            type: "select",
            label: "Tamaño",
            default: "md",
            options: [
              { value: "xs", label: "Extra pequeño" },
              { value: "sm", label: "Pequeño" },
              { value: "md", label: "Mediano (por defecto)" },
              { value: "lg", label: "Grande" },
              { value: "xl", label: "Extra grande" },
            ],
          },
          full_width: {
            type: "boolean",
            label: "Ancho completo",
            default: false,
          },
        },
      },
    },
    show_ctas: {
      type: "boolean",
      label: "Mostrar botones",
      default: true,
    },
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
    show_search: {
      type: "boolean",
      label: "Mostrar buscador",
      default: true,
    },
    search_placeholder: {
      type: "text",
      label: "Texto del buscador (placeholder)",
      translatable: true,
      default: "Busca un destino, una experiencia, un sabor…",
      description: "Texto guía que se muestra dentro del buscador cuando está vacío.",
    },
    search_helper: {
      type: "text",
      label: "Ayuda del buscador",
      translatable: true,
      default: "Sólo si ya sabes qué buscar",
      description: "Texto pequeño a la derecha del buscador (visible sólo en pantallas grandes).",
    },
    search_size: {
      type: "select",
      label: "Tamaño del buscador",
      default: "md",
      options: [
        { value: "sm", label: "Pequeño" },
        { value: "md", label: "Mediano (por defecto)" },
        { value: "lg", label: "Grande" },
        { value: "xl", label: "Extra grande" },
      ],
    },
    search_max_width: {
      type: "select",
      label: "Ancho máximo del buscador",
      default: "md",
      options: [
        { value: "sm", label: "Angosto" },
        { value: "md", label: "Medio (por defecto)" },
        { value: "lg", label: "Ancho" },
        { value: "xl", label: "Muy ancho" },
        { value: "full", label: "Ancho completo" },
      ],
    },
    text_alignment: {
      type: "select",
      label: "Posición del texto (frase, título, subtítulo)",
      default: "left",
      options: [
        { value: "left", label: "Izquierda" },
        { value: "center", label: "Centro" },
        { value: "right", label: "Derecha" },
      ],
    },
    search_alignment: {
      type: "select",
      label: "Posición del buscador",
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
  responsive: { breakpoints: ["desktop", "tablet", "mobile"], overridable_fields: ["background_images", "background_position", "cta_alignment", "text_alignment", "search_alignment"] },
  i18n: {
    translatable_fields: ["eyebrow", "title", "subtitle", "ctas", "search_placeholder", "search_helper"],
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
    heading: { type: "text", label: "Encabezado", translatable: true, default: "Destinos del Oriente Maya" },
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
  schema: { heading: { type: "text", label: "Encabezado", translatable: true, default: "Qué te mueve" } },
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
  schema: { heading: { type: "text", label: "Encabezado", translatable: true, default: "Rutas sugeridas" } },
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
  schema: { heading: { type: "text", label: "Encabezado", translatable: true, default: "Un consejo de Alux" } },
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
    heading: { type: "text", label: "Encabezado", translatable: true, default: "Arma tu Viaje" },
    body: {
      type: "rich_text",
      label: "Cuerpo",
      translatable: true,
      default: "Tu expediente personal. Guarda destinos, experiencias y notas. Tu concierge humano lo recibe cuando estés listo.",
    },
    cta_label: { type: "text", label: "Etiqueta CTA", translatable: true, default: "Arma tu viaje" },
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
  schema: { heading: { type: "text", label: "Encabezado", translatable: true, default: "Oriente Maya en vivo" } },
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
  schema: { heading: { type: "text", label: "Encabezado", translatable: true, default: "Empresas recomendadas" } },
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
  schema: { heading: { type: "text", label: "Encabezado", translatable: true, default: "Lo que cuentan quienes ya vinieron" } },
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
          size: {
            type: "select",
            label: "Tamaño",
            default: "md",
            options: [
              { value: "sm", label: "Pequeño" },
              { value: "md", label: "Medio" },
              { value: "lg", label: "Grande" },
              { value: "xl", label: "Extra grande" },
            ],
          },
          full_width: {
            type: "boolean",
            label: "Ancho completo",
            default: false,
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
 * Bloques avanzados (Modo Profesional) — HTML embebido y Formulario.
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
    surfaces: ["home", "landing", "institutional", "destination", "business", "product"],
  },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

const customFormBlock: BlockContract = {
  type: "vmx.custom.form",
  category: "static",
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
    surfaces: ["home", "landing", "institutional", "destination", "business", "product"],
  },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

/* ------------------------------------------------------------------ *
 * Registro
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Etapa 15.10.8 · Smart Blocks v1
 * Bloques que consumen datos reales (destinos, empresas, productos,
 * eventos) vía `SmartBlockQuery` declarativa resuelta server-side por
 * `resolveSmartBlock` (RLS anon + lista blanca de tablas/columnas).
 * ------------------------------------------------------------------ */

const smartCommonSchema = {
  title: {
    type: "text",
    label: "Título",
    translatable: true,
  },
  limit: {
    type: "number",
    label: "Cantidad de elementos",
    default: 6,
  },
  only_featured: {
    type: "boolean",
    label: "Solo destacados",
    default: false,
  },
} as const;

const smartDestinationsGridBlock: BlockContract = {
  type: "vmx.smart.destinations-grid",
  category: "smart",
  version: "1.0.0",
  display_name: "Destinos (Smart)",
  description: "Grid dinámico de destinos publicados.",
  schema: { ...smartCommonSchema },
  capabilities: {
    soporta_datos_dinamicos: true,
    soporta_i18n: true,
    soporta_preview: true,
    soporta_responsive: true,
    soporta_cache: true,
  },
  data_sources: [
    {
      domain: "destinations",
      read_only: true,
      query: {
        table: "destinations",
        select: ["id", "slug", "name", "short_description", "hero_image_url", "is_featured", "sort_order"],
        filters: [{ column: "status", op: "eq", value: "published" }],
        order_by: [{ column: "sort_order", direction: "asc" }],
        limit: 6,
      },
    },
  ],
  constraints: { surfaces: ["home", "landing", "institutional", "destination"] },
  i18n: { translatable_fields: ["title"], fallback: "base_language" },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

const smartBusinessesGridBlock: BlockContract = {
  type: "vmx.smart.businesses-grid",
  category: "smart",
  version: "1.0.0",
  display_name: "Empresas (Smart)",
  description: "Grid dinámico de empresas publicadas.",
  schema: { ...smartCommonSchema },
  capabilities: {
    soporta_datos_dinamicos: true,
    soporta_i18n: true,
    soporta_preview: true,
    soporta_responsive: true,
    soporta_cache: true,
  },
  data_sources: [
    {
      domain: "businesses",
      read_only: true,
      query: {
        table: "businesses",
        select: ["id", "slug", "name", "short_description", "cover_image_url", "logo_url", "is_featured"],
        filters: [{ column: "status", op: "eq", value: "published" }],
        limit: 6,
      },
    },
  ],
  constraints: { surfaces: ["home", "landing", "destination", "business"] },
  i18n: { translatable_fields: ["title"], fallback: "base_language" },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

const smartProductsGridBlock: BlockContract = {
  type: "vmx.smart.products-grid",
  category: "smart",
  version: "1.0.0",
  display_name: "Productos (Smart)",
  description: "Grid dinámico de productos publicados.",
  schema: { ...smartCommonSchema },
  capabilities: {
    soporta_datos_dinamicos: true,
    soporta_i18n: true,
    soporta_preview: true,
    soporta_responsive: true,
    soporta_cache: true,
  },
  data_sources: [
    {
      domain: "marketplace",
      read_only: true,
      query: {
        table: "products",
        select: ["id", "slug", "name", "short_description", "cover_image_url", "price", "currency", "is_featured"],
        filters: [{ column: "status", op: "eq", value: "published" }],
        limit: 6,
      },
    },
  ],
  constraints: { surfaces: ["home", "landing", "destination", "business", "product"] },
  i18n: { translatable_fields: ["title"], fallback: "base_language" },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

const smartEventsListBlock: BlockContract = {
  type: "vmx.smart.events-list",
  category: "smart",
  version: "1.0.0",
  display_name: "Eventos (Smart)",
  description: "Lista de eventos publicados por fecha.",
  schema: { ...smartCommonSchema },
  capabilities: {
    soporta_datos_dinamicos: true,
    soporta_i18n: true,
    soporta_preview: true,
    soporta_responsive: true,
    soporta_cache: true,
  },
  data_sources: [
    {
      domain: "events",
      read_only: true,
      query: {
        table: "events",
        select: ["id", "slug", "name", "short_description", "cover_image_url", "starts_at", "ends_at", "is_featured"],
        filters: [{ column: "status", op: "eq", value: "published" }],
        order_by: [{ column: "starts_at", direction: "asc" }],
        limit: 6,
      },
    },
  ],
  constraints: { surfaces: ["home", "landing", "destination"] },
  i18n: { translatable_fields: ["title"], fallback: "base_language" },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

/* ------------------------------------------------------------------ *
 * US-R3 · Ola 1 (Singletons) — Bloques de Superficie oficiales.
 *
 * Cada bloque `vmx.surface.*` representa la plantilla oficial de una
 * superficie pública singleton (Home ya cuenta con composición por
 * secciones; aquí se registran las 3 restantes de la Ola 1). Estos
 * contratos son la identidad permanente de la plantilla — evolucionan
 * en versión, no se sustituyen. No aceptan configuración editorial en
 * esta ola (adopción reproductiva). US-R4+ agrega schema editable
 * sobre estos mismos tipos preservando compatibilidad.
 * ------------------------------------------------------------------ */

const surfaceMarketplaceBlock: BlockContract = {
  type: "vmx.surface.marketplace",
  category: "static",
  version: "1.0.0",
  display_name: "Superficie · Marketplace",
  description:
    "Plantilla oficial del Marketplace público (/marketplace). Renderiza el catálogo de empresas publicadas.",
  schema: {},
  capabilities: {
    soporta_preview: true,
    soporta_responsive: true,
    soporta_seo: true,
    soporta_cache: true,
  },
  constraints: { surfaces: ["marketplace"] },
  responsive: { breakpoints: ["desktop", "tablet", "mobile"] },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

const surfaceAluxBlock: BlockContract = {
  type: "vmx.surface.alux",
  category: "static",
  version: "1.0.0",
  display_name: "Superficie · Alux",
  description:
    "Plantilla oficial de la página pública consultiva de Alux (/alux).",
  schema: {},
  capabilities: {
    soporta_preview: true,
    soporta_responsive: true,
    soporta_seo: true,
    soporta_cache: true,
  },
  constraints: { surfaces: ["alux"] },
  responsive: { breakpoints: ["desktop", "tablet", "mobile"] },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

const surfaceTripPlannerBlock: BlockContract = {
  type: "vmx.surface.trip-planner",
  category: "static",
  version: "1.0.0",
  display_name: "Superficie · Arma tu Viaje",
  description:
    "Plantilla oficial del constructor de viajes (/arma-tu-viaje).",
  schema: {},
  capabilities: {
    soporta_preview: true,
    soporta_responsive: true,
    soporta_seo: true,
    soporta_cache: true,
  },
  constraints: { surfaces: ["trip_builder"] },
  responsive: { breakpoints: ["desktop", "tablet", "mobile"] },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

/* ------------------------------------------------------------------ *
 * US-R3 · Ola 2 · Sub-ola 2.1 — Superficies dinámicas por slug.
 *
 * `vmx.surface.region` reproduce la ficha de una Región turística.
 * `vmx.surface.destination` reproduce la ficha de un Destino. Ambas
 * plantillas se cargan por kind (1 plantilla por kind + resolución por
 * slug en la ruta; 0 composiciones por registro). No aceptan
 * configuración editorial en esta sub-ola (adopción reproductiva).
 * ------------------------------------------------------------------ */

const surfaceRegionBlock: BlockContract = {
  type: "vmx.surface.region",
  category: "static",
  version: "1.0.0",
  display_name: "Superficie · Región",
  description:
    "Plantilla oficial de la ficha de una Región turística. Renderiza el índice de destinos publicados de la región activa.",
  schema: {},
  capabilities: {
    soporta_preview: true,
    soporta_responsive: true,
    soporta_seo: true,
    soporta_cache: true,
  },
  constraints: { surfaces: ["region"] },
  responsive: { breakpoints: ["desktop", "tablet", "mobile"] },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

const surfaceDestinationBlock: BlockContract = {
  type: "vmx.surface.destination",
  category: "static",
  version: "1.0.0",
  display_name: "Superficie · Destino",
  description:
    "Plantilla oficial de la ficha pública de un Destino. Renderiza la vista del destino resuelto por slug.",
  schema: {},
  capabilities: {
    soporta_preview: true,
    soporta_responsive: true,
    soporta_seo: true,
    soporta_cache: true,
  },
  constraints: { surfaces: ["destination"] },
  responsive: { breakpoints: ["desktop", "tablet", "mobile"] },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

/* ------------------------------------------------------------------ *
 * US-R3 · Ola 2 · Sub-ola 2.2 — Plantilla Madre Business.
 *
 * Bloque universal para toda ficha pública de negocio (empresas,
 * hoteles, restaurantes, cenotes, museos, agencias, tours,
 * transportistas, tiendas, servicios y futuras categorías). Los gates
 * de capacidades se resuelven vía Catálogo Central de Planes; el
 * bloque no codifica límites propios.
 * ------------------------------------------------------------------ */

const surfaceBusinessBlock: BlockContract = {
  type: "vmx.surface.business",
  category: "static",
  version: "1.0.0",
  display_name: "Superficie · Empresa",
  description:
    "Plantilla madre oficial para toda ficha pública de negocio. La categoría define variantes; el plan contratado habilita capacidades vía Catálogo Central de Planes.",
  schema: {},
  capabilities: {
    soporta_preview: true,
    soporta_responsive: true,
    soporta_seo: true,
    soporta_cache: true,
  },
  constraints: { surfaces: ["business"] },
  responsive: { breakpoints: ["desktop", "tablet", "mobile"] },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

/* ------------------------------------------------------------------ *
 * US-R3 · Sub-ola 2.2b — Plantilla Madre Business (bloques granulares).
 *
 * El editor ya no ve un bloque monolítico: el árbol lateral expone la
 * estructura editorial completa. Cada bloque es reutilizable, respeta
 * gates por plan (vía Catálogo Central de Planes) y hereda el contexto
 * `BusinessSurfaceContext` inyectado por el Studio o por la ruta pública.
 * ------------------------------------------------------------------ */

function businessBlock(
  type: string,
  display_name: string,
  description: string,
  extra: Partial<BlockContract> = {},
): BlockContract {
  return {
    type,
    category: "static",
    version: "1.0.0",
    display_name,
    description,
    schema: {},
    capabilities: {
      soporta_preview: true,
      soporta_responsive: true,
      soporta_seo: false,
      soporta_cache: true,
    },
    constraints: { surfaces: ["business"] },
    responsive: { breakpoints: ["desktop", "tablet", "mobile"] },
    audit: ["Block.Registered", "Block.VersionPublished"],
    ...extra,
  };
}

const businessShellBlock = businessBlock(
  "vmx.business.shell",
  "Empresa · Shell",
  "Contenedor oficial de la ficha de negocio (PublicShell con eyebrow, título, descripción y breadcrumbs).",
);
const businessHeaderBadgesBlock = businessBlock(
  "vmx.business.header-badges",
  "Empresa · Badges de encabezado",
  "Favorito y sello de verificación bajo el título del negocio.",
);
const businessDescriptionBlock = businessBlock(
  "vmx.business.description",
  "Empresa · Descripción",
  "Descripción larga tomada del CMS del negocio.",
);
const businessGalleryBlock = businessBlock(
  "vmx.business.gallery",
  "Empresa · Galería",
  "Galería de fotografías del negocio (gated por plan).",
);
const businessInfoBlock = businessBlock(
  "vmx.business.info",
  "Empresa · Información",
  "Ficha rápida: destino, categoría, verificación y plan.",
);
const businessProductsBlock = businessBlock(
  "vmx.business.products",
  "Empresa · Productos",
  "Listado de productos, habitaciones, menú, tours o servicios según categoría.",
);
const businessPromotionsBlock = businessBlock(
  "vmx.business.promotions",
  "Empresa · Promociones",
  "Promociones vigentes (gated por plan vía Catálogo Central).",
);
const businessContactBlock = businessBlock(
  "vmx.business.contact",
  "Empresa · Contacto",
  "Datos de contacto y reservación tomados del CMS.",
);

/* ------------------------------------------------------------------ *
 * US-R3 · Sub-ola 2.3a — Plantilla Madre Producto (bloques granulares).
 *
 * Ficha individual de un producto (NO catálogo dentro de una empresa).
 * Cada bloque consume `ProductSurfaceContext`. Registro editorial:
 * shell (contenedor), hero, gallery, price-cta, description,
 * business-context, promos, reviews, faq y related. Añadir un bloque
 * nuevo = añadir una entrada aquí; el renderer y el Studio no cambian.
 * ------------------------------------------------------------------ */

function productBlock(
  type: string,
  display_name: string,
  description: string,
  extra: Partial<BlockContract> = {},
): BlockContract {
  return {
    type,
    category: "static",
    version: "1.0.0",
    display_name,
    description,
    schema: {},
    capabilities: {
      soporta_preview: true,
      soporta_responsive: true,
      soporta_seo: false,
      soporta_cache: true,
    },
    constraints: { surfaces: ["product"] },
    responsive: { breakpoints: ["desktop", "tablet", "mobile"] },
    audit: ["Block.Registered", "Block.VersionPublished"],
    ...extra,
  };
}

const productShellBlock = productBlock(
  "vmx.product.shell",
  "Producto · Shell",
  "Contenedor oficial de la ficha de producto (PublicShell con breadcrumbs jerárquicos).",
);
const productHeroBlock = productBlock(
  "vmx.product.hero",
  "Producto · Hero",
  "Tipo, título, tagline y favorito bajo el encabezado del producto.",
);
const productGalleryBlock = productBlock(
  "vmx.product.gallery",
  "Producto · Galería",
  "Portada + galería. Scroll-snap mobile, grid en tablet/desktop.",
);
const productPriceCtaBlock = productBlock(
  "vmx.product.price-cta",
  "Producto · Precio + CTA",
  "Precio prominente y Estrategia de Conversión (comprar/reservar/cotizar/contactar).",
);
const productDescriptionBlock = productBlock(
  "vmx.product.description",
  "Producto · Descripción",
  "Descripción larga del producto tomada del CMS.",
);
const productBusinessContextBlock = productBlock(
  "vmx.product.business-context",
  "Producto · Empresa oferente",
  "Empresa padre + link, contacto y ubicación pública.",
);
const productPromosBlock = productBlock(
  "vmx.product.promos",
  "Producto · Promociones",
  "Promociones vigentes de la empresa que ofrece el producto.",
);
const productReviewsBlock = productBlock(
  "vmx.product.reviews",
  "Producto · Opiniones",
  "Opiniones publicadas por viajeros sobre este producto.",
);
const productFaqBlock = productBlock(
  "vmx.product.faq",
  "Producto · Preguntas frecuentes",
  "FAQs publicadas asociadas al producto.",
);
const productRelatedBlock = productBlock(
  "vmx.product.related",
  "Producto · Relacionados",
  "Otros productos publicados por la misma empresa.",
);

/* ------------------------------------------------------------------ *
 * H-02 · Iniciativa 2 — Discovery Navigator
 *
 * Bloque oficial de descubrimiento territorial. Su misión es ser el
 * punto de entrada hacia toda la oferta turística del contexto activo
 * (destino, región, micrositio, landing). Diseñado para evolucionar
 * hacia promociones, eventos, experiencias destacadas, Alux y campañas
 * sin cambiar la firma del contrato.
 * ------------------------------------------------------------------ */
const discoveryNavigatorBlock: BlockContract = {
  type: "vmx.discovery.navigator",
  category: "static",
  version: "1.0.0",
  display_name: "Discovery Navigator",
  description:
    "Centro de descubrimiento territorial. Muestra las categorías disponibles del destino con conteos dinámicos y las conecta con las superficies del portal.",
  schema: {
    title: {
      type: "text",
      label: "Título",
      translatable: true,
      default: "Explora el destino",
    },
    variant: {
      type: "select",
      label: "Variante",
      default: "panel",
      options: [
        { value: "panel", label: "Panel" },
        { value: "list", label: "Lista" },
        { value: "grid", label: "Grid" },
      ],
    },
    showCounts: {
      type: "boolean",
      label: "Mostrar conteos",
      default: true,
    },
    ctaLabel: {
      type: "text",
      label: "Texto del enlace inferior",
      translatable: true,
      default: "Ver todo el Marketplace",
    },
    ctaHref: {
      type: "url",
      label: "URL del enlace inferior",
    },
    emptyLabel: {
      type: "text",
      label: "Mensaje vacío",
      translatable: true,
      default: "Aún no hay categorías publicadas.",
    },
    scope: {
      type: "select",
      label: "Alcance",
      default: "auto",
      options: [
        { value: "auto", label: "Automático (contexto de la ruta)" },
        { value: "destination", label: "Destino específico" },
        { value: "region", label: "Región" },
      ],
    },
    manualDestinationSlug: {
      type: "text",
      label: "Slug de destino (manual)",
    },
    manualRegionSlug: {
      type: "text",
      label: "Slug de región (manual)",
    },
  },
  capabilities: {
    soporta_i18n: true,
    soporta_preview: true,
    soporta_responsive: true,
    soporta_cache: true,
  },
  // Sin `constraints.surfaces` → utilizable en cualquier página pública.
  responsive: { breakpoints: ["desktop", "tablet", "mobile"] },
  i18n: { translatable_fields: ["title", "ctaLabel", "emptyLabel"] },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

/* ------------------------------------------------------------------ *
 * H-03 · Ola I1.a — Experience Hero (`vmx.experience.hero`)
 *
 * Bloque fundacional de las Experience Pages. Su misión es reemplazar
 * los headers estáticos de fichas por un hero accionable que informa,
 * inspira, descubre y convierte, respetando la identidad de
 * Valladolid.mx.
 *
 * Regla de Compatibilidad Evolutiva: este bloque evoluciona sólo
 * mediante `variant`, `capabilities`, `permissions` y `extensions[]`.
 * NO se creará jamás `experience.hero-pro` ni `experience.hero-v2`.
 *
 * 3 capas:
 *  - Presentación: `src/components/experience-builder/blocks/experience-hero/ExperienceHero.tsx`
 *  - Contenido:    `src/lib/experience-builder/blocks/experience-hero/contract.ts` (Zod v1.0.0)
 *  - Comportamiento: `.../ExperienceHeroBlock.tsx` (hidrata SurfaceContext)
 *
 * Checklist de admisión (6/6 verde):
 *  1. Reutilizable en business/product/event/destination/region/landing ✔
 *  2. Aporta valor al visitante (jerarquía + acciones inmediatas)       ✔
 *  3. Mejora descubrimiento (badges + meta contextuales)                ✔
 *  4. Mejora conversión (CTA primario/secundario persistente)           ✔
 *  5. Mobile First / Touch First (min-h 44px, layout responsive)        ✔
 *  6. Respeta Context Engine (no altera rutas ni breadcrumbs)           ✔
 * ------------------------------------------------------------------ */
const experienceHeroBlock: BlockContract = {
  type: "vmx.experience.hero",
  category: "static",
  version: "1.0.0",
  display_name: "Experience Hero",
  description:
    "Hero accionable universal para Experience Pages (business, product, event, destination, region). Informa, inspira y convierte desde el primer scroll.",
  schema: {
    source: {
      type: "select",
      label: "Fuente de datos",
      default: "manual",
      options: [
        { value: "manual", label: "Manual (config)" },
        { value: "business", label: "Ficha de empresa (auto)" },
        { value: "product", label: "Ficha de producto (reservado)" },
        { value: "destination", label: "Destino (reservado)" },
        { value: "event", label: "Evento (reservado)" },
      ],
    },
    variant: {
      type: "select",
      label: "Variante",
      default: "immersive",
      options: [
        { value: "immersive", label: "Inmersivo (media full-bleed)" },
        { value: "compact", label: "Compacto (media + texto)" },
        { value: "editorial", label: "Editorial (sin media)" },
      ],
    },
    eyebrow:     { type: "text", label: "Eyebrow", translatable: true },
    title:       { type: "text", label: "Título", translatable: true },
    description: { type: "rich_text", label: "Descripción", translatable: true },
    mediaUrl:    { type: "url", label: "URL de la media (imagen)" },
    mediaAlt:    { type: "text", label: "Texto alternativo", translatable: true },
    overlay:     { type: "number", label: "Overlay (0–1)", default: 0.45 },
    badges: {
      type: "list",
      label: "Badges",
      item: {
        type: "object",
        label: "Badge",
        fields: {
          label:   { type: "text", label: "Texto", translatable: true, required: true },
          tone:    { type: "select", label: "Tono", default: "neutral", options: [
            { value: "neutral", label: "Neutro" },
            { value: "primary", label: "Primario" },
            { value: "success", label: "Éxito" },
            { value: "warning", label: "Advertencia" },
          ] },
          iconKey: { type: "text", label: "Icono (Lucide key)" },
        },
      },
    },
    meta: {
      type: "list",
      label: "Meta chips",
      item: {
        type: "object",
        label: "Meta",
        fields: {
          iconKey: { type: "text", label: "Icono (Lucide key)" },
          label:   { type: "text", label: "Texto", translatable: true, required: true },
        },
      },
    },
    ctaPrimary: {
      type: "object",
      label: "CTA primario",
      fields: {
        label:  { type: "text", label: "Texto", translatable: true, required: true },
        href:   { type: "url", label: "URL" },
        action: { type: "select", label: "Acción", default: "navigate", options: [
          { value: "navigate", label: "Navegar" },
          { value: "favorite", label: "Guardar" },
          { value: "contact",  label: "Contactar" },
          { value: "book",     label: "Reservar" },
          { value: "share",    label: "Compartir" },
        ] },
      },
    },
    ctaSecondary: {
      type: "object",
      label: "CTA secundario",
      fields: {
        label:  { type: "text", label: "Texto", translatable: true, required: true },
        href:   { type: "url", label: "URL" },
        action: { type: "select", label: "Acción", default: "navigate", options: [
          { value: "navigate", label: "Navegar" },
          { value: "favorite", label: "Guardar" },
          { value: "contact",  label: "Contactar" },
          { value: "book",     label: "Reservar" },
          { value: "share",    label: "Compartir" },
        ] },
      },
    },
  },
  capabilities: {
    soporta_i18n: true,
    soporta_preview: true,
    soporta_responsive: true,
    soporta_cache: true,
    soporta_seo: true,
  },
  // Sin `constraints.surfaces` → utilizable en cualquier Experience Page.
  constraints: { unique_per_page: true },
  responsive: {
    breakpoints: ["desktop", "tablet", "mobile"],
    overridable_fields: ["variant", "overlay"],
  },
  i18n: {
    translatable_fields: ["eyebrow", "title", "description", "mediaAlt"],
  },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

/* ------------------------------------------------------------------ *
 * H-03 · Ola I1.b — Experience Subnav (`vmx.experience.subnav`)
 *   Sub-nav sticky con anclas manuales, auto-detectadas o presets.
 *   Reutilizable en business/product/event/destination/region/landing.
 * ------------------------------------------------------------------ */
const experienceSubnavBlock: BlockContract = {
  type: "vmx.experience.subnav",
  category: "static",
  version: "1.0.0",
  display_name: "Experience Subnav",
  description:
    "Sub-nav horizontal sticky para saltar entre secciones de la ficha. Reutilizable en cualquier Experience Page.",
  schema: {
    source: {
      type: "select",
      label: "Fuente de anclas",
      default: "manual",
      options: [
        { value: "manual", label: "Manual" },
        { value: "auto", label: "Auto (detecta secciones)" },
        { value: "business", label: "Preset ficha empresa" },
        { value: "product", label: "Preset ficha producto" },
        { value: "destination", label: "Preset destino" },
        { value: "event", label: "Preset evento" },
      ],
    },
    variant: {
      type: "select",
      label: "Variante",
      default: "pill",
      options: [
        { value: "pill", label: "Chips (pill)" },
        { value: "tabs", label: "Tabs con underline" },
        { value: "underline", label: "Editorial (underline)" },
      ],
    },
    sticky: { type: "boolean", label: "Fija arriba al hacer scroll", default: true },
    scrollOffset: { type: "number", label: "Offset de scroll (px)", default: 80 },
    ariaLabel: { type: "text", label: "Etiqueta accesible", default: "Secciones de la página", translatable: true },
    anchors: {
      type: "list",
      label: "Anclas",
      item: {
        type: "object",
        label: "Ancla",
        fields: {
          id: { type: "text", label: "ID (destino del anchor)", required: true },
          label: { type: "text", label: "Etiqueta", required: true, translatable: true },
          iconKey: { type: "text", label: "Icono (Lucide key)" },
        },
      },
    },
  },
  capabilities: {
    soporta_i18n: true,
    soporta_preview: true,
    soporta_responsive: true,
    soporta_cache: true,
  },
  // Sin `constraints.surfaces` → utilizable en cualquier Experience Page.
  constraints: { unique_per_page: true },
  responsive: {
    breakpoints: ["desktop", "tablet", "mobile"],
    overridable_fields: ["variant", "sticky"],
  },
  i18n: { translatable_fields: ["ariaLabel", "anchors"] },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

/* ------------------------------------------------------------------ *
 * H-03 · Ola I1.b — Experience CTA Bar (`vmx.experience.cta-bar`)
 *   Barra flotante persistente con acciones (reservar/contactar/…).
 *   Reutilizable en cualquier Experience Page.
 * ------------------------------------------------------------------ */
const experienceCtaBarBlock: BlockContract = {
  type: "vmx.experience.cta-bar",
  category: "static",
  version: "1.0.0",
  display_name: "Experience CTA Bar",
  description:
    "Barra flotante persistente con acciones (reservar, contactar, guardar, compartir). Aparece tras el scroll y respeta safe-area en móvil.",
  schema: {
    source: {
      type: "select",
      label: "Fuente",
      default: "manual",
      options: [
        { value: "manual", label: "Manual" },
        { value: "business", label: "Ficha empresa (auto)" },
        { value: "product", label: "Ficha producto (reservado)" },
        { value: "event", label: "Evento (reservado)" },
        { value: "destination", label: "Destino (reservado)" },
      ],
    },
    variant: {
      type: "select",
      label: "Variante",
      default: "bar",
      options: [
        { value: "bar", label: "Barra full-width" },
        { value: "floating", label: "Píldora flotante" },
        { value: "inline", label: "Inline (no sticky)" },
      ],
    },
    desktopPosition: {
      type: "select",
      label: "Posición en desktop",
      default: "bottom",
      options: [
        { value: "bottom", label: "Abajo" },
        { value: "top", label: "Arriba" },
      ],
    },
    label: { type: "text", label: "Título", translatable: true },
    meta: { type: "text", label: "Subtítulo / precio", translatable: true },
    revealAfterScroll: { type: "number", label: "Aparecer tras scroll (px)", default: 320 },
    ariaLabel: { type: "text", label: "Etiqueta accesible", default: "Acciones principales", translatable: true },
    actions: {
      type: "list",
      label: "Acciones",
      item: {
        type: "object",
        label: "Acción",
        fields: {
          label: { type: "text", label: "Texto", translatable: true },
          href: { type: "url", label: "URL" },
          iconKey: { type: "text", label: "Icono (Lucide key)" },
          action: {
            type: "select",
            label: "Acción",
            default: "navigate",
            options: [
              { value: "navigate", label: "Navegar" },
              { value: "favorite", label: "Guardar" },
              { value: "contact", label: "Contactar" },
              { value: "book", label: "Reservar" },
              { value: "share", label: "Compartir" },
              { value: "phone", label: "Llamar" },
              { value: "whatsapp", label: "WhatsApp" },
            ],
          },
          emphasis: {
            type: "select",
            label: "Énfasis",
            default: "secondary",
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
    soporta_cache: true,
  },
  // Sin `constraints.surfaces` → reutilizable en TODAS las Experience Pages.
  constraints: { unique_per_page: true },
  responsive: {
    breakpoints: ["desktop", "tablet", "mobile"],
    overridable_fields: ["variant", "desktopPosition"],
  },
  i18n: { translatable_fields: ["label", "meta", "ariaLabel", "actions"] },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

/* ------------------------------------------------------------------ *
 * H-03 · Ola I1.c — Fundacionales: Gallery, Info-Grid, Section, Features.
 *   Reutilizables en todas las Experience Pages (sin `constraints.surfaces`).
 *   Evolución sólo por `variant` / `capabilities` / `extensions[]`.
 * ------------------------------------------------------------------ */
const experienceGalleryBlock: BlockContract = {
  type: "vmx.experience.gallery",
  category: "static",
  version: "1.0.0",
  display_name: "Experience Gallery",
  description:
    "Galería de medios (imágenes, video futuro, 360°, 3D, AR) para cualquier Experience Page.",
  schema: {
    source: {
      type: "select", label: "Fuente", default: "manual",
      options: [
        { value: "manual", label: "Manual" },
        { value: "business", label: "Ficha empresa (reservado)" },
        { value: "product", label: "Ficha producto (reservado)" },
        { value: "destination", label: "Destino (reservado)" },
        { value: "event", label: "Evento (reservado)" },
      ],
    },
    variant: {
      type: "select", label: "Variante", default: "mosaic",
      options: [
        { value: "mosaic", label: "Mosaico editorial" },
        { value: "grid", label: "Grid uniforme" },
        { value: "carousel", label: "Carrusel" },
        { value: "strip", label: "Tira compacta" },
      ],
    },
    aspect: {
      type: "select", label: "Proporción", default: "landscape",
      options: [
        { value: "landscape", label: "Horizontal" },
        { value: "square", label: "Cuadrada" },
        { value: "portrait", label: "Vertical" },
        { value: "auto", label: "Automática" },
      ],
    },
    heading: { type: "text", label: "Encabezado", translatable: true },
    subheading: { type: "text", label: "Subencabezado", translatable: true },
    maxVisible: { type: "number", label: "Máximo visible", default: 9 },
    ariaLabel: { type: "text", label: "Etiqueta accesible", default: "Galería", translatable: true },
    items: {
      type: "list", label: "Elementos",
      item: {
        type: "object", label: "Elemento",
        fields: {
          url: { type: "media", label: "Imagen", accepts: ["image/*"] },
          alt: { type: "text", label: "Alt", translatable: true },
          caption: { type: "text", label: "Pie", translatable: true },
        },
      },
    },
  },
  capabilities: {
    soporta_i18n: true, soporta_seo: true, soporta_preview: true,
    soporta_responsive: true, soporta_cache: true,
  },
  constraints: {},
  responsive: { breakpoints: ["desktop", "tablet", "mobile"], overridable_fields: ["variant", "aspect", "maxVisible"] },
  i18n: { translatable_fields: ["heading", "subheading", "ariaLabel", "items"] },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

const experienceInfoGridBlock: BlockContract = {
  type: "vmx.experience.info-grid",
  category: "static",
  version: "1.0.0",
  display_name: "Experience Info Grid",
  description: "Rejilla de datos clave (horario, ubicación, teléfono, categoría, aforo…) reutilizable.",
  schema: {
    source: {
      type: "select", label: "Fuente", default: "manual",
      options: [
        { value: "manual", label: "Manual" },
        { value: "business", label: "Ficha empresa (auto)" },
        { value: "product", label: "Ficha producto (reservado)" },
        { value: "destination", label: "Destino (reservado)" },
        { value: "event", label: "Evento (reservado)" },
      ],
    },
    variant: {
      type: "select", label: "Variante", default: "cards",
      options: [
        { value: "cards", label: "Tarjetas" },
        { value: "list", label: "Lista" },
        { value: "inline", label: "Chips inline" },
      ],
    },
    heading: { type: "text", label: "Encabezado", translatable: true },
    columns: { type: "number", label: "Columnas", default: 3 },
    ariaLabel: { type: "text", label: "Etiqueta accesible", default: "Información clave", translatable: true },
    items: {
      type: "list", label: "Datos",
      item: {
        type: "object", label: "Dato",
        fields: {
          iconKey: { type: "text", label: "Icono (Lucide key)" },
          label: { type: "text", label: "Etiqueta", translatable: true },
          value: { type: "text", label: "Valor", translatable: true },
          href: { type: "url", label: "Enlace" },
          tone: {
            type: "select", label: "Tono", default: "default",
            options: [
              { value: "default", label: "Neutro" },
              { value: "primary", label: "Primario" },
              { value: "accent", label: "Acentuado" },
              { value: "warning", label: "Aviso" },
            ],
          },
        },
      },
    },
  },
  capabilities: { soporta_i18n: true, soporta_preview: true, soporta_responsive: true, soporta_cache: true },
  constraints: {},
  responsive: { breakpoints: ["desktop", "tablet", "mobile"], overridable_fields: ["variant", "columns"] },
  i18n: { translatable_fields: ["heading", "ariaLabel", "items"] },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

const experienceSectionBlock: BlockContract = {
  type: "vmx.experience.section",
  category: "static",
  version: "1.0.0",
  display_name: "Experience Section",
  description:
    "Sección editorial avanzada (eyebrow, título, lead, cuerpo, media, CTAs). Evolución del layout section, con jerarquía SEO y anclas.",
  schema: {
    source: {
      type: "select", label: "Fuente", default: "manual",
      options: [
        { value: "manual", label: "Manual" },
        { value: "business", label: "Ficha empresa (auto)" },
        { value: "product", label: "Producto (reservado)" },
        { value: "destination", label: "Destino (reservado)" },
        { value: "event", label: "Evento (reservado)" },
      ],
    },
    variant: {
      type: "select", label: "Variante", default: "editorial",
      options: [
        { value: "editorial", label: "Editorial" },
        { value: "split", label: "Texto + media" },
        { value: "centered", label: "Centrada" },
        { value: "quote", label: "Cita" },
      ],
    },
    eyebrow: { type: "text", label: "Frase superior", translatable: true },
    title: { type: "text", label: "Título", translatable: true },
    lead: { type: "text", label: "Lead", translatable: true },
    body: { type: "rich_text", label: "Cuerpo", translatable: true },
    mediaUrl: { type: "media", label: "Imagen", accepts: ["image/*"] },
    mediaAlt: { type: "text", label: "Alt de imagen", translatable: true },
    attribution: { type: "text", label: "Atribución (cita)", translatable: true },
    align: {
      type: "select", label: "Alineación", default: "left",
      options: [
        { value: "left", label: "Izquierda" },
        { value: "center", label: "Centrada" },
      ],
    },
    tone: {
      type: "select", label: "Tono", default: "default",
      options: [
        { value: "default", label: "Por defecto" },
        { value: "muted", label: "Atenuado" },
        { value: "accent", label: "Acentuado" },
      ],
    },
    ctas: {
      type: "list", label: "Botones",
      item: {
        type: "object", label: "Botón",
        fields: {
          label: { type: "text", label: "Texto", translatable: true },
          href: { type: "url", label: "URL" },
          emphasis: {
            type: "select", label: "Énfasis", default: "primary",
            options: [
              { value: "primary", label: "Primario" },
              { value: "secondary", label: "Secundario" },
              { value: "ghost", label: "Fantasma" },
              { value: "link", label: "Enlace" },
            ],
          },
        },
      },
    },
  },
  capabilities: { soporta_i18n: true, soporta_seo: true, soporta_preview: true, soporta_responsive: true, soporta_cache: true },
  constraints: {},
  responsive: { breakpoints: ["desktop", "tablet", "mobile"], overridable_fields: ["variant", "align", "tone"] },
  i18n: { translatable_fields: ["eyebrow", "title", "lead", "body", "attribution", "ctas"] },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

const experienceFeaturesBlock: BlockContract = {
  type: "vmx.experience.features",
  category: "static",
  version: "1.0.0",
  display_name: "Experience Features",
  description: "Lista de características / amenities / servicios reutilizable en cualquier Experience Page.",
  schema: {
    source: {
      type: "select", label: "Fuente", default: "manual",
      options: [
        { value: "manual", label: "Manual" },
        { value: "business", label: "Ficha empresa (reservado)" },
        { value: "product", label: "Producto (reservado)" },
        { value: "destination", label: "Destino (reservado)" },
        { value: "event", label: "Evento (reservado)" },
      ],
    },
    variant: {
      type: "select", label: "Variante", default: "grid",
      options: [
        { value: "grid", label: "Grid con icono" },
        { value: "checklist", label: "Checklist" },
        { value: "chips", label: "Chips compactos" },
        { value: "columns", label: "Columnas editorial" },
      ],
    },
    heading: { type: "text", label: "Encabezado", translatable: true },
    subheading: { type: "text", label: "Subencabezado", translatable: true },
    columns: { type: "number", label: "Columnas", default: 3 },
    ariaLabel: { type: "text", label: "Etiqueta accesible", default: "Características", translatable: true },
    items: {
      type: "list", label: "Características",
      item: {
        type: "object", label: "Característica",
        fields: {
          iconKey: { type: "text", label: "Icono (Lucide key)" },
          title: { type: "text", label: "Título", translatable: true },
          description: { type: "text", label: "Descripción", translatable: true },
          available: { type: "boolean", label: "Disponible", default: true },
          href: { type: "url", label: "Enlace" },
        },
      },
    },
  },
  capabilities: { soporta_i18n: true, soporta_preview: true, soporta_responsive: true, soporta_cache: true },
  constraints: {},
  responsive: { breakpoints: ["desktop", "tablet", "mobile"], overridable_fields: ["variant", "columns"] },
  i18n: { translatable_fields: ["heading", "subheading", "ariaLabel", "items"] },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

const experienceInstitutionalBadgesBlock: BlockContract = {
  type: "vmx.experience.institutional-badges",
  category: "static",
  version: "1.0.0",
  display_name: "Experience · Institutional Badges",
  description:
    "Distintivos institucionales oficiales (Pueblo Mágico, Patrimonio, Oriente Maya, Despierta en Valladolid, premios, certificaciones, reconocimientos, Empresa Verificada, Recomendado por Alux). Único bloque autorizado; NUNCA se hardcodean en plantillas.",
  schema: {
    source: {
      type: "select", label: "Fuente", default: "manual",
      options: [
        { value: "manual", label: "Manual" },
        { value: "destination", label: "Destino (reservado)" },
        { value: "business", label: "Empresa (reservado)" },
        { value: "product", label: "Producto (reservado)" },
        { value: "event", label: "Evento (reservado)" },
      ],
    },
    variant: {
      type: "select", label: "Variante", default: "soft",
      options: [
        { value: "filled", label: "Sólido (máxima jerarquía)" },
        { value: "soft", label: "Suave (default)" },
        { value: "outline", label: "Contorno" },
        { value: "icon-only", label: "Sólo icono (móvil / overlay)" },
      ],
    },
    size: {
      type: "select", label: "Tamaño", default: "md",
      options: [
        { value: "sm", label: "Pequeño" },
        { value: "md", label: "Medio" },
        { value: "lg", label: "Grande (hero editorial)" },
      ],
    },
    layout: {
      type: "select", label: "Disposición", default: "strip",
      options: [
        { value: "strip", label: "Fila" },
        { value: "stack", label: "Columna" },
      ],
    },
    subjectSlug: {
      type: "text",
      label: "Slug del sujeto (destino/negocio/producto)",
    },
    ariaLabel: {
      type: "text", label: "Etiqueta accesible",
      default: "Distintivos institucionales", translatable: true,
    },
    items: {
      type: "list", label: "Distintivos",
      item: {
        type: "object", label: "Distintivo",
        fields: {
          kind: {
            type: "select", label: "Tipo",
            options: [
              { value: "pueblo-magico", label: "Pueblo Mágico" },
              { value: "patrimonio", label: "Patrimonio" },
              { value: "oriente-maya", label: "Oriente Maya" },
              { value: "despierta-en-valladolid", label: "Despierta en Valladolid" },
              { value: "award", label: "Premio" },
              { value: "official-recognition", label: "Reconocimiento oficial" },
              { value: "certification", label: "Certificación" },
              { value: "verified-business", label: "Empresa Verificada" },
              { value: "alux-recommended", label: "Recomendado por Alux" },
              { value: "custom", label: "Distintivo (custom)" },
            ],
          },
          slug: { type: "text", label: "Slug único" },
          label: { type: "text", label: "Etiqueta (override)", translatable: true },
          shortLabel: { type: "text", label: "Etiqueta corta (móvil)", translatable: true },
          programUrl: { type: "url", label: "URL del programa" },
          issuedAt: { type: "text", label: "Fecha (ISO)" },
        },
      },
    },
  },
  capabilities: { soporta_i18n: true, soporta_seo: true, soporta_preview: true, soporta_responsive: true, soporta_cache: true },
  constraints: {
    surfaces: [
      "home", "landing", "institutional", "destination", "business", "product",
    ],
  },
  responsive: { breakpoints: ["desktop", "tablet", "mobile"], overridable_fields: ["variant", "size", "layout"] },
  i18n: { translatable_fields: ["ariaLabel", "items"] },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

const experienceProductsBlock: BlockContract = {
  type: "vmx.experience.products",
  category: "static",
  version: "1.0.0",
  display_name: "Experience Products",
  description:
    "Listado oficial de productos / habitaciones / tours / accesos / experiencias. Reutilizable en business, destination, region, category, landing y micrositios.",
  schema: {
    source: {
      type: "select", label: "Fuente", default: "manual",
      options: [
        { value: "manual", label: "Manual" },
        { value: "business", label: "Ficha empresa (contexto)" },
        { value: "destination", label: "Destino (reservado)" },
        { value: "region", label: "Región (reservado)" },
        { value: "category", label: "Categoría (reservado)" },
        { value: "context", label: "Context Engine (reservado)" },
      ],
    },
    variant: {
      type: "select", label: "Variante", default: "grid",
      options: [
        { value: "grid", label: "Grid" },
        { value: "list", label: "Lista" },
        { value: "carousel", label: "Carrusel" },
        { value: "featured", label: "Destacado" },
      ],
    },
    heading: { type: "text", label: "Encabezado", translatable: true },
    subheading: { type: "text", label: "Subencabezado", translatable: true },
    emptyMessage: { type: "text", label: "Mensaje vacío", translatable: true, default: "Sin productos publicados." },
    columns: { type: "number", label: "Columnas", default: 2 },
    maxItems: { type: "number", label: "Máximo de items" },
    groupBy: {
      type: "select", label: "Agrupar por", default: "none",
      options: [
        { value: "none", label: "Sin agrupar" },
        { value: "type", label: "Tipo de producto" },
      ],
    },
    ariaLabel: { type: "text", label: "Etiqueta accesible", default: "Productos y experiencias", translatable: true },
  },
  capabilities: { soporta_i18n: true, soporta_seo: true, soporta_preview: true, soporta_responsive: true, soporta_cache: true },
  constraints: {},
  responsive: { breakpoints: ["desktop", "tablet", "mobile"], overridable_fields: ["variant", "columns"] },
  i18n: { translatable_fields: ["heading", "subheading", "emptyMessage", "ariaLabel"] },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

const experiencePromotionsBlock: BlockContract = {
  type: "vmx.experience.promotions",
  category: "static",
  version: "1.0.0",
  display_name: "Experience Promotions",
  description:
    "Oportunidades comerciales reutilizables (promociones, ofertas, descuentos, paquetes, campañas, cupones). Complementa a `vmx.experience.products` sin depender de él.",
  schema: {
    source: {
      type: "select", label: "Fuente", default: "manual",
      options: [
        { value: "manual", label: "Manual" },
        { value: "business", label: "Ficha empresa (contexto)" },
        { value: "destination", label: "Destino (reservado)" },
        { value: "region", label: "Región (reservado)" },
        { value: "category", label: "Categoría (reservado)" },
        { value: "context", label: "Context Engine (reservado)" },
        { value: "campaign", label: "Campaña (reservado)" },
      ],
    },
    variant: {
      type: "select", label: "Variante", default: "grid",
      options: [
        { value: "strip", label: "Franja compacta" },
        { value: "grid", label: "Grid" },
        { value: "list", label: "Lista" },
        { value: "carousel", label: "Carrusel" },
        { value: "featured", label: "Destacada" },
        { value: "banner", label: "Banner único" },
      ],
    },
    heading: { type: "text", label: "Encabezado", translatable: true },
    subheading: { type: "text", label: "Subencabezado", translatable: true },
    emptyMessage: { type: "text", label: "Mensaje vacío", translatable: true, default: "Sin promociones vigentes por ahora." },
    columns: { type: "number", label: "Columnas", default: 2 },
    maxItems: { type: "number", label: "Máximo de items" },
    groupBy: {
      type: "select", label: "Agrupar por", default: "none",
      options: [
        { value: "none", label: "Sin agrupar" },
        { value: "business", label: "Negocio" },
        { value: "urgency", label: "Urgencia" },
      ],
    },
    ariaLabel: { type: "text", label: "Etiqueta accesible", default: "Promociones y oportunidades", translatable: true },
  },
  capabilities: { soporta_i18n: true, soporta_seo: true, soporta_preview: true, soporta_responsive: true, soporta_cache: true },
  constraints: {},
  responsive: { breakpoints: ["desktop", "tablet", "mobile"], overridable_fields: ["variant", "columns"] },
  i18n: { translatable_fields: ["heading", "subheading", "emptyMessage", "ariaLabel"] },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

const experienceReviewsBlock: BlockContract = {
  type: "vmx.experience.reviews",
  category: "static",
  version: "1.0.0",
  display_name: "Experience Reviews",
  description:
    "Confianza y prueba social — reputación agregada + reseñas multi-fuente (Google, TripAdvisor, propias, Alux, futuras) con respuestas del negocio y moderación.",
  schema: {
    source: {
      type: "select", label: "Fuente", default: "manual",
      options: [
        { value: "manual", label: "Manual" },
        { value: "business", label: "Ficha empresa (contexto)" },
        { value: "product", label: "Ficha producto (reservado)" },
        { value: "destination", label: "Destino (reservado)" },
        { value: "region", label: "Región (reservado)" },
        { value: "category", label: "Categoría (reservado)" },
        { value: "context", label: "Context Engine (reservado)" },
        { value: "aggregator", label: "Agregador externo (reservado)" },
      ],
    },
    variant: {
      type: "select", label: "Variante", default: "list",
      options: [
        { value: "summary", label: "Sólo resumen" },
        { value: "list", label: "Lista" },
        { value: "grid", label: "Grid" },
        { value: "carousel", label: "Carrusel" },
        { value: "featured", label: "Destacada" },
        { value: "wall", label: "Muro" },
        { value: "compact", label: "Compacto (widget)" },
      ],
    },
    heading: { type: "text", label: "Encabezado", translatable: true },
    subheading: { type: "text", label: "Subencabezado", translatable: true },
    emptyMessage: { type: "text", label: "Mensaje vacío", translatable: true, default: "Aún no hay reseñas publicadas." },
    columns: { type: "number", label: "Columnas", default: 2 },
    maxItems: { type: "number", label: "Máximo de items" },
    groupBy: {
      type: "select", label: "Agrupar por", default: "none",
      options: [
        { value: "none", label: "Sin agrupar" },
        { value: "platform", label: "Fuente" },
        { value: "language", label: "Idioma" },
        { value: "travelerType", label: "Tipo de viajero" },
        { value: "rating", label: "Puntuación" },
      ],
    },
    sortBy: {
      type: "select", label: "Ordenar por", default: "recent",
      options: [
        { value: "recent", label: "Más recientes" },
        { value: "highest", label: "Mejor puntuadas" },
        { value: "lowest", label: "Peor puntuadas" },
        { value: "helpful", label: "Más útiles" },
        { value: "recommendedByAlux", label: "Recomendadas por Alux (reservado)" },
      ],
    },
    ariaLabel: { type: "text", label: "Etiqueta accesible", default: "Opiniones y reseñas", translatable: true },
  },
  capabilities: { soporta_i18n: true, soporta_seo: true, soporta_preview: true, soporta_responsive: true, soporta_cache: true },
  constraints: {},
  responsive: { breakpoints: ["desktop", "tablet", "mobile"], overridable_fields: ["variant", "columns"] },
  i18n: { translatable_fields: ["heading", "subheading", "emptyMessage", "ariaLabel"] },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

const experienceRelatedCollectionBlock: BlockContract = {
  type: "vmx.experience.related-collection",
  category: "static",
  version: "1.0.0",
  display_name: "Experience Related Collection",
  description:
    "Motor de descubrimiento contextual — colecciones heterogéneas (empresas, productos, experiencias, hoteles, restaurantes, eventos, promociones, rutas, destinos, regiones) usando siempre el mismo bloque. Preparado para evolucionar hacia recomendaciones de Alux y Context Engine sin romper compatibilidad.",
  schema: {
    source: {
      type: "select", label: "Fuente", default: "manual",
      options: [
        { value: "manual", label: "Manual" },
        { value: "destination", label: "Destino (contexto)" },
        { value: "region", label: "Región (reservado)" },
        { value: "category", label: "Categoría (reservado)" },
        { value: "business", label: "Empresa (reservado)" },
        { value: "product", label: "Producto (reservado)" },
        { value: "context", label: "Context Engine (reservado)" },
        { value: "alux", label: "Alux (reservado)" },
      ],
    },
    entityKind: {
      type: "select", label: "Tipo de entidad", default: "mixed",
      options: [
        { value: "mixed", label: "Mixto" },
        { value: "business", label: "Empresas" },
        { value: "product", label: "Productos" },
        { value: "experience", label: "Experiencias" },
        { value: "hotel", label: "Hoteles" },
        { value: "restaurant", label: "Restaurantes" },
        { value: "event", label: "Eventos" },
        { value: "promotion", label: "Promociones" },
        { value: "route", label: "Rutas" },
        { value: "destination", label: "Destinos" },
        { value: "region", label: "Regiones" },
        { value: "category", label: "Categorías" },
      ],
    },
    variant: {
      type: "select", label: "Variante", default: "grid",
      options: [
        { value: "grid", label: "Grid" },
        { value: "list", label: "Lista" },
        { value: "carousel", label: "Carrusel" },
        { value: "masonry", label: "Mosaico" },
        { value: "featured", label: "Destacado" },
        { value: "compact", label: "Compacto" },
      ],
    },
    heading: { type: "text", label: "Encabezado", translatable: true, default: "Sigue descubriendo" },
    subheading: { type: "text", label: "Subencabezado", translatable: true },
    emptyMessage: { type: "text", label: "Mensaje vacío", translatable: true, default: "Aún no hay contenido para descubrir aquí." },
    columns: { type: "number", label: "Columnas", default: 2 },
    maxItems: { type: "number", label: "Máximo de items" },
    ariaLabel: { type: "text", label: "Etiqueta accesible", translatable: true, default: "Sigue descubriendo" },
  },
  capabilities: { soporta_i18n: true, soporta_seo: true, soporta_preview: true, soporta_responsive: true, soporta_cache: true },
  constraints: {},
  responsive: { breakpoints: ["desktop", "tablet", "mobile"], overridable_fields: ["variant", "columns"] },
  i18n: { translatable_fields: ["heading", "subheading", "emptyMessage", "ariaLabel"] },
  audit: ["Block.Registered", "Block.VersionPublished"],
};

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
  // Etapa 15.10.8 · Smart Blocks v1
  smartDestinationsGridBlock,
  smartBusinessesGridBlock,
  smartProductsGridBlock,
  smartEventsListBlock,
  // US-R3 · Ola 2 · Sub-ola 2.1 — Region + Destination
  surfaceRegionBlock,
  surfaceDestinationBlock,
  // US-R3 · Ola 2 · Sub-ola 2.2 — Plantilla Madre Business
  surfaceBusinessBlock,
  // US-R3 · Sub-ola 2.2b — Business granular (Plantilla Editable)
  businessShellBlock,
  businessHeaderBadgesBlock,
  businessDescriptionBlock,
  businessGalleryBlock,
  businessInfoBlock,
  businessProductsBlock,
  businessPromotionsBlock,
  businessContactBlock,
  // US-R3 · Sub-ola 2.3a — Plantilla Madre Producto (bloques granulares)
  productShellBlock,
  productHeroBlock,
  productGalleryBlock,
  productPriceCtaBlock,
  productDescriptionBlock,
  productBusinessContextBlock,
  productPromosBlock,
  productReviewsBlock,
  productFaqBlock,
  productRelatedBlock,
  // US-R3 · Sub-ola 2.5d — Surface Kit neutro (nueva capacidad, sin
  // sustituir bloques existentes). Spread al final del catálogo.
  ...KIT_BLOCK_CONTRACTS,
  // H-02 · Iniciativa 2 — Discovery Navigator (centro de descubrimiento).
  discoveryNavigatorBlock,
  // H-03 · Ola I1.a — Experience Hero (fundacional Experience Pages).
  experienceHeroBlock,
  // H-03 · Ola I1.b — Experience Subnav + CTA Bar (fundacionales).
  experienceSubnavBlock,
  experienceCtaBarBlock,
  // H-03 · Ola I1.c — Gallery, Info-Grid, Section, Features.
  experienceGalleryBlock,
  experienceInfoGridBlock,
  experienceSectionBlock,
  experienceFeaturesBlock,
  // H-03 · Ola I2.a — Experience Products.
  experienceProductsBlock,
  // H-03 · Ola I2.b — Experience Promotions.
  experiencePromotionsBlock,
  // H-03 · Ola I2.c — Experience Reviews.
  experienceReviewsBlock,
  // H-03 · Ola I3.b — Experience Related Collection (Motor de Descubrimiento).
  experienceRelatedCollectionBlock,
];

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