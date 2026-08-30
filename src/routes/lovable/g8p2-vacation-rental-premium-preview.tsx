/**
 * G8-P2 · Vista previa interna de la plantilla premium de CASA DE
 * VACACIONES (pendiente de aceptación visual del Founder).
 *
 * Reutiliza las primitivas premium y la composición general de Hotel,
 * pero declara la semántica propia de la familia: propiedad completa,
 * capacidad, dormitorios, camas, baños, amenidades, cocina, alberca,
 * estancia mínima, check-in/check-out, reglas, disponibilidad, precio
 * por noche y ubicación aproximada por privacidad.
 * JSON-LD `VacationRental`.
 *
 * Vista INTERNA, noindex, sin persistencia y sin datos reales nuevos.
 */
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BedDouble, Bath, Users, CalendarClock, Waves, ChefHat, MapPin } from "lucide-react";
import { Container } from "@/components/layout/Container";
import {
  PremiumHero,
  PremiumSection,
  PremiumTerritorialBreadcrumb,
  PremiumPresentationControl,
} from "@/components/premium";
import type { PremiumPresentation } from "@/lib/omxds/presentation/presentation";
import {
  createVacationRentalSemantics,
  VACATION_RENTAL_JSON_LD_TYPE,
} from "@/lib/omxds/surfaces/vacation-rental-surface.adapter";

export const Route = createFileRoute("/lovable/g8p2-vacation-rental-premium-preview")({
  head: () => ({
    meta: [
      { title: "G8-P2 · Vista previa plantilla Premium de Casa de vacaciones (interna)" },
      {
        name: "description",
        content:
          "Vista previa interna de la plantilla premium de casa de vacaciones de Valladolid.mx. No indexable.",
      },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: G8P2VacationRentalPremiumPreview,
});

const GOVERNED = "/api/public/studio-media/governed/v1p1c";

const RENTAL = {
  name: "Casa de patio colonial",
  eyebrow: "Casa de vacaciones · propiedad completa (demo interna)",
  claim:
    "Propiedad completa demostrativa en la traza colonial de Valladolid: patio de piedra, cocina equipada y alberca privada.",
} as const;

const SEMANTICS = createVacationRentalSemantics({
  capacity: 8,
  bedrooms: 3,
  beds: 5,
  bathrooms: 2,
  amenities: ["Wi-Fi", "Aire acondicionado", "Lavadora", "Estacionamiento", "Patio de piedra"],
  kitchen: true,
  pool: true,
  minimumStayNights: 2,
  checkIn: "15:00",
  checkOut: "11:00",
  houseRules: ["No se permiten fiestas", "Mascotas bajo solicitud", "Silencio después de 22:00"],
  availabilityNote: "Disponibilidad bajo solicitud (demo)",
  nightlyPrice: 3200,
  approximateLocation: true,
});

function G8P2VacationRentalPremiumPreview() {
  const [presentation, setPresentation] = useState<PremiumPresentation>("editorial");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": VACATION_RENTAL_JSON_LD_TYPE,
    name: RENTAL.name,
    description: RENTAL.claim,
    occupancy: { "@type": "QuantitativeValue", value: SEMANTICS.capacity },
    numberOfBedrooms: SEMANTICS.bedrooms,
    numberOfBathroomsTotal: SEMANTICS.bathrooms,
    amenityFeature: SEMANTICS.amenities.map((name) => ({
      "@type": "LocationFeatureSpecification",
      name,
      value: true,
    })),
  };

  return (
    <main className="min-h-svh bg-background">
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>

      <PremiumHero
        vm={{
          presentation,
          crumbs: [
            { label: "Oriente Maya" },
            { label: "Valladolid" },
            { label: "Casas de vacaciones" },
            { label: RENTAL.name },
          ],
          eyebrow: RENTAL.eyebrow,
          title: RENTAL.name,
          description: RENTAL.claim,
          media: {
            url: `${GOVERNED}/hotel-cover.jpg`,
            alt: "Patio central con piscina estilo cenote y arcos de piedra en una casa colonial de Valladolid, Yucatán",
          },
          primaryAction: { label: "Solicitar reserva", href: "#solicitud" },
          secondaryAction: { label: "Ver la propiedad", href: "#propiedad" },
        }}
      />

      <Container className="py-6">
        <PremiumTerritorialBreadcrumb
          crumbs={[{ label: "Oriente Maya" }, { label: "Valladolid" }, { label: RENTAL.name }]}
        />
        <div className="mt-4">
          <PremiumPresentationControl value={presentation} onChange={setPresentation} />
        </div>
        <p className="mt-4 rounded-xl border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          Preview interna pendiente de aceptación visual del Founder. Este preset no se asigna
          automáticamente a entidades públicas.
        </p>
      </Container>

      <PremiumSection
        vm={{
          id: "propiedad",
          eyebrow: "La propiedad",
          title: "Casa completa para tu grupo",
          description:
            "La familia Casa de vacaciones se diferencia de Hotel: se renta la propiedad entera, no una habitación.",
        }}
      >
        <dl className="grid gap-4 sm:grid-cols-2">
          {[
            {
              icon: Users,
              label: "Capacidad",
              value: SEMANTICS.capacity ? `${SEMANTICS.capacity} huéspedes` : null,
            },
            {
              icon: BedDouble,
              label: "Dormitorios / camas",
              value:
                SEMANTICS.bedrooms && SEMANTICS.beds
                  ? `${SEMANTICS.bedrooms} dormitorios · ${SEMANTICS.beds} camas`
                  : null,
            },
            {
              icon: Bath,
              label: "Baños",
              value: SEMANTICS.bathrooms ? `${SEMANTICS.bathrooms} baños` : null,
            },
            {
              icon: CalendarClock,
              label: "Estancia mínima · check-in / out",
              value:
                SEMANTICS.minimumStayNights && SEMANTICS.checkIn && SEMANTICS.checkOut
                  ? `${SEMANTICS.minimumStayNights} noches · ${SEMANTICS.checkIn} / ${SEMANTICS.checkOut}`
                  : null,
            },
            { icon: ChefHat, label: "Cocina", value: SEMANTICS.kitchen ? "Equipada" : null },
            { icon: Waves, label: "Alberca", value: SEMANTICS.pool ? "Privada" : null },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-4">
              <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <Icon className="size-4" aria-hidden />
                {label}
              </dt>
              <dd className="mt-2 text-sm leading-6">{value ?? "Sin acreditar"}</dd>
            </div>
          ))}
        </dl>
      </PremiumSection>

      <PremiumSection
        vm={{ id: "amenidades", eyebrow: "Amenidades", title: "Qué incluye la casa" }}
      >
        <ul className="flex flex-wrap gap-2">
          {SEMANTICS.amenities.map((item) => (
            <li key={item} className="rounded-pill border border-border bg-card px-3 py-2 text-sm">
              {item}
            </li>
          ))}
        </ul>
      </PremiumSection>

      <PremiumSection
        vm={{ id: "reglas", eyebrow: "Reglas", title: "Convivencia y disponibilidad" }}
      >
        <ul className="space-y-2 rounded-2xl border border-border bg-card p-4 text-sm">
          {SEMANTICS.houseRules.map((rule) => (
            <li key={rule}>· {rule}</li>
          ))}
          <li className="pt-2 text-muted-foreground">{SEMANTICS.availabilityNote}</li>
        </ul>
      </PremiumSection>

      <PremiumSection
        vm={{ id: "ubicacion", eyebrow: "Ubicación", title: "Zona aproximada" }}
        compact
      >
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="size-4" aria-hidden />
          {SEMANTICS.approximateLocation
            ? "Se muestra la zona aproximada por privacidad; la dirección exacta se comparte tras confirmar la reserva."
            : "Ubicación exacta acreditada."}
        </p>
      </PremiumSection>

      <PremiumSection
        vm={{ id: "solicitud", eyebrow: "Reserva", title: "Solicita esta casa" }}
        compact
      >
        <p className="text-sm">
          {SEMANTICS.nightlyPrice
            ? `Desde $${SEMANTICS.nightlyPrice.toLocaleString("es-MX")} MXN por noche (demo)`
            : "Precio bajo solicitud"}
        </p>
        <a
          href="#solicitud"
          className="mt-3 inline-flex min-h-11 items-center rounded-pill bg-primary px-6 text-sm font-semibold text-primary-foreground"
        >
          Solicitar reserva
        </a>
      </PremiumSection>
    </main>
  );
}
