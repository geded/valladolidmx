/**
 * PublicShell — Layout canónico de superficies públicas (15.10.5d.1).
 *
 * Contrato declarativo para la Discovery Layer. Provee:
 *   · Breadcrumb territorial opcional.
 *   · Eyebrow/título/descripción de página.
 *   · Slot de contenido principal con `<main id="main">`.
 *
 * Header y Footer NO se renderizan aquí: viven en `__root.tsx` para
 * todas las rutas públicas (render condicional contra rutas de
 * Workspace). Esta separación garantiza que toda superficie pública
 * comparta exactamente el mismo header/footer sin posibilidad de
 * implementaciones paralelas.
 */
import type { ReactNode } from "react";
import { Container } from "@/components/layout/Container";
import { BreadcrumbTerritorial } from "@/components/layout/BreadcrumbTerritorial";
import type { BreadcrumbCrumb } from "@/types/territory";
import {
  ContextEngineProvider,
  type RouteContextDeclaration,
} from "@/lib/context-engine";
import { cn } from "@/lib/utils";

export type PublicShellVariant = "default" | "hero" | "minimal";

export interface PublicShellProps {
  title?: string;
  eyebrow?: string;
  description?: string;
  crumbs?: readonly BreadcrumbCrumb[];
  variant?: PublicShellVariant;
  className?: string;
  children: ReactNode;
  /**
   * H-02 · I2 — Declaración de contexto opcional. Si se provee, el
   * shell monta `<ContextEngineProvider>` para su subárbol. Cuando es
   * `undefined` (default), el shell se comporta exactamente igual que
   * antes de H-02 — cero cambios observables.
   */
  contextDeclaration?: RouteContextDeclaration;
  /**
   * H-02 · I2 — Cuando es `true`, el breadcrumb interno deriva sus
   * migas del Context Engine. Sólo tiene efecto si además se provee
   * `contextDeclaration` (o si un provider externo está montado).
   * Default `false`: la prop `crumbs` sigue siendo la fuente.
   */
  useContextCrumbs?: boolean;
}

export function PublicShell({
  title,
  eyebrow,
  description,
  crumbs,
  variant = "default",
  className,
  children,
  contextDeclaration,
  useContextCrumbs = false,
}: PublicShellProps) {
  const body = (
    <PublicShellBody
      title={title}
      eyebrow={eyebrow}
      description={description}
      crumbs={crumbs}
      variant={variant}
      className={className}
      useContextCrumbs={useContextCrumbs}
    >
      {children}
    </PublicShellBody>
  );

  if (contextDeclaration) {
    return (
      <ContextEngineProvider declaration={contextDeclaration}>
        {body}
      </ContextEngineProvider>
    );
  }
  return body;
}

interface PublicShellBodyProps {
  title?: string;
  eyebrow?: string;
  description?: string;
  crumbs?: readonly BreadcrumbCrumb[];
  variant: PublicShellVariant;
  className?: string;
  useContextCrumbs: boolean;
  children: ReactNode;
}

function PublicShellBody({
  title,
  eyebrow,
  description,
  crumbs,
  variant,
  className,
  useContextCrumbs,
  children,
}: PublicShellBodyProps) {
  if (variant === "minimal" || variant === "hero") {
    return (
      <main id="main" tabIndex={-1} className={cn("pb-24", className)}>
        {children}
      </main>
    );
  }

  const hasHeader = Boolean(title || eyebrow || description);
  const hasCrumbs = useContextCrumbs || Boolean(crumbs && crumbs.length > 0);

  return (
    <main id="main" tabIndex={-1} className={cn("pb-24 pt-8 md:pt-12", className)}>
      <Container>
        {hasCrumbs ? (
          <BreadcrumbTerritorial
            crumbs={crumbs}
            useContextCrumbs={useContextCrumbs}
          />
        ) : null}
        {hasHeader ? (
          <header className={cn("max-w-3xl", hasCrumbs ? "mt-6" : null)}>
            {eyebrow ? (
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-primary">
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h1 className="text-balance text-4xl md:text-5xl">{title}</h1>
            ) : null}
            {description ? (
              <p className="mt-4 text-lg text-muted-foreground">{description}</p>
            ) : null}
          </header>
        ) : null}
        <div className={cn(hasHeader ? "mt-12" : "mt-0")}>{children}</div>
      </Container>
    </main>
  );
}