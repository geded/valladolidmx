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

bootstrapBlockLibrary();

export interface CompositionRendererProps {
  tree: CompositionTree;
  /** Metadato no funcional; el renderer es agnóstico al tipo de página. */
  pageType?: string;
  /** Modo Studio: muestra placeholders editoriales y banderas de error. */
  studio?: boolean;
  /** Render-prop opcional para overlays editoriales (selección, etc.). */
  wrap?: (node: CompositionNode, content: ReactNode) => ReactNode;
}

export function CompositionRenderer({
  tree,
  studio = false,
  wrap,
}: CompositionRendererProps): ReactNode {
  return (
    <Fragment>
      {tree.root.children.map((node) => (
        <RenderNode key={node.id} node={node} studio={studio} wrap={wrap} />
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
}

function RenderNode({ node, studio, wrap }: RenderNodeProps): ReactNode {
  const contract = getBlock(node.type);
  if (!contract) {
    return studio ? (
      <StudioErrorBlock
        title={`Bloque desconocido: ${node.type}`}
        detail="Este bloque no está registrado en el Block Registry."
      />
    ) : null;
  }

  const Comp = COMPONENT_MAP[node.type] ?? GenericBlockPreview;
  const content = (
    <Comp
      node={node}
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
                  />
                ))}
              </Fragment>
            )
          : undefined
      }
    />
  );

  return wrap ? wrap(node, content) : content;
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

const COMPONENT_MAP: Record<string, BlockPreview> = {
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
};