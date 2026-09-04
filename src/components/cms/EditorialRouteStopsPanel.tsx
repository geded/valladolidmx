/**
 * EditorialRouteStopsPanel — Administración de las paradas de una ruta
 * editorial (Lote 3C). Reutiliza el lenguaje visual del CMS Studio; no
 * introduce navegación, shells ni patrones propios.
 */
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ROUTE_STOP_KINDS,
  listRouteStopCandidatesCms,
  listRouteStopsCms,
  saveRouteStopsCms,
  type RouteStopInput,
  type RouteStopKind,
} from "@/lib/cms/editorial-route-stops.functions";

const KIND_LABEL: Record<RouteStopKind, string> = {
  place: "Lugar",
  experience: "Experiencia",
  event: "Evento",
  business: "Empresa",
  product: "Producto",
  destination: "Destino",
  note: "Nota",
};

const EMPTY_STOP: RouteStopInput = {
  entityKind: "place",
  entityId: null,
  title: null,
  note: null,
  dayNumber: 1,
  durationMinutes: null,
};

export function EditorialRouteStopsPanel({ routeId }: { routeId: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listRouteStopsCms);
  const saveFn = useServerFn(saveRouteStopsCms);
  const candidatesFn = useServerFn(listRouteStopCandidatesCms);

  const stopsQuery = useQuery({
    queryKey: ["cms", "route-stops", routeId],
    queryFn: () => listFn({ data: { routeId } }),
  });

  const [stops, setStops] = useState<RouteStopInput[]>([]);
  useEffect(() => {
    if (stopsQuery.data) {
      setStops(
        stopsQuery.data.map((s) => ({
          entityKind: s.entityKind,
          entityId: s.entityId,
          title: s.title,
          note: s.note,
          dayNumber: s.dayNumber,
          durationMinutes: s.durationMinutes,
        })),
      );
    }
  }, [stopsQuery.data]);

  const kindsInUse = Array.from(new Set(stops.map((s) => s.entityKind))).filter(
    (k) => k !== "note",
  );
  const candidates = useQuery({
    queryKey: ["cms", "route-stop-candidates", kindsInUse.join(",")],
    enabled: kindsInUse.length > 0,
    queryFn: async () => {
      const out: Record<string, { id: string; label: string }[]> = {};
      for (const kind of kindsInUse) {
        out[kind] = await candidatesFn({ data: { kind } });
      }
      return out;
    },
  });

  const save = useMutation({
    mutationFn: () => saveFn({ data: { routeId, stops } }),
    onSuccess: (res) => {
      toast.success(`Paradas guardadas (${res.count}).`);
      void qc.invalidateQueries({ queryKey: ["cms", "route-stops", routeId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo guardar."),
  });

  const patch = (i: number, next: Partial<RouteStopInput>) =>
    setStops((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...next } : s)));
  const move = (i: number, delta: number) =>
    setStops((prev) => {
      const next = [...prev];
      const j = i + delta;
      if (j < 0 || j >= next.length) return prev;
      const a = next[i]!;
      next[i] = next[j]!;
      next[j] = a;
      return next;
    });

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Paradas del itinerario</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Cada parada referencia una ficha publicada. El orden define el recorrido.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setStops((p) => [...p, { ...EMPTY_STOP }])}
            className="h-9 rounded-md border border-border px-3 text-xs font-medium hover:bg-muted"
          >
            + Agregar parada
          </button>
          <button
            type="button"
            disabled={save.isPending}
            onClick={() => save.mutate()}
            className="h-9 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-60"
          >
            {save.isPending ? "Guardando…" : "Guardar paradas"}
          </button>
        </div>
      </div>

      {stopsQuery.isLoading ? (
        <p className="mt-4 text-xs text-muted-foreground">Cargando paradas…</p>
      ) : stops.length === 0 ? (
        <p className="mt-4 text-xs text-muted-foreground">
          Esta ruta todavía no tiene paradas. Agrega al menos una antes de publicarla.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {stops.map((s, i) => (
            <li key={i} className="rounded-lg border border-border/70 bg-background p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">#{i + 1}</span>
                <select
                  value={s.entityKind}
                  onChange={(e) =>
                    patch(i, { entityKind: e.target.value as RouteStopKind, entityId: null })
                  }
                  className="h-9 rounded-md border border-border bg-background px-2 text-xs"
                >
                  {ROUTE_STOP_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {KIND_LABEL[k]}
                    </option>
                  ))}
                </select>

                {s.entityKind === "note" ? (
                  <input
                    value={s.title ?? ""}
                    onChange={(e) => patch(i, { title: e.target.value || null })}
                    placeholder="Título de la nota"
                    className="h-9 min-w-[200px] flex-1 rounded-md border border-border bg-background px-2 text-xs"
                  />
                ) : (
                  <select
                    value={s.entityId ?? ""}
                    onChange={(e) => patch(i, { entityId: e.target.value || null })}
                    className="h-9 min-w-[220px] flex-1 rounded-md border border-border bg-background px-2 text-xs"
                  >
                    <option value="">Selecciona una ficha publicada…</option>
                    {(candidates.data?.[s.entityKind] ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                )}

                <input
                  type="number"
                  min={1}
                  value={s.dayNumber ?? ""}
                  onChange={(e) =>
                    patch(i, { dayNumber: e.target.value ? Number(e.target.value) : null })
                  }
                  placeholder="Día"
                  className="h-9 w-20 rounded-md border border-border bg-background px-2 text-xs"
                />
                <input
                  type="number"
                  min={0}
                  step={15}
                  value={s.durationMinutes ?? ""}
                  onChange={(e) =>
                    patch(i, { durationMinutes: e.target.value ? Number(e.target.value) : null })
                  }
                  placeholder="Min."
                  className="h-9 w-24 rounded-md border border-border bg-background px-2 text-xs"
                />
                <div className="ml-auto flex gap-1">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    className="h-9 w-9 rounded-md border border-border text-xs hover:bg-muted"
                    aria-label="Subir parada"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    className="h-9 w-9 rounded-md border border-border text-xs hover:bg-muted"
                    aria-label="Bajar parada"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => setStops((p) => p.filter((_, idx) => idx !== i))}
                    className="h-9 rounded-md border border-destructive/40 px-2 text-xs text-destructive hover:bg-destructive/10"
                  >
                    Quitar
                  </button>
                </div>
              </div>
              <input
                value={s.note ?? ""}
                onChange={(e) => patch(i, { note: e.target.value || null })}
                placeholder="Nota editorial visible en la ficha pública (opcional)"
                className="mt-2 h-9 w-full rounded-md border border-border bg-background px-2 text-xs"
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
