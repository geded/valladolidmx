/**
 * G8-Q2D-B · Server functions de lectura de la ficha de Lugar.
 *
 * Wrapper delgado: toda la lógica vive en `place-public-reads.server.ts`.
 *  - `getPublicPlace`: pública, sólo lugares `published`.
 *  - `getPlacePreview`: autenticada y restringida a staff editorial; permite
 *    ver borradores marcados como “Borrador · no publicado”.
 * Ninguna de las dos publica ni cambia estados.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PublicPlaceDTO } from "./place-public-contract";

const SLUG = /^[a-z0-9-]{1,120}$/;

export const getPublicPlace = createServerFn({ method: "GET" })
  .inputValidator((input: { destinationSlug: string; placeSlug: string }) => {
    if (!input || !SLUG.test(input.destinationSlug ?? "") || !SLUG.test(input.placeSlug ?? ""))
      throw new Error("invalid_slug");
    return input;
  })
  .handler(async ({ data }): Promise<PublicPlaceDTO | null> => {
    const { readPublicPlace } = await import("./place-public-reads.server");
    return readPublicPlace({
      destinationSlug: data.destinationSlug,
      placeSlug: data.placeSlug,
      allowUnpublished: false,
    });
  });

export const getPlacePreview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { destinationSlug: string; placeSlug: string }) => {
    if (!input || !SLUG.test(input.destinationSlug ?? "") || !SLUG.test(input.placeSlug ?? ""))
      throw new Error("invalid_slug");
    return input;
  })
  .handler(async ({ data, context }): Promise<PublicPlaceDTO | null> => {
    const ctx = context as unknown as { supabase: unknown; userId: string };
    const { assertPlacePreviewStaff, readPublicPlace } =
      await import("./place-public-reads.server");
    await assertPlacePreviewStaff(ctx.supabase, ctx.userId);
    return readPublicPlace({
      destinationSlug: data.destinationSlug,
      placeSlug: data.placeSlug,
      allowUnpublished: true,
      client: ctx.supabase,
    });
  });
