/**
 * Discovery library barrel (15.10.5d.1).
 */
export {
  buildPublicHead,
  DISCOVERY_ORIGIN,
  type DiscoveryHead,
  type DiscoveryHeadOptions,
  type DiscoveryOgType,
} from "./seo";

export {
  DISCOVERY_CARDS_REGISTRY,
  getDiscoveryCard,
  listDiscoveryCardKinds,
  type DiscoveryCardKind,
  type DiscoveryCardDefinition,
} from "./cards-registry";

export {
  DISCOVERY_SECTIONS_REGISTRY,
  getDiscoverySection,
  listDiscoverySectionKinds,
  listSectionsForSurface,
  type DiscoverySectionKind,
  type DiscoverySectionDefinition,
} from "./sections-registry";