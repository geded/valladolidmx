/**
 * Alux · Resumen de reseñas (contrato compartido, browser-safe).
 *
 * Fuente: resumen oficial de reseñas de Google Maps (Places API New,
 * campo `reviewSummary`, generado por Gemini). Reglas de Google que este
 * contrato hace cumplir:
 *  · el texto se muestra tal cual (Alux no lo reescribe ni lo pasa al modelo);
 *  · encabezado «Resumen de reseñas» + texto de divulgación debajo;
 *  · enlaces «Acerca de este resumen», «Reportar» y «Ver reseñas»;
 *  · sólo se conserva el identificador de Google del lugar, nunca el texto.
 *
 * Productos y eventos muestran las reseñas de su negocio; un evento sin
 * negocio muestra las de su sede (p. ej. la iglesia del video mapping).
 *
 * Dos momentos del viajero (Alux concierge, no chat):
 *  · planeando → «Estás explorando {nombre}.»
 *  · en sitio (ubicación concedida y cerca) → «Estás a 150 m de {nombre}.»
 */
import { formatDistance, haversineKm, type GeoPoint } from "./proximity";

export type ReviewEntityKind = "business" | "place" | "product" | "event";

export interface ReviewEntityRef {
  readonly kind: ReviewEntityKind;
  readonly id: string;
}

/** Distancia máxima entre nuestra ubicación y la de Google para aceptar el vínculo. */
export const REVIEW_MATCH_MAX_METERS = 250;
/** Si Google no encontró el negocio, no se vuelve a buscar antes de estos días. */
export const REVIEW_MATCH_RETRY_DAYS = 30;
/** Más allá de esta distancia el viajero no está «en sitio»: se trata como planeación. */
export const REVIEW_ONSITE_MAX_KM = 20;

export const GOOGLE_SUMMARY_ABOUT_URL = "https://support.google.com/local-listings/answer/9851099";
export const REVIEW_SUMMARY_HEADING = "Resumen de reseñas";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseReviewEntityRef(ref: string | null | undefined): ReviewEntityRef | null {
  if (typeof ref !== "string") return null;
  const [kind, id, ...rest] = ref.split(":");
  if (rest.length > 0 || !id || !UUID.test(id)) return null;
  if (kind !== "business" && kind !== "place" && kind !== "product" && kind !== "event")
    return null;
  return { kind, id: id.toLowerCase() };
}

/** Acepta el lugar de Google sólo si está a ≤ 250 m de nuestras coordenadas. */
export function isAcceptableGoogleMatch(ours: GeoPoint, google: GeoPoint): boolean {
  return haversineKm(ours, google) * 1000 <= REVIEW_MATCH_MAX_METERS;
}

/** ¿Toca volver a buscar el vínculo con Google? */
export function shouldRetryMatch(lastAttemptIso: string | null, nowMs = Date.now()): boolean {
  if (!lastAttemptIso) return true;
  const last = Date.parse(lastAttemptIso);
  if (!Number.isFinite(last)) return true;
  return nowMs - last >= REVIEW_MATCH_RETRY_DAYS * 24 * 60 * 60 * 1000;
}

export type TravelerMoment = "planning" | "onsite";

export function resolveTravelerMoment(
  traveler: GeoPoint | null,
  entity: GeoPoint | null,
): { moment: TravelerMoment; distanceKm: number | null } {
  if (!traveler || !entity) return { moment: "planning", distanceKm: null };
  const km = haversineKm(traveler, entity);
  return km <= REVIEW_ONSITE_MAX_KM
    ? { moment: "onsite", distanceKm: km }
    : { moment: "planning", distanceKm: null };
}

/** Frase con la que Alux presenta el resumen (fuera del texto de Google). */
export function buildReviewSummaryIntro(input: {
  readonly name: string;
  readonly moment: TravelerMoment;
  readonly distanceKm?: number | null;
}): string {
  const lead =
    input.moment === "onsite"
      ? `Estás ${formatDistance(input.distanceKm ?? undefined) ?? "cerca"} de ${input.name}.`
      : `Estás explorando ${input.name}.`;
  return `${lead} Este es un resumen basado en las reseñas de ${input.name}:`;
}

export interface AluxReviewSummaryDTO {
  readonly available: true;
  /** Nombre en Valladolid.mx de quien recibe las reseñas (negocio o lugar). */
  readonly subjectName: string;
  readonly subjectCoords: GeoPoint | null;
  /** Texto de Google, sin modificar. */
  readonly text: string;
  readonly disclosureText: string;
  readonly reviewsUri: string | null;
  readonly flagContentUri: string | null;
}

export type AluxReviewSummaryResult = AluxReviewSummaryDTO | { readonly available: false };
