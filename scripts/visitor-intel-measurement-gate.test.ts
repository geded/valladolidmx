import { describe, expect, it } from "vitest";

import { classifyMeasurement } from "../src/lib/visitor-intel/measurement-gate";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
const real = { hostname: "www.quehacerenvalladolid.com", userAgent: IPHONE, webdriver: false };

describe("monitor de visitantes · sólo visitas reales del sitio publicado", () => {
  it("cuenta una persona en el sitio publicado", () => {
    expect(classifyMeasurement(real)).toBe("measured");
    expect(classifyMeasurement({ ...real, hostname: "quehacerenvalladolid.com" })).toBe("measured");
    expect(classifyMeasurement({ ...real, hostname: "valladolidmx.lovable.app" })).toBe("measured");
  });

  it("no cuenta la vista previa del editor ni el servidor local", () => {
    expect(
      classifyMeasurement({
        ...real,
        hostname: "id-preview--fd89b51f-9afc-4e15-8ee2-21fe468f6aa9.lovable.app",
      }),
    ).toBe("non_production_host");
    expect(classifyMeasurement({ ...real, hostname: "localhost" })).toBe("non_production_host");
  });

  it("no cuenta navegadores automatizados", () => {
    expect(classifyMeasurement({ ...real, webdriver: true })).toBe("automated_browser");
  });

  it("no cuenta robots declarados", () => {
    for (const ua of [
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 HeadlessChrome/120.0 Safari/537.36",
      "Mozilla/5.0 (compatible; Bytespider; spider-feedback@bytedance.com)",
      "",
    ]) {
      expect(classifyMeasurement({ ...real, userAgent: ua })).toBe("declared_bot");
    }
  });

  it("sí cuenta personas desde el navegador interno de WhatsApp, Instagram o Facebook", () => {
    for (const ua of [
      `${IPHONE} Instagram 350.0.0.0`,
      `${IPHONE} [FBAN/FBIOS;FBAV/480.0]`,
      "Mozilla/5.0 (Linux; Android 14; Cubot X30) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36 WhatsApp/2.24",
    ]) {
      expect(classifyMeasurement({ ...real, userAgent: ua })).toBe("measured");
    }
  });
});
