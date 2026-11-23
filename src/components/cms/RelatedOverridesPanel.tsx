/**
 * RelatedOverridesPanel — E6.c
 *
 * Panel embebido en el editor de una ficha (empresa/producto/destino/evento)
 * para gestionar los fijados y ocultos de la lista relacionada sin salir del
 * editor. Reutiliza los server fns de `related/overrides.functions.ts`.
 *
 * Lenguaje: todo lo que ve el editor sale de `related-overrides-ui.ts`, que es
 * la misma autoridad que usan las pruebas del panel.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  deleteOverride,
  listOverridesCms,
  resolveRelatedEntityNames,
  upsertOverride,
  type RelatedEntityKind,
  type RelatedOverrideMode,
  type RelatedOverrideRow,
} from "@/lib/related/overrides.functions";
import {
  KIND_LABELS,
  MAX_PINS_SHOWN,
  MODE_HELP,
  MODE_LABELS,
  RELATED_SECTION_NAMES,
  honouredRelatedKinds,
  relatedPanelIntro,
} from "@/lib/related/related-overrides-ui";
import {
  CmsEntitySearchPicker,
  type CmsPickOption,
} from "@/components/cms/CmsEntitySearchPicker";

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

/* ------------------------------------------------------------------ *
 * Panel
 * ------------------------------------------------------------------ */
export function RelatedOverridesPanel({ entityType, entityId }: Props) {
  const surface = SURFACE_BY_KIND[entityType];
  const qc = useQueryClient();
  const listFn = useServerFn(listOverridesCms);
  const upsertFn = useServerFn(upsertOverride);
  const deleteFn = useServerFn(deleteOverride);
  const namesFn = useServerFn(resolveRelatedEntityNames);

  const queryKey = ["cms", "related-overrides", entityType, entityId] as const;
  const query = useQuery({
    queryKey,
    queryFn: () =>
      listFn({
        data: { entityType, entityId, surface, limit: 100 },
      }),
    enabled: Boolean(entityId),
  });

  const rows = useMemo<RelatedOverrideRow[]>(() => query.data?.rows ?? [], [query.data]);

  const namesQuery = useQuery({
    queryKey: ["cms", "related-overrides-names", rows.map((r) => `${r.related_entity_type}:${r.related_entity_id}`).join(",")] as const,
    enabled: rows.length > 0,
    queryFn: () =>
      namesFn({
        data: {
          refs: rows.map((r) => ({ kind: r.related_entity_type, id: r.related_entity_id })),
        },
      }),
  });
  const names = namesQuery.data?.names ?? {};

  const upsertMut = useMutation({
    mutationFn: (input: Parameters<typeof upsertFn>[0]["data"]) => upsertFn({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const allowedKinds = honouredRelatedKinds(entityType);
  const defaultRelatedKind: RelatedEntityKind = allowedKinds[0] ?? entityType;

  const [relatedKind, setRelatedKind] = useState<RelatedEntityKind>(defaultRelatedKind);
  const [picked, setPicked] = useState<CmsPickOption | null>(null);
  const [mode, setMode] = useState<RelatedOverrideMode>("pin");
  const [note, setNote] = useState("");
  const [formRound, setFormRound] = useState(0);

  const canSave = Boolean(picked) && picked?.id !== entityId;

  return (
    <section className="rounded-xl border bg-card p-4">
      <header className="mb-3">
        <h3 className="text-sm font-semibold">
          Lista recomendada: {RELATED_SECTION_NAMES[entityType]}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">{relatedPanelIntro(entityType)}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Es opcional. Puedes fijar hasta {MAX_PINS_SHOWN} elementos.
        </p>
      </header>

      <form
        className="mb-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!picked) return;
          upsertMut.mutate({
            entityType,
            entityId,
            surface,
            relatedEntityType: relatedKind,
            relatedEntityId: picked.id,
            mode,
            position: null,
            note: note.trim() || null,
          });
          setPicked(null);
          setNote("");
          setFormRound((n) => n + 1);
        }}
      >
        {allowedKinds.length > 1 && (
          <label className="block text-xs">
            <span className="mb-1 block text-muted-foreground">¿Qué tipo de elemento?</span>
            <select
              value={relatedKind}
              onChange={(e) => {
                setRelatedKind(e.target.value as RelatedEntityKind);
                setPicked(null);
              }}
              className="h-9 w-full rounded-md border bg-background px-2 text-sm md:w-56"
            >
              {allowedKinds.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
        )}

        <CmsEntitySearchPicker
          key={`${relatedKind}-${formRound}`}
          kind={relatedKind}
          excludeIds={[entityId]}
          onPick={setPicked}
        />

        <fieldset className="space-y-1">
          <legend className="mb-1 text-xs text-muted-foreground">¿Qué debe pasar?</legend>
          {(["pin", "hide"] as RelatedOverrideMode[]).map((m) => (
            <label
              key={m}
              className="flex cursor-pointer items-start gap-2 rounded-md border px-2 py-1.5 text-xs hover:bg-muted"
            >
              <input
                type="radio"
                name="related-mode"
                value={m}
                checked={mode === m}
                onChange={() => setMode(m)}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">{MODE_LABELS[m]}</span>
                <span className="block text-muted-foreground">{MODE_HELP[m]}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <label className="block text-xs">
          <span className="mb-1 block text-muted-foreground">
            Motivo para el equipo (opcional)
          </span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Por ejemplo: lo pidió el dueño, o no debe salir porque cerró"
            className="h-9 w-full rounded-md border bg-background px-2 text-sm"
          />
        </label>

        <div>
          <button
            type="submit"
            disabled={upsertMut.isPending || !canSave}
            className="h-9 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-95 disabled:opacity-60"
          >
            {upsertMut.isPending ? "Guardando…" : "Guardar"}
          </button>
          {upsertMut.error instanceof Error && (
            <span className="ml-3 text-xs text-destructive">{upsertMut.error.message}</span>
          )}
        </div>
      </form>

      {query.isLoading && <p className="text-xs text-muted-foreground">Cargando…</p>}
      {!query.isLoading && rows.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Aún no has fijado ni ocultado nada: la lista se arma sola con las reglas automáticas.
        </p>
      )}
      {rows.length > 0 && (
        <ul className="divide-y">
          {rows.map((r) => {
            const entry = names[`${r.related_entity_type}:${r.related_entity_id}`];
            return (
              <li key={r.id} className="flex items-start gap-3 py-2 text-xs">
                <span
                  className={`inline-flex shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                    r.mode === "pin"
                      ? "bg-primary/10 text-primary"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {MODE_LABELS[r.mode]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">
                    {entry?.name ?? `${KIND_LABELS[r.related_entity_type]} sin nombre`}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {KIND_LABELS[r.related_entity_type]}
                    {entry && entry.status !== "published" ? " · borrador o sin publicar" : ""}
                  </div>
                  {r.note && <p className="mt-0.5 text-[11px] text-muted-foreground">{r.note}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("¿Quitar este ajuste? La lista volverá a su orden normal.")) {
                      deleteMut.mutate(r.id);
                    }
                  }}
                  className="rounded-md border border-destructive/40 px-2 py-1 text-[11px] font-medium text-destructive hover:bg-destructive/10"
                  disabled={deleteMut.isPending}
                >
                  Quitar
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
