/**
 * Monitor de visitantes · vocabulario en lenguaje de usuario.
 *
 * Única fuente de nombres legibles para las etapas, pasos, indicadores,
 * secciones del sitio y factores que calculan los módulos del monitor.
 * Sólo presentación: los identificadores técnicos de los contratos no
 * cambian; aquí se traducen para que el equipo entienda qué significa
 * cada cifra y para qué sirve.
 */
import type { JourneyTransitionId, VisitorStage } from "./journey";

/** Etapas del recorrido del viajero. */
export const STAGE_LABEL: Record<VisitorStage, string> = {
  stranger: "Aún no conoce el sitio",
  anonymous: "Visitante sin cuenta",
  identified: "Con cuenta",
  explorer: "Explorador",
  interested: "Interesado",
  travel_plan: "Con viaje armado",
  concierge: "Atendido por concierge",
  reservation: "Con reserva",
  traveler: "Viviendo su viaje",
  ambassador: "Embajador",
};

/** Pasos del recorrido: qué hizo la persona para avanzar. */
export const TRANSITION_LABEL: Record<JourneyTransitionId, string> = {
  T1_stranger_to_anonymous: "Llegó al sitio",
  T2_anonymous_to_identified: "Creó su cuenta",
  T3_identified_to_explorer: "Exploró a fondo",
  T4_explorer_to_interested: "Mostró interés",
  T5_interested_to_travel_plan: "Armó su viaje",
  T6_travel_plan_to_concierge: "Pidió ayuda al concierge",
  T7_concierge_to_reservation: "Reservó",
  T8_reservation_to_traveler: "Vivió su viaje",
  T9_traveler_to_ambassador: "Recomendó a otros",
};

/** «Paso 2 · Creó su cuenta»; «Avance general» para el agregado. */
export function transitionLabel(id: string): string {
  if (id === "aggregate") return "Avance general del recorrido";
  const label = TRANSITION_LABEL[id as JourneyTransitionId];
  const step = /^T(\d)_/.exec(id)?.[1];
  if (!label || !step) return id;
  return `Paso ${step} · ${label}`;
}

/** Indicadores oficiales del catálogo. */
export const METRIC_LABEL: Record<string, string> = {
  JPR_30D: "Avance del recorrido",
  T1_conversion: "Llegadas al sitio",
  T2_conversion: "Cuentas creadas",
  T4_conversion: "Primer interés",
  T5_conversion: "Viajes armados",
  T6_conversion: "Casos al concierge",
  T7_conversion: "Reservas",
  T9_conversion: "Recomendaciones",
  TRUST_INDEX: "Confianza del viajero",
  CONTINUITY_RATE: "Regresos que reconocen su viaje",
  CSAT_ONSITE: "Satisfacción durante el viaje",
};

export function metricLabel(id: string): string {
  return METRIC_LABEL[id] ?? id;
}

/** Qué hacer cuando un indicador baja, en palabras simples. */
export const METRIC_ACTION: Record<string, string> = {
  JPR_30D: "Reforzar el paso donde más personas se detienen.",
  T1_conversion: "Mejorar los canales y páginas que menos visitas atraen.",
  T2_conversion: "Mejorar los momentos en que invitamos a crear cuenta.",
  T4_conversion: "Mejorar las secciones y sugerencias que menos interés despiertan.",
  T5_conversion: "Facilitar que lo sugerido por Alux pase a Mi Viaje.",
  T6_conversion: "Hacer más clara la invitación a pedir ayuda al concierge.",
  T7_conversion: "Mejorar las propuestas y el pago que no terminan en reserva.",
  T9_conversion: "Impulsar lo que hace que los viajeros recomienden Valladolid.mx.",
  TRUST_INDEX: "Revisar cambios que bajan la confianza aunque suban las ventas.",
  CONTINUITY_RATE: "Cuidar que quien regresa encuentre su viaje donde lo dejó.",
  CSAT_ONSITE: "Dejar de promover experiencias con baja satisfacción sostenida.",
};

export function metricAction(id: string, fallback = ""): string {
  return METRIC_ACTION[id] ?? fallback;
}

/** Secciones del sitio que envían señales («capability» en los contratos). */
export const SURFACE_LABEL: Record<string, string> = {
  page: "Páginas vistas",
  alux_dock: "Botón flotante de Alux",
  session: "Inicio de visita",
  home: "Inicio",
  landing: "Páginas de campaña",
  destinations: "Lista de destinos",
  destination: "Página de destino",
  territorial: "Mapa y región",
  tourism: "Listados turísticos",
  experiences: "Experiencias",
  routes: "Rutas",
  premium: "Fichas premium",
  workspace: "Mi Viaje",
  listing: "Listados",
  cms: "Equipo interno",
};

export function surfaceLabel(key: string): string {
  const base = key.split(/[|:]/)[0] ?? key;
  return SURFACE_LABEL[key] ?? SURFACE_LABEL[base] ?? key;
}

/** Idiomas del navegador. */
export const LOCALE_LABEL: Record<string, string> = {
  es: "Español",
  en: "Inglés",
  fr: "Francés",
  de: "Alemán",
  it: "Italiano",
  pt: "Portugués",
  zh: "Chino",
  ja: "Japonés",
  ko: "Coreano",
};

export function localeLabel(code: string): string {
  const base = code.toLowerCase().split("-")[0] ?? code;
  const name = LOCALE_LABEL[base];
  if (!name) return code;
  return base === code.toLowerCase() ? name : `${name} (${code})`;
}

/** Cómo se agrupa a los visitantes. */
export const DIMENSION_LABEL: Record<string, string> = {
  locale: "Idioma",
  destination: "Destino",
  capability: "Sección del sitio",
  country: "País",
  channel: "Canal",
  device: "Dispositivo",
};

/** Nombre legible del valor de un grupo según cómo se agrupó. */
export function segmentValueLabel(dimension: string, key: string, label: string): string {
  if (key === "__others__")
    return label.replace(/^Otros \((\d+) segmentos < (\d+)\)$/, "Otros grupos pequeños ($1)");
  if (dimension === "capability") return surfaceLabel(key);
  if (dimension === "locale") return localeLabel(key);
  return label;
}

/** Factores que ordenan las recomendaciones. */
export const FACTOR_LABEL: Record<string, string> = {
  confidence: "Qué tan seguros estamos",
  impact: "Tamaño del cambio",
  urgency: "Urgencia",
  reach: "Personas alcanzadas",
  journey: "Etapa del recorrido",
  ecosystem: "Beneficio para el destino",
  ecosystem_benefit: "Beneficio para el destino",
  friction: "Obstáculos detectados",
  traveler_benefit: "Beneficio para el viajero",
};

export function factorLabel(key: string): string {
  return FACTOR_LABEL[key] ?? key;
}

/** Qué tan confiable es lo aprendido de recomendaciones anteriores. */
export const RELIABILITY_LABEL: Record<string, string> = {
  reliable: "confiable",
  learning: "aprendiendo",
  insufficient_data: "pocos datos",
  unknown: "sin historial",
};

export function reliabilityLabel(key: string): string {
  return RELIABILITY_LABEL[key] ?? key;
}

/** Nivel genérico (confianza, riesgo de sesgo). */
export const LEVEL_LABEL: Record<string, string> = {
  high: "alta",
  medium: "media",
  low: "baja",
};

export function levelLabel(key: string): string {
  return LEVEL_LABEL[key] ?? key;
}

/** Influencias conocidas de cada paso. */
export const INFLUENCER_LABEL: Record<string, string> = {
  seo: "buscadores",
  social: "redes sociales",
  referral: "enlaces de otros sitios",
  landing: "páginas de campaña",
  ac1_moments: "invitaciones a crear cuenta",
  continuity_recognition: "reconocer al visitante que regresa",
  first_five_seconds: "primeros segundos de la visita",
  discovery: "descubrimiento",
  tourist_hero: "portadas",
  recommendations: "recomendaciones",
  alux: "Alux",
  favorite: "favoritos",
  add_to_plan: "agregar a Mi Viaje",
  compare: "comparar opciones",
  alux_suggestion: "sugerencias de Alux",
  travel_plan_bridge: "paso de Alux a Mi Viaje",
  alux_proposal: "propuestas de Alux",
  concierge_voice: "atención del concierge",
  promote_plan_to_case: "enviar el viaje al concierge",
  alux_intent: "intención detectada por Alux",
  high_intent: "alto interés",
  concierge_proposal: "propuestas del concierge",
  checkout_narrative: "proceso de pago",
  trust_signals: "señales de confianza",
  pre_trip_prep: "preparación antes del viaje",
  live_day: "acompañamiento el día del viaje",
  onsite_context: "ayuda en el destino",
  live_recap: "resumen del viaje",
  travel_passport: "pasaporte de viaje",
  post_trip_loop: "seguimiento después del viaje",
};

export function influencersLabel(keys: readonly string[]): string {
  return keys.map((k) => INFLUENCER_LABEL[k] ?? k).join(", ");
}
