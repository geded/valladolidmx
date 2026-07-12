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
        Oriente Maya de Yucatán
      </p>
      <h1 className="mt-2 font-serif text-4xl">Tu viaje aún no se confirmó</h1>
      <p className="mt-3 text-base leading-relaxed text-foreground/80">
        Algo se interrumpió en el último paso. No pasa nada: tu itinerario
        sigue guardado y puedes retomarlo cuando quieras. Tu concierge ya está
        al tanto por si prefieres que te llame.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        {order ? (
          <Link
            to="/cuenta/checkout/$orderId"
            params={{ orderId: order }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Volver a confirmar
          </Link>
        ) : null}
        <Link
          to="/cuenta/mi-viaje"
          className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Ir a mi viaje
        </Link>
      </div>
    </div>
  );
}