import { createFileRoute, Link } from "@tanstack/react-router";

interface S { order?: string }

export const Route = createFileRoute("/_authenticated/cuenta/pagos/exito")({
  validateSearch: (s: Record<string, unknown>): S => ({
    order: typeof s.order === "string" ? s.order : undefined,
  }),
  component: ExitoPage,
});

function ExitoPage() {
  const { order } = Route.useSearch();
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
        Cuenta del viajero
      </p>
      <h1 className="mt-2 text-4xl">¡Pago recibido!</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Estamos confirmando tu pago con el proveedor. En unos segundos tu
        orden{order ? ` ${order.slice(0, 8)}` : ""} aparecerá como{" "}
        <strong>pagada</strong> en tu historial.
      </p>
      <Link
        to="/cuenta/historial"
        search={order ? { highlight: order } : undefined}
        className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Ver mi historial
      </Link>
    </div>
  );
}