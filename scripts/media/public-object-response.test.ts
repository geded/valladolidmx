import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ signedUrl: "https://storage.invalid/private?token=hidden" }));

vi.mock("@/lib/media/sign.server", () => ({
  unsafeGetSignedUrl: async () => ({ ok: true, url: state.signedUrl }),
}));

import { publicMediaObjectResponse } from "../../src/lib/media/public-object-response.server";

const request = () =>
  new Request("https://www.quehacerenvalladolid.com/api/public/studio-media/foto.webp");

describe("Entrega pública de imágenes sin revelar almacenamiento", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("entrega la imagen desde la misma URL, sin Location ni URL firmada", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(new Uint8Array([1, 2, 3]), {
            status: 200,
            headers: { "Content-Type": "image/webp", ETag: '"abc"', "Content-Length": "3" },
          }),
      ),
    );
    const response = await publicMediaObjectResponse({
      bucket: "studio-media",
      path: "foto.webp",
      request: request(),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/webp");
    expect(response.headers.get("Location")).toBeNull();
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("nunca sigue ni propaga una redirección del almacenamiento", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () => new Response(null, { status: 302, headers: { Location: state.signedUrl } }),
      ),
    );
    const response = await publicMediaObjectResponse({
      bucket: "media-derived",
      path: "800/foto.webp",
      request: request(),
    });
    expect(response.status).toBe(502);
    expect(response.headers.get("Location")).toBeNull();
  });

  it("rechaza contenido que no sea imagen aunque la ruta exista", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () => new Response("<html></html>", { headers: { "Content-Type": "text/html" } }),
      ),
    );
    const response = await publicMediaObjectResponse({
      bucket: "studio-media",
      path: "foto.webp",
      request: request(),
    });
    expect(response.status).toBe(502);
  });

  it("conserva una respuesta 304 sin descargar contenido", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 304 })),
    );
    const response = await publicMediaObjectResponse({
      bucket: "studio-media",
      path: "foto.webp",
      request: request(),
    });
    expect(response.status).toBe(304);
    expect(response.body).toBeNull();
  });
});
