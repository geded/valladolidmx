/**
 * Agregar parada sin salir del itinerario: busca por nombre y la suma
 * al día elegido usando el mismo `addPlanItem` de «Agregar a Mi Viaje».
 */
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Search, X } from "lucide-react";
import { toast } from "@/lib/toast";
import { addPlanItem } from "@/lib/traveler/travel-plans.functions";
import { searchItineraryStops } from "@/lib/traveler/itinerary-quick-add.functions";

export function ItineraryQuickAdd({
  planId,
  totalDays,
  onAdded,
  onClose,
}: {
  planId: string;
  totalDays: number;
  onAdded: () => void;
  onClose: () => void;
}) {
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [day, setDay] = useState<number | null>(0);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 300);
    return () => clearTimeout(t);
  }, [term]);
  const search = useServerFn(searchItineraryStops);
  const add = useServerFn(addPlanItem);
  const q = useQuery({
    queryKey: ["itinerary-quick-add", debounced],
    queryFn: () => search({ data: { term: debounced } }),
    enabled: debounced.length >= 2,
    staleTime: 30_000,
  });
  const m = useMutation({
    mutationFn: (h: { kind: "business" | "destination"; id: string; title: string; subtitle: string | null; slug: string }) =>
      add({
        data: {
          planId,
          kind: h.kind,
          targetId: h.id,
          dayIndex: day,
          snapshot: { title: h.title, slug: h.slug, subtitle: h.subtitle, image_url: null },
        },
      }),
    onSuccess: (_r, h) => {
      toast.success(`${h.title} se agregó${day === null ? "" : ` al día ${day + 1}`}`);
      onAdded();
    },
    onError: () => toast.error("No pudimos agregar la parada. Inténtalo de nuevo."),
  });
  const days = Math.max(totalDays, 1) + 1;
  return (
    <div className="mt-3 rounded-xl border border-border bg-background p-3">
      <div className="flex items-center gap-2">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          autoFocus
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Busca un cenote, café, hotel o pueblo…"
          className="min-h-10 min-w-0 flex-1 bg-transparent text-base outline-none sm:text-sm"
          aria-label="Buscar parada"
        />
        <button type="button" onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-accent" aria-label="Cerrar búsqueda">
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <div className="-mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {Array.from({ length: days }, (_, i) => (i < days - 1 ? i : null)).map((d) => (
          <button
            key={String(d)}
            type="button"
            onClick={() => setDay(d)}
            aria-pressed={day === d}
            className={`shrink-0 rounded-pill border px-2.5 py-1 text-[11px] font-medium ${
              day === d ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"
            }`}
          >
            {d === null ? "Sin día" : `Día ${d + 1}`}
          </button>
        ))}
      </div>
      {debounced.length >= 2 ? (
        <ul className="mt-2 divide-y">
          {q.isPending ? <li className="py-3 text-xs text-muted-foreground">Buscando…</li> : null}
          {q.data?.length === 0 ? <li className="py-3 text-xs text-muted-foreground">Sin resultados.</li> : null}
          {q.data?.map((h) => (
            <li key={h.id} className="flex items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{h.title}</p>
                {h.subtitle ? <p className="truncate text-xs text-muted-foreground">{h.subtitle}</p> : null}
              </div>
              <button
                type="button"
                disabled={m.isPending}
                onClick={() => m.mutate(h)}
                className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-pill bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-60"
              >
                <Plus className="size-3.5" aria-hidden /> Agregar
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
