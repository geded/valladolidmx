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
}

export function PublicShell({
  title,
  eyebrow,
  description,
  crumbs,
  variant = "default",
  className,
  children,
}: PublicShellProps) {
  if (variant === "minimal" || variant === "hero") {
    return (
      <main id="main" className={cn("pb-24", className)}>
        {children}
      </main>
    );
  }

  const hasHeader = Boolean(title || eyebrow || description);
  const hasCrumbs = Boolean(crumbs && crumbs.length > 0);

  return (
    <main id="main" className={cn("pb-24 pt-8 md:pt-12", className)}>
      <Container>
        {hasCrumbs ? <BreadcrumbTerritorial crumbs={crumbs!} /> : null}
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