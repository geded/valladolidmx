/**
 * SiteFooter — Pie de página global.
 * Responsabilidades: enlaces institucionales, idiomas, redes.
 */
import { Link } from "@tanstack/react-router";
import { Container } from "./Container";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useTranslation } from "@/i18n/context";
import { SITE } from "@/config/site";

export function SiteFooter() {
  const { t } = useTranslation();
  return (
    <footer className="mt-24 border-t border-border bg-secondary/40">
      <Container className="grid gap-10 py-12 md:grid-cols-4">
        <div>
          <BrandLogo tone="dark" size="md" />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">{t("footer.tagline")}</p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground">{t("footer.explore")}</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/oriente-maya" className="hover:text-foreground">{t("nav.destinations")}</Link></li>
            <li><Link to="/experiencias" className="hover:text-foreground">{t("nav.experiences")}</Link></li>
            <li><Link to="/hoteles" className="hover:text-foreground">{t("nav.hotels")}</Link></li>
            <li><Link to="/restaurantes" className="hover:text-foreground">{t("nav.restaurants")}</Link></li>
            <li><Link to="/eventos" className="hover:text-foreground">{t("nav.events")}</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground">{t("footer.platform")}</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/arma-tu-viaje" className="hover:text-foreground">{t("nav.plan_trip")}</Link></li>
            <li><Link to="/alux" className="hover:text-foreground">{t("nav.alux")}</Link></li>
            <li><Link to="/empresas" className="hover:text-foreground">{t("nav.for_business")}</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground">{t("common.language")}</h3>
          <div className="mt-3">
            <LanguageSwitcher />
          </div>
        </div>
      </Container>
      <div className="border-t border-border/60">
        <Container className="flex flex-col items-center justify-between gap-3 py-5 text-xs text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} {SITE.name}. {t("footer.rights")}</p>
          <div className="flex gap-4">
            <span>{t("footer.legal")}</span>
            <span>{t("footer.privacy")}</span>
          </div>
        </Container>
      </div>
    </footer>
  );
}
