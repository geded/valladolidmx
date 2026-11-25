/**
 * Títulos legibles de los eventos del Centro de Notificaciones (UNC).
 *
 * Fuente única compartida por la campana in-app y el despachador de correo,
 * para que el aviso se lea igual en todos los canales. No crea estados ni
 * canales nuevos: sólo traduce `event_type` a lenguaje claro.
 */
export const UNC_EVENT_TITLES: Record<string, string> = {
  "media.review_requested": "Imagen enviada a aprobación",
  "Concierge.Case.Created": "Nuevo expediente de viaje",
  "Concierge.Message.Received": "Mensaje de un viajero",
  "Concierge.Booking.Created": "Nueva reservación",
  "Concierge.Booking.Paid": "Reservación pagada",
  "Concierge.Booking.Cancelled": "Reservación cancelada",
  "Concierge.Proposal.Sent": "Propuesta enviada",
  "Concierge.Proposal.Viewed": "Propuesta vista por el viajero",
  "Concierge.Proposal.Accepted": "Propuesta aceptada",
  "Concierge.Quote.Expired": "Cotización vencida",
  "Traveler.SignedUp": "Nuevo viajero registrado",
  "CRM.Prospect.Created": "Nuevo prospecto de Alux",
  "CRM.Prospect.Returned": "Un prospecto regresó con Alux",
  "Restaurant.Booking.Created": "Nueva reservación de mesa",
  "Restaurant.Booking.Updated": "Cambio en una reservación de mesa",
  "taxi.requested": "Nueva solicitud de Taxi Alux",
  "taxi.accepted": "Taxi Alux asignado",
  "taxi.arrived": "Tu Taxi Alux llegó",
  "taxi.in_progress": "Viaje de Taxi Alux en curso",
  "taxi.completed": "Viaje de Taxi Alux realizado",
  "taxi.cancelled": "Viaje de Taxi Alux cancelado",
};

export function uncEventTitle(eventType: string): string {
  return UNC_EVENT_TITLES[eventType] ?? "Aviso de la plataforma";
}

/**
 * Categorías de lectura del Centro de avisos.
 * Sólo agrupan visualmente los mismos eventos del Delivery Ledger:
 * no crean canales, estados ni contratos nuevos.
 */
export type UncGroup = "aprobaciones" | "viajeros" | "reservas" | "otros";

export const UNC_GROUP_LABELS: Record<UncGroup, string> = {
  aprobaciones: "Aprobaciones",
  viajeros: "Viajeros",
  reservas: "Reservas",
  otros: "Otros",
};

export function uncEventGroup(eventType: string): UncGroup {
  if (eventType.startsWith("media.")) return "aprobaciones";
  if (eventType.startsWith("Concierge.Booking") || eventType.startsWith("Restaurant.Booking") || eventType.startsWith("taxi.")) return "reservas";
  if (eventType.startsWith("Traveler.")) return "viajeros";
  if (eventType.startsWith("CRM.")) return "viajeros";
  if (eventType.startsWith("Concierge.")) return "viajeros";
  return "otros";
}
