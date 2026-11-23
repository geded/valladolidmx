/**
 * E6 · Listas recomendadas — vista general de ajustes (v2, lenguaje de editor)
 *
 * Reúne en una sola página los ajustes «Aparece primero» / «Que no aparezca»
 * de las listas recomendadas al pie de las fichas de empresa, producto,
 * destino y evento. Mismo lenguaje, buscador y tipos que el panel embebido en
 * cada editor (`related-overrides-ui.ts` + `CmsEntitySearchPicker`): nunca se
 * pide ni se muestra un código interno.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listOverridesCms,
  upsertOverride,
  deleteOverride,
  resolveRelatedEntityNames,
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
} from "@/lib/related/related-overrides-ui";
import {
  CmsEntitySearchPicker,
  type CmsPickOption,
} from "@/components/cms/CmsEntitySearchPicker";

export const Route = createFileRoute("/_authenticated/cms/relacionados/")({
  head: () => ({
    meta: [
      { title: "Listas recomendadas · CMS Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RelatedOverridesPage,
});

const SURFACE_BY_KIND: Record<RelatedEntityKind, string> = {
  business: "business-profile",
  product: "product-detail",
  destination: "destination-detail",
  event: "event-detail",
};

const ALL_KINDS = Object.keys(KIND_LABELS) as RelatedEntityKind[];

function RelatedOverridesPage() {
  const qc = useQueryClient();
  const call = useServerFn(listOverridesCms);
  const upsertFn = useServerFn(upsertOverride);
  const deleteFn = useServerFn(deleteOverride);
  const namesFn = useServerFn(resolveRelatedEntityNames);

  const [filterKind, setFilterKind] = useState<RelatedEntityKind | "">("");
  const [filterEntity, setFilterEntity] = useState<CmsPickOption | null>(null);

  const query = useQuery({
    queryKey: ["cms", "related-overrides", { filterKind, filterId: filterEntity?.id ?? "" }],
    queryFn: () =>
      call({
        data: {
          entityType: filterKind || undefined,
          entityId: filterEntity?.id || undefined,
          limit: 200,
        },
      }),
  });

  const upsertMut = useMutation({
    mutationFn: (input: Parameters<typeof upsertFn>[0]["data"]) => upsertFn({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cms", "related-overrides"] }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cms", "related-overrides"] }),
  });

  const rows = useMemo<RelatedOverrideRow[]>(() => query.data?.rows ?? [], [query.data]);

  const refs = useMemo(() => {
    const out: Array<{ kind: RelatedEntityKind; id: string }> = [];
    for (const r of rows) {
      out.push({ kind: r.entity_type, id: r.entity_id });
      out.push({ kind: r.related_entity_type, id: r.related_entity_id });
    }
    return out;
  }, [rows]);
  const namesQuery = useQuery({
    queryKey: ["cms", "related-overrides-names", refs.map((r) => `${r.kind}:${r.id}`).join(",")],
    enabled: refs.length > 0,
    queryFn: () => namesFn({ data: { refs } }),
  });
  const names = namesQuery.data?.names ?? {};
  const nameOf = (kind: RelatedEntityKind, id: string) =>
    names[`${kind}:${id}`]?.name ??
    (namesQuery.isLoading ? "Cargando…" : `${KIND_LABELS[kind]} sin nombre`);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold">Listas recomendadas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Al final de cada ficha pública hay una lista de recomendaciones («Explora cerca de …» o
          «Sigue descubriendo») que se arma sola. Aquí ves y ajustas, en un solo lugar, lo que
          debe aparecer primero o no debe aparecer. También puedes hacerlo desde el editor de cada
          ficha.
        </p>
      </header>

      <CreateForm
        onSubmit={(data) => upsertMut.mutate(data)}
        pending={upsertMut.isPending}
        error={upsertMut.error instanceof Error ? upsertMut.error.message : null}
      />

      <section className="rounded-xl border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <h2 className="text-sm font-semibold">Ajustes guardados</h2>
          <div className="ml-auto flex w-full flex-wrap items-end gap-2 md:w-auto">
            <label className="text-xs">
              <span className="mb-1 block text-muted-foreground">Tipo de ficha</span>
              <select
                value={filterKind}
                onChange={(e) => {
                  setFilterKind(e.target.value as RelatedEntityKind | "");
                  setFilterEntity(null);
                }}
                className="h-9 rounded-md border bg-background px-2 text-xs"
              >
                <option value="">Todas</option>
                {ALL_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </label>
            {filterKind && (
              <div className="w-full md:w-72">
                <CmsEntitySearchPicker
                  key={filterKind}
                  kind={filterKind}
                  label={`Solo de esta ${KIND_LABELS[filterKind].toLowerCase()} (opcional)`}
                  onPick={setFilterEntity}
                />
              </div>
            )}
          </div>
        </div>

        {query.isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
        {query.isError && (
          <p className="text-sm text-destructive">
            {query.error instanceof Error ? query.error.message : "Error al cargar."}
          </p>
        )}
        {!query.isLoading && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No hay ajustes todavía: todas las listas se arman solas con las reglas automáticas.
          </p>
        )}
        {rows.length > 0 && (
          <ul className="divide-y">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-start gap-3 py-2.5 text-xs">
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
                    {nameOf(r.related_entity_type, r.related_entity_id)}
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      · {KIND_LABELS[r.related_entity_type]}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    En la ficha de {KIND_LABELS[r.entity_type].toLowerCase()}{" "}
                    <span className="font-medium text-foreground">
                      {nameOf(r.entity_type, r.entity_id)}
                    </span>{" "}
                    · lista {RELATED_SECTION_NAMES[r.entity_type]}
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
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

interface CreateFormData {
  entityType: RelatedEntityKind;
  entityId: string;
  surface: string;
  relatedEntityType: RelatedEntityKind;
  relatedEntityId: string;
  mode: RelatedOverrideMode;
  position: number | null;
  note: string | null;
}

function CreateForm({
  onSubmit,
  pending,
  error,
}: {
  onSubmit: (data: CreateFormData) => void;
  pending: boolean;
  error: string | null;
}) {
  const [entityType, setEntityType] = useState<RelatedEntityKind>("business");
  const [entity, setEntity] = useState<CmsPickOption | null>(null);
  const allowed = honouredRelatedKinds(entityType);
  const [relatedEntityType, setRelatedEntityType] = useState<RelatedEntityKind>("business");
  const [related, setRelated] = useState<CmsPickOption | null>(null);
  const [mode, setMode] = useState<RelatedOverrideMode>("pin");
  const [note, setNote] = useState("");
  const [round, setRound] = useState(0);

  const relatedKind = allowed.includes(relatedEntityType)
    ? relatedEntityType
    : (allowed[0] ?? entityType);
  const canSave = Boolean(entity && related && entity.id !== related.id);

  return (
    <form
      className="space-y-3 rounded-xl border bg-card p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!entity || !related) return;
        onSubmit({
          entityType,
          entityId: entity.id,
          surface: SURFACE_BY_KIND[entityType],
          relatedEntityType: relatedKind,
          relatedEntityId: related.id,
          mode,
          position: null,
          note: note.trim() || null,
        });
        setRelated(null);
        setNote("");
        setRound((n) => n + 1);
      }}
    >
      <h2 className="text-sm font-semibold">Nuevo ajuste</h2>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-xs">
            <span className="mb-1 block text-muted-foreground">1. ¿En qué tipo de ficha?</span>
            <select
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value as RelatedEntityKind);
                setEntity(null);
                setRelated(null);
              }}
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
            >
              {ALL_KINDS.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
          <CmsEntitySearchPicker
            key={`entity-${entityType}`}
            kind={entityType}
            label={`2. ¿Cuál ${KIND_LABELS[entityType].toLowerCase()}?`}
            onPick={setEntity}
          />
          <p className="text-[11px] text-muted-foreground">
            Se ajusta su lista {RELATED_SECTION_NAMES[entityType]}.
          </p>
        </div>

        <div className="space-y-2">
          {allowed.length > 1 && (
            <label className="block text-xs">
              <span className="mb-1 block text-muted-foreground">
                3. ¿Qué tipo de recomendación?
              </span>
              <select
                value={relatedKind}
                onChange={(e) => {
                  setRelatedEntityType(e.target.value as RelatedEntityKind);
                  setRelated(null);
                }}
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              >
                {allowed.map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </label>
          )}
          <CmsEntitySearchPicker
            key={`related-${entityType}-${relatedKind}-${round}`}
            kind={relatedKind}
            label={`${allowed.length > 1 ? "4" : "3"}. ¿Qué ${KIND_LABELS[relatedKind].toLowerCase()} quieres ajustar?`}
            excludeIds={entity ? [entity.id] : []}
            onPick={setRelated}
          />
        </div>
      </div>

      <fieldset className="grid gap-2 md:grid-cols-2">
        <legend className="mb-1 text-xs text-muted-foreground">¿Qué debe pasar?</legend>
        {(["pin", "hide"] as RelatedOverrideMode[]).map((m) => (
          <label
            key={m}
            className="flex cursor-pointer items-start gap-2 rounded-md border px-2 py-1.5 text-xs hover:bg-muted"
          >
            <input
              type="radio"
              name="related-mode-admin"
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

      <div>
        <label className="block text-xs">
          <span className="mb-1 block text-muted-foreground">Motivo para el equipo (opcional)</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Por ejemplo: lo pidió el dueño, o no debe salir porque cerró"
            className="h-9 w-full rounded-md border bg-background px-2 text-sm"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending || !canSave}
          className="h-9 rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground hover:opacity-95 disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Guardar ajuste"}
        </button>
        <span className="text-[11px] text-muted-foreground">
          Cada lista muestra hasta {MAX_PINS_SHOWN} elementos fijados. Si ya existe el mismo ajuste,
          se actualiza en lugar de repetirse.
        </span>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}
