/**
 * /concierge/expedientes/$caseId — contenedor del expediente.
 * El detalle vive en `expedientes.$caseId.index.tsx` y el Estudio de
 * Propuesta en `expedientes.$caseId.propuesta.tsx`.
 */
import { createFileRoute, ErrorComponent, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/concierge/expedientes/$caseId")({
  component: () => <Outlet />,
  errorComponent: ErrorComponent,
  notFoundComponent: () => <div className="p-6">Expediente no encontrado.</div>,
});
