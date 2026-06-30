import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Hero } from "@/components/home/Hero";
import { DestinosSection } from "@/components/home/DestinosSection";
import { CategoriasSection } from "@/components/home/CategoriasSection";
import { RutasSection } from "@/components/home/RutasSection";
import { ConsejoAluxSection } from "@/components/home/ConsejoAluxSection";
import { ArmaTuViajeSection } from "@/components/home/ArmaTuViajeSection";
import { EnVivoSection } from "@/components/home/EnVivoSection";
import { EmpresasSection } from "@/components/home/EmpresasSection";
import { ResenasSection } from "@/components/home/ResenasSection";
import { SITE } from "@/config/site";
import { getPublishedHomeComposition } from "@/lib/experience-builder/public-reads.functions";
import { CompositionRenderer } from "@/lib/experience-builder/composition-renderer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${SITE.name} — Despierta en Valladolid y descubre el Oriente Maya` },
      { name: "description", content: SITE.default_description },
      { property: "og:title", content: `${SITE.name} — Despierta en Valladolid y descubre el Oriente Maya` },
      { property: "og:description", content: SITE.default_description },
    ],
  }),
  component: HomePage,
});

/**
 * HomePage (Etapa 15.10.3)
 *
 * Renderiza la Home pública a partir de una composición publicada
 * desde el Experience Builder. Si todavía no existe una composición
 * publicada para `page_type='home'` (o si la lectura falla), cae al
 * Home legacy hardcodeado — Progressive Migration: cada bloque puede
 * activarse o revertirse de forma independiente sin afectar el sitio.
 */
function HomePage() {
  const fetchHome = useServerFn(getPublishedHomeComposition);
  const { data: published } = useQuery({
    queryKey: ["eb", "published-home", "default"],
    queryFn: () => fetchHome({ data: { variant_key: "default" } }),
    staleTime: 60_000,
  });

  if (published?.snapshot) {
    return (
      <main id="main">
        <CompositionRenderer tree={published.snapshot} pageType="home" />
      </main>
    );
  }

  return <LegacyHome />;
}

/**
 * LegacyHome — Fallback hardcodeado (Doc 12). Se conserva hasta que la
 * composición de Home esté publicada y validada en producción.
 */
function LegacyHome() {
  return (
    <main id="main">
      <Hero />
      <DestinosSection />
      <CategoriasSection />
      <RutasSection />
      <ConsejoAluxSection />
      <ArmaTuViajeSection />
      <EnVivoSection />
      <EmpresasSection />
      <ResenasSection />
    </main>
  );
}
