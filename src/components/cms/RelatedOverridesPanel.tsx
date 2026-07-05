/**
 * RelatedOverridesPanel — E6.c
 *
 * Panel embebido en el editor de una ficha (empresa/producto/destino/evento)
 * para gestionar pins/hides de la Related Collection sin salir del editor.
 * Reutiliza los server fns admin de `related/overrides.functions.ts`.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  deleteOverride,
  listOverridesCms,
  upsertOverride,
  type RelatedEntityKind,
  type RelatedOverrideMode,
  type RelatedOverrideRow,
} from "@/lib/related/overrides.functions";

const KIND_LABELS: Record<RelatedEntityKind, string> = {
  business: "Empresa",
  product: "Producto",
  destination: "Destino",
  event: "Evento",
};

const SURFACE_BY_KIND: Record<RelatedEntityKind, string> = {
  business: "business-profile",
  product: "product-detail",
  destination: "destination-detail",
  event: "event-detail",
};

interface Props {
  entityType: RelatedEntityKind;
  entityId: string;
}

export function RelatedOverridesPanel({ entityType, entityId }: Props) {
  const surface = SURFACE_BY_KIND[entityType];
  const qc = useQueryClient();
  const listFn = useServerFn(listOverridesCms);
  const upsertFn = useServerFn(upsertOverride);
  const deleteFn = useServerFn(deleteOverride);

  const queryKey = ["cms", "related-overrides", entityType, entityId] as const;
  const query = useQuery({
    queryKey,
    queryFn: () =>
      listFn({
        data: { entityType, entityId, surface, limit: 100 },
      }),
    enabled: Boolean(entityId),
  });

  const upsertMut = useMutation({
    mutationFn: (input: Parameters<typeof upsertFn>[0]["data"]) =>
      upsertFn({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const rows = useMemo<RelatedOverrideRow[]>(
    () => query.data?.rows ?? [],
    [query.data],
  );

  const defaultRelatedKind: RelatedEntityKind =
    entityType === "destination" ? "business" : entityType;

  const [relatedKind, setRelatedKind] = useState<RelatedEntityKind>(defaultRelatedKind);
  const [relatedId, setRelatedId] = useState("");
  const [mode, setMode] = useState<RelatedOverrideMode>("pin");
  const [note, setNote] = useState("");

  return (
    <section className="rounded-xl border bg-card p-4">
      <header className="mb-3 flex items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Colección relacionada</h3>
          <p className="text-xs text-muted-foreground">
            Fija o oculta ítems que aparecen en el bloque Related Collection de esta ficha.
            Superficie: <code>{surface}</code>.
          </p>
        </div>
      </header>

      <form
        className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!relatedId.trim()) return;
          upsertMut.mutate({
            entityType,
            entityId,
            surface,
            relatedEntityType: relatedKind,
            relatedEntityId: relatedId.trim(),
            mode,
            position: null,
            note: note.trim() || null,
          });
          setRelatedId("");
          setNote("");
        }}
      >
        <label className="text-xs md:col-span-1">
          <span className="mb-1 block text-muted-foreground">Relacionado</span>
          <select
            value={relatedKind}
            onChange={(e) => setRelatedKind(e.target.value as RelatedEntityKind)}
            className="h-9 w-full rounded-md border bg-background px-2"
          >
            {(Object.keys(KIND_LABELS) as RelatedEntityKind[]).map((k) => (
              <option key={k} value={k}>{KIND_LABELS[k]}</option>
            ))}
          </select>
        </label>
        <label className="text-xs md:col-span-2">
          <span className="mb-1 block text-muted-foreground">UUID</span>
          <input
            value={relatedId}
            onChange={(e) => setRelatedId(e.target.value)}
            placeholder="related_entity_id"
            className="h-9 w-full rounded-md border bg-background px-2 font-mono text-[11px]"
          />
        </label>
        <label className="text-xs md:col-span-1">
          <span className="mb-1 block text-muted-foreground">Modo</span>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as RelatedOverrideMode)}
            className="h-9 w-full rounded-md border bg-background px-2"
          >
            <option value="pin">Pin</option>
            <option value="hide">Hide</option>
          </select>
        </label>
        <label className="text-xs md:col-span-2">
          <span className="mb-1 block text-muted-foreground">Nota (opcional)</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="h-9 w-full rounded-md border bg-background px-2"
          />
        </label>
        <div className="md:col-span-6">
          <button
            type="submit"
            disabled={upsertMut.isPending || !relatedId.trim()}
            className="h-9 rounded-md bg-primary px-3 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:opacity-95 disabled:opacity-60"
          >
            {upsertMut.isPending ? "Guardando…" : "Añadir override"}
          </button>
          {upsertMut.error instanceof Error && (
            <span className="ml-3 text-xs text-destructive">{upsertMut.error.message}</span>
          )}
        </div>
      </form>

      {query.isLoading && (
        <p className="text-xs text-muted-foreground">Cargando overrides…</p>
      )}
      {!query.isLoading && rows.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Aún no hay pins ni hides. Añade uno arriba.
        </p>
      )}
      {rows.length > 0 && (
        <ul className="divide-y">
          {rows.map((r) => (
            <li key={r.id} className="flex items-start gap-3 py-2 text-xs">
              <span
                className={`inline-flex shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${
                  r.mode === "pin"
                    ? "bg-primary/10 text-primary"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {r.mode}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-medium">{KIND_LABELS[r.related_entity_type]}</div>
                <code className="block truncate text-[10px] text-muted-foreground">
                  {r.related_entity_id}
                </code>
                {r.note && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{r.note}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("¿Eliminar este override?")) {
                    deleteMut.mutate(r.id);
                  }
                }}
                className="rounded-md border border-destructive/40 px-2 py-1 text-[11px] font-medium text-destructive hover:bg-destructive/10"
                disabled={deleteMut.isPending}
              >
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}