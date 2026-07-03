/**
 * /mi-viaje — Redirect permanente a /cuenta/mi-viaje (Reconciliación 3).
 *
 * La página huérfana fue migrada al workspace "cuenta" para operar bajo
 * WorkspaceShell. Se conserva la URL /mi-viaje como alias por
 * compatibilidad con enlaces existentes.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/mi-viaje")({
  beforeLoad: () => {
    throw redirect({ to: "/cuenta/mi-viaje" });
  },
  component: () => null,
});