/**
 * FavoriteButton — Botón cliente para alternar un favorito.
 * (Ola 4 · Etapa 4). Idempotente: tolera doble click y race
 * con otras pestañas; el servidor garantiza unicidad.
 */
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/useAuth";
import {
  listMyFavorites,
  toggleFavorite,
  type FavoriteEntityKind,
} from "@/lib/traveler/traveler-favorites.functions";

interface Props {
  entityKind: FavoriteEntityKind;
  entityId: string;
  className?: string;
}

export function FavoriteButton({ entityKind, entityId, className }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fetchFavorites = useServerFn(listMyFavorites);
  const toggle = useServerFn(toggleFavorite);

  const { data } = useQuery({
    queryKey: ["traveler", "favorites", user?.id],
    queryFn: () => fetchFavorites(),
    enabled: Boolean(user?.id),
    staleTime: 60_000,
  });

  const isActive = Boolean(
    data?.some((f) => f.entity_kind === entityKind && f.entity_id === entityId),
  );
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  useEffect(() => setOptimistic(null), [isActive]);

  const mutation = useMutation({
    mutationFn: () => toggle({ data: { entity_kind: entityKind, entity_id: entityId } }),
    onMutate: () => setOptimistic(!isActive),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["traveler", "favorites", user?.id] });
    },
    onError: () => setOptimistic(null),
  });

  if (!user) return null;
  const active = optimistic ?? isActive;

  return (
    <button
      type="button"
      disabled={mutation.isPending}
      onClick={() => mutation.mutate()}
      aria-pressed={active}
      className={[
        "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background hover:bg-accent",
        className ?? "",
      ].join(" ")}
    >
      <span aria-hidden>{active ? "★" : "☆"}</span>
      <span>{active ? "Guardado" : "Guardar"}</span>
    </button>
  );
}