/**
 * /oriente-maya/{destino}/{categoria}/{empresa} — Layout territorial (N2.2).
 * Layout puro con `<Outlet />` para permitir la ruta hija de producto.
 * La ficha de empresa vive en el `.index.tsx`.
 */
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/oriente-maya/$destino/$categoria/$empresa",
)({
  component: () => <Outlet />,
});