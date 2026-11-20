/**
 * trip-brief.ts — Contrato del Brief de Viaje (confirmación antes de
 * enviar al Concierge).
 *
 * Se almacena en `travel_plans.meta.trip_brief` (jsonb ya existente).
 * Sin tablas nuevas. Validado con Zod en el borde de la server fn.
 *
 * El brief alimenta:
 *  - El snapshot del expediente (concierge lo lee en texto humano).
 *  - El contexto de handoff de Alux.
 *  - El itinerario posterior a la confirmación.
 */
import { z } from "zod";

// -------------------------------------------------------------------------
// Enums del brief
// -------------------------------------------------------------------------

export const ARRIVAL_MODES = ["plane", "bus", "own_car", "already_in_area"] as const;
export type ArrivalMode = (typeof ARRIVAL_MODES)[number];

export const AIRPORTS = ["merida", "cancun", "tulum", "chichen_itza"] as const;
export type Airport = (typeof AIRPORTS)[number];

export const GROUP_TYPES = ["couple", "family", "friends", "solo", "business"] as const;
export type GroupType = (typeof GROUP_TYPES)[number];

export const TRANSPORT_MODES = [
  "own_car",
  "rent_car",
  "tours_with_transport",
  "own_arrange",
  "undecided",
] as const;
export type TransportMode = (typeof TRANSPORT_MODES)[number];

export const RENTAL_CAR_TYPES = ["compact", "suv", "van"] as const;
export type RentalCarType = (typeof RENTAL_CAR_TYPES)[number];

export const TOUR_PREFERENCES = ["private", "shared"] as const;
export type TourPreference = (typeof TOUR_PREFERENCES)[number];

export const YES_NO_UNSURE = ["yes", "no", "unsure"] as const;

// -------------------------------------------------------------------------
// Schema Zod
// -------------------------------------------------------------------------

export const tripBriefSchema = z.object({
  arrivalMode: z.enum(ARRIVAL_MODES),
  airport: z.enum(AIRPORTS).nullable().optional(),
  originCity: z.string().trim().max(200).optional(),
  adults: z.number().int().min(1).max(40),
  hasMinors: z.boolean(),
  minorAges: z.array(z.number().int().min(0).max(17)).optional(),
  hasMobilityNeeds: z.boolean(),
  mobilityNotes: z.string().trim().max(500).optional(),
  groupType: z.enum(GROUP_TYPES),
  preferredLanguage: z.string().trim().max(10).optional(),
  dietaryOrHealthNotes: z.string().trim().max(500).optional(),
  transportMode: z.enum(TRANSPORT_MODES),
  rentalCarType: z.enum(RENTAL_CAR_TYPES).nullable().optional(),
  needsChildSeat: z.boolean().optional(),
  needsAdditionalDriver: z.boolean().optional(),
  pickupPoint: z.string().trim().max(300).optional(),
  tourPreference: z.enum(TOUR_PREFERENCES).nullable().optional(),
  airportTransfer: z.enum(YES_NO_UNSURE).optional(),
  hasValidLicense: z.boolean().optional(),
  mobilityNotesGeneral: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(500).optional(),
});

export type TripBrief = z.infer<typeof tripBriefSchema>;

// -------------------------------------------------------------------------
// Etiquetas legibles (es-MX)
// -------------------------------------------------------------------------

export const ARRIVAL_MODE_LABEL: Record<ArrivalMode, string> = {
  plane: "Avión",
  bus: "Autobús",
  own_car: "Auto propio",
  already_in_area: "Ya estoy en la zona",
};

export const AIRPORT_LABEL: Record<Airport, string> = {
  merida: "Aeropuerto Internacional de Mérida",
  cancun: "Aeropuerto Internacional de Cancún",
  tulum: "Aeropuerto Internacional de Tulum",
  chichen_itza: "Aeropuerto Internacional de Chichén Itzá",
};

export const GROUP_TYPE_LABEL: Record<GroupType, string> = {
  couple: "Pareja",
  family: "Familia",
  friends: "Amigos",
  solo: "Solo",
  business: "Empresa",
};

export const TRANSPORT_MODE_LABEL: Record<TransportMode, string> = {
  own_car: "Viajo en mi auto",
  rent_car: "Quiero rentar auto",
  tours_with_transport: "Tours con transportación incluida",
  own_arrange: "Me muevo por mi cuenta (taxi / colectivo)",
  undecided: "Aún no lo decido",
};

export const RENTAL_CAR_TYPE_LABEL: Record<RentalCarType, string> = {
  compact: "Compacto",
  suv: "SUV",
  van: "Van",
};

export const TOUR_PREFERENCE_LABEL: Record<TourPreference, string> = {
  private: "Privado",
  shared: "Compartido",
};

export const YES_NO_UNSURE_LABEL: Record<string, string> = {
  yes: "Sí",
  no: "No",
  unsure: "No sé",
};

// -------------------------------------------------------------------------
// Formateador humano — produce frases para el expediente y para Alux
// -------------------------------------------------------------------------

function minorAgesLabel(ages: number[]): string {
  if (ages.length === 0) return "menores";
  if (ages.length === 1) return `1 menor (${ages[0]} año${ages[0] === 1 ? "" : "s"})`;
  return `${ages.length} menores (${ages.map((a) => `${a}`).join(", ")} años)`;
}

/**
 * Convierte un TripBrief en un resumen humano de 1-3 líneas,
 * apto para mostrar en el expediente del concierge y en el contexto de Alux.
 */
export function briefToHumanSummary(
  brief: TripBrief,
  opts: { partySize?: number | null; startDate?: string | null; endDate?: string | null; itemCount?: number },
): string {
  const parts: string[] = [];

  // Composición del grupo
  const adults = brief.adults;
  const minors = brief.hasMinors && brief.minorAges ? brief.minorAges : [];
  const groupParts: string[] = [];
  if (adults > 0) groupParts.push(`${adults} adulto${adults === 1 ? "" : "s"}`);
  if (brief.hasMinors) groupParts.push(minorAgesLabel(minors));
  if (brief.groupType) groupParts.push(`(${GROUP_TYPE_LABEL[brief.groupType].toLowerCase()})`);
  parts.push(groupParts.join(" · "));

  // Fechas
  if (opts.startDate && opts.endDate) {
    const d1 = new Date(opts.startDate + "T00:00:00");
    const d2 = new Date(opts.endDate + "T00:00:00");
    const nights = Math.round((d2.getTime() - d1.getTime()) / 86_400_000);
    parts.push(`${opts.startDate} → ${opts.endDate} · ${nights + 1} días / ${nights} noches`);
  } else if (opts.startDate) {
    parts.push(`Desde ${opts.startDate}`);
  }

  // Llegada
  if (brief.arrivalMode === "plane" && brief.airport) {
    parts.push(`Llegan por avión a ${AIRPORT_LABEL[brief.airport]}`);
  } else {
    parts.push(`Llegan: ${ARRIVAL_MODE_LABEL[brief.arrivalMode]}`);
  }

  // Transportación
  const tparts: string[] = [TRANSPORT_MODE_LABEL[brief.transportMode]];
  if (brief.transportMode === "rent_car" && brief.rentalCarType) {
    tparts.push(`${RENTAL_CAR_TYPE_LABEL[brief.rentalCarType].toLowerCase()}`);
    if (brief.needsChildSeat) tparts.push("con silla infantil");
    if (brief.needsAdditionalDriver) tparts.push("conductor adicional");
  }
  if (brief.transportMode === "tours_with_transport" && brief.tourPreference) {
    tparts.push(`(${TOUR_PREFERENCE_LABEL[brief.tourPreference].toLowerCase()})`);
  }
  parts.push(tparts.join(" "));

  // Traslado aeropuerto
  if (brief.airportTransfer && brief.airportTransfer !== "no") {
    parts.push(
      brief.airportTransfer === "yes"
        ? "Solicita traslado aeropuerto ⇄ hospedaje"
        : "Traslado aeropuerto por confirmar",
    );
  }

  // Movilidad
  if (brief.hasMobilityNeeds && brief.mobilityNotes?.trim()) {
    parts.push(`Movilidad: ${brief.mobilityNotes.trim()}`);
  }
  if (brief.mobilityNotesGeneral?.trim()) {
    parts.push(brief.mobilityNotesGeneral.trim());
  }

  // Restricciones
  if (brief.dietaryOrHealthNotes?.trim()) {
    parts.push(`Salud/dieta: ${brief.dietaryOrHealthNotes.trim()}`);
  }

  // Origen
  if (brief.originCity?.trim()) {
    parts.push(`Desde: ${brief.originCity.trim()}`);
  }

  // Lugares guardados
  if (opts.itemCount != null && opts.itemCount > 0) {
    parts.push(`${opts.itemCount} lugar${opts.itemCount === 1 ? "" : "es"} guardado${opts.itemCount === 1 ? "" : "s"}`);
  }

  // Notas libres
  if (brief.notes?.trim()) {
    parts.push(`Nota: ${brief.notes.trim()}`);
  }

  // Idioma
  if (brief.preferredLanguage?.trim()) {
    parts.push(`Idioma preferido: ${brief.preferredLanguage.trim()}`);
  }

  return parts.join(" · ");
}

/**
 * Lista de pares (clave, valor humano) para el expediente detallado.
 */
export function briefToDetailRows(brief: TripBrief): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [];

  rows.push({ label: "Cómo llega", value: ARRIVAL_MODE_LABEL[brief.arrivalMode] });
  if (brief.arrivalMode === "plane" && brief.airport) {
    rows.push({ label: "Aeropuerto", value: AIRPORT_LABEL[brief.airport] });
  }
  if (brief.originCity) rows.push({ label: "Origen", value: brief.originCity });

  rows.push({ label: "Adultos", value: String(brief.adults) });
  if (brief.hasMinors && brief.minorAges?.length) {
    rows.push({ label: "Menores", value: minorAgesLabel(brief.minorAges) });
  } else if (brief.hasMinors) {
    rows.push({ label: "Menores", value: "Sí (edades por confirmar)" });
  } else {
    rows.push({ label: "Menores", value: "No" });
  }
  rows.push({ label: "Tipo de grupo", value: GROUP_TYPE_LABEL[brief.groupType] });

  if (brief.hasMobilityNeeds) {
    rows.push({ label: "Movilidad reducida", value: brief.mobilityNotes?.trim() || "Sí" });
  }
  if (brief.dietaryOrHealthNotes?.trim()) {
    rows.push({ label: "Salud / dieta", value: brief.dietaryOrHealthNotes.trim() });
  }
  if (brief.preferredLanguage) {
    rows.push({ label: "Idioma preferido", value: brief.preferredLanguage });
  }

  rows.push({ label: "Transportación", value: TRANSPORT_MODE_LABEL[brief.transportMode] });
  if (brief.transportMode === "rent_car") {
    if (brief.rentalCarType) rows.push({ label: "Tipo de auto", value: RENTAL_CAR_TYPE_LABEL[brief.rentalCarType] });
    if (brief.needsChildSeat) rows.push({ label: "Silla infantil", value: "Sí" });
    if (brief.needsAdditionalDriver) rows.push({ label: "Conductor adicional", value: "Sí" });
    if (brief.hasValidLicense != null) rows.push({ label: "Licencia vigente", value: brief.hasValidLicense ? "Sí" : "No" });
  }
  if (brief.transportMode === "tours_with_transport") {
    if (brief.tourPreference) rows.push({ label: "Preferencia", value: TOUR_PREFERENCE_LABEL[brief.tourPreference] });
    if (brief.pickupPoint) rows.push({ label: "Punto de recogida", value: brief.pickupPoint });
  }
  if (brief.airportTransfer) {
    rows.push({ label: "Traslado aeropuerto", value: YES_NO_UNSURE_LABEL[brief.airportTransfer] });
  }
  if (brief.mobilityNotesGeneral?.trim()) {
    rows.push({ label: "Notas de movilidad", value: brief.mobilityNotesGeneral.trim() });
  }
  if (brief.notes?.trim()) {
    rows.push({ label: "Nota del viajero", value: brief.notes.trim() });
  }

  return rows;
}
