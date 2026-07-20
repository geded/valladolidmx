/**
 * /oriente-maya/{destino} — Layout territorial (Navigation Blueprint v1.0 · N2.2).
 *
 * Layout puro: monta `<Outlet />` para que las rutas hijas
 * (`$categoria`, `$empresa`, `$producto`) rendericen. La ficha del
 * destino vive en `$destino.index.tsx`.
 *
 * FIX N2.2: durante N2.1 este archivo era leaf y renderizaba
 * `DestinationSurface` sin `<Outlet />`, lo que ocultaba todas las
 * superficies territoriales hijas (regresión). Al separar índice de
 * layout se restaura la jerarquía territorial oficial.
 */
import { createFileRoute, Outlet } from "@tanstack/react-router";

type DestinationSearch = {
  explora?: string;
};

export const Route = createFileRoute("/oriente-maya/$destino")({
  validateSearch: (search: Record<string, unknown>): DestinationSearch =>
    typeof search.explora === "string" ? { explora: search.explora } : {},
  component: () => <Outlet />,
});
