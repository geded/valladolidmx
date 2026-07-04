/**
 * H-03 · Ola I3.c — `vmx.experience.institutional-badges`
 *
 * Registry oficial de Institutional Badges. Fuente única de verdad para
 * `kind`, iconografía, token de color, prioridad institucional y
 * restricciones (p. ej. Pueblos Mágicos autorizados).
 *
 * Regla vinculante (memoria): ningún componente hardcodea badges. Toda
 * incorporación de un `kind` nuevo o de un destino autorizado se hace
 * exclusivamente aquí, con evidencia oficial del organismo emisor.
 */
import {
  Award,
  BadgeCheck,
  Landmark,
  MapPin,
  ShieldCheck,
  Sparkles,
  Sun,
  Trophy,
  Compass,
  Star,
  type LucideIcon,
} from "lucide-react";

export const BADGE_KINDS = [
  "pueblo-magico",
  "patrimonio",
  "oriente-maya",
  "despierta-en-valladolid",
  "award",
  "official-recognition",
  "certification",
  "verified-business",
  "alux-recommended",
  "custom",
] as const;
export type BadgeKind = (typeof BADGE_KINDS)[number];

export interface BadgeRegistryEntry {
  kind: BadgeKind;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  /** Nombre del token semántico (sin el prefijo `--color-`). */
  colorToken: string;
  /** Prioridad institucional — orden fijo, no configurable. */
  priority: number;
  /** Grupo jerárquico (Directiva Founder). */
  group: "identity" | "recognition" | "trust" | "custom";
  programUrl?: string;
  tooltip: string;
  /** Restricciones opcionales (p. ej. Pueblos Mágicos autorizados). */
  restrictedSlugs?: string[];
}

/**
 * Pueblos Mágicos del Oriente Maya autorizados (memoria vinculante).
 * Nuevas incorporaciones requieren PR dedicado con evidencia oficial.
 */
export const PUEBLOS_MAGICOS_AUTORIZADOS = ["valladolid", "izamal", "espita"] as const;

export const INSTITUTIONAL_BADGE_REGISTRY: Record<BadgeKind, BadgeRegistryEntry> = {
  "pueblo-magico": {
    kind: "pueblo-magico",
    label: "Pueblo Mágico",
    shortLabel: "P. Mágico",
    icon: Sparkles,
    colorToken: "badge-pueblo-magico",
    priority: 10,
    group: "identity",
    tooltip: "Distintivo Pueblo Mágico otorgado por la SECTUR",
    restrictedSlugs: [...PUEBLOS_MAGICOS_AUTORIZADOS],
  },
  patrimonio: {
    kind: "patrimonio",
    label: "Patrimonio",
    shortLabel: "Patrimonio",
    icon: Landmark,
    colorToken: "badge-patrimonio",
    priority: 20,
    group: "identity",
    tooltip: "Patrimonio cultural reconocido",
  },
  "oriente-maya": {
    kind: "oriente-maya",
    label: "Oriente Maya de Yucatán",
    shortLabel: "Oriente Maya",
    icon: Compass,
    colorToken: "badge-oriente-maya",
    priority: 30,
    group: "identity",
    tooltip: "Marca territorial Oriente Maya de Yucatán",
  },
  "despierta-en-valladolid": {
    kind: "despierta-en-valladolid",
    label: "Despierta en Valladolid",
    shortLabel: "Despierta",
    icon: Sun,
    colorToken: "badge-despierta",
    priority: 40,
    group: "identity",
    tooltip: "Programa oficial Despierta en Valladolid",
  },
  award: {
    kind: "award",
    label: "Premio",
    shortLabel: "Premio",
    icon: Trophy,
    colorToken: "badge-award",
    priority: 50,
    group: "recognition",
    tooltip: "Reconocimiento otorgado por institución oficial",
  },
  "official-recognition": {
    kind: "official-recognition",
    label: "Reconocimiento oficial",
    shortLabel: "Reconocimiento",
    icon: Award,
    colorToken: "badge-recognition",
    priority: 60,
    group: "recognition",
    tooltip: "Reconocimiento institucional adicional",
  },
  certification: {
    kind: "certification",
    label: "Certificación",
    shortLabel: "Certificado",
    icon: ShieldCheck,
    colorToken: "badge-certification",
    priority: 70,
    group: "recognition",
    tooltip: "Certificación oficial vigente",
  },
  "verified-business": {
    kind: "verified-business",
    label: "Empresa Verificada",
    shortLabel: "Verificada",
    icon: BadgeCheck,
    colorToken: "badge-verified",
    priority: 80,
    group: "trust",
    tooltip: "Empresa verificada por Valladolid.mx",
  },
  "alux-recommended": {
    kind: "alux-recommended",
    label: "Recomendado por Alux",
    shortLabel: "Alux",
    icon: Star,
    colorToken: "badge-alux",
    priority: 90,
    group: "trust",
    tooltip: "Recomendación validada por Alux, el asistente oficial",
  },
  custom: {
    kind: "custom",
    label: "Distintivo",
    shortLabel: "Distintivo",
    icon: MapPin,
    colorToken: "badge-neutral",
    priority: 100,
    group: "custom",
    tooltip: "Distintivo institucional",
  },
};

export function getBadgeRegistryEntry(kind: BadgeKind): BadgeRegistryEntry {
  return INSTITUTIONAL_BADGE_REGISTRY[kind] ?? INSTITUTIONAL_BADGE_REGISTRY.custom;
}

/** Autorización institucional (§12: `pueblo-magico` sólo en destinos autorizados). */
export function isBadgeAuthorized(kind: BadgeKind, subjectSlug?: string): boolean {
  const entry = getBadgeRegistryEntry(kind);
  if (!entry.restrictedSlugs) return true;
  if (!subjectSlug) return false;
  return entry.restrictedSlugs.includes(subjectSlug.toLowerCase());
}