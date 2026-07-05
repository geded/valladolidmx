/**
 * ConsejoAluxSection — Sección 5 de Home.
 * Presencia visible de Alux SIN chat flotante como elemento principal.
 */
import { Sparkles } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { ComingSoonBadge } from "@/components/common/ComingSoonBadge";
import { useTranslation } from "@/i18n/context";

export function ConsejoAluxSection({ config }: { config?: Record<string, unknown> } = {}) {
  const { t } = useTranslation();
  const heading = typeof config?.heading === "string" && config.heading.trim() ? config.heading : t("sections.alux_title");
  return (
    <section id="consejo-alux" className="@container bg-secondary/40 py-20 @3xl:py-24">
      <Container>
        <div data-home-layout="consejo-alux" className="mx-auto flex max-w-3xl flex-col items-start gap-6 rounded-3xl border border-border bg-card p-8 shadow-sm @3xl:flex-row @3xl:items-center @3xl:p-10">
          <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
            <Sparkles className="size-6" aria-hidden />
          </div>
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                {heading}
              </p>
              <ComingSoonBadge label={t("common.coming_soon")} />
            </div>
            <p className="text-balance text-xl leading-snug @3xl:text-2xl">{t("sections.alux_body")}</p>
            <p className="mt-4 text-xs text-muted-foreground">
              Toca el botón de Alux en cualquier destino, empresa o producto para recibir sugerencias contextuales.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
