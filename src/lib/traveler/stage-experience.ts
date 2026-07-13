/**
 * Stage Experience (CV6.O2) — narrativa visible por etapa del Journey.
 *
 * Extensión ADITIVA sobre los contratos v1.0.0 congelados en CV6.O1
 * (`TravelStage`, `getDailyMission`, `stageAllowsPermission`). No
 * introduce nuevas fases, motores ni estados; declara únicamente el
 * lenguaje visible del compañero de viaje según la etapa detectada.
 *
 * Consumido por `StageAwareCompanionBoard` y por el Stage Simulator.
 */

import type { TravelStage } from "./journey-stage";

export type StageTone = "warm" | "curious" | "focused" | "prepared" | "live" | "reflective";

export interface StagePermissionCue {
  permission: "geolocation" | "notifications" | "camera";
  title: string;
  benefit: string;
  ctaLabel: string;
}

export interface StageExperience {
  stage: TravelStage;
  label: string;              // etiqueta visible de la etapa
  tone: StageTone;
  eyebrow: string;            // supralínea corta
  greeting: (firstName?: string | null) => string;
  narrative: string;          // qué está haciendo Alux por el viajero ahora
  primaryCtaLabel: string;
  primaryCtaHref: string;     // ruta relativa dentro de la plataforma
  secondary: string[];        // hasta 3 apoyos secundarios (no compiten con la misión)
  permissionCue?: StagePermissionCue; // sólo cuando `stageAllowsPermission` lo autoriza
  accentClass: string;        // token semántico (bg/tint) para reforzar el cambio visual
}

/**
 * Fuente única de la narrativa visible por etapa.
 * Reforzada por Founder Daily Value Principle (una misión) +
 * Founder Travel Companion First (permisos sólo cuando aportan valor).
 */
export const STAGE_EXPERIENCE: Record<TravelStage, StageExperience> = {
  inspiration: {
    stage: "inspiration",
    label: "Inspiración",
    tone: "curious",
    eyebrow: "Deja que el Oriente Maya te sorprenda",
    greeting: (n) => (n ? `${n}, ¿y si hoy descubres algo nuevo?` : "¿Y si hoy descubres algo nuevo?"),
    narrative:
      "Alux te acompaña en la etapa más libre del viaje: soñar. Aún no necesitas fechas, ni itinerario, ni permisos. Solo curiosidad.",
    primaryCtaLabel: "Explorar Oriente Maya",
    primaryCtaHref: "/oriente-maya",
    secondary: [
      "Descubre destinos icónicos y menos conocidos",
      "Guarda lo que te inspire; después construimos el viaje",
    ],
    accentClass: "bg-primary/5",
  },
  exploration: {
    stage: "exploration",
    label: "Exploración",
    tone: "warm",
    eyebrow: "Estás explorando",
    greeting: (n) => (n ? `Bien hecho, ${n}. Sigamos afinando lo que te gustará.` : "Sigamos afinando lo que te gustará."),
    narrative:
      "Alux ya conoce lo básico de ti. Ahora te muestra experiencias y lugares alineados con tu estilo. No pediremos tu ubicación en esta etapa.",
    primaryCtaLabel: "Ver recomendaciones para ti",
    primaryCtaHref: "/oriente-maya",
    secondary: [
      "Marca favoritos para calibrar mejor las sugerencias",
      "Cuando tengas fechas, pasamos a Planeación",
    ],
    accentClass: "bg-accent/20",
  },
  planning: {
    stage: "planning",
    label: "Planeación",
    tone: "focused",
    eyebrow: "Estás armando tu viaje",
    greeting: (n) => (n ? `Vamos, ${n}. Completemos tu itinerario.` : "Completemos tu itinerario."),
    narrative:
      "Alux te ayuda a decidir qué falta: días, prioridades, combinaciones. Todo se guarda en tu Travel Plan. Aún no necesitamos ubicación.",
    primaryCtaLabel: "Continuar mi viaje",
    primaryCtaHref: "/mi-viaje",
    secondary: [
      "Alux propone; tú confirmas siempre",
      "El concierge humano queda a un clic cuando lo pidas",
    ],
    accentClass: "bg-secondary/40",
  },
  pre_trip: {
    stage: "pre_trip",
    label: "Pre-viaje",
    tone: "prepared",
    eyebrow: "Faltan pocos días",
    greeting: (n) => (n ? `${n}, revisemos lo que falta antes de salir.` : "Revisemos lo que falta antes de salir."),
    narrative:
      "Alux prepara documentos, reservas y llegada. Este es un buen momento para activar el acompañamiento en tiempo real durante el viaje.",
    primaryCtaLabel: "Revisar mi checklist",
    primaryCtaHref: "/mi-viaje",
    secondary: [
      "Documentos, vouchers y confirmaciones a la mano",
      "El día que llegues, Alux ya estará contigo en el destino",
    ],
    permissionCue: {
      permission: "notifications",
      title: "Activa avisos del viaje",
      benefit:
        "Te avisaremos sólo cosas útiles: cambios de horario, recordatorios de reserva y llegada al destino. Puedes desactivarlo cuando quieras.",
      ctaLabel: "Activar avisos",
    },
    accentClass: "bg-primary/10",
  },
  on_trip: {
    stage: "on_trip",
    label: "En destino",
    tone: "live",
    eyebrow: "Estás en el Oriente Maya",
    greeting: (n) => (n ? `${n}, esto es lo más importante para hoy.` : "Esto es lo más importante para hoy."),
    narrative:
      "Ahora la ubicación sí aporta valor inmediato: distancias reales, tiempos de traslado y qué hacer ahora mismo cerca de ti. Sin ella, Alux sigue funcionando; con ella, te acompaña mucho mejor.",
    primaryCtaLabel: "Ver mi día",
    primaryCtaHref: "/mi-viaje",
    secondary: [
      "Alux prioriza lo cercano y lo abierto ahora",
      "El concierge está disponible si algo cambia",
    ],
    permissionCue: {
      permission: "geolocation",
      title: "Activa acompañamiento en tiempo real",
      benefit:
        "Con tu ubicación podemos mostrarte qué hacer cerca, cuánto tardas en llegar y qué está abierto ahora. Es reversible en cualquier momento.",
      ctaLabel: "Activar ubicación",
    },
    accentClass: "bg-success/15",
  },
  post_trip: {
    stage: "post_trip",
    label: "Post-viaje",
    tone: "reflective",
    eyebrow: "El viaje no termina aquí",
    greeting: (n) => (n ? `Bienvenido de vuelta, ${n}.` : "Bienvenido de vuelta."),
    narrative:
      "Alux guarda tus recuerdos, aprende contigo y prepara el siguiente viaje. Cada experiencia hace más inteligente tu Pasaporte de Viajero.",
    primaryCtaLabel: "Ver mi Pasaporte",
    primaryCtaHref: "/cuenta/mi-viaje",
    secondary: [
      "Comparte reseñas y ayuda a otros viajeros",
      "Recibe ideas para tu próximo Oriente Maya",
    ],
    accentClass: "bg-warning/10",
  },
};

export function getStageExperience(stage: TravelStage): StageExperience {
  return STAGE_EXPERIENCE[stage];
}

export const ALL_STAGES: TravelStage[] = [
  "inspiration",
  "exploration",
  "planning",
  "pre_trip",
  "on_trip",
  "post_trip",
];