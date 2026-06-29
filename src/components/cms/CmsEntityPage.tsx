/**
 * CmsEntityPage — Adaptador entre una server fn de lectura y EntityListView.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  EntityListView,
  type EntityColumn,
} from "@/components/cms/EntityListView";

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
}

export function CmsEntityPage<Row>(props: Props<Row>) {
  const callFn = useServerFn(props.fn);
  const [search, setSearch] = useState("");

  const query = useQuery<ListResult<Row>>({
    queryKey: ["cms", props.queryKey, { search }],
    queryFn: () => callFn({ data: { search, limit: 50, offset: 0 } }),
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
    />
  );
}