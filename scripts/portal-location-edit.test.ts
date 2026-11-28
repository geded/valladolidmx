import { describe, expect, it } from "vitest";
import { locationEditorPatch } from "../src/lib/portal/location-editor";

describe("existing location edit payload", () => {
  it("preserves precise coordinates and principal status while changing editable text", () => {
    const patch = locationEditorPatch({
      label: " Recepción ",
      address: " Carretera Yalcobá–Cuncunul km 4 ",
      references: " Yalcobá ",
      postalCode: " 97780 ",
      latitude: "20.8415917219258",
      longitude: "-88.0109170846558",
      primary: true,
    });
    expect(patch.latitude).toBe(20.8415917219258);
    expect(patch.longitude).toBe(-88.0109170846558);
    expect(patch.is_primary).toBe(true);
    expect(patch.address_line1).toBe("Carretera Yalcobá–Cuncunul km 4");
    expect(patch).not.toHaveProperty("destination_zone_id");
    expect(patch).not.toHaveProperty("business_id");
    expect(patch).not.toHaveProperty("id");
  });
  it("keeps optional blank coordinates empty rather than moving a location to zero", () => {
    const patch = locationEditorPatch({
      label: "",
      address: "",
      references: "",
      postalCode: "",
      latitude: " ",
      longitude: "",
      primary: false,
    });
    expect(patch.latitude).toBeNull();
    expect(patch.longitude).toBeNull();
    expect(patch.is_primary).toBe(false);
  });
});
