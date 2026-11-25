/**
 * Reservar mesa · reglas puras compartidas por la ficha, el Portal y las pruebas.
 * La base de datos decide la disponibilidad (`restaurant_public_slots`); aquí
 * solo viven etiquetas, estados y el armado de los ajustes del restaurante.
 */

export const TABLE_STATUSES = [
  "pendiente",
  "confirmada",
  "llego",
  "sentada",
  "terminada",
  "no_vino",
  "cancelada",
  "rechazada",
] as const;
export type TableStatus = (typeof TABLE_STATUSES)[number];

export const TABLE_STATUS_LABEL: Record<TableStatus, string> = {
  pendiente: "Por confirmar",
  confirmada: "Reservada",
  llego: "Llegó",
  sentada: "Sentada",
  terminada: "Terminada",
  no_vino: "No vino",
  cancelada: "Cancelada",
  rechazada: "Rechazada",
};

/** Siguiente paso natural en la agenda del día (botones del Portal). */
export function nextTableActions(status: TableStatus): TableStatus[] {
  switch (status) {
    case "pendiente":
      return ["confirmada", "rechazada"];
    case "confirmada":
      return ["llego", "no_vino", "cancelada"];
    case "llego":
      return ["sentada"];
    case "sentada":
      return ["terminada"];
    default:
      return [];
  }
}

/** Estados que ocupan mesa. */
export function occupiesTable(status: string): boolean {
  return status === "pendiente" || status === "confirmada" || status === "llego" || status === "sentada";
}

export const TABLE_SOURCE_LABEL: Record<string, string> = {
  pagina: "Valladolid.mx",
  alux: "Alux",
  whatsapp: "WhatsApp",
  telefono: "Por teléfono",
  sin_cita: "Sin reservación",
};

/** Personas que trajo la plataforma (lo que se cobraría por persona en la Etapa 3). */
export function platformGuests(rows: ReadonlyArray<{ source: string; status: string; party_size: number }>): number {
  return rows
    .filter((r) => (r.source === "pagina" || r.source === "alux" || r.source === "whatsapp") && (r.status === "terminada" || r.status === "sentada" || r.status === "llego"))
    .reduce((n, r) => n + r.party_size, 0);
}

export const WEEKDAYS: ReadonlyArray<{ key: string; label: string }> = [
  { key: "1", label: "Lunes" },
  { key: "2", label: "Martes" },
  { key: "3", label: "Miércoles" },
  { key: "4", label: "Jueves" },
  { key: "5", label: "Viernes" },
  { key: "6", label: "Sábado" },
  { key: "7", label: "Domingo" },
];

export interface TableGroup {
  seats: number;
  count: number;
}

export interface TableBookingSettings {
  slot_minutes: number;
  duration_minutes: number;
  max_party: number;
  min_notice_minutes: number;
  max_days_ahead: number;
  confirm_mode: "inmediata" | "confirmacion";
  /** isodow "1".."7" → rangos ["HH:MM","HH:MM"]. */
  hours: Record<string, Array<[string, string]>>;
  tables: TableGroup[];
}

export const DEFAULT_TABLE_SETTINGS: TableBookingSettings = {
  slot_minutes: 30,
  duration_minutes: 90,
  max_party: 8,
  min_notice_minutes: 60,
  max_days_ahead: 60,
  confirm_mode: "inmediata",
  hours: Object.fromEntries(WEEKDAYS.map((d) => [d.key, [["08:00", "22:00"]]])) as TableBookingSettings["hours"],
  tables: [{ seats: 4, count: 6 }, { seats: 2, count: 2 }],
};

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Limpia los ajustes del formulario; devuelve error legible si algo no cuadra. */
export function normalizeTableSettings(input: TableBookingSettings): { ok: true; value: TableBookingSettings } | { ok: false; error: string } {
  const tables = input.tables.filter((t) => t.count > 0 && t.seats > 0);
  if (tables.length === 0) return { ok: false, error: "Agrega al menos una mesa." };
  if (tables.some((t) => t.seats > 30 || t.count > 100)) return { ok: false, error: "Revisa las mesas: máximo 30 personas y 100 mesas por tipo." };
  const hours: TableBookingSettings["hours"] = {};
  for (const d of WEEKDAYS) {
    const ranges = (input.hours[d.key] ?? []).filter(([a, b]) => HHMM.test(a) && HHMM.test(b) && a < b);
    if ((input.hours[d.key] ?? []).length !== ranges.length) return { ok: false, error: `Revisa el horario del ${d.label.toLowerCase()}.` };
    if (ranges.length) hours[d.key] = ranges;
  }
  const maxSeats = Math.max(...tables.map((t) => t.seats));
  return {
    ok: true,
    value: {
      ...input,
      tables,
      hours,
      max_party: Math.min(Math.max(1, Math.round(input.max_party)), 60),
      slot_minutes: Math.min(Math.max(15, Math.round(input.slot_minutes)), 120),
      duration_minutes: Math.min(Math.max(30, Math.round(input.duration_minutes)), 360),
      min_notice_minutes: Math.min(Math.max(0, Math.round(input.min_notice_minutes)), 4320),
      max_days_ahead: Math.min(Math.max(1, Math.round(input.max_days_ahead)), 365),
      ...(input.max_party > maxSeats ? { max_party: maxSeats } : {}),
    },
  };
}

/** Día de hoy en Valladolid (YYYY-MM-DD). */
export function meridaToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Merida" }).format(now);
}

export function formatTableTime(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", { timeZone: "America/Merida", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export function formatTableDate(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", { timeZone: "America/Merida", weekday: "long", day: "numeric", month: "long" }).format(new Date(iso));
}

export const TABLE_BOOKING_ERRORS: Record<string, string> = {
  booking_off: "Este restaurante no está recibiendo reservaciones en línea por ahora.",
  slot_unavailable: "Ese horario se acaba de ocupar. Elige otro, por favor.",
  invalid_name: "Escribe tu nombre.",
  invalid_phone: "Escribe un teléfono de 10 dígitos.",
  invalid_email: "Revisa tu correo.",
  too_many_reservations: "Ya tienes 3 reservaciones activas en este restaurante.",
  forbidden: "No tienes permiso para esto.",
};

export function tableBookingError(message: string): string {
  for (const [code, text] of Object.entries(TABLE_BOOKING_ERRORS)) if (message.includes(code)) return text;
  return "No se pudo completar. Intenta de nuevo.";
}
