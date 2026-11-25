import { describe, expect, test } from "vitest";
import { HOME_PREMIUM_G4_CONTENT } from "../../../src/components/home-premium/home-premium-content";
import {
  mergeHomeRealContent,
  resolveHomeSectionVisibility,
} from "../../../src/components/home-premium/home-premium-real";
import type { HomeRealContent } from "../../../src/lib/experience-builder/smart-blocks.server";

const corpus: HomeRealContent = {
  destinos: [
    ["Valladolid", "valladolid", true],
    ["Chichén Itzá", "chichen-itza", false],
    ["Ek Balam", "ek-balam", false],
    ["El Cuyo", "el-cuyo", false],
    ["Espita", "espita", true],
    ["Izamal", "izamal", true],
  ].map(([title, slug, puebloMagico]) => ({
    businessId: null,
    title: String(title),
    subtitle: "",
    category: "Destino",
    href: `/oriente-maya/${slug}`,
    mediaUrl: "",
    puebloMagico: puebloMagico === true,
  })),
  experiencias: [],
  stays: [],
  food: [],
  eventos: [],
  rutas: [],
  mapPoints: [],
  mediaAssets: {},
};

describe("Pueblos Mágicos independently of Destinos selection", () => {
  test("Valladolid, Izamal and Espita survive the four-destination limit", () => {
    const result = mergeHomeRealContent(HOME_PREMIUM_G4_CONTENT, corpus, {}, { destinos: 4 });
    expect(result.destinos.items.map((item) => item.name)).toEqual([
      "Valladolid",
      "Chichén Itzá",
      "Ek Balam",
      "El Cuyo",
    ]);
    expect(result.pueblosMagicos.items?.map((item) => item.name)).toEqual([
      "Valladolid",
      "Espita",
      "Izamal",
    ]);
    expect(result.pueblosMagicos.items).toHaveLength(3);
  });

  test("only published corpus entries appear, without inventing missing towns", () => {
    const result = mergeHomeRealContent(
      HOME_PREMIUM_G4_CONTENT,
      {
        ...corpus,
        destinos: corpus.destinos.slice(0, 1),
      },
      {},
      { destinos: 1 },
    );
    expect(result.pueblosMagicos.items?.map((item) => item.href)).toEqual([
      "/oriente-maya/valladolid",
    ]);
  });

  test("a non-magic first destination does not hide published magic towns", () => {
    const result = mergeHomeRealContent(
      HOME_PREMIUM_G4_CONTENT,
      {
        ...corpus,
        destinos: corpus.destinos.slice(1),
      },
      {},
      { destinos: 1 },
    );
    expect(result.destinos.items[0]?.name).toBe("Chichén Itzá");
    expect(resolveHomeSectionVisibility(result, {}).pueblosMagicos).toBe(true);
    expect(resolveHomeSectionVisibility(result, { pueblosMagicos: false }).pueblosMagicos).toBe(
      false,
    );
  });

  test("empty CMS corpus clears previous selection and hides the section", () => {
    const previous = mergeHomeRealContent(HOME_PREMIUM_G4_CONTENT, corpus, {}, { destinos: 4 });
    const result = mergeHomeRealContent(previous, { ...corpus, destinos: [] }, {}, { destinos: 4 });
    expect(result.pueblosMagicos.items).toEqual([]);
    expect(resolveHomeSectionVisibility(result, {}).pueblosMagicos).toBe(false);
  });
});
