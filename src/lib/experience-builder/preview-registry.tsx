/**
 * Experience Builder · Template Preview Registry (US-R3 · Ola 2 · Sub-ola 2.2b)
 *
 * Patrón REUTILIZABLE para toda "Plantilla Madre" del Studio (Business,
 * Region, Destination, Product, Event, Experience, Hotel, Restaurant y
 * futuras). Objetivo: que ninguna plantilla dinámica se abra con
 * placeholders rotos ("Empresa no disponible", "Destino no encontrado").
 *
 * Reglas (Founder, Sub-ola 2.2b):
 *  - NO se crea otro Studio ni otro renderer. El Studio pinta el árbol
 *    con el `CompositionRenderer` de siempre; este registry sólo
 *    inyecta un Provider de datos y un selector visual.
 *  - Cada entrada declara: cómo listar candidatos reales, cómo cargar
 *    el detalle por slug, un dato demo estable, y el Provider React que
 *    el Studio envolverá alrededor del canvas.
 *  - La selección se persiste en localStorage por kind. El editor la ve
 *    igual la próxima vez que abra la plantilla.
 *
 * Añadir una plantilla madre nueva = registrar aquí, sin tocar el Studio.
 */

import type { ComponentType, ReactNode } from "react";
import {
  getMarketplaceBusinessBySlug,
  listMarketplaceBusinesses,
  type MarketplaceBusinessDetail,
} from "@/lib/marketplace/marketplace-reads.functions";
import { BusinessSurfaceProvider } from "@/components/surfaces/BusinessSurface";

/** Candidato ligero para poblar el selector "Vista previa con…". */
export interface PreviewCandidate {
  slug: string;
  label: string;
  secondary?: string;
}

/**
 * Contrato de un proveedor de preview de plantilla madre. `TData` es el
 * tipo del dato de dominio (empresa, región, etc.) que se inyecta en el
 * contexto que consumen los bloques `vmx.<kind>.*`.
 */
export interface TemplatePreviewProvider<TData> {
  /** Enum `page_kind` (coincide con `page_compositions.kind`). */
  readonly kind: string;
  /** Etiqueta corta en la barra ("Vista previa con empresa"). */
  readonly label: string;
  /** Placeholder del combo ("Selecciona una empresa…"). */
  readonly placeholder: string;
  /** ¿Debe listarse este selector cuando el editor abre este kind? */
  matches(pageType: string, slug: string): boolean;
  /** Lista de candidatos reales publicados. */
  loadCandidates(): Promise<PreviewCandidate[]>;
  /** Carga el detalle real por slug (o `null` si no existe). */
  loadDetail(slug: string): Promise<TData | null>;
  /** Dato demo estable — se usa cuando no hay negocios reales aún. */
  demoData(): TData;
  /** Provider React que expone `TData` al árbol renderizado. */
  readonly Provider: ComponentType<{ data: TData | null; children: ReactNode }>;
}

/* ------------------------------------------------------------------ *
 * Providers concretos
 * ------------------------------------------------------------------ */

function BusinessDataProvider({
  data,
  children,
}: {
  data: MarketplaceBusinessDetail | null;
  children: ReactNode;
}) {
  return <BusinessSurfaceProvider business={data}>{children}</BusinessSurfaceProvider>;
}

/** Empresa demo estable — evita "Empresa no disponible" en Studio. */
function demoBusiness(): MarketplaceBusinessDetail {
  return {
    id: "demo-business",
    slug: "empresa-demo",
    display_name: "Empresa demo · Valladolid.mx",
    tagline: "Ficha de ejemplo para editar la Plantilla Madre.",
    description:
      "Este es un negocio de ejemplo. Reemplaza los textos, elige una empresa real desde la barra superior o previsualiza con otro slug antes de publicar.",
    destination_slug: "valladolid",
    category_slug: "hotel",
    verified: true,
    plan_tier: "pro",
    products: [
      {
        id: "demo-p1",
        slug: "habitacion-estandar",
        name: "Habitación estándar",
        tagline: "Cama king, desayuno incluido y wifi de alta velocidad.",
        product_type: "room",
        price_amount: 1450,
        price_currency: "MXN",
        business_slug: "empresa-demo",
        business_name: "Empresa demo · Valladolid.mx",
        conversion_mode: "reservation",
        primary_action_label: "Reservar ahora",
        secondary_action_mode: "whatsapp",
        secondary_action_label: "Preguntar por WhatsApp",
        accepts_online_payment: true,
        requires_availability: true,
        visibility_level: "public",
      },
      {
        id: "demo-p2",
        slug: "suite-familiar",
        name: "Suite familiar",
        tagline: "Espacio para 4, terraza privada y vista al jardín.",
        product_type: "room",
        price_amount: 2890,
        price_currency: "MXN",
        business_slug: "empresa-demo",
        business_name: "Empresa demo · Valladolid.mx",
        conversion_mode: "reservation",
        primary_action_label: "Reservar ahora",
        secondary_action_mode: "whatsapp",
        secondary_action_label: "Preguntar por WhatsApp",
        accepts_online_payment: true,
        requires_availability: true,
        visibility_level: "public",
      },
    ],
    promotions: [
      {
        id: "demo-promo",
        slug: "estancia-3x2",
        title: "Estancia 3x2 entre semana",
        description: "Reserva 3 noches y paga 2, válido de lunes a jueves.",
        discount_percent: 33,
        starts_at: null,
        ends_at: null,
        business_slug: "empresa-demo",
        business_name: "Empresa demo · Valladolid.mx",
      },
    ],
  };
}

/* ------------------------------------------------------------------ *
 * Registry
 * ------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const REGISTRY: TemplatePreviewProvider<any>[] = [
  {
    kind: "business",
    label: "Vista previa con empresa",
    placeholder: "Selecciona una empresa…",
    matches: (pageType, slug) =>
      pageType === "business" || slug === "__tpl_business__",
    async loadCandidates() {
      const items = await listMarketplaceBusinesses();
      return items.map((b) => ({
        slug: b.slug,
        label: b.display_name,
        secondary: b.destination_slug || b.category_slug || undefined,
      }));
    },
    async loadDetail(slug) {
      return await getMarketplaceBusinessBySlug({ data: { slug } });
    },
    demoData: demoBusiness,
    Provider: BusinessDataProvider,
  } satisfies TemplatePreviewProvider<MarketplaceBusinessDetail>,
  // NOTA: `region`, `destination`, `product`, `event`, `experience`,
  // `hotel`, `restaurant` se registrarán aquí cuando su superficie
  // exponga un `SurfaceProvider` equivalente. El Studio no requiere
  // cambios: consulta este registry por kind.
];

export function getPreviewProvider(
  pageType: string | null | undefined,
  slug: string | null | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): TemplatePreviewProvider<any> | null {
  if (!pageType && !slug) return null;
  return (
    REGISTRY.find((p) => p.matches(pageType ?? "", slug ?? "")) ?? null
  );
}

export function listPreviewProviders(): readonly TemplatePreviewProvider<unknown>[] {
  return REGISTRY as readonly TemplatePreviewProvider<unknown>[];
}

/* ------------------------------------------------------------------ *
 * Persistencia de selección en localStorage.
 * ------------------------------------------------------------------ */

export function readStoredPreviewSlug(kind: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(`eb.preview.${kind}.slug`);
  } catch {
    return null;
  }
}

export function writeStoredPreviewSlug(kind: string, slug: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (slug) window.localStorage.setItem(`eb.preview.${kind}.slug`, slug);
    else window.localStorage.removeItem(`eb.preview.${kind}.slug`);
  } catch {
    /* noop */
  }
}
