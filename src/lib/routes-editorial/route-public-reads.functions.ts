/**
 * Lote 3C · Server functions públicas de Rutas / Itinerarios.
 * Wrapper delgado: la lógica vive en `route-public-reads.server.ts`.
 * Sólo lectura, sin sesión (SSR de rutas públicas).
 */
import { createServerFn } from "@tanstack/react-start";
import type {
  EditorialRouteCardDTO,
  EditorialRouteDetailDTO,
} from "./route-public-contract";

const SLUG = /^[a-z0-9-]{1,120}$/;

export const listPublicRoutes = createServerFn({ method: "GET" })
  .inputValidator((input?: { destino?: string | null; limit?: number }) => ({
    destino:
      typeof input?.destino === "string" && SLUG.test(input.destino) ? input.destino : null,
    limit: typeof input?.limit === "number" ? Math.min(Math.max(input.limit, 1), 48) : 48,
  }))
  .handler(async ({ data }): Promise<EditorialRouteCardDTO[]> => {
    const { readPublishedRouteCards } = await import("./route-public-reads.server");
    return readPublishedRouteCards({ destinationSlug: data.destino, limit: data.limit });
  });

export const getPublicRoute = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => {
    if (!input || !SLUG.test(input.slug ?? "")) throw new Error("invalid_slug");
    return { slug: input.slug };
  })
  .handler(async ({ data }): Promise<EditorialRouteDetailDTO | null> => {
    const { readPublicRoute } = await import("./route-public-reads.server");
    return readPublicRoute(data.slug);
  });
