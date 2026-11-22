/**
 * CmsEntityPage — Adaptador entre una server fn de lectura y EntityListView.
 */
import { useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { EntityListView, type EntityColumn } from "@/components/cms/EntityListView";
import type { ReactNode } from "react";
import { useCmsListMemory } from "@/lib/cms/list-memory";

interface ListResult<Row> {
  rows: Row[];
  total: number;
  limit: number;
  offset: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ServerFn<Row> = (...args: any[]) => Promise<ListResult<Row>>;

interface Props<Row> {
  queryKey: string;
  fn: ServerFn<Row>;
  title: string;
  description?: string;
  stage?: string;
  columns: EntityColumn<Row>[];
  rowKey: (row: Row) => string;
  emptyMessage?: string;
  headerActions?: ReactNode;
  /** Filtros adicionales enviados a la server fn (p. ej. uso o alcance). */
  extraParams?: Record<string, string | number | boolean | null>;
  /** Barra territorial y filtros de la sección. */
  filters?: ReactNode;
  /** Tamaño de página; por defecto 50. */
  pageSize?: number;
  /** Presentación compacta de herramientas para superficies de alta densidad. */
  toolbarVariant?: "default" | "compact";
}

export function CmsEntityPage<Row>(props: Props<Row>) {
  const callFn = useServerFn(props.fn);
  // Búsqueda y página se recuerdan al ir al editor y volver.
  const memory = useCmsListMemory(props.queryKey);
  const search = typeof memory.values.search === "string" ? memory.values.search : "";
  const page = typeof memory.values.page === "number" ? memory.values.page : 1;
  const { set } = memory;
  const setSearch = useCallback((next: string) => set("search", next), [set]);
  const setPage = useCallback((next: number) => set("page", next), [set]);
  const pageSize = props.pageSize ?? 50;
  const params = props.extraParams ?? {};
  const paramsKey = JSON.stringify(params);

  // Cualquier cambio de búsqueda o filtro vuelve a la primera página
  // (no al restaurar lo recordado).
  const filterKey = `${search}|${paramsKey}`;
  const lastFilterKey = useRef<string | null>(null);
  useEffect(() => {
    if (!memory.ready) return;
    if (lastFilterKey.current !== null && lastFilterKey.current !== filterKey) setPage(1);
    lastFilterKey.current = filterKey;
  }, [memory.ready, filterKey, setPage]);

  const query = useQuery<ListResult<Row>>({
    queryKey: ["cms", props.queryKey, { search, page, pageSize, ...params }],
    enabled: memory.ready,
    queryFn: () =>
      callFn({
        data: {
          search,
          limit: pageSize,
          offset: (page - 1) * pageSize,
          ...params,
        },
      }),
  });

  if (query.isError) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-destructive/40 bg-destructive/5 p-5 text-sm">
        <p className="font-semibold text-destructive">
          No se pudo cargar {props.title.toLowerCase()}.
        </p>
        <p className="mt-1 text-destructive/80">
          {query.error instanceof Error ? query.error.message : "Error desconocido."}
        </p>
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="mt-3 rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <EntityListView<Row>
      title={props.title}
      description={props.description}
      stage={props.stage}
      rows={query.data?.rows ?? []}
      total={query.data?.total ?? 0}
      columns={props.columns}
      search={search}
      onSearchChange={setSearch}
      isFetching={query.isFetching}
      rowKey={props.rowKey}
      emptyMessage={props.emptyMessage}
      headerActions={props.headerActions}
      filters={props.filters}
      page={page}
      pageSize={pageSize}
      onPageChange={setPage}
      toolbarVariant={props.toolbarVariant}
    />
  );
}
