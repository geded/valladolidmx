import { createFileRoute } from "@tanstack/react-router";
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
 * HomePage — Orquesta las 10 secciones del Home (Doc 12).
 * Orden: Hero · Destinos · Categorías · Rutas · Consejo Alux ·
 *        Arma tu Viaje · EN VIVO · Empresas · Reseñas · Footer (global).
 */
function HomePage() {
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
