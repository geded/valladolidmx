/**
 * /paginas — Redirect legacy hacia el Studio único.
 *
 * 15.10.4d · Single Studio Principle. Mantiene compatibilidad con accesos
 * antiguos sin crear otro editor ni otra experiencia de edición.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/paginas")({
  beforeLoad: () => {
    throw redirect({ to: "/cms/experience-builder", search: { mode: "visual", page: "home", block: undefined } });
  },
});