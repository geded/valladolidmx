/**
 * EntityListView — Vista de listado tipada reutilizable (Ola 1 · Etapa 2).
 *
 * Render exclusivamente lectura. Sin mutaciones, sin transición de estado.
 * Cumple VISUAL-GATES-CHECKLIST (12D): tokens semánticos, jerarquía clara,
 * estados vacíos y de error explícitos.
 */
import { useId, useState, type ReactNode } from "react";
import { getEditorialStatusLabel } from "@/lib/cms/editorial-language";

export interface EntityColumn<Row> {
  key: string;
  header: string;
  render: (row: Row) => ReactNode;
  className?: string;
}

interface Props<Row> {
  title: string;
  description?: string;
  stage?: string;
  rows: Row[];
  total: number;
  columns: EntityColumn<Row>[];
  search: string;
  onSearchChange: (next: string) => void;
  isFetching?: boolean;
  rowKey: (row: Row) => string;
  emptyMessage?: string;
  headerActions?: ReactNode;
  /** Barra territorial y filtros propios de la sección. */
  filters?: ReactNode;
  /** Paginación (1-indexada). Si se omite, no se muestran controles. */
  page?: number;
  pageSize?: number;
  onPageChange?: (next: number) => void;
  toolbarVariant?: "default" | "compact";
}

export function EntityListView<Row>(props: Props<Row>) {
  const {
    title,
    description,
    stage,
    rows,
    total,
    columns,
    search,
    onSearchChange,
    isFetching,
    rowKey,
    emptyMessage = "Sin registros que mostrar.",
    headerActions,
    filters,
    page,
    pageSize,
    onPageChange,
    toolbarVariant = "default",
  } = props;

  const hasPaging = typeof page === "number" && typeof pageSize === "number" && !!onPageChange;
  const totalPages = hasPaging ? Math.max(1, Math.ceil(total / pageSize!)) : 1;
  const from = hasPaging && total > 0 ? (page! - 1) * pageSize! + 1 : 0;
  const to = hasPaging ? Math.min(total, (page! - 1) * pageSize! + rows.length) : rows.length;

  const inputId = useId();
  const [draft, setDraft] = useState(search);

  return (
    <section className="mx-auto w-full max-w-6xl min-w-0 overflow-x-clip">
      <header
        className={
          toolbarVariant === "compact"
            ? "grid gap-4 border-b border-border pb-5"
            : "flex flex-col gap-2 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between"
        }
      >
        <div className={toolbarVariant === "compact" ? "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3" : ""}>
          <div className="min-w-0">
          {stage && (
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
              {stage}
            </p>
          )}
          <h1 className="mt-1 text-2xl font-semibold tracking-normal">{title}</h1>
          {description && (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
          )}
          </div>
          {toolbarVariant === "compact" ? (
            <div className="shrink-0 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs font-semibold tabular-nums text-foreground">
              {isFetching ? "Actualizando…" : `${total} imagen${total === 1 ? "" : "es"}`}
            </div>
          ) : null}
        </div>
        <div className={toolbarVariant === "compact" ? "min-w-0" : "flex items-center gap-3"}>
          {toolbarVariant !== "compact" ? (
          <p className="text-xs text-muted-foreground">
            {isFetching ? "Actualizando…" : `${total} registro${total === 1 ? "" : "s"}`}
          </p>
          ) : null}
          {headerActions}
        </div>
      </header>

      {filters && <div className="mt-5">{filters}</div>}

      <form
        className={
          toolbarVariant === "compact"
            ? "mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 lg:max-w-3xl"
            : "mt-5 flex flex-wrap items-end gap-3"
        }
        onSubmit={(e) => {
          e.preventDefault();
          onSearchChange(draft.trim());
        }}
      >
        <div className="flex min-w-0 flex-col gap-1">
          <label
            htmlFor={inputId}
            className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
          >
            Buscar
          </label>
          <input
            id={inputId}
            type="search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Filtrar por nombre…"
            className={
              toolbarVariant === "compact"
                ? "h-11 w-full rounded-xl border border-border bg-background px-4 text-sm shadow-sm outline-hidden focus-visible:ring-2 focus-visible:ring-primary"
                : "h-9 w-72 rounded-md border border-border bg-background px-3 text-sm outline-hidden focus-visible:ring-2 focus-visible:ring-primary"
            }
          />
        </div>
        <button
          type="submit"
          className={toolbarVariant === "compact" ? "h-11 shrink-0 rounded-xl bg-primary px-4 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:opacity-95" : "h-9 rounded-md bg-primary px-4 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:opacity-95"}
        >
          Aplicar
        </button>
        {search && (
          <button
            type="button"
            onClick={() => {
              setDraft("");
              onSearchChange("");
            }}
            className={toolbarVariant === "compact" ? "col-span-2 h-9 justify-self-start rounded-md border border-border bg-card px-4 text-xs font-medium hover:bg-accent" : "h-9 rounded-md border border-border bg-card px-4 text-xs font-medium hover:bg-accent"}
          >
            Limpiar
          </button>
        )}
      </form>

      <div className="mt-5 overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className={`px-3 py-2 font-medium ${c.className ?? ""}`}>
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-3 py-8 text-center text-sm text-muted-foreground"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={rowKey(row)} className="border-t border-border hover:bg-accent/30">
                    {columns.map((c) => (
                      <td key={c.key} className={`px-3 py-2 align-top ${c.className ?? ""}`}>
                        {c.render(row)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {hasPaging && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {total === 0
              ? "Sin resultados."
              : `Mostrando ${from}–${to} de ${total} · página ${page} de ${totalPages}`}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page! <= 1}
              onClick={() => onPageChange!(page! - 1)}
              className="h-9 rounded-md border border-border bg-card px-3 text-xs font-medium disabled:opacity-40 hover:bg-accent"
            >
              ← Anterior
            </button>
            <button
              type="button"
              disabled={page! >= totalPages}
              onClick={() => onPageChange!(page! + 1)}
              className="h-9 rounded-md border border-border bg-card px-3 text-xs font-medium disabled:opacity-40 hover:bg-accent"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export function StatusBadge({ value }: { value: string | null | undefined }) {
  const v = value ?? "draft";
  const tone =
    v === "published"
      ? "bg-primary/10 text-primary"
      : v === "approved"
        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
        : v === "in_review"
          ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
          : v === "archived"
            ? "bg-muted text-muted-foreground"
            : "bg-secondary text-secondary-foreground";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${tone}`}
    >
      {getEditorialStatusLabel(v)}
    </span>
  );
}
