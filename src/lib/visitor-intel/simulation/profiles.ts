/**
 * CV8.S.2 · Catálogo de perfiles de viajero (Capa 2: Generación).
 *
 * Fuente única de propensiones por perfil. El motor `behavior.ts` consume
 * este catálogo para muestrear decisiones (avanzar/abandonar/regresar,
 * gasto, idioma, sensibilidad al clima) sin acoplarse a datos reales.
 */
import type { ProfilePropensities, TravelerProfileId } from "./scenario";

export interface ProfileDefinition {
  id: TravelerProfileId;
  label: string;
  /** Duración típica del viaje en días (min, max). */
  trip_length_days: [number, number];
  /** Idiomas probables (BCP-47) con peso. */
  locales: ReadonlyArray<readonly [string, number]>;
  propensities: ProfilePropensities;
}

export const PROFILE_CATALOG: Readonly<Record<TravelerProfileId, ProfileDefinition>> = {
  couple_international: {
    id: "couple_international",
    label: "Pareja internacional",
    trip_length_days: [4, 8],
    locales: [["en", 5], ["es", 2], ["fr", 1]],
    propensities: {
      exploration_depth: 0.75, favorite_to_plan: 0.55, concierge_acceptance: 0.6,
      purchase_intent: 0.65, weather_sensitivity: 0.55, language_diversity: 0.8,
      ticket_size_usd: [180, 420],
    },
  },
  couple_national: {
    id: "couple_national",
    label: "Pareja nacional",
    trip_length_days: [2, 4],
    locales: [["es", 9], ["en", 1]],
    propensities: {
      exploration_depth: 0.6, favorite_to_plan: 0.5, concierge_acceptance: 0.45,
      purchase_intent: 0.55, weather_sensitivity: 0.4, language_diversity: 0.1,
      ticket_size_usd: [90, 220],
    },
  },
  family: {
    id: "family",
    label: "Familia",
    trip_length_days: [3, 6],
    locales: [["es", 7], ["en", 3]],
    propensities: {
      exploration_depth: 0.55, favorite_to_plan: 0.6, concierge_acceptance: 0.55,
      purchase_intent: 0.6, weather_sensitivity: 0.7, language_diversity: 0.3,
      ticket_size_usd: [140, 380],
    },
  },
  backpacker: {
    id: "backpacker",
    label: "Mochilero",
    trip_length_days: [5, 12],
    locales: [["en", 5], ["es", 3], ["de", 1], ["fr", 1]],
    propensities: {
      exploration_depth: 0.85, favorite_to_plan: 0.35, concierge_acceptance: 0.2,
      purchase_intent: 0.3, weather_sensitivity: 0.25, language_diversity: 0.9,
      ticket_size_usd: [30, 90],
    },
  },
  retirees: {
    id: "retirees",
    label: "Jubilados",
    trip_length_days: [5, 10],
    locales: [["en", 6], ["es", 3], ["de", 1]],
    propensities: {
      exploration_depth: 0.5, favorite_to_plan: 0.6, concierge_acceptance: 0.75,
      purchase_intent: 0.7, weather_sensitivity: 0.75, language_diversity: 0.6,
      ticket_size_usd: [200, 500],
    },
  },
  gastronomic: {
    id: "gastronomic",
    label: "Gastronómico",
    trip_length_days: [3, 6],
    locales: [["es", 6], ["en", 3], ["fr", 1]],
    propensities: {
      exploration_depth: 0.7, favorite_to_plan: 0.65, concierge_acceptance: 0.55,
      purchase_intent: 0.7, weather_sensitivity: 0.3, language_diversity: 0.5,
      ticket_size_usd: [120, 320],
    },
  },
  cultural: {
    id: "cultural",
    label: "Cultural",
    trip_length_days: [4, 8],
    locales: [["es", 5], ["en", 4], ["it", 1]],
    propensities: {
      exploration_depth: 0.85, favorite_to_plan: 0.6, concierge_acceptance: 0.5,
      purchase_intent: 0.55, weather_sensitivity: 0.5, language_diversity: 0.7,
      ticket_size_usd: [110, 280],
    },
  },
  nature: {
    id: "nature",
    label: "Naturaleza",
    trip_length_days: [3, 7],
    locales: [["es", 5], ["en", 4], ["de", 1]],
    propensities: {
      exploration_depth: 0.75, favorite_to_plan: 0.55, concierge_acceptance: 0.45,
      purchase_intent: 0.5, weather_sensitivity: 0.85, language_diversity: 0.6,
      ticket_size_usd: [80, 220],
    },
  },
  luxury: {
    id: "luxury",
    label: "Lujo",
    trip_length_days: [3, 6],
    locales: [["en", 6], ["es", 3], ["fr", 1]],
    propensities: {
      exploration_depth: 0.6, favorite_to_plan: 0.55, concierge_acceptance: 0.85,
      purchase_intent: 0.8, weather_sensitivity: 0.5, language_diversity: 0.7,
      ticket_size_usd: [400, 1200],
    },
  },
  day_tripper: {
    id: "day_tripper",
    label: "Excursionista de un día",
    trip_length_days: [1, 1],
    locales: [["es", 6], ["en", 3], ["fr", 1]],
    propensities: {
      exploration_depth: 0.35, favorite_to_plan: 0.2, concierge_acceptance: 0.15,
      purchase_intent: 0.35, weather_sensitivity: 0.6, language_diversity: 0.5,
      ticket_size_usd: [25, 80],
    },
  },
  hotel_guest: {
    id: "hotel_guest",
    label: "Huésped en hotel",
    trip_length_days: [2, 5],
    locales: [["es", 5], ["en", 4], ["de", 1]],
    propensities: {
      exploration_depth: 0.55, favorite_to_plan: 0.6, concierge_acceptance: 0.7,
      purchase_intent: 0.65, weather_sensitivity: 0.55, language_diversity: 0.6,
      ticket_size_usd: [130, 340],
    },
  },
  self_drive: {
    id: "self_drive",
    label: "Auto rentado",
    trip_length_days: [4, 9],
    locales: [["es", 5], ["en", 4], ["fr", 1]],
    propensities: {
      exploration_depth: 0.9, favorite_to_plan: 0.55, concierge_acceptance: 0.5,
      purchase_intent: 0.6, weather_sensitivity: 0.5, language_diversity: 0.7,
      ticket_size_usd: [150, 400],
    },
  },
};

export const PROFILE_IDS = Object.keys(PROFILE_CATALOG) as TravelerProfileId[];