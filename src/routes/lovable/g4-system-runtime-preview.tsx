/**
 * G4-SYSTEM-01 · Vista previa integral del runtime visual premium.
 *
 * Vista INTERNA, no indexable y sin persistencia. Renderiza TODAS las
 * familias (home, territorio, destino, hotel, restaurante, experiencia,
 * evento, casa de vacaciones y ruta) con las MISMAS primitivas
 * compartidas de `src/components/premium`, para revisar el conjunto.
 *
 * Reglas aplicadas:
 *  - Editorial y Cinematográfica son variantes de PRESENTACIÓN sobre los
 *    mismos view-models; no hay dos modelos de datos.
 *  - El selector de presentación es interno: sólo se muestra si el actor
 *    simulado está autorizado. El visitante recibe la variante publicada.
 *  - Sólo medios gobernados estables (`/api/public/studio-media/governed/v1p1c/*`).
 *    Sin URLs firmadas, sin assets nuevos.
 *  - Distintivo Pueblo Mágico exclusivamente vía
 *    `resolvePuebloMagicoBadge`: sin asset acreditado configurado se
 *    presenta como texto, nunca imitando el logotipo oficial.
 *  - Datos DEMO VISUAL locales; no se leen ni mutan entidades reales.
 */
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/button";
import {
  PremiumBreadcrumb,
  PremiumCard,
  PremiumGallery,
  PremiumHero,
  PremiumPresentationSelector,
  PremiumSection,
} from "@/components/premium";
import {
  buildTerritorialCrumbs,
  DEFAULT_PREMIUM_GALLERY_LAYOUT,
  PREMIUM_GALLERY_LAYOUTS,
  PREMIUM_PRESENTATION_ACTORS,
  resolvePremiumPresentation,
  resolvePuebloMagicoBadge,
  TERRITORY_LABEL,
  type PremiumGalleryLayout,
  type PremiumPresentation,
  type PremiumPresentationActor,
} from "@/lib/omxds/presentation/premium-presentation";
import type { PremiumCardVM, PremiumHeroVM } from "@/lib/omxds/presentation/premium-view-models";

export const Route = createFileRoute("/lovable/g4-system-runtime-preview")({
  head: () => ({
    meta: [
      { title: "G4-SYSTEM-01 · Runtime visual premium (interno)" },
      {
        name: "description",
        content:
          "Vista previa interna del runtime visual premium compartido de Valladolid.mx. No indexable.",
      },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: G4SystemRuntimePreview,
});

/* ------------------------------------------------------------------ *
 * Medios gobernados (ruta pública estable, nunca firmada).
 * ------------------------------------------------------------------ */
const GOVERNED = "/api/public/studio-media/governed/v1p1c";

const MEDIA = {
  centro: {
    url: `${GOVERNED}/destination-cover.jpg`,
    alt: "Centro histórico de Valladolid con arquitectura colonial bajo luz cálida",
  },
  plaza: {
    url: `${GOVERNED}/destination-gallery-1.jpg`,
    alt: "Plaza principal de Valladolid con kiosco, palmeras y arcadas coloniales",
  },
  calle: {
    url: `${GOVERNED}/destination-gallery-2.jpg`,
    alt: "Calle colonial de Valladolid con fachadas pastel y puertas de madera",
  },
  hotel: {
    url: `${GOVERNED}/hotel-cover.jpg`,
    alt: "Patio de hotel boutique con piscina y arcos de piedra caliza",
  },
  restaurante: {
    url: `${GOVERNED}/restaurant-cover.jpg`,
    alt: "Terraza de restaurante colonial con arcos de piedra y mesas iluminadas",
  },
  cenote: {
    url: `${GOVERNED}/experience-cover.jpg`,
    alt: "Cenote de aguas turquesa dentro de una caverna de piedra caliza",
  },
} as const;

const GALLERY_ITEMS = [MEDIA.centro, MEDIA.plaza, MEDIA.calle, MEDIA.hotel, MEDIA.cenote];

/* ------------------------------------------------------------------ *
 * View-models DEMO VISUAL (no son datos reales ni acreditados).
 * ------------------------------------------------------------------ */
const HERO_BY_FAMILY: Record<string, PremiumHeroVM> = {
  home: {
    family: "home",
    eyebrow: TERRITORY_LABEL,
    title: "Una revista territorial que se convierte en tu itinerario",
    subtitle:
      "Descubre el Oriente Maya de Yucatán y arma tu viaje con Alux, paso a paso y a tu ritmo.",
    cover: MEDIA.centro,
    facts: [
      { label: "Destinos", value: "Demo visual" },
      { label: "Rutas", value: "Demo visual" },
    ],
  },
  destination: {
    family: "destination",
    eyebrow: "Destino",
    title: "Valladolid",
    subtitle:
      "Capital turística del Oriente Maya de Yucatán: centro colonial, cenotes y cocina yucateca.",
    cover: MEDIA.plaza,
    badges: [
      { label: "Capital turística", tone: "primary" },
      ...(resolvePuebloMagicoBadge("valladolid")
        ? [
            {
              label: resolvePuebloMagicoBadge("valladolid")!.label,
              assetUrl: resolvePuebloMagicoBadge("valladolid")!.assetUrl,
              tone: "institutional" as const,
            },
          ]
        : []),
    ],
    facts: [
      { label: "Región", value: TERRITORY_LABEL },
      { label: "Ubicación", value: "Mapa oficial" },
    ],
  },
  hotel: {
    family: "hotel",
    eyebrow: "Hospedaje · Demo visual",
    title: "Hacienda San Servacio",
    subtitle: "Hotel boutique en casona colonial, a pasos del centro histórico.",
    cover: MEDIA.hotel,
    facts: [
      { label: "Tipo", value: "Boutique" },
      { label: "Precio", value: "Sin acreditar" },
    ],
  },
  restaurant: {
    family: "restaurant",
    eyebrow: "Gastronomía · Demo visual",
    title: "Cocina de Zací",
    subtitle: "Cocina yucateca de raíz maya en un patio de piedra caliza.",
    cover: MEDIA.restaurante,
    facts: [
      { label: "Cocina", value: "Yucateca" },
      { label: "Horario", value: "Sin acreditar" },
    ],
  },
  experience: {
    family: "experience",
    eyebrow: "Experiencia · Demo visual",
    title: "Inframundo Maya",
    subtitle: "Recorrido guiado por cenotes y relatos del inframundo maya.",
    cover: MEDIA.cenote,
    facts: [
      { label: "Duración", value: "Media jornada" },
      { label: "Cupo", value: "Sin acreditar" },
    ],
  },
  event: {
    family: "event",
    eyebrow: "Evento · Demo visual",
    title: "Noche de Valladolid",
    subtitle: "Programa cultural en el centro histórico, con música y cocina local.",
    cover: MEDIA.calle,
    facts: [
      { label: "Estado", value: "Programado (demo)" },
      { label: "Sede", value: "Centro histórico" },
    ],
  },
  "vacation-home": {
    family: "vacation-home",
    eyebrow: "Casa de vacaciones · Demo visual",
    title: "Casa Patio Sisal",
    subtitle: "Casa completa con patio y alberca, contrato de hospedaje compartido.",
    cover: MEDIA.hotel,
    facts: [
      { label: "Contrato", value: "business/hosting" },
      { label: "Capacidad", value: "Sin acreditar" },
    ],
  },
  route: {
    family: "route",
    eyebrow: "Ruta · Demo visual",
    title: "Pueblos Mágicos del Oriente Maya",
    subtitle: "Valladolid, Izamal y Espita en una secuencia sugerida por Alux.",
    cover: MEDIA.centro,
    facts: [
      { label: "Paradas", value: "3" },
      { label: "Duración", value: "2 días (demo)" },
    ],
  },
};

const PUEBLOS = ["valladolid", "izamal", "espita"] as const;
const PUEBLO_LABELS: Record<(typeof PUEBLOS)[number], string> = {
  valladolid: "Valladolid",
  izamal: "Izamal",
  espita: "Espita",
};

const CARDS: PremiumCardVM[] = [
  {
    id: "hotel",
    eyebrow: "Hospedaje",
    title: "Hacienda San Servacio",
    tagline: "Casona colonial restaurada con patio y alberca.",
    media: MEDIA.hotel,
    meta: "Demo visual",
  },
  {
    id: "restaurant",
    eyebrow: "Gastronomía",
    title: "Cocina de Zací",
    tagline: "Cocina yucateca de raíz maya bajo arcos de piedra.",
    media: MEDIA.restaurante,
    meta: "Demo visual",
  },
  {
    id: "experience",
    eyebrow: "Experiencia",
    title: "Inframundo Maya",
    tagline: "Cenotes, relatos y guía local certificada por el operador.",
    media: MEDIA.cenote,
    meta: "Demo visual",
  },
  {
    id: "event",
    eyebrow: "Evento",
    title: "Noche de Valladolid",
    tagline: "Programa cultural en el centro histórico.",
    media: MEDIA.calle,
    meta: "Demo visual",
  },
];

/* ------------------------------------------------------------------ *
 * Preview
 * ------------------------------------------------------------------ */
function G4SystemRuntimePreview() {
  const [actor, setActor] = useState<PremiumPresentationActor>("admin");
  const [requested, setRequested] = useState<PremiumPresentation>("editorial");
  const [layout, setLayout] = useState<PremiumGalleryLayout>(DEFAULT_PREMIUM_GALLERY_LAYOUT);

  const resolution = useMemo(
    () => resolvePremiumPresentation({ published: "editorial", requested, actor }),
    [requested, actor],
  );
  const presentation = resolution.presentation;

  const crumbs = buildTerritorialCrumbs({ slug: "valladolid", label: "Valladolid" });

  return (
    <main className="bg-background pb-16">
      <Container className="space-y-10 py-6 sm:py-10">
        <header className="space-y-4">
          <PremiumBreadcrumb crumbs={crumbs} />
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary">
              Interno · No indexable
            </p>
            <h1 className="mt-1 font-serif text-xl font-semibold text-foreground sm:text-2xl">
              G4-SYSTEM-01 · Runtime visual premium compartido
            </h1>
            <p className="mt-2 max-w-prose text-sm text-muted-foreground">
              Todas las familias renderizadas con las mismas primitivas. Editorial y Cinematográfica
              son variantes de presentación sobre los mismos view-models.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                Actor simulado
                <select
                  value={actor}
                  onChange={(event) => setActor(event.target.value as PremiumPresentationActor)}
                  className="rounded-pill border border-border bg-background px-3 py-1.5 text-xs text-foreground"
                >
                  {PREMIUM_PRESENTATION_ACTORS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <PremiumPresentationSelector
                actor={actor}
                value={presentation}
                onChange={setRequested}
              />

              <div
                role="group"
                aria-label="Galería"
                className="inline-flex items-center gap-1 rounded-pill bg-muted p-1"
              >
                {PREMIUM_GALLERY_LAYOUTS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setLayout(option)}
                    aria-pressed={layout === option}
                    className={
                      layout === option
                        ? "rounded-pill bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-soft"
                        : "rounded-pill px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                    }
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              Presentación efectiva: <strong>{presentation}</strong> · origen{" "}
              <strong>{resolution.source}</strong> · selector{" "}
              <strong>{resolution.selectorAvailable ? "disponible" : "oculto"}</strong>. El
              visitante nunca ve el selector.
            </p>
          </div>
        </header>

        {Object.entries(HERO_BY_FAMILY).map(([family, hero]) => (
          <PremiumSection
            key={family}
            vm={{ id: `familia-${family}`, eyebrow: "Familia", title: hero.title }}
          >
            <PremiumHero
              vm={{
                ...hero,
                actions: (
                  <Button size="sm" variant="secondary" type="button">
                    Agregar al Travel Plan (demo)
                  </Button>
                ),
              }}
              presentation={presentation}
            />
          </PremiumSection>
        ))}

        <PremiumSection
          vm={{
            id: "pueblos-magicos",
            eyebrow: TERRITORY_LABEL,
            title: "Pueblos Mágicos del Oriente Maya",
            description:
              "Distintivo textual mientras no exista asset oficial acreditado y configurado.",
          }}
        >
          <ul className="grid gap-3 sm:grid-cols-3">
            {PUEBLOS.map((slug) => {
              const badge = resolvePuebloMagicoBadge(slug);
              return (
                <li key={slug}>
                  <PremiumCard
                    presentation={presentation}
                    vm={{
                      id: slug,
                      title: PUEBLO_LABELS[slug],
                      eyebrow: TERRITORY_LABEL,
                      media: MEDIA.plaza,
                      badges: badge
                        ? [
                            {
                              label: badge.label,
                              assetUrl: badge.assetUrl,
                              tone: "institutional",
                            },
                          ]
                        : [],
                      meta: "Demo visual",
                    }}
                  />
                </li>
              );
            })}
          </ul>
        </PremiumSection>

        <PremiumSection
          vm={{
            eyebrow: "Directorio",
            title: "Listados con la tarjeta compartida",
            description: "Misma tarjeta, dos presentaciones, ningún modelo de datos nuevo.",
          }}
        >
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CARDS.map((card) => (
              <li key={card.id}>
                <PremiumCard vm={card} presentation={presentation} />
              </li>
            ))}
          </ul>
        </PremiumSection>

        <PremiumSection
          vm={{
            eyebrow: "Galería",
            title: "Galería premium compartida",
            description: "Mosaico, carrusel, cuadrícula y tira como eje independiente.",
          }}
        >
          <PremiumGallery vm={{ items: GALLERY_ITEMS, layout }} />
        </PremiumSection>
      </Container>
    </main>
  );
}
