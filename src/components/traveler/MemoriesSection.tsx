import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Heart, Star, Trash2, Camera } from "lucide-react";
import { toast } from "sonner";
import {
  createMemory,
  deleteMemory,
  listMyMemories,
  type TravelMemory,
} from "@/lib/traveler/travel-memories.functions";

type Props = {
  planId: string | null;
  orderId: string | null;
};

export function MemoriesSection({ planId, orderId }: Props) {
  const qc = useQueryClient();
  const listFn = useServerFn(listMyMemories);
  const createFn = useServerFn(createMemory);
  const deleteFn = useServerFn(deleteMemory);

  const q = useQuery({
    queryKey: ["travel-memories"],
    queryFn: () => listFn(),
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["travel-memories"] });

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [rating, setRating] = useState<number | null>(null);

  const create = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          planId,
          orderId,
          title: title.trim() || null,
          body: body.trim(),
          photoUrl: photoUrl.trim() || null,
          rating,
        },
      }),
    onSuccess: () => {
      setTitle("");
      setBody("");
      setPhotoUrl("");
      setRating(null);
      invalidate();
      toast.success("Recuerdo guardado");
    },
    onError: (e: unknown) =>
      toast.error("No pudimos guardar el recuerdo", {
        description: e instanceof Error ? e.message : undefined,
      }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      invalidate();
      toast("Recuerdo eliminado");
    },
  });

  const memories = q.data ?? [];
  const canSubmit = body.trim().length > 0 && !create.isPending;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <Heart className="size-4 text-primary" aria-hidden />
          <h2 className="font-serif text-base text-foreground">
            Escribe un recuerdo
          </h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Guarda un momento, una comida, un atardecer. Sólo tú lo verás y viajará
          contigo entre dispositivos.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) create.mutate();
          }}
          className="space-y-3"
        >
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título (opcional)"
            maxLength={120}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="¿Qué quieres recordar de este momento?"
            rows={4}
            maxLength={4000}
            required
            className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Camera className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                type="url"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="URL de foto (opcional)"
                className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex items-center gap-1" role="radiogroup" aria-label="Calificación">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  onClick={() => setRating(rating === n ? null : n)}
                  className="grid size-7 place-items-center rounded-md transition-colors hover:bg-accent"
                  title={`${n} estrella${n > 1 ? "s" : ""}`}
                >
                  <Star
                    className={
                      "size-4 " +
                      (rating !== null && n <= rating
                        ? "fill-primary text-primary"
                        : "text-muted-foreground")
                    }
                    aria-hidden
                  />
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={!canSubmit}
              className="ml-auto rounded-pill bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-soft transition-opacity disabled:opacity-60"
            >
              {create.isPending ? "Guardando…" : "Guardar recuerdo"}
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h3 className="font-serif text-sm text-foreground">
            Tu diario de viaje
          </h3>
          <span className="text-xs text-muted-foreground">
            {memories.length} {memories.length === 1 ? "recuerdo" : "recuerdos"}
          </span>
        </div>

        {q.isLoading ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Cargando tus recuerdos…
          </div>
        ) : memories.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Todavía no tienes recuerdos. El primero que escribas aparecerá aquí.
          </div>
        ) : (
          <ol className="space-y-3">
            {memories.map((m) => (
              <MemoryCard
                key={m.id}
                memory={m}
                onDelete={() => remove.mutate(m.id)}
                disabled={remove.isPending}
              />
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function MemoryCard({
  memory,
  onDelete,
  disabled,
}: {
  memory: TravelMemory;
  onDelete: () => void;
  disabled: boolean;
}) {
  const date = new Date(memory.created_at);
  const formatted = date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  return (
    <li className="rounded-lg border bg-card p-4">
      <div className="flex items-start gap-3">
        {memory.photo_url ? (
          <img
            src={memory.photo_url}
            alt=""
            loading="lazy"
            className="size-16 shrink-0 rounded-md object-cover"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {memory.title ? (
              <h4 className="truncate font-serif text-sm text-foreground">
                {memory.title}
              </h4>
            ) : null}
            <span className="text-xs text-muted-foreground">{formatted}</span>
            {memory.rating ? (
              <span className="inline-flex items-center gap-0.5 text-xs text-primary">
                {Array.from({ length: memory.rating }).map((_, i) => (
                  <Star key={i} className="size-3 fill-primary text-primary" aria-hidden />
                ))}
              </span>
            ) : null}
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">
            {memory.body}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("¿Eliminar este recuerdo?")) onDelete();
          }}
          disabled={disabled}
          className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
          aria-label="Eliminar recuerdo"
          title="Eliminar"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>
    </li>
  );
}