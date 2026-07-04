/**
 * /oriente-maya/{destino}/{categoria} — Layout territorial (N2.2).
 * Layout puro con `<Outlet />` para permitir rutas hijas de empresa y
 * producto. La ficha de categoría en destino vive en el `.index.tsx`.
 */
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/oriente-maya/$destino/$categoria")({
  component: () => <Outlet />,
});