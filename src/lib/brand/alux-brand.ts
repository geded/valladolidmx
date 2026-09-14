import type { LocaleCode } from "@/config/languages";

export interface AluxPalette {
  primary: string;
  primaryForeground: string;
  surface: string;
  surfaceForeground: string;
  accent: string;
  accentForeground: string;
  border: string;
  ring: string;
  badge: string;
  badgeForeground: string;
}

export const ALUX_PALETTE_KEYS = [
  "primary",
  "primaryForeground",
  "surface",
  "surfaceForeground",
  "accent",
  "accentForeground",
  "border",
  "ring",
  "badge",
  "badgeForeground",
] as const satisfies ReadonlyArray<keyof AluxPalette>;

export interface AluxVoice {
  shortDescriptor: string;
  territorialDescriptor: string;
  conversationTitle: string;
  conversationDescription: string;
  publicIntro: string;
  inputPlaceholder: string;
  sendLabel: string;
  newConversation: string;
  thinking: string;
  disclaimer: string;
  discoveryTitle: string;
  discoveryBody: string;
  nearbyTitle: string;
  nearbyBody: string;
  nearbyCta: string;
  planCta: string;
  planningPrompt: string;
  onsitePrompt: string;
  workspaceTitle: string;
  workspaceEmpty: string;
  workspaceActionTitle: string;
  workspaceOpen: string;
  unavailable: string;
  pageEyebrow: string;
  pageTitle: string;
  pageDescription: string;
  nextStepTitle: string;
  nextStepReview: string;
  nextStepDetect: string;
  nextStepNearby: string;
  viewTrip: string;
  humanConciergeTitle: string;
  humanConciergeBody: string;
  conciergeSentTitle: string;
  conciergeSentBody: string;
  conciergeWaitingTitle: string;
  conciergeWaitingBody: string;
  conciergeProposalReadyTitle: string;
  conciergeProposalReadyBody: string;
  prepareTrip: string;
  retry: string;
  loadingTrip: string;
  tripLoadError: string;
  suggestedQuestions: string;
  travelerPanelTitle: string;
  travelerPanelDescription: string;
  profilePromptTitle: string;
  profilePromptBody: string;
  completeProfile: string;
  completePublicProfile: string;
  suggestionReady: string;
  nearbySectionTitle: string;
  locationTitle: string;
  locationBody: string;
  shareLocation: string;
  requestingLocation: string;
  locationDenied: string;
  locationUnavailable: string;
  contextTitle: string;
  exploreNearbyTitle: string;
  catalogGrounding: string;
  activeCouponsTitle: string;
  promotionsTitle: string;
  profileAccuracyTitle: string;
  profileAccuracyBody: string;
  publicStarterSeason: string;
  publicStarterDays: string;
  publicStarterDestinations: string;
  publicStarterExperiences: string;
  publicAvailability: string;
  conversationMemory: string;
  locationGranted: string;
  locationGeneral: string;
  locationNearbyCta: string;
  createAccount: string;
  proposalFooter: string;
  suggestionEyebrow: string;
  suggestionSafety: string;
  suggestionWhy: string;
  suggestionAction: string;
  sourcesTitle: string;
  sourcesEmpty: string;
  proposalsTitle: string;
  proposalsDisclaimer: string;
  proposalsWhy: string;
  proposalsHideWhy: string;
  workspaceNoActions: string;
  workspaceReversible: string;
  workspaceWhy: string;
  workspaceRationale: string;
  workspaceEffect: string;
  workspaceSources: string;
  memoryTitle: string;
  memoryPaused: string;
  memoryActive: string;
  memoryDescription: string;
  memoryGeneral: string;
  memorySignals: string;
  memoryPreserved: string;
  memoryResume: string;
  memoryPause: string;
  memoryForget: string;
  memoryConfirm: string;
  memoryCancel: string;
}

export const ALUX_VOICE_KEYS = [
  "shortDescriptor",
  "territorialDescriptor",
  "conversationTitle",
  "conversationDescription",
  "publicIntro",
  "inputPlaceholder",
  "sendLabel",
  "newConversation",
  "thinking",
  "disclaimer",
  "discoveryTitle",
  "discoveryBody",
  "nearbyTitle",
  "nearbyBody",
  "nearbyCta",
  "planCta",
  "planningPrompt",
  "onsitePrompt",
  "workspaceTitle",
  "workspaceEmpty",
  "workspaceActionTitle",
  "workspaceOpen",
  "unavailable",
  "pageEyebrow",
  "pageTitle",
  "pageDescription",
  "nextStepTitle",
  "nextStepReview",
  "nextStepDetect",
  "nextStepNearby",
  "viewTrip",
  "humanConciergeTitle",
  "humanConciergeBody",
  "prepareTrip",
  "retry",
  "loadingTrip",
  "tripLoadError",
  "suggestedQuestions",
  "travelerPanelTitle",
  "travelerPanelDescription",
  "profilePromptTitle",
  "profilePromptBody",
  "completeProfile",
  "completePublicProfile",
  "suggestionReady",
  "nearbySectionTitle",
  "locationTitle",
  "locationBody",
  "shareLocation",
  "requestingLocation",
  "locationDenied",
  "locationUnavailable",
  "contextTitle",
  "exploreNearbyTitle",
  "catalogGrounding",
  "activeCouponsTitle",
  "promotionsTitle",
  "profileAccuracyTitle",
  "profileAccuracyBody",
  "publicStarterSeason",
  "publicStarterDays",
  "publicStarterDestinations",
  "publicStarterExperiences",
  "publicAvailability",
  "conversationMemory",
  "locationGranted",
  "locationGeneral",
  "locationNearbyCta",
  "createAccount",
  "proposalFooter",
  "suggestionEyebrow",
  "suggestionSafety",
  "suggestionWhy",
  "suggestionAction",
  "sourcesTitle",
  "sourcesEmpty",
  "proposalsTitle",
  "proposalsDisclaimer",
  "proposalsWhy",
  "proposalsHideWhy",
  "workspaceNoActions",
  "workspaceReversible",
  "workspaceWhy",
  "workspaceRationale",
  "workspaceEffect",
  "workspaceSources",
  "memoryTitle",
  "memoryPaused",
  "memoryActive",
  "memoryDescription",
  "memoryGeneral",
  "memorySignals",
  "memoryPreserved",
  "memoryResume",
  "memoryPause",
  "memoryForget",
  "memoryConfirm",
  "memoryCancel",
] as const satisfies ReadonlyArray<keyof AluxVoice>;

export type AluxCopyByLocale = Record<LocaleCode, AluxVoice>;

const ES: AluxVoice = {
  shortDescriptor: "Concierge IA",
  territorialDescriptor: "Concierge IA de {territory}",
  conversationTitle: "Conversa con {name}",
  conversationDescription:
    "Pregunta libre. {name} responde sólo con el catálogo publicado y te dice cuándo un dato no está disponible.",
  publicIntro:
    "Pregúntame sobre los destinos, experiencias y servicios de {territory}, o cómo armar tu viaje.",
  inputPlaceholder: "¿Qué viaje tienes en mente?",
  sendLabel: "Enviar a {name}",
  newConversation: "Nueva conversación",
  thinking: "{name} está pensando…",
  disclaimer:
    "{name} propone; tú decides con un toque. No reserva ni inventa precios, horarios o disponibilidad.",
  discoveryTitle: "Empieza a explorar",
  discoveryBody:
    "Aún no exploras un destino de {territory}. Elige uno para recibir recomendaciones basadas en tu recorrido, nunca inventadas.",
  nearbyTitle: "{name} te sugiere {count} lugares a menos de {distance} de ti",
  nearbyBody:
    "Ordenados por cercanía real en {destination}. Puedo priorizar por tus intereses o filtrar por lo que está abierto ahora.",
  nearbyCta: "Ver con {name}",
  planCta: "Planear con {name}",
  planningPrompt: "Estoy planeando",
  onsitePrompt: "Ya estoy en la región",
  workspaceTitle: "Copiloto · {name}",
  workspaceEmpty: "{name} está observando el pulso de este espacio.",
  workspaceActionTitle: "Próxima acción de alto impacto",
  workspaceOpen: "Abrir conversación con {name}",
  unavailable: "{name} no pudo responder ahora. Inténtalo en un momento.",
  pageEyebrow: "Inteligencia",
  pageTitle: "{name}",
  pageDescription:
    "La inteligencia que acompaña el trabajo del concierge humano: resume expedientes, sugiere productos y prepara borradores revisables.",
  nextStepTitle: "Tu siguiente mejor paso",
  nextStepReview: "Revisar los destinos y experiencias de tu viaje",
  nextStepDetect: "Detectar qué puede faltar según tu tiempo y ritmo",
  nextStepNearby: "Sugerir lugares cercanos sin cambiar tu plan",
  viewTrip: "Ver mi viaje",
  humanConciergeTitle: "Cuando quieras hacerlo realidad",
  humanConciergeBody:
    "Tu expediente conserva lo que elegiste. Cuando tú lo decidas, un concierge humano podrá revisarlo contigo, coordinar opciones y ayudarte a convertirlo en un viaje real.",
  conciergeSentTitle: "Ya compartí tu viaje con el Concierge",
  conciergeSentBody:
    "Un concierge humano tiene la información que elegiste. Me quedaré pendiente y te avisaré cuando llegue una respuesta para revisarla juntos.",
  conciergeWaitingTitle: "Tu Concierge está revisando el viaje",
  conciergeWaitingBody:
    "Mientras prepara una respuesta, puedes seguir explorando o añadir una nota. Te avisaré aquí cuando haya una propuesta para ti.",
  conciergeProposalReadyTitle: "Ya tienes una respuesta de tu Concierge",
  conciergeProposalReadyBody:
    "La propuesta está lista. Ábrela para que revisemos juntos qué incluye, su importe y su vigencia antes de que decidas.",
  prepareTrip: "Preparar mi viaje",
  retry: "Reintentar",
  loadingTrip: "Cargando tu viaje antes de conversar…",
  tripLoadError: "No pude cargar tu viaje. {name} no enviará un contexto incompleto.",
  suggestedQuestions: "Preguntas sugeridas",
  travelerPanelTitle: "{name} · Copiloto de tu viaje",
  travelerPanelDescription:
    "Analiza tu espacio de viaje y sugiere. Nunca modifica ni envía nada sin que tú lo confirmes.",
  profilePromptTitle: "Ayúdame a asesorarte mejor",
  profilePromptBody:
    "Mientras más completo esté tu perfil, más preciso puedo ser al recomendarte opciones de {territory}.",
  completeProfile: "Completar perfil",
  completePublicProfile: "Completar tu perfil público",
  suggestionReady: "Sugerencia lista",
  nearbySectionTitle: "Cercanía real",
  locationTitle: "Dónde estás",
  locationBody:
    "Compartir tu ubicación me permite priorizar lugares realmente cercanos y calcular tiempos de traslado.",
  shareLocation: "Compartir mi ubicación",
  requestingLocation: "Solicitando permiso…",
  locationDenied: "Permiso denegado — reintentar",
  locationUnavailable: "Ubicación no disponible",
  contextTitle: "Qué estás explorando",
  exploreNearbyTitle: "Qué explorar cerca",
  catalogGrounding:
    "Sugerencias derivadas del catálogo publicado y del contexto real de tu recorrido, nunca inventadas.",
  activeCouponsTitle: "Tus cupones activos",
  promotionsTitle: "Promociones en {destination}",
  profileAccuracyTitle: "Ayúdame a asesorarte mejor",
  profileAccuracyBody:
    "Completa tu perfil de viajero y tu perfil público para recibir recomendaciones más precisas de {territory}.",
  publicStarterSeason: "¿Cuál es la mejor época para visitar {territory}?",
  publicStarterDays: "¿Qué hacer en 3 días en {territory}?",
  publicStarterDestinations: "¿Qué destinos publicados me recomiendas?",
  publicStarterExperiences: "¿Qué experiencias encajan con mi viaje?",
  publicAvailability: "{territory} · disponible sin registro",
  conversationMemory: "{name} recuerda tu conversación previa · no necesitas repetir contexto",
  locationGranted: "Ordenando por cercanía a tu ubicación",
  locationGeneral: "Sin ubicación · recomiendo por relevancia territorial",
  locationNearbyCta: "Compartir mi ubicación para sugerencias cercanas",
  createAccount: "Crear cuenta gratuita",
  proposalFooter: "{name} propone · tú confirmas en Mi Viaje.",
  suggestionEyebrow: "{name} · {capability}",
  suggestionSafety: "Sugerencia · no modifica tu viaje sin tu confirmación",
  suggestionWhy: "Por qué te lo recomiendo",
  suggestionAction: "Acción disponible",
  sourcesTitle: "Fuentes utilizadas",
  sourcesEmpty: "Sin referencias del catálogo utilizadas.",
  proposalsTitle: "{name} sugiere para tu viaje",
  proposalsDisclaimer: "{name} propone; tú decides. Nada se añade a tu plan sin tu confirmación.",
  proposalsWhy: "Por qué {name} lo sugiere",
  proposalsHideWhy: "Ocultar por qué",
  workspaceNoActions: "Sin acciones sugeridas por ahora.",
  workspaceReversible: "Reversible",
  workspaceWhy: "¿Por qué?",
  workspaceRationale: "Razón",
  workspaceEffect: "Efecto",
  workspaceSources: "Fuentes",
  memoryTitle: "Personalización y memoria",
  memoryPaused: "En pausa",
  memoryActive: "Activa",
  memoryDescription:
    "{name} recuerda lo que exploras en este dispositivo para sugerirte mejores lugares y experiencias. Nunca guarda tu nombre, correo ni teléfono, y lo que recuerda se borra solo después de {count} días sin actividad.",
  memoryGeneral: "Ahora mismo {name} te acompaña con recomendaciones generales.",
  memorySignals: "{name} está usando {count} señales recientes de tu navegación.",
  memoryPreserved:
    "Tu viaje y tus lugares guardados se conservan siempre, incluso con la personalización en pausa.",
  memoryResume: "Reactivar personalización",
  memoryPause: "Pausar personalización",
  memoryForget: "Borrar lo que {name} recuerda",
  memoryConfirm: "Sí, borrar",
  memoryCancel: "Mejor no",
};

const EN: AluxVoice = {
  ...ES,
  shortDescriptor: "AI Concierge",
  territorialDescriptor: "AI Concierge for {territory}",
  conversationTitle: "Chat with {name}",
  conversationDescription:
    "Ask freely. {name} answers only from the published catalog and tells you when information is unavailable.",
  publicIntro:
    "Ask me about destinations, experiences and services in {territory}, or how to plan your trip.",
  inputPlaceholder: "What trip do you have in mind?",
  sendLabel: "Send to {name}",
  newConversation: "New conversation",
  thinking: "{name} is thinking…",
  disclaimer:
    "{name} suggests; you decide with one tap. It never books or invents prices, hours or availability.",
  discoveryTitle: "Start exploring",
  discoveryBody:
    "You are not exploring a destination in {territory} yet. Choose one for recommendations grounded in your journey.",
  nearbyCta: "View with {name}",
  planCta: "Plan with {name}",
  planningPrompt: "I am planning",
  onsitePrompt: "I am already in the region",
  workspaceTitle: "Copilot · {name}",
  workspaceEmpty: "{name} is observing this workspace.",
  workspaceActionTitle: "Next high-impact action",
  workspaceOpen: "Open conversation with {name}",
  unavailable: "{name} could not answer right now. Please try again shortly.",
};

export const DEFAULT_ALUX_COPY: AluxCopyByLocale = {
  es: ES,
  en: EN,
  // La voz actual es la reserva segura hasta que Marca publique cada traducción.
  fr: { ...ES },
  de: { ...ES },
  it: { ...ES },
  pt: { ...ES },
};

export function fillAluxCopy(
  template: string,
  values: Record<string, string | number | null | undefined>,
): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value == null ? "" : String(value)),
    template,
  );
}

export function normalizeAluxCopy(value: unknown): AluxCopyByLocale {
  const stored = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return Object.fromEntries(
    (Object.keys(DEFAULT_ALUX_COPY) as LocaleCode[]).map((locale) => {
      const localeValue =
        stored[locale] && typeof stored[locale] === "object"
          ? (stored[locale] as Record<string, unknown>)
          : {};
      const voice = Object.fromEntries(
        ALUX_VOICE_KEYS.map((key) => {
          const candidate = localeValue[key];
          return [
            key,
            typeof candidate === "string" && candidate.trim()
              ? candidate.trim().slice(0, 500)
              : DEFAULT_ALUX_COPY[locale][key],
          ];
        }),
      ) as unknown as AluxVoice;
      return [locale, voice];
    }),
  ) as AluxCopyByLocale;
}
