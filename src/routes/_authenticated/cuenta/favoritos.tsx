/**
 * /cuenta/favoritos — Lista de favoritos del viajero (Ola 4 · Etapa 4).
 * Lectura vía server fn protegida; eliminación idempotente.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/useAuth";
import {
  listMyFavorites,
  removeFavorite,
  type FavoriteEntityKind,
  type FavoriteHydrated,
} from "@/lib/traveler/traveler-favorites.functions";

export const Route = createFileRoute("/_authenticated/cuenta/favoritos")({
  component: FavoritosPage,
});

const KIND_LABEL: Record<FavoriteEntityKind, string> = {
  business: "Empresa",
  product: "Producto",
  promotion: "Promoción",
};

function FavoritosPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fetchFavorites = useServerFn(listMyFavorites);
  const remove = useServerFn(removeFavorite);

  const { data, isLoading, error } = useQuery({
    queryKey: ["traveler", "favorites", user?.id],
    queryFn: () => fetchFavorites(),
    enabled: Boolean(user?.id),
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: (input: { kind: FavoriteEntityKind; id: string }) =>
      remove({ data: { entity_kind: input.kind, entity_id: input.id } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["traveler", "favorites", user?.id] });
    },
  });

  return (
    <div className="max-w-3xl">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
        Cuenta del viajero
      </p>
      <h1 className="mt-2 text-4xl">Favoritos</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Aquí se guardan las empresas, productos y promociones que marcaste
        en el Marketplace.
      </p>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Cargando…</p>
      ) : error ? (
        <p className="mt-8 text-sm text-destructive">
          No pudimos cargar tus favoritos: {String((error as Error).message)}
        </p>
      ) : !data || data.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Aún no tienes favoritos. Explora el Marketplace y guarda lo que
            te interese.
          </p>
          <Link
            to="/oriente-maya"
            className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Explorar el Marketplace
          </Link>
        </div>
      ) : (
        <ul className="mt-8 grid gap-3">
          {data.map((f: FavoriteHydrated) => (
            <li
              key={f.id}
              className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-card p-4"
            >
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {KIND_LABEL[f.entity_kind]}
                </p>
                <p className="mt-1 truncate text-sm font-semibold">
                  {f.title || "Recurso no disponible"}
                </p>
                {f.subtitle ? (
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {f.subtitle}
                  </p>
                ) : null}
                {f.entity_kind === "business" && f.slug ? (
                  <Link
                    to="/marketplace/$slug"
                    params={{ slug: f.slug }}
                    className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
                  >
                    Ver ficha →
                  </Link>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => mutation.mutate({ kind: f.entity_kind, id: f.entity_id })}
                disabled={mutation.isPending}
                className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-60"
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}