/**
 * G5-S1 · Vista previa interna de Listing Readiness.
 *
 * Vista INTERNA, no indexable, sin persistencia y sin lecturas al
 * backend: todas las entidades provienen de fixtures locales ficticios.
 *
 * Objetivo:
 *  - Validar D-05 (hero sin medio gobernado ya no muestra rectángulo
 *    negro, sino degradado cálido piedra/caliza con contraste AA).
 *  - Validar D-06 (familia "casas de vacaciones" visible con slug
 *    persistido capitalizado, comparado de forma normalizada).
 *  - Probar todas las familias turísticas y ambos layouts de listado
 *    (grid y lista) en un solo lugar.
 *
 * Reglas aplicadas:
 *  - Sólo medios gobernados existentes vía la ruta pública estable
 *    `/api/public/studio-media/governed/v1p1c/*`. Sin URLs firmadas.
 *  - Cero mutaciones, cero flags, cero datos reales.
 */
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { TourismListingSurface } from "@/components/surfaces/TourismListingSurface";
import type { TourismCardVM } from "@/components/experience-builder/tourism-card/TourismCard";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/lovable/g5-listing-readiness-preview")({
  head: () => ({
    meta: [
      { title: "G5-S1 · Vista previa interna de Listing Readiness" },
      {
        name: "description",
        content: "Vista previa interna de listados turísticos con fixtures locales. No indexable.",
      },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: G5ListingReadinessPreview,
});

const GOVERNED = "/api/public/studio-media/governed/v1p1c";

type FamilyId = "hoteles" | "restaurantes" | "experiencias" | "eventos" | "casas-de-vacaciones";

interface FamilyFixture {
  id: FamilyId;
  label: string;
  hero: { eyebrow: string; title: string; subtitle: string; mediaUrl: string | null };
  items: TourismCardVM[];
}

function card(partial: Partial<TourismCardVM> & { id: string; name: string }): TourismCardVM {
  return {
    entityKind: null,
    eyebrow: null,
    mapLabel: null,
    href: null,
    tagline: null,
    businessName: null,
    mediaUrl: null,
    mediaAlt: null,
    rating: null,
    location: null,
    territorialContext: "Valladolid · Oriente Maya",
    highlights: [],
    badges: [],
    institutionalBadges: [],
    dateLabel: null,
    availabilityLabel: null,
    priceAmount: null,
    priceCurrency: "MXN",
    priceHint: null,
    primaryAction: null,
    secondaryAction: null,
    ...partial,
  };
}

const FAMILIES: FamilyFixture[] = [
  {
    id: "hoteles",
    label: "Hoteles",
    hero: {
      eyebrow: "Dónde dormir",
      title: "Hoteles en el Oriente Maya",
      subtitle: "Casonas coloniales, haciendas y hospedaje boutique (demo visual).",
      mediaUrl: `${GOVERNED}/hotel-cover.jpg`,
    },
    items: [
      card({
        id: "h1",
        entityKind: "hotel",
        name: "Hacienda San Servacio Boutique",
        tagline: "Casona del siglo XVIII a dos calles de la catedral.",
        mediaUrl: `${GOVERNED}/hotel-cover.jpg`,
        mediaAlt: "Patio colonial con alberca estilo cenote",
        highlights: ["Alberca estilo cenote", "Desayuno yucateco"],
        badges: [{ label: "Demo visual", tone: "default" }],
        location: { label: "Centro Histórico", distanceKm: 0.4 },
      }),
      card({
        id: "h2",
        entityKind: "hotel",
        name: "Posada Calzada de los Frailes",
        tagline: "Habitaciones alrededor de un patio de piedra.",
        mediaUrl: `${GOVERNED}/hotel-gallery-1.jpg`,
        mediaAlt: "Habitación colonial con vigas de madera",
        location: { label: "Sisal", distanceKm: 1.1 },
      }),
      // D-05 · caso sin medio gobernado.
      card({
        id: "h3",
        entityKind: "hotel",
        name: "Hospedaje sin portada gobernada",
        tagline: "Caso de prueba para el fallback visual de medios.",
        location: { label: "Valladolid", distanceKm: null },
      }),
    ],
  },
  {
    id: "restaurantes",
    label: "Restaurantes",
    hero: {
      eyebrow: "Dónde comer",
      title: "Cocina del Oriente Maya",
      subtitle: "Fondas, terrazas y cocina de autor yucateca (demo visual).",
      mediaUrl: `${GOVERNED}/restaurant-cover.jpg`,
    },
    items: [
      card({
        id: "r1",
        entityKind: "restaurant",
        name: "Terraza de los Arcos",
        tagline: "Cocina yucateca contemporánea frente a un cenote.",
        mediaUrl: `${GOVERNED}/restaurant-cover.jpg`,
        mediaAlt: "Terraza colonial iluminada con velas",
        priceAmount: 480,
        priceHint: "por persona",
      }),
      card({
        id: "r2",
        entityKind: "restaurant",
        name: "Fonda del Mercado",
        tagline: "Desayunos tradicionales y recados de la región.",
      }),
    ],
  },
  {
    id: "experiencias",
    label: "Experiencias",
    hero: {
      eyebrow: "Qué hacer",
      title: "Experiencias para vivir el destino",
      subtitle: "Cenotes, bicicleta y recorridos guiados (demo visual).",
      mediaUrl: `${GOVERNED}/experience-cover.jpg`,
    },
    items: [
      card({
        id: "e1",
        entityKind: "experience",
        name: "Cenotes escondidos al amanecer",
        tagline: "Recorrido guiado de tres horas en grupo pequeño.",
        mediaUrl: `${GOVERNED}/experience-cover.jpg`,
        mediaAlt: "Cenote abierto de aguas turquesa",
        priceAmount: 950,
        availabilityLabel: "Sale todos los días",
      }),
      card({
        id: "e2",
        entityKind: "experience",
        name: "Valladolid en bicicleta",
        tagline: "Calles coloniales, mercados y barrios históricos.",
        mediaUrl: `${GOVERNED}/experience-gallery-2.jpg`,
        mediaAlt: "Tour en bicicleta por calles coloniales",
      }),
    ],
  },
  {
    id: "eventos",
    label: "Eventos",
    hero: {
      eyebrow: "Agenda",
      title: "Qué pasa esta temporada",
      subtitle: "Fiestas, ferias y encuentros culturales (demo visual).",
      mediaUrl: null,
    },
    items: [
      card({
        id: "v1",
        entityKind: "event",
        name: "Noche de la Calzada",
        tagline: "Música en vivo y talleres artesanales.",
        dateLabel: "Sábado 14 · 19:00 h",
        mediaUrl: `${GOVERNED}/destination-gallery-2.jpg`,
        mediaAlt: "Calle colonial iluminada",
      }),
      card({
        id: "v2",
        entityKind: "event",
        name: "Feria del cacao",
        tagline: "Productores del oriente de Yucatán.",
        dateLabel: "Domingo 22 · 10:00 h",
      }),
    ],
  },
  {
    id: "casas-de-vacaciones",
    label: "Casas de vacaciones",
    hero: {
      eyebrow: "Hospedaje independiente",
      title: "Casas de vacaciones",
      subtitle: "Casas, villas y rentas completas a tu ritmo (demo visual).",
      mediaUrl: `${GOVERNED}/hotel-gallery-2.jpg`,
    },
    items: [
      card({
        id: "c1",
        // D-06 · la familia se representa hoy con la semántica de hospedaje.
        entityKind: "hotel",
        eyebrow: "Casa de vacaciones",
        name: "Casa Buganvilia",
        tagline: "Casa colonial completa con patio y alberca privada.",
        mediaUrl: `${GOVERNED}/hotel-gallery-2.jpg`,
        mediaAlt: "Terraza con vista a la catedral colonial",
        highlights: ["3 recámaras", "Alberca privada", "Cocina equipada"],
        priceAmount: 3200,
        priceHint: "por noche",
      }),
      card({
        id: "c2",
        entityKind: "hotel",
        eyebrow: "Casa de vacaciones",
        name: "Villa Sisal",
        tagline: "Villa con jardín y hamacas, ideal para grupos.",
      }),
    ],
  },
];

function G5ListingReadinessPreview() {
  const [familyId, setFamilyId] = useState<FamilyId>("hoteles");
  const [columns, setColumns] = useState<1 | 2 | 3>(3);
  const family = FAMILIES.find((f) => f.id === familyId) ?? FAMILIES[0];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="border-b border-amber-300/60 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
        Vista previa interna G5-S1 · Listing Readiness — fixtures locales, no indexable, sin
        persistencia. No modifica fichas reales, datos ni el CMS.
      </div>

      <Container className="pt-6">
        <div className="flex flex-wrap items-center gap-2">
          {FAMILIES.map((f) => (
            <Button
              key={f.id}
              type="button"
              size="sm"
              variant={f.id === familyId ? "default" : "outline"}
              className="min-h-11 rounded-pill px-4"
              onClick={() => setFamilyId(f.id)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Layout</span>
          {([1, 2, 3] as const).map((c) => (
            <Button
              key={c}
              type="button"
              size="sm"
              variant={c === columns ? "default" : "outline"}
              className="min-h-11 rounded-pill px-4"
              onClick={() => setColumns(c)}
            >
              {c === 1 ? "Lista" : `${c} columnas`}
            </Button>
          ))}
        </div>
      </Container>

      <div className="mt-6">
        <TourismListingSurface
          hero={{
            eyebrow: family.hero.eyebrow,
            title: family.hero.title,
            subtitle: family.hero.subtitle,
            mediaUrl: family.hero.mediaUrl,
            mediaAlt: family.hero.mediaUrl ? `${family.label} en Valladolid, Yucatán` : null,
          }}
          items={family.items}
          columns={columns}
          destinationSlug="valladolid"
          destinationLabel="Valladolid"
          showAddToTrip={false}
          capabilities={{ showFavorite: false }}
          emptyMessage="Sin entidades de demostración para esta familia."
        />
      </div>
    </div>
  );
}
