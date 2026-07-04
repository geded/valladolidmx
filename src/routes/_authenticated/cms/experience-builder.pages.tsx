/**
 * /cms/experience-builder/pages — Redirect al Studio único.
 *
 * 15.10.4d · Single Studio Principle. El editor sobre el modelo eb_*
 * (v0 15.10.4b Fase 2) queda absorbido dentro del Experience Builder
 * oficial (/cms/experience-builder), donde el Modo Profesional expone
 * el canvas técnico y el Modo Visual el flujo WYSIWYG por defecto.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/cms/experience-builder/pages")({
  beforeLoad: () => {
    throw redirect({ to: "/cms/experience-builder", search: { mode: "visual", page: "home", block: undefined } });
  },
});