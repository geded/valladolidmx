/**
 * ConsejoAluxSection — Sección 5 de Home.
 * Presencia visible de Alux SIN chat flotante como elemento principal.
 */
import { Sparkles, ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Container } from "@/components/layout/Container";
import { ComingSoonBadge } from "@/components/common/ComingSoonBadge";
import { useTranslation } from "@/i18n/context";

export function ConsejoAluxSection() {
  const { t } = useTranslation();
  return (
    <section id="consejo-alux" className="bg-secondary/40 py-20 md:py-24">
      <Container>
        <div className="mx-auto flex max-w-3xl flex-col items-start gap-6 rounded-3xl border border-border bg-card p-8 shadow-sm md:flex-row md:items-center md:p-10">
          <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
            <Sparkles className="size-6" aria-hidden />
          </div>
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                {t("sections.alux_title")}
              </p>
              <ComingSoonBadge label={t("common.coming_soon")} />
            </div>
            <p className="text-balance text-xl leading-snug md:text-2xl">{t("sections.alux_body")}</p>
            <Link
              to="/alux"
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              {t("common.learn_more")} <ArrowUpRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
