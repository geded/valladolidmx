/**
 * Experience Builder · vmx.kit.* neutral blocks (US-R3 · Sub-ola 2.5d).
 *
 * Registra los primitives del Surface Kit como bloques neutros en el
 * Builder. Son entrada NUEVA — no reemplazan `vmx.business.*` ni
 * `vmx.product.*`, no migran semillas existentes y no dependen de
 * ningún `SurfaceContext` (leen exclusivamente `node.config`).
 *
 * Reglas Sub-ola 2.5d:
 *  - Nuevos IDs `vmx.kit.*` (namespace propio).
 *  - Contratos `static` sin `constraints.surfaces` → utilizables en
 *    cualquier tipo de página del Builder.
 *  - Renderers idénticos en Studio y producción (delegan al Kit).
 *  - Sin acoplamiento a Business/Product/preview-registry.
 */
import type { ReactNode } from "react";
import type { BlockContract } from "./block-contract";
import type { CompositionNode } from "./composition-tree";
import {
  KitBadges,
  KitCardGrid,
  KitContact,
  KitFaq,
  KitGallery,
  KitHero,
  KitInfoTable,
  KitLocation,
  KitPromos,
  KitReviews,
  KitRichText,
} from "@/components/surfaces/kit";
import type {
  BadgeVM,
  CardVM,
  FaqVM,
  InfoRowVM,
  MediaVM,
  PromoVM,
  ReviewVM,
} from "@/components/surfaces/kit/types";

/* ------------------------------------------------------------------ *
 * Contract factory
 * ------------------------------------------------------------------ */

function kitBlock(
  type: string,
  display_name: string,
  description: string,
  schema: BlockContract["schema"] = {},
): BlockContract {
  return {
    type,
    category: "static",
    version: "1.0.0",
    display_name,
    description,
    schema,
    capabilities: {
      soporta_preview: true,
      soporta_responsive: true,
      soporta_seo: false,
      soporta_cache: true,
    },
    // Sin `constraints.surfaces` → disponible en cualquier tipo de página.
    responsive: { breakpoints: ["desktop", "tablet", "mobile"] },
    audit: ["Block.Registered", "Block.VersionPublished"],
  };
}

/* ------------------------------------------------------------------ *
 * Contracts (11 primitives neutros)
 * ------------------------------------------------------------------ */

export const KIT_BLOCK_CONTRACTS: BlockContract[] = [
  kitBlock("vmx.kit.hero", "Kit · Hero", "Título, subtítulo, eyebrow y badges neutros.", {
    eyebrow: { type: "text", label: "Eyebrow", translatable: true },
    title: { type: "text", label: "Título", required: true, translatable: true },
    subtitle: { type: "text", label: "Subtítulo", translatable: true },
  }),
  kitBlock("vmx.kit.rich-text", "Kit · Texto enriquecido", "Sección de texto con encabezado opcional.", {
    heading: { type: "text", label: "Encabezado", translatable: true },
    body: { type: "rich_text", label: "Cuerpo", translatable: true },
    empty_label: { type: "text", label: "Mensaje vacío", translatable: true },
  }),
  kitBlock("vmx.kit.gallery", "Kit · Galería", "Portada y miniaturas en scroll-snap mobile / grid desktop.", {
    cover_url: { type: "url", label: "URL portada" },
    cover_alt: { type: "text", label: "Alt portada", translatable: true },
    items: {
      type: "list",
      label: "Miniaturas",
      item: {
        type: "object",
        label: "Media",
        fields: {
          url: { type: "url", label: "URL" },
          alt: { type: "text", label: "Alt", translatable: true },
        },
      },
    },
    empty_label: { type: "text", label: "Mensaje vacío", translatable: true },
  }),
  kitBlock("vmx.kit.info-table", "Kit · Tabla de datos", "Pares clave/valor apilados en dos columnas.", {
    rows: {
      type: "list",
      label: "Filas",
      item: {
        type: "object",
        label: "Fila",
        fields: {
          label: { type: "text", label: "Etiqueta", translatable: true },
          value: { type: "text", label: "Valor", translatable: true },
        },
      },
    },
  }),
  kitBlock("vmx.kit.badges", "Kit · Insignias", "Colección de píldoras compactas.", {
    items: {
      type: "list",
      label: "Insignias",
      item: {
        type: "object",
        label: "Insignia",
        fields: {
          label: { type: "text", label: "Texto", translatable: true },
          tone: {
            type: "select",
            label: "Tono",
            default: "primary",
            options: [
              { value: "neutral", label: "Neutral" },
              { value: "primary", label: "Primario" },
              { value: "success", label: "Éxito" },
              { value: "warning", label: "Aviso" },
              { value: "danger", label: "Alerta" },
            ],
          },
        },
      },
    },
  }),
  kitBlock("vmx.kit.contact", "Kit · Contacto", "Bloque de contacto sencillo (teléfono, whatsapp, email...).", {
    contact_type: { type: "text", label: "Tipo", default: "whatsapp" },
    label: { type: "text", label: "Etiqueta", translatable: true },
    value: { type: "text", label: "Valor", required: true, translatable: true },
    href: { type: "url", label: "Enlace" },
  }),
  kitBlock("vmx.kit.location", "Kit · Ubicación", "Dirección visible con etiqueta opcional.", {
    label: { type: "text", label: "Etiqueta", translatable: true },
    address_line1: { type: "text", label: "Dirección", required: true, translatable: true },
    address_line2: { type: "text", label: "Complemento", translatable: true },
  }),
  kitBlock("vmx.kit.reviews", "Kit · Opiniones", "Listado de opiniones con estrellas.", {
    heading: { type: "text", label: "Encabezado", translatable: true, default: "Opiniones" },
    empty_label: { type: "text", label: "Mensaje vacío", translatable: true },
    items: {
      type: "list",
      label: "Opiniones",
      item: {
        type: "object",
        label: "Opinión",
        fields: {
          author: { type: "text", label: "Autor", translatable: true },
          rating: { type: "number", label: "Calificación (0-5)" },
          title: { type: "text", label: "Título", translatable: true },
          body: { type: "rich_text", label: "Comentario", translatable: true },
        },
      },
    },
  }),
  kitBlock("vmx.kit.faq", "Kit · Preguntas frecuentes", "Listado de FAQs con detalle expandible.", {
    heading: { type: "text", label: "Encabezado", translatable: true, default: "Preguntas frecuentes" },
    items: {
      type: "list",
      label: "FAQs",
      item: {
        type: "object",
        label: "FAQ",
        fields: {
          question: { type: "text", label: "Pregunta", translatable: true },
          answer: { type: "rich_text", label: "Respuesta", translatable: true },
        },
      },
    },
  }),
  kitBlock("vmx.kit.promos", "Kit · Promociones", "Tarjetas de promoción con % de descuento opcional.", {
    heading: { type: "text", label: "Encabezado", translatable: true, default: "Promociones vigentes" },
    items: {
      type: "list",
      label: "Promociones",
      item: {
        type: "object",
        label: "Promo",
        fields: {
          title: { type: "text", label: "Título", translatable: true },
          description: { type: "text", label: "Descripción", translatable: true },
          discount_percent: { type: "number", label: "Descuento %" },
        },
      },
    },
  }),
  kitBlock("vmx.kit.card-grid", "Kit · Grid de tarjetas", "Rejilla neutra de tarjetas (1-4 columnas).", {
    columns: {
      type: "select",
      label: "Columnas",
      default: "3",
      options: [
        { value: "1", label: "1" },
        { value: "2", label: "2" },
        { value: "3", label: "3" },
        { value: "4", label: "4" },
      ],
    },
    empty_label: { type: "text", label: "Mensaje vacío", translatable: true },
    items: {
      type: "list",
      label: "Tarjetas",
      item: {
        type: "object",
        label: "Tarjeta",
        fields: {
          eyebrow: { type: "text", label: "Eyebrow", translatable: true },
          title: { type: "text", label: "Título", translatable: true },
          tagline: { type: "text", label: "Bajada", translatable: true },
          href: { type: "url", label: "Enlace" },
          image_url: { type: "url", label: "Imagen" },
        },
      },
    },
  }),
];

/* ------------------------------------------------------------------ *
 * Config → VM helpers (defensivos: node.config puede venir sin llenar)
 * ------------------------------------------------------------------ */

function readString(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}
function readNumber(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : undefined;
}
function readList(v: unknown): Array<Record<string, unknown>> {
  return Array.isArray(v) ? (v as Array<Record<string, unknown>>) : [];
}

/* ------------------------------------------------------------------ *
 * Renderers (Studio y producción usan el mismo componente)
 * ------------------------------------------------------------------ */

type KitRenderer = (node: CompositionNode) => ReactNode;

export const KIT_BLOCK_RENDERERS: Record<string, KitRenderer> = {
  "vmx.kit.hero": (node) => (
    <KitHero
      vm={{
        eyebrow: readString(node.config.eyebrow),
        title: readString(node.config.title) ?? "Título del Hero",
        subtitle: readString(node.config.subtitle),
      }}
    />
  ),
  "vmx.kit.rich-text": (node) => (
    <KitRichText
      vm={{
        heading: readString(node.config.heading),
        body: readString(node.config.body) ?? null,
        emptyLabel: readString(node.config.empty_label),
      }}
    />
  ),
  "vmx.kit.gallery": (node) => {
    const items: MediaVM[] = readList(node.config.items).map((it, i) => ({
      id: readString(it.id) ?? `k-${i}`,
      url: readString(it.url) ?? "",
      alt: readString(it.alt) ?? "",
    }));
    const coverUrl = readString(node.config.cover_url);
    return (
      <KitGallery
        vm={{
          cover: coverUrl
            ? { url: coverUrl, alt: readString(node.config.cover_alt) ?? "" }
            : null,
          items,
          emptyLabel: readString(node.config.empty_label),
        }}
      />
    );
  },
  "vmx.kit.info-table": (node) => {
    const rows: InfoRowVM[] = readList(node.config.rows).map((r) => ({
      label: readString(r.label) ?? "—",
      value: readString(r.value) ?? "—",
    }));
    return <KitInfoTable vm={{ rows }} />;
  },
  "vmx.kit.badges": (node) => {
    const items: BadgeVM[] = readList(node.config.items).map((b) => ({
      label: readString(b.label) ?? "Badge",
      tone: (readString(b.tone) as BadgeVM["tone"]) ?? "primary",
    }));
    return <KitBadges items={items} />;
  },
  "vmx.kit.contact": (node) => (
    <KitContact
      vm={{
        type: readString(node.config.contact_type) ?? "contact",
        label: readString(node.config.label),
        value: readString(node.config.value) ?? "—",
        href: readString(node.config.href),
      }}
    />
  ),
  "vmx.kit.location": (node) => (
    <KitLocation
      vm={{
        label: readString(node.config.label),
        addressLine1: readString(node.config.address_line1) ?? "—",
        addressLine2: readString(node.config.address_line2),
      }}
    />
  ),
  "vmx.kit.reviews": (node) => {
    const items: ReviewVM[] = readList(node.config.items).map((r, i) => ({
      id: readString(r.id) ?? `rv-${i}`,
      author: readString(r.author) ?? "Anónimo",
      rating: readNumber(r.rating) ?? 5,
      title: readString(r.title),
      body: readString(r.body) ?? "",
    }));
    return (
      <KitReviews
        reviews={items}
        heading={readString(node.config.heading) ?? "Opiniones"}
        emptyLabel={readString(node.config.empty_label)}
      />
    );
  },
  "vmx.kit.faq": (node) => {
    const items: FaqVM[] = readList(node.config.items).map((f, i) => ({
      id: readString(f.id) ?? `faq-${i}`,
      question: readString(f.question) ?? "",
      answer: readString(f.answer) ?? "",
    }));
    return (
      <KitFaq
        faqs={items}
        heading={readString(node.config.heading) ?? "Preguntas frecuentes"}
      />
    );
  },
  "vmx.kit.promos": (node) => {
    const items: PromoVM[] = readList(node.config.items).map((p, i) => ({
      id: readString(p.id) ?? `pr-${i}`,
      title: readString(p.title) ?? "Promoción",
      description: readString(p.description) ?? null,
      discountPercent: readNumber(p.discount_percent) ?? null,
    }));
    return (
      <KitPromos
        promotions={items}
        heading={readString(node.config.heading) ?? "Promociones vigentes"}
      />
    );
  },
  "vmx.kit.card-grid": (node) => {
    const items: CardVM[] = readList(node.config.items).map((c, i) => ({
      id: readString(c.id) ?? `card-${i}`,
      eyebrow: readString(c.eyebrow),
      title: readString(c.title) ?? "Tarjeta",
      tagline: readString(c.tagline),
      href: readString(c.href),
      media: readString(c.image_url) ? { url: readString(c.image_url) as string } : null,
    }));
    const colsRaw = readString(node.config.columns) ?? "3";
    const cols = ((): 1 | 2 | 3 | 4 => {
      const n = Number(colsRaw);
      return n === 1 || n === 2 || n === 3 || n === 4 ? n : 3;
    })();
    return (
      <KitCardGrid
        vm={{
          columns: cols,
          items,
          emptyLabel: readString(node.config.empty_label),
        }}
      />
    );
  },
};