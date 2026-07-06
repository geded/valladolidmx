/**
 * H-03 · U1.2 — Validación visual de `vmx.experience.related-collection` v1.1.0.
 *
 * Ruta interna noindex/nofollow. Cubre los 7 casos exigidos por el
 * Founder para cerrar U1.2:
 *   1. grid
 *   2. list
 *   3. carousel
 *   4. featured
 *   5. estado vacío
 *   6. agrupamiento (multi-grupo con destino + eventos + productos)
 *   7. mobile (contenedor reducido con carousel + touch snap)
 *
 * Founder Directive: Related Collection es una recomendación turística
 * útil — contexto + confianza + relevancia + siguiente acción. Reutiliza
 * la Tourism Card oficial, cero cards paralelas.
 */
import { createFileRoute } from "@tanstack/react-router";
import { ExperienceRelatedCollection } from "@/components/experience-builder/blocks/experience-related-collection/ExperienceRelatedCollection";
import {
  buildExperienceRelatedCollectionPreviewDTO,
  createRelatedItem,
  EXPERIENCE_RELATED_CAPABILITIES_V11_DEFAULTS,
  type ExperienceRelatedCollectionDTO,
  type ExperienceRelatedItem,
  type ExperienceRelatedVariant,
} from "@/lib/experience-builder/blocks/experience-related-collection/contract";

export const Route = createFileRoute("/lovable/experience-related-collection-preview")({
  head: () => ({
    meta: [
      { title: "U1.2 · Experience Related Collection v1.1.0" },
      { name: "robots", content: "noindex,nofollow" },
      {
        name: "description",
        content:
          "Validación visual U1.2 del bloque vmx.experience.related-collection v1.1.0 reutilizando la Tourism Card oficial.",
      },
    ],
  }),
  component: Page,
});

/* ------------------------------------------------------------------ *
 * Fixtures — un DTO rico con 4 items para variantes single-group.
 * ------------------------------------------------------------------ */
function richItems(): ExperienceRelatedItem[] {
  return [
    createRelatedItem({
      id: "u12-hotel",
      kind: "hotel",
      title: "Casona de las Bugambilias",
      subtitle: null,
      description: "Hotel boutique colonial a dos cuadras del Zócalo.",
      href: "#",
      imageUrl: null,
      imageAlt: null,
      meta: [],
      badges: [],
      tags: [],
      priceAmount: 2850,
      priceCurrency: "MXN",
      dateStart: null,
      dateEnd: null,
      destinationSlug: "valladolid",
      categorySlug: "hoteles",
      rationale: "Cercano al centro histórico y con la mejor calificación del destino.",
      sourceHint: "destination",
      score: 0.95,
      priceHint: "por noche",
      rating: { value: 4.8, count: 489 },
      location: { label: "Centro histórico · Valladolid", distanceKm: 0.4 },
      territorialContext: "Oriente Maya · Valladolid",
      highlights: ["Piscina", "Desayuno incluido", "Pet friendly"],
      institutionalBadges: [{ label: "Pueblo Mágico", tone: "primary" }],
      primaryAction: { label: "Ver disponibilidad", href: "#" },
      secondaryAction: { label: "Contactar", href: null },
    }),
    createRelatedItem({
      id: "u12-restaurant",
      kind: "restaurant",
      title: "Cocina Xok Maya",
      subtitle: null,
      description: "Cocina tradicional yucateca reinterpretada por chef local.",
      href: "#",
      imageUrl: null,
      imageAlt: null,
      meta: [],
      badges: [],
      tags: [],
      priceAmount: null,
      priceCurrency: null,
      dateStart: null,
      dateEnd: null,
      destinationSlug: "valladolid",
      categorySlug: "restaurantes",
      rationale: "Recomendado a quienes reservan en Casona de las Bugambilias.",
      sourceHint: "destination",
      score: 0.9,
      priceHint: "$$ · Yucateca",
      rating: { value: 4.6, count: 731 },
      location: { label: "Calle 41 · Valladolid centro", distanceKm: 0.2 },
      territorialContext: "Oriente Maya · Valladolid",
      highlights: ["Terraza", "Mezcalería", "Vegetariano"],
      dateLabel: "Abierto hoy · hasta 23:00",
      availabilityLabel: "Mesa hoy",
      institutionalBadges: [{ label: "Despierta en Valladolid", tone: "warning" }],
      primaryAction: { label: "Reservar mesa", href: "#" },
      secondaryAction: { label: "Ver menú", href: "#" },
    }),
    createRelatedItem({
      id: "u12-experience",
      kind: "experience",
      title: "Temazcal ceremonial maya",
      subtitle: null,
      description: "Ritual guiado por chamán con cantos y plantas sagradas.",
      href: "#",
      imageUrl: null,
      imageAlt: null,
      meta: [],
      badges: [],
      tags: [],
      priceAmount: 950,
      priceCurrency: "MXN",
      dateStart: null,
      dateEnd: null,
      destinationSlug: "valladolid",
      categorySlug: "experiencias",
      rationale: "Complementa tu noche en Valladolid con una experiencia auténtica.",
      sourceHint: "destination",
      score: 0.88,
      priceHint: "por persona",
      businessName: "Kuxtal Ancestral",
      rating: { value: 5.0, count: 88 },
      location: { label: "Comunidad de Xocén", distanceKm: 12 },
      territorialContext: "Oriente Maya · Zona rural",
      highlights: ["Chamán maya", "90 min", "Incluye traslado"],
      dateLabel: "Mar · Jue · Sáb · 18:00",
      institutionalBadges: [{ label: "Auténtico", tone: "success" }],
      primaryAction: { label: "Reservar", href: "#" },
    }),
    createRelatedItem({
      id: "u12-event",
      kind: "event",
      title: "Festival de la Vaquería",
      subtitle: null,
      description: "Fiesta tradicional con jarana, gastronomía y trajes típicos.",
      href: "#",
      imageUrl: null,
      imageAlt: null,
      meta: [],
      badges: [],
      tags: [],
      priceAmount: 0,
      priceCurrency: "MXN",
      dateStart: null,
      dateEnd: null,
      destinationSlug: "valladolid",
      categorySlug: null,
      rationale: "En cartelera durante tu ventana de viaje.",
      sourceHint: "destination",
      score: 0.86,
      priceHint: "Entrada libre",
      businessName: "Ayuntamiento de Valladolid",
      location: { label: "Parque Francisco Cantón", distanceKm: 0.1 },
      territorialContext: "Oriente Maya · Valladolid",
      highlights: ["Jarana yucateca", "Familiar"],
      dateLabel: "Sáb 12 jul · 19:00",
      institutionalBadges: [{ label: "Gratis", tone: "success" }],
      primaryAction: { label: "Agregar al viaje", href: "#" },
      secondaryAction: { label: "Cómo llegar", href: "#" },
    }),
  ];
}

function singleGroupDTO(
  variant: ExperienceRelatedVariant,
  overrides: Partial<ExperienceRelatedCollectionDTO> = {},
): ExperienceRelatedCollectionDTO {
  const base = buildExperienceRelatedCollectionPreviewDTO();
  return {
    ...base,
    variant,
    columns: variant === "grid" ? 3 : base.columns,
    heading: "Sigue descubriendo el Oriente Maya",
    subheading:
      "Recomendaciones útiles para decidir qué explorar después de tu reserva.",
    groups: [
      {
        id: "sigue-descubriendo",
        entityKind: "mixed",
        heading: null,
        subheading: null,
        emptyMessage: null,
        variant: null,
        items: richItems(),
        seeAllHref: "/oriente-maya/valladolid",
        seeAllLabel: "Ver todo el destino",
      },
    ],
    ...overrides,
  };
}

function emptyDTO(): ExperienceRelatedCollectionDTO {
  const base = buildExperienceRelatedCollectionPreviewDTO();
  return {
    ...base,
    variant: "grid",
    heading: "Sigue descubriendo",
    subheading:
      "Cuando publiques nuevas empresas o eventos aquí, aparecerán como recomendaciones vivas.",
    emptyMessage:
      "Aún no tenemos recomendaciones para este destino. Vuelve pronto — el Oriente Maya se enriquece cada semana.",
    groups: [],
  };
}

function groupedDTO(): ExperienceRelatedCollectionDTO {
  const base = buildExperienceRelatedCollectionPreviewDTO();
  const [hotel, restaurant, experience, event] = richItems();
  return {
    ...base,
    variant: "grid",
    columns: 2,
    heading: "Sigue descubriendo el Oriente Maya",
    subheading:
      "Multi-grupo por tipo de entidad — un solo bloque, orquestando destinos, gastronomía, experiencias y eventos.",
    groups: [
      {
        id: "hospedaje",
        entityKind: "hotel",
        heading: "Dónde quedarte",
        subheading: "Hospedaje verificado cerca del centro histórico.",
        emptyMessage: null,
        variant: null,
        items: [hotel],
        seeAllHref: "/oriente-maya/valladolid/hoteles",
        seeAllLabel: "Ver hoteles",
      },
      {
        id: "gastronomia",
        entityKind: "restaurant",
        heading: "Dónde comer",
        subheading: "Cocina yucateca reinterpretada por chefs locales.",
        emptyMessage: null,
        variant: null,
        items: [restaurant],
        seeAllHref: "/oriente-maya/valladolid/restaurantes",
        seeAllLabel: "Ver restaurantes",
      },
      {
        id: "experiencias",
        entityKind: "experience",
        heading: "Qué vivir",
        subheading: "Experiencias auténticas guiadas por la comunidad.",
        emptyMessage: null,
        variant: "carousel",
        items: [experience, hotel],
        seeAllHref: "/oriente-maya/valladolid/experiencias",
        seeAllLabel: "Ver experiencias",
      },
      {
        id: "eventos",
        entityKind: "event",
        heading: "Qué está pasando",
        subheading: "Agenda cultural del destino durante tu viaje.",
        emptyMessage: "Aún no hay eventos publicados para las fechas de tu viaje.",
        variant: "list",
        items: [event],
        seeAllHref: "/eventos",
        seeAllLabel: "Ver agenda",
      },
    ],
    capabilities: {
      ...base.capabilities,
      ...EXPERIENCE_RELATED_CAPABILITIES_V11_DEFAULTS,
    },
  };
}

function Page() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-14 px-4 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          H-03 · U1.2 · Related Collection v1.1.0
        </p>
        <h1 className="text-3xl font-semibold">Sigue descubriendo el Oriente Maya</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Validación visual U1.2. Related Collection reutiliza la
          Tourism Card oficial — cero cards paralelas — y responde
          arriba de la línea a las cinco preguntas Founder Experience
          Rule. Cada card aporta contexto, confianza, relevancia y
          siguiente acción.
        </p>
      </header>

      <Case
        n={1}
        title="Grid · un solo grupo"
        note="Grid responsivo (3 columnas en desktop, 2 en tablet, 1 en mobile). Cada card responde las 5 preguntas above-the-fold."
      >
        <ExperienceRelatedCollection dto={singleGroupDTO("grid")} />
      </Case>

      <Case
        n={2}
        title="List · lectura densa"
        note="Fila detallada — ideal para páginas de destino en móvil o para colecciones largas donde el orden importa."
      >
        <ExperienceRelatedCollection dto={singleGroupDTO("list")} />
      </Case>

      <Case
        n={3}
        title="Carousel · desplazamiento horizontal con snap"
        note="Snap táctil. Empujar → siguiente card. Preserva la identidad Oriente Maya sin sensación SaaS."
      >
        <ExperienceRelatedCollection dto={singleGroupDTO("carousel")} />
      </Case>

      <Case
        n={4}
        title="Featured · destacado + secundarios"
        note="Uno protagonista + hasta tres filas de refuerzo. Útil para hero de recomendación turística."
      >
        <ExperienceRelatedCollection dto={singleGroupDTO("featured")} />
      </Case>

      <Case
        n={5}
        title="Estado vacío · educado"
        note="Sin datos, sin frustración. El bloque comunica que la recomendación llegará más adelante."
      >
        <ExperienceRelatedCollection dto={emptyDTO()} />
      </Case>

      <Case
        n={6}
        title="Agrupamiento · multi-grupo (hospedaje + gastronomía + experiencias + eventos)"
        note="Un solo bloque orquestando 4 sub-colecciones con variantes por grupo. Founder: no es un carrusel decorativo, es un plan de descubrimiento."
      >
        <ExperienceRelatedCollection dto={groupedDTO()} />
      </Case>

      <Case
        n={7}
        title="Mobile · contenedor 390 px"
        note="Simula viewport móvil (Founder: mobile first). Combina carousel y layout denso; touch snap operativo."
      >
        <div className="mx-auto w-full max-w-[390px] rounded-3xl border border-border bg-background/60 p-4 shadow-soft">
          <ExperienceRelatedCollection
            dto={singleGroupDTO("carousel", {
              heading: "Sigue descubriendo",
              subheading: "Recomendaciones útiles para tu día en Valladolid.",
            })}
          />
          <div className="mt-6" />
          <ExperienceRelatedCollection
            dto={singleGroupDTO("list", {
              heading: "Cerca de ti",
              subheading: "Ordenado por proximidad.",
              density: "compact",
            })}
          />
        </div>
      </Case>
    </main>
  );
}

function Case({
  n,
  title,
  note,
  children,
}: {
  n: number;
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 border-t border-border pt-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
          Caso {n}
        </p>
        <h2 className="mt-1 text-xl font-semibold">{title}</h2>
        {note ? (
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{note}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}