/**
 * /cuenta/anfitrion — Onboarding empresarial dentro del Workspace Cuenta.
 *
 * Permite a un viajero autenticado reclamar una empresa existente o registrar
 * una nueva para revisión administrativa, sin salir de su workspace.
 */
import { createFileRoute } from "@tanstack/react-router";
import { BecomeHostFlow } from "@/components/hosting/BecomeHostFlow";

export const Route = createFileRoute("/_authenticated/cuenta/anfitrion")({
  component: CuentaAnfitrionRoute,
});

function CuentaAnfitrionRoute() {
  return (
    <div className="max-w-4xl">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
        Anfitrión empresarial
      </p>
      <h1 className="mt-2 text-4xl">Convierte tu negocio en anfitrión</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Busca una empresa ya dada de alta para reclamarla, o registra una nueva
        para que un administrador la revise y apruebe.
      </p>

      <div className="mt-8">
        <BecomeHostFlow />
      </div>
    </div>
  );
}