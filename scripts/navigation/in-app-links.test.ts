import { describe, expect, it } from "vitest";
import { inAppPath } from "@/lib/navigation/in-app-links";

const here = { origin: "https://www.quehacerenvalladolid.com", href: "https://www.quehacerenvalladolid.com/oriente-maya/valladolid" };

describe("enlaces internos sin recargar el sitio", () => {
  it("una tarjeta de empresa navega dentro de la app", () => {
    expect(inAppPath({ href: "/oriente-maya/valladolid/hoteles/casa-quetzal-valladolid" }, here)).toBe(
      "/oriente-maya/valladolid/hoteles/casa-quetzal-valladolid",
    );
  });
  it("otro sitio, nueva pestaña o descarga los abre el navegador", () => {
    expect(inAppPath({ href: "https://www.google.com/maps" }, here)).toBeNull();
    expect(inAppPath({ href: "/eventos", target: "_blank" }, here)).toBeNull();
    expect(inAppPath({ href: "/eventos", download: true }, here)).toBeNull();
  });
  it("direcciones del servidor y archivos no pasan por la app", () => {
    expect(inAppPath({ href: "/api/public/maps/static" }, here)).toBeNull();
    expect(inAppPath({ href: "/sitemap.xml" }, here)).toBeNull();
    expect(inAppPath({ href: "/docs/menu.pdf" }, here)).toBeNull();
  });
  it("un ancla en la misma página la desplaza el navegador", () => {
    expect(inAppPath({ href: "#hoteles" }, here)).toBeNull();
  });
});
