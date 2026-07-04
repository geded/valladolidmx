/**
 * AddToCartButton — Botón cliente para añadir un producto al carrito.
 * (Ola 4 · Etapa 4b). Genera un `client_request_id` por click para
 * que reintentos no creen duplicados (idempotencia server-side).
 */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/useAuth";
import { addToCart } from "@/lib/catalog/cart.functions";

interface Props {
  productId: string;
  className?: string;
}

function genId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function AddToCartButton({ productId, className }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const add = useServerFn(addToCart);
  const [justAdded, setJustAdded] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      add({
        data: { product_id: productId, quantity: 1, client_request_id: genId() },
      }),
    onSuccess: () => {
      setJustAdded(true);
      window.setTimeout(() => setJustAdded(false), 1800);
      void queryClient.invalidateQueries({ queryKey: ["traveler", "cart", user?.id] });
    },
  });

  if (!user) return null;

  return (
    <button
      type="button"
      disabled={mutation.isPending}
      onClick={() => mutation.mutate()}
      className={[
        "inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60",
        className ?? "",
      ].join(" ")}
    >
      {mutation.isPending ? "Añadiendo…" : justAdded ? "Añadido ✓" : "Añadir al carrito"}
    </button>
  );
}