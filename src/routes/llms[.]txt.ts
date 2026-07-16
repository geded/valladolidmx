/**
 * PR-2 · Infrastructure Externalization.
 *
 * `/llms.txt` dinámico. Todo enlace absoluto se deriva de la fuente
 * única de verdad `src/config/site.ts` (via `absoluteUrl`). No
 * hardcodear el dominio público en este archivo.
 */
import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { SITE, absoluteUrl } from "@/config/site";

interface Entry {
  label: string;
  path: string;
  description: string;
}

const PAGES: Entry[] = [
  { label: "Inicio", path: "/", description: "Puerta de entrada al Oriente Maya de Yucatán." },
  { label: "Oriente Maya", path: "/oriente-maya", description: "Región turística — destinos, pueblos y cenotes del oriente de Yucatán." },
  { label: "Experiencias", path: "/experiencias", description: "Tours, cenotes, ruinas y experiencias auténticas." },
  { label: "Hoteles", path: "/hoteles", description: "Hospedaje boutique, haciendas y hoteles familiares." },
  { label: "Restaurantes", path: "/restaurantes", description: "Cocina yucateca, mercados y gastronomía maya." },
  { label: "Eventos", path: "/eventos", description: "Agenda cultural, festivales y ferias." },
  { label: "Casas de vacaciones", path: "/casas-de-vacaciones", description: "Rentas vacacionales en Valladolid y alrededores." },
  { label: "Promociones", path: "/promociones", description: "Ofertas vigentes verificadas." },
  { label: "Arma tu viaje", path: "/arma-tu-viaje", description: "Planea con Alux, copiloto turístico." },
  { label: "Empresas", path: "/empresas", description: "Directorio de empresas certificadas." },
  { label: "Blog", path: "/blog", description: "Historias, agenda y notas editoriales." },
  { label: "Contacto", path: "/contacto", description: "Contacto oficial." },
];

const DESTINATIONS: Entry[] = [
  { label: "Valladolid", path: "/oriente-maya/valladolid", description: "Pueblo Mágico colonial, puerta del Oriente Maya." },
  { label: "Ek Balam", path: "/oriente-maya/ek-balam", description: "Zona arqueológica maya del jaguar negro, con cenote Xcanché." },
  { label: "Izamal", path: "/oriente-maya/izamal", description: "Pueblo Mágico amarillo, convento franciscano y pirámide Kinich Kakmó." },
  { label: "Espita", path: "/oriente-maya/espita", description: "Pueblo Mágico, comunidad artesana del oriente yucateco." },
  { label: "Uayma", path: "/oriente-maya/uayma", description: "Templo colonial policromado único en Yucatán." },
  { label: "Río Lagartos", path: "/oriente-maya/rio-lagartos", description: "Reserva de la Biosfera, manglares y flamencos rosados." },
  { label: "Las Coloradas", path: "/oriente-maya/las-coloradas", description: "Salineras rosadas frente al Golfo de México." },
];

function renderEntries(entries: Entry[]): string {
  return entries
    .map((e) => `- [${e.label}](${absoluteUrl(e.path)}): ${e.description}`)
    .join("\n");
}

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: () => {
        const body = [
          `# ${SITE.name} — ${SITE.tagline}`,
          "",
          `> Plataforma turística oficial del Oriente Maya de Yucatán, México. Guía y directorio verificado de Valladolid, Chichén Itzá, Ek Balam, Izamal, Espita, Uayma, Río Lagartos, Las Coloradas, cenotes y comunidades mayas. Descubre experiencias, hoteles, restaurantes, eventos y arma tu viaje con Alux, el copiloto turístico basado en IA. Sitio canónico: ${SITE.url}.`,
          "",
          "Valladolid es Pueblo Mágico y capital cultural del oriente de Yucatán. Desde aquí se accede a los principales destinos arqueológicos, naturales y coloniales del sureste mexicano.",
          "",
          "## Pages",
          "",
          renderEntries(PAGES),
          "",
          "## Destinos",
          "",
          renderEntries(DESTINATIONS),
          "",
          "## Datos clave",
          "",
          "- Región: Oriente Maya, estado de Yucatán, México (país MX, estado YUC).",
          "- Cercanía: Chichén Itzá a 45 min de Valladolid; Ek Balam a 30 min; Río Lagartos a 1 h 30 min.",
          "- Idiomas soportados: español (oficial), inglés, francés, alemán, italiano, portugués.",
          `- Sitemap: ${absoluteUrl("/sitemap.xml")}`,
          "- Alux: copiloto turístico basado en IA que arma itinerarios personalizados por destino, presupuesto e intereses.",
          "",
        ].join("\n");
        return new Response(body, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});