import { createFileRoute, Link } from "@tanstack/react-router";

interface S { order?: string }

export const Route = createFileRoute("/_authenticated/cuenta/pagos/error")({
  validateSearch: (s: Record<string, unknown>): S => ({
    order: typeof s.order === "string" ? s.order : undefined,
  }),
  component: ErrorPage,
});

function ErrorPage() {
  const { order } = Route.useSearch();
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
        Cuenta del viajero
      </p>
      <h1 className="mt-2 text-4xl">Pago no completado</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        No se completó el pago de tu orden
        {order ? ` ${order.slice(0, 8)}` : ""}. Puedes intentarlo de
        nuevo desde tu historial.
      </p>
      <Link
        to="/cuenta/historial"
        search={order ? { highlight: order } : undefined}
        className="mt-6 inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
      >
        Volver al historial
      </Link>
    </div>
  );
}