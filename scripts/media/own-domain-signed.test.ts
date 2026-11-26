import { describe, expect, it } from "vitest";
import { toOwnDomainSignedUrl } from "../../src/lib/media/own-domain-signed";
const H = "https://abc123.supabase.co/storage/v1/object/sign/";
describe("fotos firmadas bajo dominio propio", () => {
  it("convierte imágenes", () => {
    expect(toOwnDomainSignedUrl(`${H}destinations/a/b.jpg?token=x.y.z`)).toBe("/api/public/signed/destinations/a/b.jpg?token=x.y.z");
  });
  it("no toca documentos", () => {
    expect(toOwnDomainSignedUrl(`${H}docs/a.pdf?token=t`)).toBe(`${H}docs/a.pdf?token=t`);
  });
});
