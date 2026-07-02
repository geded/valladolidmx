/**
 * ArmaTuViajeSection — Sección 6 de Home. CTA permanente.
 */
import { Link } from "@tanstack/react-router";
import { Compass, FileText, MessageCircle } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { useTranslation } from "@/i18n/context";

export function ArmaTuViajeSection({ config }: { config?: Record<string, unknown> } = {}) {
  const { t } = useTranslation();
  const heading = typeof config?.heading === "string" && config.heading.trim() ? config.heading : t("sections.ayv_title");
  const body = typeof config?.body === "string" && config.body.trim() ? config.body : t("sections.ayv_sub");
  const ctaLabel = typeof config?.cta_label === "string" && config.cta_label.trim() ? config.cta_label : t("hero.cta_secondary");
  return (
    <section id="arma-tu-viaje" className="py-20 md:py-28">
      <Container>
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-primary">
              {t("nav.plan_trip")}
            </p>
            <h2 className="text-balance text-3xl md:text-4xl">{heading}</h2>
            <p className="mt-4 text-lg text-muted-foreground">{body}</p>
            <Link
              to="/arma-tu-viaje"
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground shadow-sm transition-all hover:opacity-95 active:scale-[0.98]"
            >
              <Compass className="size-4" aria-hidden />
              {ctaLabel}
            </Link>
          </div>
          <ul className="grid gap-3">
            {[
              { Icon: Compass, title: "Guarda destinos", body: "Reúne lo que te llama de cada lugar." },
              { Icon: FileText, title: "Anota lo importante", body: "Fechas, intereses, viajeros, presupuesto." },
              { Icon: MessageCircle, title: "Tu concierge humano", body: "Lo recibe cuando estés listo. Nunca antes." },
            ].map(({ Icon, title, body }) => (
              <li key={title} className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-muted-foreground">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
