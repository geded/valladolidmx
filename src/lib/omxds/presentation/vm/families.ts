/**
 * G4-SYSTEM-02 · Mappers por familia del runtime premium.
 *
 * Cada familia (home, territorio, destino, hotel, restaurante,
 * experiencia, evento, casa de vacaciones, ruta) expone un único
 * mapper `toXxxPremiumVM()` que produce el mismo contrato de
 * view-models. Editorial y Cinematográfica son PRESENTACIONES de estos
 * mismos view-models: jamás dos modelos de datos ni dos plantillas.
 *
 * Prohibido añadir aquí lógica de negocio, acceso a datos, mapas
 * alternos o persistencia.
 */
import type { PremiumCrumb, PremiumGalleryLayout } from "../premium-presentation";
import type {
  PremiumGalleryVM,
  PremiumHeroVM,
  PremiumSectionVM,
  PremiumSurfaceFamily,
} from "../premium-view-models";
import {
  toPremiumCrumbs,
  toPremiumGalleryVM,
  toPremiumHeroVM,
  type PremiumEntitySource,
} from "./common";

/** Resultado único que consumen previews y superficies. */
export interface PremiumSurfaceVM {
  family: PremiumSurfaceFamily;
  hero: PremiumHeroVM;
  gallery: PremiumGalleryVM;
  crumbs: PremiumCrumb[];
}

/** Eyebrow editorial por defecto de cada familia. */
export const PREMIUM_FAMILY_EYEBROW: Record<PremiumSurfaceFamily, string> = {
  home: "Oriente Maya de Yucatán",
  territory: "Territorio",
  destination: "Destino",
  hotel: "Hospedaje",
  restaurant: "Cocina",
  experience: "Experiencia",
  event: "Evento",
  "vacation-home": "Casa de vacaciones",
  route: "Ruta",
};

/** Constructor compartido: ninguna familia duplica esta composición. */
export function toPremiumSurfaceVM(
  family: PremiumSurfaceFamily,
  source: PremiumEntitySource,
  options: { galleryLayout?: PremiumGalleryLayout; crumbTail?: readonly PremiumCrumb[] } = {},
): PremiumSurfaceVM {
  return {
    family,
    hero: toPremiumHeroVM(family, source, { eyebrow: PREMIUM_FAMILY_EYEBROW[family] }),
    gallery: toPremiumGalleryVM(source, options.galleryLayout),
    crumbs: toPremiumCrumbs(source, options.crumbTail ?? []),
  };
}

type FamilyOptions = Parameters<typeof toPremiumSurfaceVM>[2];

export const toHomePremiumVM = (source: PremiumEntitySource, options?: FamilyOptions) =>
  toPremiumSurfaceVM("home", source, options);

export const toTerritoryPremiumVM = (source: PremiumEntitySource, options?: FamilyOptions) =>
  toPremiumSurfaceVM("territory", source, options);

export const toDestinationPremiumVM = (source: PremiumEntitySource, options?: FamilyOptions) =>
  toPremiumSurfaceVM("destination", source, options);

export const toHotelPremiumVM = (source: PremiumEntitySource, options?: FamilyOptions) =>
  toPremiumSurfaceVM("hotel", source, options);

export const toRestaurantPremiumVM = (source: PremiumEntitySource, options?: FamilyOptions) =>
  toPremiumSurfaceVM("restaurant", source, options);

export const toExperiencePremiumVM = (source: PremiumEntitySource, options?: FamilyOptions) =>
  toPremiumSurfaceVM("experience", source, options);

export const toEventPremiumVM = (source: PremiumEntitySource, options?: FamilyOptions) =>
  toPremiumSurfaceVM("event", source, options);

export const toVacationHomePremiumVM = (source: PremiumEntitySource, options?: FamilyOptions) =>
  toPremiumSurfaceVM("vacation-home", source, options);

export const toRoutePremiumVM = (source: PremiumEntitySource, options?: FamilyOptions) =>
  toPremiumSurfaceVM("route", source, options);

/** Encabezado de sección normalizado (mismo ritmo en todas las familias). */
export function toPremiumSectionVM(input: {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  action?: PremiumSectionVM["action"];
}): PremiumSectionVM {
  const vm: PremiumSectionVM = { title: input.title.trim() };
  if (input.id) vm.id = input.id;
  if (input.eyebrow) vm.eyebrow = input.eyebrow;
  if (input.description) vm.description = input.description;
  if (input.action) vm.action = input.action;
  return vm;
}
