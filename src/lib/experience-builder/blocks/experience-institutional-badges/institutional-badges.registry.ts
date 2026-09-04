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
import { getAuthorizedSlugs } from "@/lib/institutional/institutional-authority";


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
  /** Marca institucional acreditada. Cuando existe, sustituye al glifo genérico. */
  markSrc?: string;
  markAlt?: string;
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
  /** Política de verdad: registry, evidencia por item o bloqueo total. */
  verificationMode: "registry" | "evidence" | "disabled";
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
    markSrc: "/brand/institutional/pueblos-magicos-oficial.webp",
    markAlt: "Pueblos Mágicos de México",
    colorToken: "badge-pueblo-magico",
    priority: 10,
    group: "identity",
    tooltip: "Distintivo Pueblo Mágico otorgado por la SECTUR",
    restrictedSlugs: [...PUEBLOS_MAGICOS_AUTORIZADOS],
    verificationMode: "registry",
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
    verificationMode: "evidence",
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
    verificationMode: "registry",
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
    restrictedSlugs: ["valladolid"],
    verificationMode: "registry",
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
    verificationMode: "evidence",
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
    verificationMode: "evidence",
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
    verificationMode: "evidence",
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
    verificationMode: "evidence",
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
    verificationMode: "evidence",
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
    verificationMode: "disabled",
  },
};

export function getBadgeRegistryEntry(kind: BadgeKind): BadgeRegistryEntry {
  return INSTITUTIONAL_BADGE_REGISTRY[kind] ?? INSTITUTIONAL_BADGE_REGISTRY.custom;
}

/**
 * Autorización institucional (§12: `pueblo-magico` sólo en destinos
 * autorizados).
 *
 * Lote 3B · C — La autoridad vigente la administra el CMS
 * (`institutional.badges.authority`). El registry conserva
 * `restrictedSlugs` únicamente como FALLBACK seguro para cuando el CMS
 * todavía no se pronuncia sobre ese distintivo. Sigue prohibido añadir
 * condicionales por slug fuera de este punto.
 */
export function isBadgeAuthorized(kind: BadgeKind, subjectSlug?: string): boolean {
  const entry = getBadgeRegistryEntry(kind);
  const managed = getAuthorizedSlugs(kind);
  const restricted = managed ?? entry.restrictedSlugs;
  if (!restricted) return true;
  if (!subjectSlug) return false;
  return restricted.includes(subjectSlug.toLowerCase());
}


export interface BadgeEvidence {
  kind: BadgeKind;
  sourceOwner?: string;
  verificationStatus?: "verified" | "unverified" | "expired" | "legacy";
  verifiedAt?: string;
  expiresAt?: string;
  evidenceUrl?: string;
}

function isValidInstant(value: string | undefined): boolean {
  return Boolean(value) && !Number.isNaN(new Date(value as string).getTime());
}

export function isBadgeEligible(
  item: BadgeEvidence,
  subjectSlug?: string,
  now = new Date(),
): boolean {
  const entry = getBadgeRegistryEntry(item.kind);
  if (!isBadgeAuthorized(item.kind, subjectSlug)) return false;
  if (entry.verificationMode === "disabled") return false;
  if (entry.verificationMode === "registry") return true;
  if (item.verificationStatus !== "verified") return false;
  if (!item.sourceOwner?.trim() || !item.evidenceUrl || !isValidInstant(item.verifiedAt))
    return false;
  try {
    new URL(item.evidenceUrl);
  } catch {
    return false;
  }
  if (item.expiresAt) {
    if (!isValidInstant(item.expiresAt)) return false;
    if (new Date(item.expiresAt).getTime() <= now.getTime()) return false;
  }
  return true;
}

/* ------------------------------------------------------------------ *
 * Lote 3B — Fuente institucional única para destinos.
 *
 * Ninguna superficie, plantilla ni adaptador decide por sí misma qué
 * distintivos corresponden a un destino: todos consumen este helper, que
 * resuelve la autorización exclusivamente desde el registry
 * (`restrictedSlugs`). Prohibidos los condicionales por slug fuera de
 * este módulo (Institutional Badges Rule).
 * ------------------------------------------------------------------ */

/** Orden institucional de los distintivos aplicables a un destino. */
const DESTINATION_BADGE_KINDS: BadgeKind[] = [
  "pueblo-magico",
  "oriente-maya",
  "despierta-en-valladolid",
];

export interface DestinationBadgeItem {
  kind: BadgeKind;
  slug: string;
  source: "destination";
}

/**
 * Distintivos institucionales autorizados para un destino, en orden de
 * prioridad del registry. Devuelve `[]` para un slug vacío.
 */
export function buildDestinationBadgeItems(subjectSlug: string): DestinationBadgeItem[] {
  const slug = subjectSlug.trim().toLowerCase();
  if (!slug) return [];
  return DESTINATION_BADGE_KINDS.filter(
    (kind) =>
      isBadgeAuthorized(kind, slug) &&
      getBadgeRegistryEntry(kind).verificationMode !== "disabled",
  )
    .sort((a, b) => getBadgeRegistryEntry(a).priority - getBadgeRegistryEntry(b).priority)
    .map((kind) => ({ kind, slug: `${kind}:${slug}`, source: "destination" as const }));
}

/** Autorización Pueblo Mágico — único punto de verdad para toda la plataforma. */
export function isPuebloMagicoDestination(subjectSlug: string): boolean {
  return isBadgeAuthorized("pueblo-magico", subjectSlug);
}
