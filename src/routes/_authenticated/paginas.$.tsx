/**
 * /paginas/* — Redirect legacy hacia el Studio único.
 *
 * 15.10.4d · Single Studio Principle. Las rutas /paginas y /paginas/inicio
 * quedaron retiradas al unificar el editor dentro del Experience Builder
 * oficial (/cms/experience-builder, modo Visual predeterminado).
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/paginas/$")({
  beforeLoad: () => {
    throw redirect({ to: "/cms/experience-builder", search: { mode: "visual", page: "home", block: undefined } });
  },
});