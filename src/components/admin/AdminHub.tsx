/**
 * AdminHub — Componente de composición compartido del Panel Fundador.
 *
 * "Admin Composition Layer" (15.10.4R · Paso C): cada sub-ruta /admin/*
 * usa este shell para ENLAZAR a superficies existentes (CMS, Portal,
 * Concierge, Cuenta, Experience Builder…) sin duplicar componentes,
 * lógica, server functions ni RPCs. Solo navegación + documentación
 * de dominios consumidos.
 */
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export interface AdminHubLink {
  to: string;
  label: string;
  description?: string;
}

export interface AdminHubSection {
  title: string;
  description?: string;
  links: AdminHubLink[];
}

interface Props {
  eyebrow: string;
  title: string;
  description: string;
  domains: string[];
  sections: AdminHubSection[];
  footer?: ReactNode;
}

export function AdminHub({ eyebrow, title, description, domains, sections, footer }: Props) {
  return (
    <div className="max-w-5xl">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          Dominios consumidos: <span className="font-semibold text-foreground">{domains.join(" · ")}</span>
        </p>
      </header>

      <div className="mt-8 grid gap-6">
        {sections.map((section) => (
          <section key={section.title} className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">{section.title}</h2>
            {section.description ? (
              <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
            ) : null}
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {section.links.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="block rounded-lg border border-border bg-background px-3 py-2 text-sm transition-colors hover:bg-accent"
                  >
                    <span className="font-medium">{link.label}</span>
                    {link.description ? (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {link.description}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {footer ? <div className="mt-6">{footer}</div> : null}
    </div>
  );
}