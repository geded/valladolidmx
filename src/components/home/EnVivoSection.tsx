/**
 * EnVivoSection — Sección 7 de Home (Oriente Maya en vivo).
 * Placeholder de futura integración Instagram + Facebook (Fase 6).
 */
import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/common/SectionHeader";
import { PlaceholderImage } from "@/components/common/PlaceholderImage";
import { ComingSoonBadge } from "@/components/common/ComingSoonBadge";
import { useTranslation } from "@/i18n/context";
import type { PlaceholderPalette } from "@/components/common/PlaceholderImage";

const TILES: { label: string; palette: PlaceholderPalette }[] = [
  { label: "Cenote Suytun", palette: "cenote" },
  { label: "Calzada de los Frailes", palette: "territorio" },
  { label: "Flamencos · Río Lagartos", palette: "atardecer" },
  { label: "Ek Balam · Acrópolis", palette: "selva" },
  { label: "Izamal amarilla", palette: "territorio" },
  { label: "Las Coloradas", palette: "atardecer" },
];

export function EnVivoSection() {
  const { t } = useTranslation();
  return (
    <section id="en-vivo" className="bg-secondary/40 py-20 md:py-28">
      <Container>
        <SectionHeader
          title={t("sections.envivo_title")}
          subtitle={t("sections.envivo_sub")}
          actions={<ComingSoonBadge label={t("common.coming_soon")} />}
        />
        <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-6">
          {TILES.map((tile) => (
            <PlaceholderImage
              key={tile.label}
              palette={tile.palette}
              label={tile.label}
              aspect="square"
            />
          ))}
        </div>
      </Container>
    </section>
  );
}
