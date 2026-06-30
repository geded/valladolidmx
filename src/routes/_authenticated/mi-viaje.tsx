/**
 * /mi-viaje — Alias del panel del Turista (Adenda 15.10.4).
 * Redirige a /cuenta (panel existente) hasta que se complete la
 * reorganización funcional en fases siguientes.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/mi-viaje")({
  beforeLoad: () => {
    throw redirect({ to: "/cuenta" });
  },
  component: () => null,
});