/**
 * FavoriteButton — Botón cliente para alternar un favorito.
 * (Ola 4 · Etapa 4 · migrado en OLA H-01 · Épica 1 · I3 · reactivo AC1.2).
 *
 * AC1.2 · Rewiring anónimo + Founder Intent Recognition Principle:
 *  - Autenticado → escribe al Travel Plan (comportamiento preservado).
 *  - Visitante   → escribe al AnonymousTravelDraft local (cero red, cero
 *    gate). Alux acompaña desde el primer clic; jamás pide antes de dar.
 *  - Toda confirmación es conversacional (Concierge Voice · copy oficial)
 *    y describe intención, no operación técnica.
 *  - Al alcanzar el límite anónimo se ofrece el registro como beneficio
 *    ("guarda tu viaje…"), nunca como error.
 */
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "@/lib/toast";
import { useAuth } from "@/hooks/useAuth";
import {
  listMyFavorites,
  toggleFavorite,
  type FavoriteEntityKind,
} from "@/lib/traveler/traveler-favorites.functions";
import { useAnonymousTrip, ANON_COPY } from "@/lib/traveler/anonymous-draft";
import { useProgressiveRegistration } from "@/lib/traveler/anonymous-draft/use-progressive-registration";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  entityKind: FavoriteEntityKind;
  entityId: string;
  /** Metadatos opcionales para enriquecer el AnonymousTravelDraft. */
  entityTitle?: string;
  entitySlug?: string;
  entityImageUrl?: string;
  variant?: "default" | "media-overlay";
  className?: string;
}

export function FavoriteButton({
  entityKind,
  entityId,
  entityTitle,
  entitySlug,
  entityImageUrl,
  variant = "default",
  className,
}: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fetchFavorites = useServerFn(listMyFavorites);
  const toggle = useServerFn(toggleFavorite);
  const anon = useAnonymousTrip();
  const limitRegistration = useProgressiveRegistration("hard_limit");

  const { data } = useQuery({
    queryKey: ["traveler", "favorites", user?.id],
    queryFn: () => fetchFavorites(),
    enabled: Boolean(user?.id),
    staleTime: 60_000,
  });

  const isActiveAuthed = Boolean(
    data?.some((f) => f.entity_kind === entityKind && f.entity_id === entityId),
  );
  const isActiveAnon = Boolean(
    anon.trip?.favorites?.some((f) => f.kind === entityKind && f.id === entityId),
  );
  const isActive = user?.id ? isActiveAuthed : isActiveAnon;

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

  const [anonBusy, setAnonBusy] = useState(false);

  async function handleClick() {
    // Rama autenticada — comportamiento preservado.
    if (user?.id) {
      const wasActive = isActive;
      try {
        await mutation.mutateAsync();
        const c = wasActive
          ? ANON_COPY.intent.favoriteReleased
          : ANON_COPY.intent.favoriteAcknowledged;
        toast(c.title, { description: c.body });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Intenta de nuevo.";
        toast.error(msg);
      }
      return;
    }

    // Rama anónima — Alux acompaña desde el primer clic.
    if (anonBusy) return;
    setAnonBusy(true);
    setOptimistic(!isActive);
    try {
      if (isActive) {
        await anon.removeFavorite(entityKind, entityId);
        const c = ANON_COPY.intent.favoriteReleased;
        toast(c.title, { description: c.body });
      } else {
        const res = await anon.addFavorite({
          kind: entityKind,
          id: entityId,
          title: entityTitle,
          slug: entitySlug,
          imageUrl: entityImageUrl,
        });
        if (!res.ok && res.reason === "limit") {
          setOptimistic(null);
          const c = ANON_COPY.intent.limitFriendly;
          toast(c.title, { description: c.body });
          limitRegistration.run();
          return;
        }
        const c = ANON_COPY.intent.favoriteAcknowledged;
        toast(c.title, { description: c.body });
      }
    } finally {
      setAnonBusy(false);
    }
  }

  const active = optimistic ?? isActive;
  const disabled = mutation.isPending || anonBusy;

  const label = active ? "Quitar de guardados" : "Guardar";

  return (
    <Button
      type="button"
      variant={variant === "media-overlay" ? "secondary" : "outline"}
      size={variant === "media-overlay" ? "icon" : "sm"}
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void handleClick();
      }}
      aria-label={label}
      aria-pressed={active}
      className={[
        variant === "media-overlay"
          ? "rounded-full border border-background/70 bg-background/90 text-foreground shadow-elevated backdrop-blur hover:bg-background"
          : active
            ? "border-primary bg-primary/10 text-primary"
            : "border-border bg-background hover:bg-accent",
        className ?? "",
      ].join(" ")}
    >
      {variant === "media-overlay" ? (
        <Heart aria-hidden className={active ? "fill-primary text-primary" : undefined} />
      ) : (
        <>
          <Heart aria-hidden className={active ? "fill-primary text-primary" : undefined} />
          <span>{active ? "Guardado" : "Guardar"}</span>
        </>
      )}
    </Button>
  );
}
