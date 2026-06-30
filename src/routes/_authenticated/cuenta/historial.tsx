/**
 * /cuenta/historial — Placeholder (Ola 4 · Etapa 3).
 * Se completa al habilitar reservas y pagos (Etapas 4 y 5).
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/cuenta/historial")({
  component: HistorialPage,
});

function HistorialPage() {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
        Cuenta del viajero
      </p>
      <h1 className="mt-2 text-4xl">Historial</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Aquí aparecerán tus reservas y compras del Marketplace. La función se
        habilita cuando se activen las reservas (Etapa 4) y los pagos
        (Etapa 5).
      </p>
    </div>
  );
}