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

import { Component, type ComponentType, type ErrorInfo, type ReactNode } from "react";
import {
  getMarketplaceBusinessBySlug,
  listMarketplaceBusinesses,
  type MarketplaceBusinessDetail,
} from "@/lib/catalog/marketplace-reads.functions";
import { BusinessSurfaceProvider } from "@/components/surfaces/BusinessSurface";
import {
  getMarketplaceProductBySlug,
  searchMarketplace,
  type MarketplaceProductDetail,
} from "@/lib/catalog/marketplace-reads.functions";
import { ProductSurfaceProvider } from "@/components/surfaces/ProductSurface";

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
  /**
   * Enum `page_kind` (coincide con `page_compositions.kind`). Es la
   * ÚNICA fuente de verdad para elegir el provider — el registry NO
   * hace matching por slug de plantilla (`__tpl_*__`) para evitar
   * textos quemados en la plataforma.
   */
  readonly kind: string;
  /** Etiqueta corta en la barra ("Vista previa con empresa"). */
  readonly label: string;
  /** Placeholder del combo ("Selecciona una empresa…"). */
  readonly placeholder: string;
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

function ProductDataProvider({
  data,
  children,
}: {
  data: MarketplaceProductDetail | null;
  children: ReactNode;
}) {
  return <ProductSurfaceProvider product={data}>{children}</ProductSurfaceProvider>;
}

/** Producto demo estable — evita "Producto no disponible" en Studio. */
function demoProduct(): MarketplaceProductDetail {
  return {
    id: "demo-product",
    slug: "producto-demo",
    name: "Producto demo · Valladolid.mx",
    tagline: "Ficha de ejemplo para editar la Plantilla Madre Producto.",
    description:
      "Este es un producto de ejemplo. Reemplaza los textos, elige un producto real desde la barra superior o previsualiza con otro slug antes de publicar.",
    product_type: "experience",
    price_amount: 1450,
    price_currency: "MXN",
    conversion_mode: "reservar_en_linea",
    primary_action_label: "Reservar ahora",
    secondary_action_mode: "whatsapp",
    secondary_action_label: "Preguntar por WhatsApp",
    accepts_online_payment: true,
    requires_availability: true,
    visibility_level: "public",
    cover_url: null,
    media: [],
    business: {
      id: "demo-biz",
      slug: "empresa-demo",
      display_name: "Empresa demo · Valladolid.mx",
      tagline: "Empresa asociada de ejemplo.",
      verified: true,
      destination_slug: "valladolid",
      category_slug: "hotel",
      plan_tier: "pro",
      primary_contact: { type: "whatsapp", value: "+52 985 000 0000", label: "Reservaciones" },
      primary_location: {
        label: "Sede",
        address_line1: "Calle 41 s/n",
        address_line2: "Centro, Valladolid, Yuc.",
        latitude: 20.6893,
        longitude: -88.2011,
      },
    },
    related: [],
    promotions: [],
    reviews: [],
    review_stats: {
      count: 0,
      average: 0,
      verifiedCount: 0,
      distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
    },
    faqs: [],
  };
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
  /**
   * `hotel` — DUMMY de extensibilidad (Sub-ola 2.2c · criterio de
   * aprobación). Reutiliza `BusinessSurfaceProvider` porque, por
   * resolución H-R3-2, hoteles/restaurantes/experiencias comparten
   * el modelo de datos de `businesses`. Sirve como prueba viva de
   * que un nuevo kind entra al sistema registrando SÓLO aquí — sin
   * modificar `CompositionRenderer`, rutas públicas ni `VisualStudio`.
   */
  {
    kind: "hotel",
    label: "Vista previa con hotel",
    placeholder: "Selecciona un hotel…",
    async loadCandidates() {
      const items = await listMarketplaceBusinesses();
      return items
        .filter((b) => (b.category_slug ?? "").toLowerCase().includes("hotel"))
        .map((b) => ({
          slug: b.slug,
          label: b.display_name,
          secondary: b.destination_slug || undefined,
        }));
    },
    async loadDetail(slug) {
      return await getMarketplaceBusinessBySlug({ data: { slug } });
    },
    demoData: demoBusiness,
    Provider: BusinessDataProvider,
  } satisfies TemplatePreviewProvider<MarketplaceBusinessDetail>,
  /**
   * `product` — Plantilla Madre Producto (Sub-ola 2.3a). El Studio
   * lista productos reales publicados vía RPC `search_marketplace` y
   * los inyecta en `ProductSurfaceProvider`. Añadir productos nuevos
   * no requiere tocar el Studio.
   */
  {
    kind: "product",
    label: "Vista previa con producto",
    placeholder: "Selecciona un producto…",
    async loadCandidates() {
      const { items } = await searchMarketplace({
        data: { limit: 40, offset: 0 },
      });
      return items.map((it) => ({
        slug: it.product_slug,
        label: it.product_name,
        secondary: it.business_name || it.product_type || undefined,
      }));
    },
    async loadDetail(slug) {
      return await getMarketplaceProductBySlug({ data: { slug } });
    },
    demoData: demoProduct,
    Provider: ProductDataProvider,
  } satisfies TemplatePreviewProvider<MarketplaceProductDetail>,
  // NOTA: `region`, `destination`, `event`, `experience`, `restaurant`
  // se registrarán aquí cuando expongan un `SurfaceProvider` equivalente.
  // El Studio no requiere cambios: consulta este registry por `kind`.
];

export function getPreviewProvider(
  pageType: string | null | undefined,
  _slug: string | null | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): TemplatePreviewProvider<any> | null {
  if (!pageType) return null;
  return REGISTRY.find((p) => p.kind === pageType) ?? null;
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

/* ------------------------------------------------------------------ *
 * Fallback controlado (Sub-ola 2.2c · requisito 5)
 *
 * Boundary que aísla fallos de un provider concreto. Si el `Provider`
 * de una plantilla lanza en render, el Studio sigue vivo: el canvas
 * se pinta sin hidratación de contexto y muestra un aviso reversible.
 * ------------------------------------------------------------------ */

interface BoundaryProps {
  kind: string;
  children: ReactNode;
}
interface BoundaryState {
  error: Error | null;
}

export class PreviewProviderBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };
  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (typeof console !== "undefined") {
      console.warn(
        `[preview-registry] Provider "${this.props.kind}" falló en render — se muestra el canvas sin hidratación.`,
        error,
        info.componentStack,
      );
    }
  }
  render() {
    if (this.state.error) {
      return (
        <div className="space-y-2">
          <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            La vista previa del kind <b>{this.props.kind}</b> falló al hidratar
            datos. El canvas se muestra sin contexto para que puedas seguir
            editando la plantilla.
          </div>
          {this.props.children}
        </div>
      );
    }
    return this.props.children;
  }
}
