/**
 * SiteFooter — Pie de página global.
 * Responsabilidades: enlaces institucionales, idiomas, redes.
 */
import { Container } from "./Container";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useTranslation } from "@/i18n/context";
import { SITE } from "@/config/site";

interface FooterLinkItem {
  label: string;
  href: string;
}

interface SiteFooterProps {
  config?: Record<string, unknown>;
}

function textValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function boolValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function linkItems(value: unknown, fallback: FooterLinkItem[]): FooterLinkItem[] {
  if (!Array.isArray(value)) return fallback;
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const label = textValue(record.label);
      const href = textValue(record.href);
      return label && href ? { label, href } : null;
    })
    .filter((item): item is FooterLinkItem => Boolean(item));
}

export function SiteFooter({ config }: SiteFooterProps = {}) {
  const { t } = useTranslation();
  const exploreLinks = linkItems(config?.explore_links, [
    { href: "/oriente-maya", label: t("nav.destinations") },
    { href: "/experiencias", label: t("nav.experiences") },
    { href: "/hoteles", label: t("nav.hotels") },
    { href: "/restaurantes", label: t("nav.restaurants") },
    { href: "/eventos", label: t("nav.events") },
  ]);
  const platformLinks = linkItems(config?.platform_links, [
    { href: "/arma-tu-viaje", label: t("nav.plan_trip") },
    { href: "/empresas", label: t("nav.for_business") },
  ]);
  const tagline = textValue(config?.tagline) ?? t("footer.tagline");
  const legalLabel = textValue(config?.legal_label) ?? t("footer.legal");
  const privacyLabel = textValue(config?.privacy_label) ?? t("footer.privacy");
  const showLanguage = boolValue(config?.show_language, true);
  return (
    <footer className="@container mt-24 border-t border-border bg-secondary/40">
      <Container className="grid grid-cols-1 gap-10 py-12 @3xl:grid-cols-4">
        <div>
          <BrandLogo tone="dark" size="md" />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">{tagline}</p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground">{t("footer.explore")}</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {exploreLinks.map((link) => (
              <li key={`${link.href}-${link.label}`}><a href={link.href} className="hover:text-foreground">{link.label}</a></li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground">{t("footer.platform")}</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {platformLinks.map((link) => (
              <li key={`${link.href}-${link.label}`}><a href={link.href} className="hover:text-foreground">{link.label}</a></li>
            ))}
          </ul>
        </div>

        {showLanguage ? <div>
          <h3 className="text-sm font-semibold text-foreground">{t("common.language")}</h3>
          <div className="mt-3">
            <LanguageSwitcher />
          </div>
        </div> : null}
      </Container>
      <div className="border-t border-border/60">
        <Container className="flex flex-col items-center justify-between gap-3 py-5 text-xs text-muted-foreground @3xl:flex-row">
          <p>© {new Date().getFullYear()} {SITE.name}. {t("footer.rights")}</p>
          <div className="flex gap-4">
            <span>{legalLabel}</span>
            <span>{privacyLabel}</span>
          </div>
        </Container>
      </div>
    </footer>
  );
}
