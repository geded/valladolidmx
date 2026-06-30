/**
 * /cuenta/favoritos — Placeholder (Ola 4 · Etapa 3).
 * La funcionalidad llega con el carrito (Etapa 4).
 */
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/cuenta/favoritos")({
  component: FavoritosPage,
});

function FavoritosPage() {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
        Cuenta del viajero
      </p>
      <h1 className="mt-2 text-4xl">Favoritos</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Próximamente podrás guardar empresas, productos y promociones de la
        vitrina del Marketplace. Esta sección se habilita junto con el
        carrito en la siguiente etapa.
      </p>
      <Link
        to="/marketplace"
        className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Explorar el Marketplace
      </Link>
    </div>
  );
}