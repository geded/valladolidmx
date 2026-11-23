/**
 * `/<categoría>/<empresa>` — Enlace corto de promoción de una empresa.
 *
 * Redirige 301 a la ficha canónica `/oriente-maya/:destino/:categoria/:empresa`
 * (misma plantilla, mismo Alux). Las rutas estáticas existentes
 * (`/eventos/:slug`, `/rutas/:slug`, `/oriente-maya/...`) conservan prioridad.
 * Cualquier otra combinación responde 404.
 */
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { resolveBusinessShortLink } from "@/lib/navigation/short-links.functions";

export const Route = createFileRoute("/$categoria/$empresa")({
  beforeLoad: async ({ params }) => {
    const href = await resolveBusinessShortLink({
      data: { categoria: params.categoria, empresa: params.empresa },
    }).catch(() => null);
    if (href) throw redirect({ href, code: 301 });
    throw notFound();
  },
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
  component: () => null,
});
