/**
 * G7 · `vmx.alux.planner` — Bloque VISUAL del Planificador Alux.
 *
 * Render-only y fail-closed por diseño:
 *  - No invoca modelos ni AI Gateway.
 *  - No persiste estado, no crea sesiones, no escribe planes.
 *  - El campo de texto es no interactivo (`readOnly`) y la acción real
 *    navega a la superficie productiva `/arma-tu-viaje`.
 */
import { Sparkles, ArrowRight } from "lucide-react";
import { Container } from "@/components/layout/Container";
import {
  applyAluxPlannerDefaults,
  type AluxPlannerDTO,
} from "@/lib/experience-builder/blocks/alux-planner/contract";

const VARIANT_PADDING: Record<AluxPlannerDTO["variant"], string> = {
  compact: "p-5 @3xl:p-6",
  editorial: "p-6 @3xl:p-10",
  panel: "p-6 @3xl:p-12",
};

export function AluxPlannerBlock({ config }: { config?: Record<string, unknown> } = {}) {
  const dto = applyAluxPlannerDefaults(config);

  return (
    <section
      data-block="vmx.alux.planner"
      data-alux-planner-variant={dto.variant}
      className="@container py-12 @3xl:py-20"
    >
      <Container>
        <div
          className={`relative overflow-hidden rounded-3xl border border-border/70 bg-card shadow-soft ${VARIANT_PADDING[dto.variant]}`}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-primary/10 blur-3xl"
          />
          <div className="relative flex min-w-0 flex-col gap-4">
            {dto.eyebrow ? (
              <p className="inline-flex items-center gap-2 text-sm font-medium text-primary">
                <Sparkles className="size-4" aria-hidden />
                {dto.eyebrow}
              </p>
            ) : null}
            <h2 className="max-w-2xl text-balance font-display text-2xl leading-tight text-foreground @3xl:text-4xl">
              {dto.heading}
            </h2>
            {dto.subheading ? (
              <p className="max-w-xl text-pretty text-base text-muted-foreground">
                {dto.subheading}
              </p>
            ) : null}

            <div className="mt-2 flex w-full min-w-0 flex-col gap-3 @2xl:flex-row @2xl:items-center">
              <input
                type="text"
                readOnly
                tabIndex={-1}
                aria-hidden
                placeholder={dto.placeholder}
                className="w-full min-w-0 rounded-pill border border-border bg-background px-5 py-3 text-sm text-muted-foreground"
              />
              <a
                href={dto.cta_href}
                className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-pill bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md ring-focus hover:opacity-95"
              >
                {dto.cta_label}
                <ArrowRight className="size-4" aria-hidden />
              </a>
            </div>

            {dto.show_prompts && dto.prompts.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {dto.prompts.map((p) => (
                  <li key={p.label}>
                    <a
                      href={dto.cta_href}
                      className="inline-flex min-h-[44px] items-center rounded-pill border border-border/70 bg-muted/40 px-4 text-sm text-foreground ring-focus hover:bg-muted"
                    >
                      {p.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}

            {dto.show_disclaimer && dto.disclaimer ? (
              <p className="text-xs text-muted-foreground">{dto.disclaimer}</p>
            ) : null}
          </div>
        </div>
      </Container>
    </section>
  );
}

export default AluxPlannerBlock;
