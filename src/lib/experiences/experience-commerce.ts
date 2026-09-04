/**
 * Experiencias · Capacidad comercial real (capa PURA).
 *
 * Regla vinculante del encargo: separación estricta entre
 *  - "Agregar a Mi Viaje" (siempre disponible cuando la entidad es
 *    elegible para el expediente del viajero), y
 *  - "Reservar" (SÓLO cuando la experiencia tiene capacidad comercial
 *    real acreditada: `conversion_mode = reservar_en_linea` y
 *    `accepts_online_payment = true`).
 *
 * Prohibido el checkout simulado: si no hay capacidad real, NO se
 * renderiza ningún botón de reserva ni de pago. En su lugar se expone la
 * vía de contacto declarada por la empresa (cotización, WhatsApp,
 * teléfono o sitio externo) o simplemente información.
 *
 * Sin red, sin React, sin flags. Testeable de forma aislada.
 */

export type ExperienceCommerceCapability =
  | "book_online"
  | "request_quote"
  | "contact_whatsapp"
  | "contact_phone"
  | "external_site"
  | "information_only";

export interface ExperienceCommerceContact {
  readonly type: string | null;
  readonly value: string | null;
}

export interface ExperienceCommerceInput {
  readonly conversionMode: string | null | undefined;
  readonly acceptsOnlinePayment: boolean | null | undefined;
  readonly requiresAvailability?: boolean | null;
  readonly priceAmount?: number | null;
  readonly priceCurrency?: string | null;
  readonly primaryActionLabel?: string | null;
  readonly secondaryActionLabel?: string | null;
  readonly contact?: ExperienceCommerceContact | null;
  readonly externalUrl?: string | null;
}

export interface ExperienceCommerceDecision {
  readonly capability: ExperienceCommerceCapability;
  /** Único caso en el que puede existir un CTA de reserva/pago. */
  readonly canBookOnline: boolean;
  readonly bookLabel: string | null;
  /** Acción de contacto real (nunca simula compra). */
  readonly contactLabel: string | null;
  readonly contactHref: string | null;
  /** Precio sólo cuando existe importe acreditado. */
  readonly priceLabel: string | null;
  /** "Agregar a Mi Viaje" nunca depende de la capacidad comercial. */
  readonly showAddToTrip: true;
  /** Explainable by default. */
  readonly rationale: string;
}

function digitsOnly(value: string): string {
  return value.replace(/[^\d+]/g, "");
}

function formatPrice(amount: number | null | undefined, currency: string | null | undefined) {
  if (amount == null || Number.isNaN(Number(amount))) return null;
  const cur = (currency || "MXN").toUpperCase();
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 0,
    }).format(Number(amount));
  } catch {
    return `${Number(amount)} ${cur}`;
  }
}

export function resolveExperienceCommerce(
  input: ExperienceCommerceInput,
): ExperienceCommerceDecision {
  const mode = (input.conversionMode || "informacion").trim();
  const priceLabel = formatPrice(input.priceAmount, input.priceCurrency);
  const base = {
    priceLabel,
    showAddToTrip: true as const,
  };

  if (mode === "reservar_en_linea" && input.acceptsOnlinePayment === true) {
    return {
      ...base,
      capability: "book_online",
      canBookOnline: true,
      bookLabel: input.primaryActionLabel || "Reservar en línea",
      contactLabel: null,
      contactHref: null,
      rationale:
        "La empresa declaró reserva en línea y pago en línea habilitado; el CTA de reserva usa la capacidad comercial real.",
    };
  }

  const contactType = (input.contact?.type || "").toLowerCase();
  const contactValue = input.contact?.value || null;

  if (mode === "solicitar_cotizacion") {
    return {
      ...base,
      capability: "request_quote",
      canBookOnline: false,
      bookLabel: null,
      contactLabel: input.primaryActionLabel || "Solicitar cotización",
      contactHref:
        contactType === "email" && contactValue
          ? `mailto:${contactValue}`
          : contactType === "whatsapp" && contactValue
            ? `https://wa.me/${digitsOnly(contactValue)}`
            : null,
      rationale:
        "Sin pago en línea acreditado: la experiencia opera por cotización, nunca por checkout simulado.",
    };
  }

  if (mode === "whatsapp" || (!input.acceptsOnlinePayment && contactType === "whatsapp")) {
    return {
      ...base,
      capability: "contact_whatsapp",
      canBookOnline: false,
      bookLabel: null,
      contactLabel: input.primaryActionLabel || "Consultar disponibilidad por WhatsApp",
      contactHref: contactValue ? `https://wa.me/${digitsOnly(contactValue)}` : null,
      rationale: "Capacidad comercial real: atención por WhatsApp del operador.",
    };
  }

  if (mode === "telefono" || contactType === "phone") {
    return {
      ...base,
      capability: "contact_phone",
      canBookOnline: false,
      bookLabel: null,
      contactLabel: input.primaryActionLabel || "Llamar al operador",
      contactHref: contactValue ? `tel:${digitsOnly(contactValue)}` : null,
      rationale: "Capacidad comercial real: reservación telefónica con el operador.",
    };
  }

  if (mode === "sitio_externo" && input.externalUrl) {
    return {
      ...base,
      capability: "external_site",
      canBookOnline: false,
      bookLabel: null,
      contactLabel: input.primaryActionLabel || "Ver disponibilidad en el sitio del operador",
      contactHref: input.externalUrl,
      rationale: "El operador gestiona la reserva en su propio sitio; la plataforma no simula pago.",
    };
  }

  return {
    ...base,
    capability: "information_only",
    canBookOnline: false,
    bookLabel: null,
    contactLabel: null,
    contactHref: null,
    rationale:
      "Sin capacidad comercial acreditada: la ficha es informativa y sólo ofrece Agregar a Mi Viaje.",
  };
}
