import { describe, expect, it } from "vitest";
import { destinationRelatedBucketToItems } from "@/lib/experience-builder/adapters/destination-related-to-block";
import type { MarketplaceBusinessCard } from "@/lib/catalog/marketplace-reads.functions";

const hotel = {
  id: "b1",
  slug: "nikau-hotel-el-cuyo",
  display_name: "Nikau Hotel El Cuyo",
  tagline: "",
  verified: false,
  destination_slug: "el-cuyo",
  category_slug: "hoteles",
} as unknown as MarketplaceBusinessCard;

describe("enlaces de empresas en la página del destino", () => {
  it("abren la ficha territorial de la empresa", () => {
    const [item] = destinationRelatedBucketToItems([hotel], "business");
    expect(item?.href).toBe("/oriente-maya/el-cuyo/hoteles/nikau-hotel-el-cuyo");
  });
});
