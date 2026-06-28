/**
 * mocks/destinos.ts — Destinos placeholder Fase 0.
 * UUIDs reales, snake_case. Listos para Fase 1 (BD real).
 */
import type { Destination } from "@/types/territory";
import imgValladolid from "@/assets/destino-valladolid.jpg";
import imgEkBalam from "@/assets/destino-ek-balam.jpg";
import imgRioLagartos from "@/assets/destino-rio-lagartos.jpg";
import imgLasColoradas from "@/assets/destino-las-coloradas.jpg";
import imgIzamal from "@/assets/destino-izamal.jpg";
import imgUayma from "@/assets/destino-uayma.jpg";

export const DESTINOS_MOCK: readonly Destination[] = [
  {
    id: "11111111-aaaa-4aaa-8aaa-000000000001",
    region_slug: "oriente-maya",
    slug: "valladolid",
    name: "Valladolid",
    tagline: "La puerta colonial del Oriente Maya.",
    hero_palette: "territorio",
    image_url: imgValladolid,
    highlights: ["Calzada de los Frailes", "Cenote Zací", "Casa de los Venados"],
  },
  {
    id: "11111111-aaaa-4aaa-8aaa-000000000002",
    region_slug: "oriente-maya",
    slug: "ek-balam",
    name: "Ek Balam",
    tagline: "La ciudad maya del jaguar negro.",
    hero_palette: "selva",
    image_url: imgEkBalam,
    highlights: ["Acrópolis", "Cenote Xcanché", "Comunidad maya viva"],
  },
  {
    id: "11111111-aaaa-4aaa-8aaa-000000000003",
    region_slug: "oriente-maya",
    slug: "rio-lagartos",
    name: "Río Lagartos",
    tagline: "Manglares, flamencos y noches de bioluminiscencia.",
    hero_palette: "cenote",
    image_url: imgRioLagartos,
    highlights: ["Reserva de la Biosfera", "Flamencos rosados", "Petén Tucha"],
  },
  {
    id: "11111111-aaaa-4aaa-8aaa-000000000004",
    region_slug: "oriente-maya",
    slug: "las-coloradas",
    name: "Las Coloradas",
    tagline: "Salineras rosadas frente al Golfo.",
    hero_palette: "atardecer",
    image_url: imgLasColoradas,
    highlights: ["Lagunas rosadas", "Aves migratorias", "Atardeceres mar adentro"],
  },
  {
    id: "11111111-aaaa-4aaa-8aaa-000000000005",
    region_slug: "oriente-maya",
    slug: "izamal",
    name: "Izamal",
    tagline: "La ciudad amarilla y tres culturas.",
    hero_palette: "territorio",
    image_url: imgIzamal,
    highlights: ["Convento de San Antonio", "Pirámide Kinich Kakmó", "Talleres artesanos"],
  },
  {
    id: "11111111-aaaa-4aaa-8aaa-000000000006",
    region_slug: "oriente-maya",
    slug: "uayma",
    name: "Uayma",
    tagline: "Una iglesia barroca que parece bordada.",
    hero_palette: "selva",
    image_url: imgUayma,
    highlights: ["Templo de Santo Domingo", "Pueblo tranquilo", "Ruta cercana a Valladolid"],
  },
];
