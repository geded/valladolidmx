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
] as const satisfies ReadonlyArray<keyof AluxVoice>;

export type AluxCopyByLocale = Record<LocaleCode, AluxVoice>;

const ES: AluxVoice = {
  shortDescriptor: "Concierge IA",
  territorialDescriptor: "Concierge IA de {territory}",
  conversationTitle: "Conversa con {name}",
  conversationDescription:
    "Pregunta libre. {name} responde sólo con el catálogo publicado y te dice cuándo un dato no está disponible.",
  publicIntro: "Pregúntame sobre los destinos, experiencias y servicios de {territory}, o cómo armar tu viaje.",
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
};

const EN: AluxVoice = {
  ...ES,
  shortDescriptor: "AI Concierge",
  territorialDescriptor: "AI Concierge for {territory}",
  conversationTitle: "Chat with {name}",
  conversationDescription:
    "Ask freely. {name} answers only from the published catalog and tells you when information is unavailable.",
  publicIntro: "Ask me about destinations, experiences and services in {territory}, or how to plan your trip.",
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
  fr: { ...EN, shortDescriptor: "Concierge IA", territorialDescriptor: "Concierge IA de {territory}" },
  de: { ...EN, shortDescriptor: "KI-Concierge", territorialDescriptor: "KI-Concierge für {territory}" },
  it: { ...EN, shortDescriptor: "Concierge IA", territorialDescriptor: "Concierge IA di {territory}" },
  pt: { ...EN, shortDescriptor: "Concierge de IA", territorialDescriptor: "Concierge de IA de {territory}" },
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
