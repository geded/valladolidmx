/**
 * ExperienceMenu — Capa 1 (Presentación) de `vmx.experience.menu`.
 * Secciones como pastillas desplazables, lista nombre/precio y la carta
 * completa sólo al pedirla. Sin JSX de datos: todo llega en el DTO.
 */
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ExperienceMenuDTO } from "@/lib/experience-builder/blocks/experience-menu/contract";

export interface ExperienceMenuProps {
  dto: ExperienceMenuDTO;
  className?: string;
}

const ALL = "__toda__";

export function ExperienceMenu({ dto, className }: ExperienceMenuProps) {
  const [active, setActive] = useState<string>(ALL);
  const [expanded, setExpanded] = useState(false);
  const total = dto.sections.reduce((sum, s) => sum + s.items.length, 0);
  const preview = dto.capabilities.previewPerSection;
  const sections = active === ALL ? dto.sections : dto.sections.filter((s) => s.id === active);
  const hidden = expanded
    ? 0
    : sections.reduce((sum, s) => sum + Math.max(0, s.items.length - preview), 0);

  return (
    <section aria-label={dto.ariaLabel} data-eb-block="experience-menu" className={cn("w-full", className)}>
      <h2 className="mb-4 text-xl font-semibold tracking-tight">{dto.heading}</h2>

      {dto.sections.length > 1 ? (
        <div
          role="tablist"
          aria-label="Secciones de la carta"
          className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]"
        >
          {[{ id: ALL, title: "Todo" }, ...dto.sections].map((s) => {
            const on = active === s.id;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => {
                  setActive(s.id);
                  setExpanded(false);
                }}
                className={cn(
                  "shrink-0 rounded-pill border px-3.5 py-1.5 text-sm transition-colors",
                  on
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-foreground hover:border-foreground/40",
                )}
              >
                {s.title}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <div className="grid gap-x-10 gap-y-6 md:grid-cols-2">
          {sections.map((section) => {
            const items = expanded ? section.items : section.items.slice(0, preview);
            return (
              <div key={section.id} className="min-w-0">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                  {section.title}
                </h3>
                <ul role="list" className="divide-y divide-border">
                  {items.map((item, i) => (
                    <li key={`${section.id}-${i}`} className="py-2.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0 font-medium text-foreground">{item.name}</span>
                        {item.priceLabel ? (
                          <span className="shrink-0 tabular-nums text-foreground">{item.priceLabel}</span>
                        ) : null}
                      </div>
                      {item.description ? (
                        <p className="mt-0.5 text-sm leading-5 text-muted-foreground">{item.description}</p>
                      ) : null}
                      {item.tags.length ? (
                        <p className="mt-1 flex flex-wrap gap-1">
                          {item.tags.map((t) => (
                            <span
                              key={t}
                              className="rounded-pill bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                            >
                              {t}
                            </span>
                          ))}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {hidden > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="mt-4 w-full rounded-pill border border-foreground px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted sm:w-auto"
          >
            {active === ALL ? `Ver toda la carta (${total})` : `Ver ${hidden} más`}
          </button>
        ) : null}

        <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">{dto.footnote}</p>
      </div>
    </section>
  );
}
