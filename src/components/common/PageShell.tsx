/**
 * PageShell — Envoltura estándar de rutas internas.
 * Provee BreadcrumbTerritorial + título de página + slot de contenido.
 * Reutilizable en cualquier ruta secundaria.
 */
import type { ReactNode } from "react";
import { Container } from "@/components/layout/Container";
import { BreadcrumbTerritorial } from "@/components/layout/BreadcrumbTerritorial";
import type { BreadcrumbCrumb } from "@/types/territory";

interface Props {
  title: string;
  eyebrow?: string;
  description?: string;
  crumbs: readonly BreadcrumbCrumb[];
  children: ReactNode;
}

export function PageShell({ title, eyebrow, description, crumbs, children }: Props) {
  return (
    <main id="main" className="pb-24 pt-8 md:pt-12">
      <Container>
        <BreadcrumbTerritorial crumbs={crumbs} />
        <header className="mt-6 max-w-3xl">
          {eyebrow ? (
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
          ) : null}
          <h1 className="text-balance text-4xl md:text-5xl">{title}</h1>
          {description ? (
            <p className="mt-4 text-lg text-muted-foreground">{description}</p>
          ) : null}
        </header>
        <div className="mt-12">{children}</div>
      </Container>
    </main>
  );
}
