/**
 * Experience Builder · Renderer Universal (Etapa 15.10.2)
 *
 * Convierte un `CompositionTree` en JSX usando exclusivamente el
 * Block Registry y el Layout Engine. Es el MISMO componente que servirá
 * composiciones públicas a partir de la Etapa 15.10.3.
 *
 * Principios:
 *  - Canvas Agnóstico: no conoce el tipo de página (Home, Landing,
 *    Destino, Empresa, Producto, Campaña, etc.). Renderiza cualquier
 *    superficie futura sin modificarse.
 *  - Page-Type Agnostic: el `pageType` se acepta solo como metadato,
 *    nunca altera el árbol ni los bloques.
 *  - Layout separado del contenido: el Layout Engine resuelve hijos;
 *    los bloques individuales no conocen su contenedor.
 */

import { Fragment, type ReactNode } from "react";
import { getBlock } from "./block-registry";
import { isContainerBlock } from "./layout-engine";
import type { CompositionNode, CompositionTree } from "./composition-tree";
import { bootstrapBlockLibrary } from "./block-library";
import {
  resolveVariables,
  type VariableContext,
} from "./dynamic-variables";
import { appearanceToStyle, hasAppearance, readAppearance } from "./appearance";
import { buildScopedTypographyCss, type FieldTypography } from "./typography";
import { applyI18nToNode } from "./i18n-overlay";
import { useTranslation } from "@/i18n/context";
import { Hero } from "@/components/home/Hero";
import { DestinosSection } from "@/components/home/DestinosSection";
import { CategoriasSection } from "@/components/home/CategoriasSection";
import { RutasSection } from "@/components/home/RutasSection";
import { ConsejoAluxSection } from "@/components/home/ConsejoAluxSection";
import { ArmaTuViajeSection } from "@/components/home/ArmaTuViajeSection";
import { EnVivoSection } from "@/components/home/EnVivoSection";
import { EmpresasSection } from "@/components/home/EmpresasSection";
import { ResenasSection } from "@/components/home/ResenasSection";
import {
  CockpitKpiGrid,
  CockpitAlerts,
  CockpitActivityStream,
} from "@/components/admin/cockpit-blocks";
import { SmartBlockRuntime } from "@/components/experience-builder/smart-blocks";
import { MarketplaceSurface } from "@/components/surfaces/MarketplaceSurface";
import { AluxSurface } from "@/components/surfaces/AluxSurface";
import { TripPlannerSurface } from "@/components/surfaces/TripPlannerSurface";
import { RegionSurface } from "@/components/surfaces/RegionSurface";
import { DestinationSurface } from "@/components/surfaces/DestinationSurface";
import { BusinessSurface } from "@/components/surfaces/BusinessSurface";
import {
  BusinessShellBlock,
  BusinessHeaderBadgesBlock,
  BusinessDescriptionBlock,
  BusinessGalleryBlock,
  BusinessInfoBlock,
  BusinessProductsBlock,
  BusinessPromotionsBlock,
  BusinessContactBlock,
} from "@/components/surfaces/business-blocks";
import {
  ProductShellBlock,
  ProductGalleryBlock,
  ProductPriceCtaBlock,
  ProductDescriptionBlock,
  ProductBusinessContextBlock,
  ProductPromosBlock,
  ProductReviewsBlock,
  ProductFaqBlock,
  ProductRelatedBlock,
} from "@/components/surfaces/product-blocks";
import { ExperienceHeroFromProduct } from "@/components/experience-builder/blocks/experience-hero/ExperienceHeroFromProduct";
import { KIT_BLOCK_RENDERERS } from "./kit-blocks";
import {
  DiscoveryNavigatorBlock,
  DiscoveryNavigatorPreview,
} from "@/components/experience-builder/blocks/DiscoveryNavigatorBlock";
import {
  ExperienceHeroBlock,
  ExperienceHeroPreview,
} from "@/components/experience-builder/blocks/experience-hero/ExperienceHeroBlock";
import {
  ExperienceSubnavBlock,
  ExperienceSubnavPreview,
} from "@/components/experience-builder/blocks/experience-subnav/ExperienceSubnavBlock";
import {
  ExperienceCtaBarBlock,
  ExperienceCtaBarPreview,
} from "@/components/experience-builder/blocks/experience-cta-bar/ExperienceCtaBarBlock";
import {
  ExperienceGalleryBlock,
  ExperienceGalleryPreview,
} from "@/components/experience-builder/blocks/experience-gallery/ExperienceGalleryBlock";
import {
  ExperienceInfoGridBlock,
  ExperienceInfoGridPreview,
} from "@/components/experience-builder/blocks/experience-info-grid/ExperienceInfoGridBlock";
import {
  ExperienceSectionBlock,
  ExperienceSectionPreview,
} from "@/components/experience-builder/blocks/experience-section/ExperienceSectionBlock";
import {
  ExperienceFeaturesBlock,
  ExperienceFeaturesPreview,
} from "@/components/experience-builder/blocks/experience-features/ExperienceFeaturesBlock";
import {
  ExperienceProductsBlock,
  ExperienceProductsPreview,
} from "@/components/experience-builder/blocks/experience-products/ExperienceProductsBlock";
import {
  ExperiencePromotionsBlock,
  ExperiencePromotionsPreview,
} from "@/components/experience-builder/blocks/experience-promotions/ExperiencePromotionsBlock";
import {
  ExperienceReviewsBlock,
  ExperienceReviewsPreview,
} from "@/components/experience-builder/blocks/experience-reviews/ExperienceReviewsBlock";
import {
  ExperienceRelatedCollectionBlock,
  ExperienceRelatedCollectionPreview,
} from "@/components/experience-builder/blocks/experience-related-collection/ExperienceRelatedCollectionBlock";
import {
  InstitutionalBadgesBlock,
  InstitutionalBadgesPreview,
} from "@/components/experience-builder/blocks/experience-institutional-badges/InstitutionalBadgesBlock";

/**
 * US-R3 · Sub-ola 2.5d — mapa de renderers `vmx.kit.*`. Se expande de
 * forma controlada en ambos mapas (Studio + producción) SIN reemplazar
 * ninguna entrada existente. Los bloques del Kit son neutros: se
 * renderizan idénticos en Studio y producción a partir de `node.config`,
 * sin depender de ningún SurfaceContext.
 */
const KIT_MAP: Record<string, BlockPreview> = Object.fromEntries(
  Object.entries(KIT_BLOCK_RENDERERS).map(([type, render]) => [
    type,
    (({ node }) => render(node)) as BlockPreview,
  ]),
);

bootstrapBlockLibrary();

export interface CompositionRendererProps {
  tree: CompositionTree;
  /** Metadato no funcional; el renderer es agnóstico al tipo de página. */
  pageType?: string;
  /** Modo Studio: muestra placeholders editoriales y banderas de error. */
  studio?: boolean;
  /** Render-prop opcional para overlays editoriales (selección, etc.). */
  wrap?: (node: CompositionNode, content: ReactNode) => ReactNode;
  /** Contexto de Variables Dinámicas. Si está presente, se resuelven los
   *  tokens `${scope.field}` de la config de cada bloque ANTES del render.
   *  El mismo renderer corre en Studio (contexto demo) y en producción
   *  (contexto real de la superficie). */
  variableContext?: VariableContext;
}

export function CompositionRenderer({
  tree,
  studio = false,
  wrap,
  variableContext,
}: CompositionRendererProps): ReactNode {
  return (
    <Fragment>
      {tree.root.children.map((node) => (
        <RenderNode
          key={node.id}
          node={node}
          studio={studio}
          wrap={wrap}
          variableContext={variableContext}
        />
      ))}
      {studio && tree.root.children.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/40 px-6 py-12 text-center text-sm text-muted-foreground">
          Composición vacía. Añade un bloque desde la biblioteca para empezar.
        </div>
      ) : null}
    </Fragment>
  );
}

interface RenderNodeProps {
  node: CompositionNode;
  studio: boolean;
  wrap?: CompositionRendererProps["wrap"];
  variableContext?: VariableContext;
}

function RenderNode({ node, studio, wrap, variableContext }: RenderNodeProps): ReactNode {
  const contract = getBlock(node.type);
  if (!contract) {
    return studio ? (
      <StudioErrorBlock
        title={`Bloque desconocido: ${node.type}`}
        detail="Este bloque no está registrado en el Block Registry."
      />
    ) : null;
  }

  // Bloque oculto: en producción no se renderiza; en Studio se muestra
  // atenuado con un badge "Oculto" para que el editor lo siga viendo.
  if (node.hidden && !studio) return null;

  // Modo producción: usa los componentes reales del Home cuando existan.
  // Modo Studio: muestra previews neutrales para conservar la diagramación
  // editorial y los overlays de selección.
  const map = studio ? STUDIO_PREVIEW_MAP : PRODUCTION_COMPONENT_MAP;
  const Comp = map[node.type] ?? STUDIO_PREVIEW_MAP[node.type] ?? GenericBlockPreview;
  // 1) Overlay de traducciones automáticas por idioma activo (H3/H5 plan i18n).
  //    En Studio no aplicamos overlay: el editor siempre muestra el idioma base
  //    para no confundir al autor con las traducciones generadas por IA.
  const { locale, defaultLocale } = useTranslation();
  const localized: CompositionNode =
    !studio && locale !== defaultLocale ? applyI18nToNode(node, locale) : node;
  // 2) Resolución de variables dinámicas.
  const resolved: CompositionNode = variableContext
    ? { ...localized, config: resolveVariables(localized.config, variableContext) as CompositionNode["config"] }
    : localized;
  const content = (
    <Comp
      node={resolved}
      displayName={contract.display_name}
      studio={studio}
      renderChildren={
        isContainerBlock(node.type)
          ? () => (
              <Fragment>
                {(node.children ?? []).map((child) => (
                  <RenderNode
                    key={child.id}
                    node={child}
                    studio={studio}
                    wrap={wrap}
                    variableContext={variableContext}
                  />
                ))}
              </Fragment>
            )
          : undefined
      }
    />
  );

  // Aplica overrides visuales (tipografía, tamaño, colores) definidos en el
  // Inspector → `config.__appearance`. Sin overrides no se envuelve nada.
  const appearance = readAppearance(resolved.config);
  const typoOverrides =
    (resolved.config as Record<string, unknown>).__typography as
      | Record<string, FieldTypography>
      | undefined;
  const scopeId = resolved.id;
  const scopedCss = typoOverrides
    ? buildScopedTypographyCss(scopeId, resolved.type, typoOverrides)
    : "";
  // US-10 (15.10.4d): visibilidad por dispositivo. `__hidden_on` es un array
  // de "mobile" | "tablet" | "desktop". Se emite como `data-hidden-on` y el
  // CSS global (src/styles.css) resuelve tanto producción como Studio.
  const rawHidden = (resolved.config as Record<string, unknown>).__hidden_on;
  const hiddenOn = Array.isArray(rawHidden)
    ? (rawHidden as unknown[]).filter(
        (v): v is "mobile" | "tablet" | "desktop" =>
          v === "mobile" || v === "tablet" || v === "desktop",
      )
    : [];
  const needsWrap = hasAppearance(appearance) || Boolean(scopedCss) || hiddenOn.length > 0;
  const styled = needsWrap ? (
    <div
      style={{
        ...(hasAppearance(appearance) ? appearanceToStyle(appearance) : {}),
        // Container queries: los overrides tipográficos responsivos se
        // evalúan contra el ancho del propio bloque, no del viewport del
        // navegador. Esto es imprescindible en el editor visual, donde
        // el canvas simula un ancho móvil dentro de una ventana desktop.
        ...(scopedCss ? { containerType: "inline-size" } : {}),
      }}
      data-eb-typo={scopedCss ? scopeId : undefined}
      data-hidden-on={hiddenOn.length > 0 ? hiddenOn.join(" ") : undefined}
    >
      {scopedCss ? <style dangerouslySetInnerHTML={{ __html: scopedCss }} /> : null}
      {content}
    </div>
  ) : (
    content
  );

  return wrap ? wrap(node, styled) : styled;
}

/* ------------------------------------------------------------------ *
 * Component map (mínimo v0)
 * ------------------------------------------------------------------ *
 *
 * Cada entrada recibe el nodo + helpers y renderiza una vista de
 * preview neutral. La Etapa 15.10.3 sustituirá las previews por los
 * componentes de producción ya envueltos en 15.10.1, sin alterar la
 * firma de este renderer.
 */

interface BlockPreviewProps {
  node: CompositionNode;
  displayName: string;
  studio: boolean;
  renderChildren?: () => ReactNode;
}

type BlockPreview = (props: BlockPreviewProps) => ReactNode;

function ContainerPreview({ node, renderChildren }: BlockPreviewProps): ReactNode {
  const padding = (node.config.padding as string) ?? "normal";
  const padClass =
    padding === "tight" ? "p-3" : padding === "spacious" ? "p-10" : "p-6";
  return (
    <div className={`rounded-lg border border-dashed border-border ${padClass}`}>
      {renderChildren ? renderChildren() : null}
    </div>
  );
}

function SectionPreview({ node, renderChildren }: BlockPreviewProps): ReactNode {
  const heading = (node.config.heading as string) ?? "";
  const subheading = (node.config.subheading as string) ?? "";
  const tone = (node.config.tone as string) ?? "default";
  const toneClass =
    tone === "muted"
      ? "bg-muted/40"
      : tone === "accent"
        ? "bg-primary/5"
        : "bg-background";
  return (
    <section className={`rounded-lg ${toneClass} p-6`}>
      {heading ? (
        <header className="mb-4">
          <h2 className="text-2xl font-semibold">{heading}</h2>
          {subheading ? (
            <p className="mt-1 text-sm text-muted-foreground">{subheading}</p>
          ) : null}
        </header>
      ) : null}
      {renderChildren ? renderChildren() : null}
    </section>
  );
}

function SpacerPreview({ node }: BlockPreviewProps): ReactNode {
  const size = (node.config.size as string) ?? "md";
  const h = size === "sm" ? "h-4" : size === "lg" ? "h-16" : "h-8";
  return <div className={h} aria-hidden="true" />;
}

function DividerPreview(): ReactNode {
  return <hr className="my-6 border-border" />;
}

function HeroPreview({ node }: BlockPreviewProps): ReactNode {
  const title = (node.config.title as string) ?? "Título principal";
  const subtitle = (node.config.subtitle as string) ?? "";
  return (
    <div className="rounded-xl bg-primary/10 px-8 py-16 text-center">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
        Hero
      </p>
      <h1 className="mt-3 text-3xl font-semibold">{title}</h1>
      {subtitle ? (
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

function NamedSectionPreview({
  node,
  displayName,
}: BlockPreviewProps): ReactNode {
  const heading = (node.config.heading as string) ?? displayName;
  return (
    <div className="rounded-lg border border-border bg-card/50 p-6">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {displayName}
      </p>
      <h2 className="mt-2 text-xl font-semibold">{heading}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Contenido dinámico — se conectará en etapas posteriores.
      </p>
    </div>
  );
}

function CardPreview({ node, displayName }: BlockPreviewProps): ReactNode {
  const reference = (node.config.reference as string) ?? "(sin referencia)";
  return (
    <div className="inline-flex flex-col rounded-md border border-border bg-card px-4 py-3">
      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {displayName}
      </span>
      <span className="mt-1 text-sm font-semibold">{reference}</span>
    </div>
  );
}

function GenericBlockPreview({
  displayName,
  renderChildren,
}: BlockPreviewProps): ReactNode {
  return (
    <div className="rounded-md border border-border/60 bg-card/30 p-4 text-sm">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {displayName}
      </p>
      {renderChildren ? <div className="mt-3">{renderChildren()}</div> : null}
    </div>
  );
}

function StudioErrorBlock({
  title,
  detail,
}: {
  title: string;
  detail: string;
}): ReactNode {
  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
      <p className="font-semibold text-destructive">{title}</p>
      <p className="mt-1 text-xs text-destructive/80">{detail}</p>
    </div>
  );
}

const STUDIO_PREVIEW_MAP: Record<string, BlockPreview> = {
  "vmx.layout.container": ContainerPreview,
  "vmx.layout.section": SectionPreview,
  "vmx.layout.spacer": SpacerPreview,
  "vmx.layout.divider": DividerPreview,
  "vmx.hero": HeroPreview,
  "vmx.section.destinos": NamedSectionPreview,
  "vmx.section.categorias": NamedSectionPreview,
  "vmx.section.rutas": NamedSectionPreview,
  "vmx.section.consejo-alux": NamedSectionPreview,
  "vmx.section.arma-tu-viaje": NamedSectionPreview,
  "vmx.section.en-vivo": NamedSectionPreview,
  "vmx.section.empresas": NamedSectionPreview,
  "vmx.section.resenas": NamedSectionPreview,
  "vmx.card.destino": CardPreview,
  "vmx.card.empresa": CardPreview,
  "vmx.card.categoria": CardPreview,
  "vmx.card.ruta": CardPreview,
  "vmx.card.resena": CardPreview,
  "vmx.cockpit.kpi-grid": NamedSectionPreview,
  "vmx.cockpit.alerts": NamedSectionPreview,
  "vmx.cockpit.activity-stream": NamedSectionPreview,
  "vmx.smart.destinations-grid": NamedSectionPreview,
  "vmx.smart.businesses-grid": NamedSectionPreview,
  "vmx.smart.products-grid": NamedSectionPreview,
  "vmx.smart.events-list": NamedSectionPreview,
  "vmx.surface.marketplace": NamedSectionPreview,
  "vmx.surface.alux": NamedSectionPreview,
  "vmx.surface.trip-planner": NamedSectionPreview,
  // US-R3 · Ola 2 · Sub-ola 2.1 — Region + Destination (preview)
  "vmx.surface.region": NamedSectionPreview,
  "vmx.surface.destination": NamedSectionPreview,
  // US-R3 · Ola 2 · Sub-ola 2.2 — Plantilla Madre Business
  "vmx.surface.business": NamedSectionPreview,
  // US-R3 · Sub-ola 2.2b — Business granular. En Studio queremos ver
  // el bloque HIDRATADO con el contexto de preview (BusinessSurfaceProvider),
  // no un placeholder — mismo componente de producción.
  "vmx.business.shell": ({ renderChildren }) => (
    <BusinessShellBlock renderChildren={renderChildren} />
  ),
  "vmx.business.header-badges": () => <BusinessHeaderBadgesBlock />,
  "vmx.business.description": () => <BusinessDescriptionBlock />,
  "vmx.business.gallery": () => <BusinessGalleryBlock />,
  "vmx.business.info": () => <BusinessInfoBlock />,
  "vmx.business.products": () => <BusinessProductsBlock />,
  "vmx.business.promotions": () => <BusinessPromotionsBlock />,
  "vmx.business.contact": () => <BusinessContactBlock />,
  // US-R3 · Sub-ola 2.3a — Product granular. Mismos componentes en
  // Studio y producción: leen `ProductSurfaceContext` (poblado por el
  // preview-registry en Studio y por la ruta pública en producción).
  "vmx.product.shell": ({ renderChildren }) => (
    <ProductShellBlock renderChildren={renderChildren} />
  ),
  // U1.5 · Unificado con `vmx.experience.hero` — sin bloque paralelo.
  "vmx.product.hero": () => <ExperienceHeroFromProduct />,
  "vmx.product.gallery": () => <ProductGalleryBlock />,
  "vmx.product.price-cta": () => <ProductPriceCtaBlock />,
  "vmx.product.description": () => <ProductDescriptionBlock />,
  "vmx.product.business-context": () => <ProductBusinessContextBlock />,
  "vmx.product.promos": () => <ProductPromosBlock />,
  "vmx.product.reviews": () => <ProductReviewsBlock />,
  "vmx.product.faq": () => <ProductFaqBlock />,
  "vmx.product.related": () => <ProductRelatedBlock />,
  // US-R3 · Sub-ola 2.5d — vmx.kit.* neutros (Studio).
  ...KIT_MAP,
};

// H-02 · Iniciativa 2 — Discovery Navigator (Studio preview neutral).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(STUDIO_PREVIEW_MAP as any)["vmx.discovery.navigator"] = () => (
  <DiscoveryNavigatorPreview />
);

// H-03 · Ola I1.a — Experience Hero (Studio preview neutral).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(STUDIO_PREVIEW_MAP as any)["vmx.experience.hero"] = () => (
  <ExperienceHeroPreview />
);

// H-03 · Ola I1.b — Experience Subnav + CTA Bar (Studio preview neutral).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(STUDIO_PREVIEW_MAP as any)["vmx.experience.subnav"] = () => (
  <ExperienceSubnavPreview />
);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(STUDIO_PREVIEW_MAP as any)["vmx.experience.cta-bar"] = () => (
  <ExperienceCtaBarPreview />
);

// H-03 · Ola I1.c — Gallery / Info-Grid / Section / Features (Studio).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(STUDIO_PREVIEW_MAP as any)["vmx.experience.gallery"] = () => <ExperienceGalleryPreview />;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(STUDIO_PREVIEW_MAP as any)["vmx.experience.info-grid"] = () => <ExperienceInfoGridPreview />;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(STUDIO_PREVIEW_MAP as any)["vmx.experience.section"] = () => <ExperienceSectionPreview />;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(STUDIO_PREVIEW_MAP as any)["vmx.experience.features"] = () => <ExperienceFeaturesPreview />;
// H-03 · Ola I2.a — Experience Products (Studio).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(STUDIO_PREVIEW_MAP as any)["vmx.experience.products"] = () => <ExperienceProductsPreview />;
// H-03 · Ola I2.b — Experience Promotions (Studio).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(STUDIO_PREVIEW_MAP as any)["vmx.experience.promotions"] = () => <ExperiencePromotionsPreview />;
// H-03 · Ola I2.c — Experience Reviews (Studio).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(STUDIO_PREVIEW_MAP as any)["vmx.experience.reviews"] = () => <ExperienceReviewsPreview />;
// H-03 · Ola I3.b — Experience Related Collection (Studio).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(STUDIO_PREVIEW_MAP as any)["vmx.experience.related-collection"] = () => <ExperienceRelatedCollectionPreview />;
// H-03 · Ola I3.c — Institutional Badges (Studio).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(STUDIO_PREVIEW_MAP as any)["vmx.experience.institutional-badges"] = () => <InstitutionalBadgesPreview />;

/* ------------------------------------------------------------------ *
 * Mapa de producción (Etapa 15.10.3)
 *
 * Cuando el renderer corre en modo público (sin `studio`), las
 * secciones del Home se sirven con los MISMOS componentes que estaba
 * usando `/` antes de la migración, garantizando paridad visual 1:1
 * y sin regresiones en SEO / CWV. Los bloques de layout y los bloques
 * todavía no migrados caen al preview neutral.
 * ------------------------------------------------------------------ */

const wrap = (Component: (props?: { config?: Record<string, unknown> }) => ReactNode): BlockPreview => ({ node }) => (
  <Component config={node.config as Record<string, unknown>} />
);

const PRODUCTION_COMPONENT_MAP: Record<string, BlockPreview> = {
  "vmx.hero": ({ node }) => {
    // Normaliza background_images (lista de {src} → string[]).
    const rawImages = node.config.background_images;
    const background_images = Array.isArray(rawImages)
      ? (rawImages as Array<{ src?: string } | string>)
          .map((it) => (typeof it === "string" ? it : (it?.src ?? "")))
          .map((s) => (s ?? "").trim())
          .filter(Boolean)
      : undefined;
    // Normaliza ctas (lista de {label,href,variant}).
    const rawCtas = node.config.ctas;
    const ctas = Array.isArray(rawCtas)
      ? (rawCtas as Array<Record<string, unknown>>).map((c) => ({
          label: typeof c?.label === "string" ? c.label : undefined,
          href: typeof c?.href === "string" ? c.href : undefined,
          variant: typeof c?.variant === "string" ? c.variant : undefined,
          size: typeof c?.size === "string" ? c.size : undefined,
          full_width: typeof c?.full_width === "boolean" ? c.full_width : undefined,
        }))
      : undefined;
    return (
      <Hero
        config={{
          eyebrow: node.config.eyebrow as string | undefined,
          title: node.config.title as string | undefined,
          subtitle: node.config.subtitle as string | undefined,
          background_image: node.config.background_image as string | undefined,
          background_images,
          slide_interval_seconds:
            typeof node.config.slide_interval_seconds === "number"
              ? node.config.slide_interval_seconds
              : undefined,
          background_position: node.config.background_position as string | undefined,
          ctas,
          cta_label: node.config.cta_label as string | undefined,
          cta_href: node.config.cta_href as string | undefined,
          cta_secondary_label: node.config.cta_secondary_label as string | undefined,
          cta_secondary_href: node.config.cta_secondary_href as string | undefined,
          cta_alignment: node.config.cta_alignment as string | undefined,
          show_search:
            typeof node.config.show_search === "boolean"
              ? (node.config.show_search as boolean)
              : undefined,
          show_ctas:
            typeof node.config.show_ctas === "boolean"
              ? (node.config.show_ctas as boolean)
              : undefined,
          search_placeholder: node.config.search_placeholder as string | undefined,
          search_helper: node.config.search_helper as string | undefined,
          search_size: node.config.search_size as string | undefined,
          search_max_width: node.config.search_max_width as string | undefined,
          text_alignment: node.config.text_alignment as string | undefined,
          search_alignment: node.config.search_alignment as string | undefined,
          __typography:
            (node.config.__typography as Record<string, FieldTypography> | undefined) ?? undefined,
        }}
      />
    );
  },
  "vmx.section.destinos": wrap(DestinosSection),
  "vmx.section.categorias": wrap(CategoriasSection),
  "vmx.section.rutas": wrap(RutasSection),
  "vmx.section.consejo-alux": wrap(ConsejoAluxSection),
  "vmx.section.arma-tu-viaje": wrap(ArmaTuViajeSection),
  "vmx.section.en-vivo": wrap(EnVivoSection),
  "vmx.section.empresas": wrap(EmpresasSection),
  "vmx.section.resenas": wrap(ResenasSection),
  // Layout y separadores reutilizan las previews neutrales:
  "vmx.layout.container": ContainerPreview,
  "vmx.layout.section": SectionPreview,
  "vmx.layout.spacer": SpacerPreview,
  "vmx.layout.divider": DividerPreview,
  // Etapa 15.10.4c — Cockpit Fundador (Founder Cockpit Composable)
  "vmx.cockpit.kpi-grid": ({ node }) => (
    <CockpitKpiGrid
      title={(node.config.title as string) ?? "Visión global"}
      window={(node.config.window as string) ?? "30d"}
      domain={(node.config.domain as string) ?? "all"}
    />
  ),
  "vmx.cockpit.alerts": ({ node }) => (
    <CockpitAlerts
      title={(node.config.title as string) ?? "Alertas"}
      limit={Number(node.config.limit ?? 10)}
    />
  ),
  "vmx.cockpit.activity-stream": ({ node }) => (
    <CockpitActivityStream
      title={(node.config.title as string) ?? "Actividad reciente"}
      limit={Number(node.config.limit ?? 20)}
    />
  ),
  // Corrección US-01 (15.10.4d) — grupo de botones (CTAs) editable.
  "vmx.actions.buttons": ({ node }) => {
    const alignment = (node.config.alignment as string) ?? "center";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = Array.isArray(node.config.items) ? (node.config.items as any[]) : [];
    const alignCls =
      alignment === "left"
        ? "justify-start"
        : alignment === "right"
          ? "justify-end"
          : "justify-center";
    return (
      <div className={`flex flex-wrap gap-3 py-6 ${alignCls}`}>
        {items.map((it, i) => {
          const label = typeof it?.label === "string" ? it.label : "Botón";
          const href = typeof it?.href === "string" ? it.href : "#";
          const variant = typeof it?.variant === "string" ? it.variant : "primary";
          const size = typeof it?.size === "string" ? it.size : "md";
          const fullWidth = it?.full_width === true;
          const cls =
            variant === "secondary"
              ? "border border-primary bg-transparent text-primary hover:bg-primary/10"
              : variant === "ghost"
                ? "bg-transparent text-primary hover:bg-primary/10"
                : "bg-primary text-primary-foreground hover:opacity-95";
          const sizeCls =
            size === "sm"
              ? "px-3 py-1.5 text-xs"
              : size === "lg"
                ? "px-6 py-3 text-base"
                : size === "xl"
                  ? "px-8 py-4 text-lg"
                  : "px-5 py-2 text-sm";
          const widthCls = fullWidth ? "w-full justify-center" : "";
          return (
            <a
              key={i}
              href={href}
              className={`inline-flex items-center rounded-full font-semibold shadow-sm transition-colors ${sizeCls} ${widthCls} ${cls}`}
            >
              {label}
            </a>
          );
        })}
      </div>
    );
  },
  // Bloques avanzados (Modo Profesional)
  "vmx.custom.html": ({ node }) => {
    const html = typeof node.config.html === "string" ? node.config.html : "";
    const maxWidth = (node.config.max_width as string) ?? "container";
    const wrapper = maxWidth === "full" ? "w-full" : "mx-auto w-full max-w-6xl px-4";
    return (
      <div className={`py-6 ${wrapper}`}>
        {/* eslint-disable-next-line react/no-danger */}
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    );
  },
  "vmx.custom.form": ({ node }) => <CustomFormBlock config={node.config} />,
  // Etapa 15.10.8 · Smart Blocks v1 — datos reales resueltos server-side.
  "vmx.smart.destinations-grid": ({ node }) => <SmartBlockRuntime node={node} />,
  "vmx.smart.businesses-grid": ({ node }) => <SmartBlockRuntime node={node} />,
  "vmx.smart.products-grid": ({ node }) => <SmartBlockRuntime node={node} />,
  "vmx.smart.events-list": ({ node }) => <SmartBlockRuntime node={node} />,
  // US-R3 · Ola 1 — Superficies singleton oficiales adoptadas por el EB.
  "vmx.surface.marketplace": () => <MarketplaceSurface />,
  "vmx.surface.alux": () => <AluxSurface />,
  "vmx.surface.trip-planner": () => <TripPlannerSurface />,
  // US-R3 · Ola 2 · Sub-ola 2.1 — plantillas dinámicas por slug.
  // El slug se resuelve dentro de la superficie (useParams del router).
  "vmx.surface.region": () => <RegionSurface />,
  "vmx.surface.destination": () => <DestinationSurface />,
  // US-R3 · Ola 2 · Sub-ola 2.2 — Business surface (universal).
  // El detalle del negocio se recibe vía `BusinessSurfaceProvider`
  // desde la ruta pública; en Studio se muestra placeholder.
  "vmx.surface.business": () => <BusinessSurface />,
  // US-R3 · Sub-ola 2.2b — Business granular. El shell es contenedor
  // (registrado en layout-engine) y expone `renderChildren` para el
  // resto de bloques del árbol.
  "vmx.business.shell": ({ renderChildren }) => (
    <BusinessShellBlock renderChildren={renderChildren} />
  ),
  "vmx.business.header-badges": () => <BusinessHeaderBadgesBlock />,
  "vmx.business.description": () => <BusinessDescriptionBlock />,
  "vmx.business.gallery": () => <BusinessGalleryBlock />,
  "vmx.business.info": () => <BusinessInfoBlock />,
  "vmx.business.products": () => <BusinessProductsBlock />,
  "vmx.business.promotions": () => <BusinessPromotionsBlock />,
  "vmx.business.contact": () => <BusinessContactBlock />,
  // US-R3 · Sub-ola 2.3a — Product granular (producción).
  "vmx.product.shell": ({ renderChildren }) => (
    <ProductShellBlock renderChildren={renderChildren} />
  ),
  "vmx.product.hero": () => <ProductHeroBlock />,
  "vmx.product.gallery": () => <ProductGalleryBlock />,
  "vmx.product.price-cta": () => <ProductPriceCtaBlock />,
  "vmx.product.description": () => <ProductDescriptionBlock />,
  "vmx.product.business-context": () => <ProductBusinessContextBlock />,
  "vmx.product.promos": () => <ProductPromosBlock />,
  "vmx.product.reviews": () => <ProductReviewsBlock />,
  "vmx.product.faq": () => <ProductFaqBlock />,
  "vmx.product.related": () => <ProductRelatedBlock />,
  // US-R3 · Sub-ola 2.5d — vmx.kit.* neutros (producción).
  ...KIT_MAP,
};

// H-02 · Iniciativa 2 — Discovery Navigator (producción: hidrata desde
// Context/Params + TanStack Query).
PRODUCTION_COMPONENT_MAP["vmx.discovery.navigator"] = ({ node }) => (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  <DiscoveryNavigatorBlock config={node.config as any} />
);

// H-03 · Ola I1.a — Experience Hero (producción: hidrata SurfaceContext
// cuando `source !== 'manual'`).
PRODUCTION_COMPONENT_MAP["vmx.experience.hero"] = ({ node }) => (
  <ExperienceHeroBlock config={node.config} />
);

// H-03 · Ola I1.b — Experience Subnav (producción: manual/auto/preset).
PRODUCTION_COMPONENT_MAP["vmx.experience.subnav"] = ({ node }) => (
  <ExperienceSubnavBlock config={node.config} />
);
// H-03 · Ola I1.b — Experience CTA Bar (producción: manual/business…).
PRODUCTION_COMPONENT_MAP["vmx.experience.cta-bar"] = ({ node }) => (
  <ExperienceCtaBarBlock config={node.config} />
);

// H-03 · Ola I1.c — Producción (mismo blockType; hidrata Surface cuando aplica).
PRODUCTION_COMPONENT_MAP["vmx.experience.gallery"] = ({ node }) => (
  <ExperienceGalleryBlock config={node.config} />
);
PRODUCTION_COMPONENT_MAP["vmx.experience.info-grid"] = ({ node }) => (
  <ExperienceInfoGridBlock config={node.config} />
);
PRODUCTION_COMPONENT_MAP["vmx.experience.section"] = ({ node }) => (
  <ExperienceSectionBlock config={node.config} />
);
PRODUCTION_COMPONENT_MAP["vmx.experience.features"] = ({ node }) => (
  <ExperienceFeaturesBlock config={node.config} />
);
// H-03 · Ola I2.a — Experience Products (Producción).
PRODUCTION_COMPONENT_MAP["vmx.experience.products"] = ({ node }) => (
  <ExperienceProductsBlock config={node.config} />
);
// H-03 · Ola I2.b — Experience Promotions (Producción).
PRODUCTION_COMPONENT_MAP["vmx.experience.promotions"] = ({ node }) => (
  <ExperiencePromotionsBlock config={node.config} />
);
// H-03 · Ola I2.c — Experience Reviews (Producción).
PRODUCTION_COMPONENT_MAP["vmx.experience.reviews"] = ({ node }) => (
  <ExperienceReviewsBlock config={node.config} />
);
// H-03 · Ola I3.b — Experience Related Collection (Producción).
PRODUCTION_COMPONENT_MAP["vmx.experience.related-collection"] = ({ node }) => (
  <ExperienceRelatedCollectionBlock config={node.config} />
);
// H-03 · Ola I3.c — Institutional Badges (Producción).
PRODUCTION_COMPONENT_MAP["vmx.experience.institutional-badges"] = ({ node }) => (
  <InstitutionalBadgesBlock config={node.config} />
);

/* ------------------------------------------------------------------ *
 * Bloque formulario configurable
 * ------------------------------------------------------------------ */
// (Los renderers de `vmx.product.*` se inyectan también en PRODUCTION_COMPONENT_MAP
//  arriba, reutilizando los mismos componentes de Studio.)

interface FormFieldCfg { key: string; label: string; type: string; required?: boolean }

function CustomFormBlock({ config }: { config: Record<string, unknown> }) {
  const heading = (config.heading as string) ?? "Contáctanos";
  const subheading = (config.subheading as string) ?? "";
  const submitLabel = (config.submit_label as string) ?? "Enviar";
  const successMessage = (config.success_message as string) ?? "¡Gracias! Recibimos tu mensaje.";
  const webhookUrl = (config.webhook_url as string) ?? "";
  const fields = Array.isArray(config.fields) ? (config.fields as FormFieldCfg[]) : [];
  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-10">
      <header className="mb-4">
        <h2 className="text-2xl font-semibold">{heading}</h2>
        {subheading ? <p className="mt-1 text-sm text-muted-foreground">{subheading}</p> : null}
      </header>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const data = new FormData(form);
          const payload: Record<string, unknown> = {};
          for (const [k, v] of data.entries()) payload[k] = v;
          const success = form.querySelector("[data-form-success]") as HTMLElement | null;
          try {
            if (webhookUrl) {
              await fetch(webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
            }
            if (success) success.classList.remove("hidden");
            form.reset();
          } catch {
            if (success) {
              success.textContent = "No se pudo enviar. Intenta más tarde.";
              success.classList.remove("hidden");
            }
          }
        }}
      >
        {fields.map((f, i) => (
          <label key={i} className="block text-sm">
            <span className="mb-1 block font-medium">
              {f.label} {f.required ? <span className="text-destructive">*</span> : null}
            </span>
            {f.type === "textarea" ? (
              <textarea
                name={f.key}
                required={f.required}
                className="min-h-[100px] w-full rounded-md border border-border bg-background px-3 py-2"
              />
            ) : (
              <input
                name={f.key}
                type={f.type === "email" ? "email" : f.type === "tel" ? "tel" : "text"}
                required={f.required}
                className="w-full rounded-md border border-border bg-background px-3 py-2"
              />
            )}
          </label>
        ))}
        <button
          type="submit"
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95"
        >
          {submitLabel}
        </button>
        <p data-form-success className="hidden text-sm text-emerald-600">{successMessage}</p>
      </form>
    </section>
  );
}