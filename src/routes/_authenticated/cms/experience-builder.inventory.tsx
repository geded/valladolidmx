/**
 * /cms/experience-builder/inventory — Route Inventory Panel (DOS · SSC-01·P2)
 *
 * Ruta interna que expone el inventario oficial de rutas del producto
 * Valladolid.mx dentro del Experience Builder. Sólo lectura, sólo para
 * roles administrativos (la gate de sesión la impone `_authenticated`).
 */
import { createFileRoute } from "@tanstack/react-router";
import { RouteInventoryPanel } from "@/components/experience-builder/RouteInventoryPanel";

export const Route = createFileRoute(
  "/_authenticated/cms/experience-builder/inventory",
)({
  head: () => ({
    meta: [{ title: "Inventario de Rutas · Experience Builder" }],
  }),
  component: RouteInventoryPanel,
});