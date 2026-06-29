/**
 * EntityListView — Vista de listado tipada reutilizable (Ola 1 · Etapa 2).
 *
 * Render exclusivamente lectura. Sin mutaciones, sin transición de estado.
 * Cumple VISUAL-GATES-CHECKLIST (12D): tokens semánticos, jerarquía clara,
 * estados vacíos y de error explícitos.
 */
import { useId, useState, type ReactNode } from "react";

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
  } = props;

  const inputId = useId();
  const [draft, setDraft] = useState(search);

  return (
    <section className="mx-auto w-full max-w-6xl">
      <header className="flex flex-col gap-2 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {stage && (
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
              {stage}
            </p>
          )}
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {isFetching ? "Actualizando…" : `${total} registro${total === 1 ? "" : "s"}`}
        </p>
      </header>

      <form
        className="mt-5 flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSearchChange(draft.trim());
        }}
      >
        <div className="flex flex-col gap-1">
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
            className="h-9 w-72 rounded-md border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <button
          type="submit"
          className="h-9 rounded-md bg-primary px-4 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:opacity-95"
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
            className="h-9 rounded-md border border-border bg-card px-4 text-xs font-medium hover:bg-accent"
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
                  <tr
                    key={rowKey(row)}
                    className="border-t border-border hover:bg-accent/30"
                  >
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

      <p className="mt-3 text-[11px] text-muted-foreground">
        Etapa 2 · Lecturas tipadas. Edición y workflow se habilitarán en etapas
        posteriores tras aprobación documental.
      </p>
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
      {v}
    </span>
  );
}