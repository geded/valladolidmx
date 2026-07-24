export const OMXDS_CARD_VARIANTS = [
  "compact",
  "standard",
  "editorial",
  "featured",
] as const;

export type OmxdsCardVariant = (typeof OMXDS_CARD_VARIANTS)[number];
export type OmxdsCardTheme = "sol" | "luna";
export type OmxdsCardFamily = "destination" | "business";

export interface CardActionContract {
  id: "save" | "add_to_trip" | "discover";
  label: string;
  href?: string;
}

export interface CardAnalyticsEvent {
  event: "card_action";
  entityId: string;
  family: OmxdsCardFamily;
  variant: OmxdsCardVariant;
  action: CardActionContract["id"];
}

export function createCardAnalyticsEvent(
  entityId: string,
  variant: OmxdsCardVariant,
  action: CardActionContract["id"],
  family: OmxdsCardFamily = "destination",
): CardAnalyticsEvent {
  return { event: "card_action", entityId, family, variant, action };
}

export function hasAnalyticsPii(event: CardAnalyticsEvent): boolean {
  return /email|phone|name|address|user/i.test(JSON.stringify(event));
}
