/**
 * E6 · Related Collection — Admin Overrides (v1)
 *
 * Panel mínimo para que editores/administradores gestionen los pins y hides
 * de la Related Collection en fichas de empresa, producto, destino y evento.
 * v1 = lista + crear + eliminar. Iteración siguiente = edición inline y
 * pestaña embebida en cada Inspector de superficie.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listOverridesCms,
  upsertOverride,
  deleteOverride,
  type RelatedEntityKind,
  type RelatedOverrideMode,
  type RelatedOverrideRow,
} from "@/lib/related/overrides.functions";

export const Route = createFileRoute("/_authenticated/cms/relacionados/")({
  head: () => ({
    meta: [
      { title: "Colecciones relacionadas · CMS Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RelatedOverridesPage,
});

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

function RelatedOverridesPage() {
  const qc = useQueryClient();
  const call = useServerFn(listOverridesCms);
  const upsertFn = useServerFn(upsertOverride);
  const deleteFn = useServerFn(deleteOverride);

  const [filterKind, setFilterKind] = useState<RelatedEntityKind | "">("");
  const [filterId, setFilterId] = useState("");

  const query = useQuery({
    queryKey: ["cms", "related-overrides", { filterKind, filterId }],
    queryFn: () =>
      call({
        data: {
          entityType: filterKind || undefined,
          entityId: filterId.trim() || undefined,
          limit: 200,
        },
      }),
  });

  const upsertMut = useMutation({
    mutationFn: (input: Parameters<typeof upsertFn>[0]["data"]) =>
      upsertFn({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cms", "related-overrides"] }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cms", "related-overrides"] }),
  });

  const rows = useMemo<RelatedOverrideRow[]>(() => query.data?.rows ?? [], [query.data]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold">Colecciones relacionadas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fija (<code>pin</code>) u oculta (<code>hide</code>) ítems del bloque
          Related Collection en fichas de empresa, producto, destino y evento.
          Complementa las reglas automáticas — no las reemplaza.
        </p>
      </header>

      <CreateForm
        onSubmit={(data) => upsertMut.mutate(data)}
        pending={upsertMut.isPending}
        error={upsertMut.error instanceof Error ? upsertMut.error.message : null}
      />

      <section className="rounded-xl border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold">Overrides existentes</h2>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <select
              value={filterKind}
              onChange={(e) => setFilterKind(e.target.value as RelatedEntityKind | "")}
              className="h-8 rounded-md border bg-background px-2 text-xs"
            >
              <option value="">Todos los tipos</option>
              {(Object.keys(KIND_LABELS) as RelatedEntityKind[]).map((k) => (
                <option key={k} value={k}>{KIND_LABELS[k]}</option>
              ))}
            </select>
            <input
              value={filterId}
              onChange={(e) => setFilterId(e.target.value)}
              placeholder="Filtrar por entity_id (uuid)"
              className="h-8 w-64 rounded-md border bg-background px-2 text-xs"
            />
          </div>
        </div>

        {query.isLoading && (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        )}
        {query.isError && (
          <p className="text-sm text-destructive">
            {query.error instanceof Error ? query.error.message : "Error al cargar."}
          </p>
        )}
        {!query.isLoading && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Sin overrides todavía. Usa el formulario de arriba para crear el primero.
          </p>
        )}
        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Modo</th>
                  <th className="py-2 pr-3">Ficha</th>
                  <th className="py-2 pr-3">Relacionado</th>
                  <th className="py-2 pr-3">Superficie</th>
                  <th className="py-2 pr-3">Pos</th>
                  <th className="py-2 pr-3">Nota</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t align-top">
                    <td className="py-2 pr-3">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          r.mode === "pin"
                            ? "bg-primary/10 text-primary"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {r.mode}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <div className="font-medium">{KIND_LABELS[r.entity_type]}</div>
                      <code className="text-[10px] text-muted-foreground">{r.entity_id}</code>
                    </td>
                    <td className="py-2 pr-3">
                      <div className="font-medium">{KIND_LABELS[r.related_entity_type]}</div>
                      <code className="text-[10px] text-muted-foreground">{r.related_entity_id}</code>
                    </td>
                    <td className="py-2 pr-3"><code>{r.surface}</code></td>
                    <td className="py-2 pr-3">{r.position ?? "—"}</td>
                    <td className="py-2 pr-3 max-w-[220px] text-muted-foreground">{r.note ?? "—"}</td>
                    <td className="py-2 text-right">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
  const [entityId, setEntityId] = useState("");
  const [relatedEntityType, setRelatedEntityType] =
    useState<RelatedEntityKind>("business");
  const [relatedEntityId, setRelatedEntityId] = useState("");
  const [mode, setMode] = useState<RelatedOverrideMode>("pin");
  const [position, setPosition] = useState("");
  const [note, setNote] = useState("");

  const surface = SURFACE_BY_KIND[entityType];

  return (
    <form
      className="grid grid-cols-1 gap-3 rounded-xl border bg-card p-4 md:grid-cols-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!entityId.trim() || !relatedEntityId.trim()) return;
        onSubmit({
          entityType,
          entityId: entityId.trim(),
          surface,
          relatedEntityType,
          relatedEntityId: relatedEntityId.trim(),
          mode,
          position: position.trim() ? Number(position) : null,
          note: note.trim() || null,
        });
        setEntityId("");
        setRelatedEntityId("");
        setPosition("");
        setNote("");
      }}
    >
      <label className="text-xs md:col-span-1">
        <span className="mb-1 block text-muted-foreground">Ficha (tipo)</span>
        <select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value as RelatedEntityKind)}
          className="h-9 w-full rounded-md border bg-background px-2"
        >
          {(Object.keys(KIND_LABELS) as RelatedEntityKind[]).map((k) => (
            <option key={k} value={k}>{KIND_LABELS[k]}</option>
          ))}
        </select>
      </label>
      <label className="text-xs md:col-span-2">
        <span className="mb-1 block text-muted-foreground">Ficha (uuid)</span>
        <input
          value={entityId}
          onChange={(e) => setEntityId(e.target.value)}
          placeholder="entity_id"
          className="h-9 w-full rounded-md border bg-background px-2"
        />
      </label>
      <label className="text-xs md:col-span-1">
        <span className="mb-1 block text-muted-foreground">Relacionado (tipo)</span>
        <select
          value={relatedEntityType}
          onChange={(e) => setRelatedEntityType(e.target.value as RelatedEntityKind)}
          className="h-9 w-full rounded-md border bg-background px-2"
        >
          {(Object.keys(KIND_LABELS) as RelatedEntityKind[]).map((k) => (
            <option key={k} value={k}>{KIND_LABELS[k]}</option>
          ))}
        </select>
      </label>
      <label className="text-xs md:col-span-2">
        <span className="mb-1 block text-muted-foreground">Relacionado (uuid)</span>
        <input
          value={relatedEntityId}
          onChange={(e) => setRelatedEntityId(e.target.value)}
          placeholder="related_entity_id"
          className="h-9 w-full rounded-md border bg-background px-2"
        />
      </label>

      <label className="text-xs md:col-span-1">
        <span className="mb-1 block text-muted-foreground">Modo</span>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as RelatedOverrideMode)}
          className="h-9 w-full rounded-md border bg-background px-2"
        >
          <option value="pin">Pin (fijar)</option>
          <option value="hide">Hide (ocultar)</option>
        </select>
      </label>
      <label className="text-xs md:col-span-1">
        <span className="mb-1 block text-muted-foreground">Posición</span>
        <input
          type="number"
          min={0}
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          placeholder="0"
          className="h-9 w-full rounded-md border bg-background px-2"
        />
      </label>
      <label className="text-xs md:col-span-3">
        <span className="mb-1 block text-muted-foreground">Nota editorial</span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Rationale opcional (por qué se fija o se oculta)"
          className="h-9 w-full rounded-md border bg-background px-2"
        />
      </label>
      <div className="flex items-end md:col-span-1">
        <button
          type="submit"
          disabled={pending || !entityId.trim() || !relatedEntityId.trim()}
          className="h-9 w-full rounded-md bg-primary px-3 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:opacity-95 disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Crear override"}
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground md:col-span-6">
        Superficie asignada automáticamente: <code>{surface}</code>. La unicidad
        <code> (ficha, superficie, relacionado)</code> hace un upsert idempotente.
      </p>
      {error && (
        <p className="md:col-span-6 text-xs text-destructive">{error}</p>
      )}
    </form>
  );
}