/**
 * Preview interna (noindex) de la FICHA CANÓNICA de Evento.
 *
 * Autoridad de render: `EventPremiumSurface`, la misma superficie que usa la
 * ruta canónica `/eventos/{slug}`. La preview no dibuja chrome propio: aporta
 * únicamente un caso DEMO rotulado con la forma real de `PublicEventDetail`.
 */
import { createFileRoute } from "@tanstack/react-router";

import { EventPremiumSurface } from "@/components/surfaces/EventPremiumSurface";
import type { PublicEventDetail } from "@/lib/events/public-reads.functions";

export const Route = createFileRoute("/lovable/g4-event-premium-preview")({
  head: () => ({
    meta: [
      { title: "Noche de Valladolid · Evento Premium" },
      {
        name: "description",
        content: "Vista previa interna de la ficha premium de Evento. No indexable.",
      },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: EventProfilePremiumPreview,
});

const MEDIA = "/api/public/studio-media/governed/v1p1c";

/** Caso DEMO rotulado: nunca se publica ni se lee de la base productiva. */
const DEMO_EVENT: PublicEventDetail = {
  id: "demo-event-noche-de-valladolid",
  slug: "noche-de-valladolid",
  title: "Noche de Valladolid",
  summary:
    "Una velada de trova, patrimonio y sabores locales para vivir la ciudad después del atardecer.",
  starts_at: "2026-09-14T19:00:00-05:00",
  ends_at: "2026-09-14T22:00:00-05:00",
  venue_name: "Plaza principal",
  is_free: true,
  destination_slug: "valladolid",
  destination_name: "Valladolid",
  cover_url: `${MEDIA}/destination-gallery-1.jpg`,
  filter_attributes: {
    event_type: ["cultura_y_tradicion"],
    audience: ["familias"],
    time_of_day: ["noche"],
    venue_type: ["aire_libre"],
    admission_type: ["entrada_libre"],
  },
  latitude: null,
  longitude: null,
  body: [
    "Contenido de demostración para revisión visual interna.",
    "",
    "19:00 · Bienvenida en el kiosco.",
    "19:45 · Trova yucateca.",
    "20:40 · Sabores del Oriente Maya de Yucatán.",
    "21:30 · Cierre bajo las arcadas.",
  ].join("\n"),
  external_url: null,
  destination_name_fallback: undefined,
} as unknown as PublicEventDetail;

function EventProfilePremiumPreview() {
  return <EventPremiumSurface event={DEMO_EVENT} />;
}
