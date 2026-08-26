/** G4-SYSTEM-02 · Mappers ViewModel del runtime premium (punto único). */
export type {
  PremiumBadgeSource,
  PremiumDestinationRef,
  PremiumEntitySource,
  PremiumFactSource,
  PremiumMediaSource,
} from "./common";
export {
  toPremiumBadgesVM,
  toPremiumCrumbs,
  toPremiumEntityBadgesVM,
  toPremiumFactsVM,
  toPremiumGalleryVM,
  toPremiumHeroVM,
  toPremiumMediaListVM,
  toPremiumMediaVM,
} from "./common";
export type { PremiumSurfaceVM } from "./families";
export {
  PREMIUM_FAMILY_EYEBROW,
  toDestinationPremiumVM,
  toEventPremiumVM,
  toExperiencePremiumVM,
  toHomePremiumVM,
  toHotelPremiumVM,
  toPremiumSectionVM,
  toPremiumSurfaceVM,
  toRestaurantPremiumVM,
  toRoutePremiumVM,
  toTerritoryPremiumVM,
  toVacationHomePremiumVM,
} from "./families";
