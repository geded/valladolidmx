/**
 * EntityEditor — Formulario genérico de creación/edición CMS (Ola 1 · Etapa 3).
 *
 * Render exclusivamente UI: TODA validación efectiva ocurre server-side
 * (`upsertCmsEntity`, `transitionEntityStatus`). Las acciones de workflow
 * respetan la máquina oficial: draft → in_review → approved → published →
 * archived.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getCmsEntityById,
  transitionEntityStatus,
  upsertCmsEntity,
  listEntityHistory,
  type CmsHistoryEntry,
} from "@/lib/cms/writes.functions";
import { StatusBadge } from "@/components/cms/EntityListView";

export type FieldType = "text" | "textarea" | "number";

export interface EditorField {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
}

interface Props {
  table: string;
  id?: string;
  title: string;
  description?: string;
  backTo: string;
  listQueryKey: string;
  fields: EditorField[];
}

type ContentStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "published"
  | "archived";

const NEXT_ACTIONS: Record<ContentStatus, { to: ContentStatus; label: string }[]> = {
  draft: [{ to: "in_review", label: "Enviar a revisión" }],
  in_review: [
    { to: "approved", label: "Aprobar" },
    { to: "draft", label: "Devolver a borrador" },
  ],
  approved: [
    { to: "published", label: "Publicar" },
    { to: "draft", label: "Devolver a borrador" },
  ],
  published: [{ to: "archived", label: "Archivar" }],
  archived: [{ to: "draft", label: "Restaurar a borrador" }],
};

export function EntityEditor(props: Props) {
  const { table, id, title, description, backTo, listQueryKey, fields } = props;

  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchById = useServerFn(getCmsEntityById);
  const upsert = useServerFn(upsertCmsEntity);
  const transition = useServerFn(transitionEntityStatus);
  const fetchHistory = useServerFn(listEntityHistory);

  const isEdit = Boolean(id);

  type DetailRow = Record<string, string | number | boolean | null>;
  const detail = useQuery({
    queryKey: ["cms", listQueryKey, "detail", id],
    queryFn: (): Promise<DetailRow> =>
      fetchById({ data: { table, id: id! } }) as Promise<DetailRow>,
    enabled: isEdit,
  });

  const history = useQuery({
    queryKey: ["cms", listQueryKey, "history", id],
    queryFn: (): Promise<CmsHistoryEntry[]> =>
      fetchHistory({ data: { table, id: id! } }) as Promise<CmsHistoryEntry[]>,
    enabled: isEdit,
  });

  const initialValues = useMemo(() => {
    const init: Record<string, string> = {};
    for (const f of fields) init[f.name] = "";
    return init;
  }, [fields]);

  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (detail.data) {
      const next: Record<string, string> = { ...initialValues };
      for (const f of fields) {
        const v = (detail.data as Record<string, unknown>)[f.name];
        next[f.name] = v === null || v === undefined ? "" : String(v);
      }
      setValues(next);
    }
  }, [detail.data, fields, initialValues]);

  const status =
    ((detail.data?.status as unknown) as ContentStatus | undefined) ?? "draft";

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {};
      for (const f of fields) {
        const raw = values[f.name];
        if (raw === "" || raw === undefined) {
          payload[f.name] = null;
          continue;
        }
        payload[f.name] = f.type === "number" ? Number(raw) : raw;
      }
      return upsert({ data: { table, id: id ?? null, payload } });
    },
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ["cms", listQueryKey] });
      if (!isEdit) {
        navigate({ to: `${backTo}/${res.id}/editar` as never });
      } else {
        await detail.refetch();
        await history.refetch();
      }
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Error al guardar."),
  });

  const transitionMutation = useMutation({
    mutationFn: (to: ContentStatus) =>
      transition({ data: { table, id: id!, to } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["cms", listQueryKey] });
      await detail.refetch();
      await history.refetch();
    },
    onError: (e) =>
      setError(e instanceof Error ? e.message : "Error en transición."),
  });

  return (
    <section className="mx-auto w-full max-w-3xl">
      <header className="flex flex-col gap-2 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
            Ola 1 · Etapa 3 · Edición
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {isEdit ? title : `Nuevo · ${title}`}
          </h1>
          {description && (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {isEdit && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Estado actual:</span>
            <StatusBadge value={status} />
          </div>
        )}
      </header>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <form
        className="mt-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          saveMutation.mutate();
        }}
      >
        {fields.map((f) => (
          <FieldInput
            key={f.name}
            field={f}
            value={values[f.name] ?? ""}
            onChange={(v) => setValues((s) => ({ ...s, [f.name]: v }))}
          />
        ))}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="h-9 rounded-md bg-primary px-4 text-xs font-semibold uppercase tracking-wider text-primary-foreground disabled:opacity-60"
          >
            {saveMutation.isPending
              ? "Guardando…"
              : isEdit
                ? "Guardar cambios"
                : "Crear borrador"}
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: backTo as never })}
            className="h-9 rounded-md border border-border bg-card px-4 text-xs font-medium hover:bg-accent"
          >
            Volver al listado
          </button>
          {isEdit && (
            <p className="text-[11px] text-muted-foreground">
              Los cambios de campos NO modifican el estado editorial.
            </p>
          )}
        </div>
      </form>

      {isEdit && (
        <section className="mt-8 rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold tracking-tight">
            Workflow editorial
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            draft → in_review → approved → published → archived. Cada
            transición se valida server-side y queda asociada al usuario actual
            como insumo de auditoría futura.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {NEXT_ACTIONS[status].map((action) => (
              <button
                key={action.to}
                type="button"
                disabled={transitionMutation.isPending}
                onClick={() => {
                  setError(null);
                  transitionMutation.mutate(action.to);
                }}
                className="h-9 rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-accent disabled:opacity-60"
              >
                {action.label}
              </button>
            ))}
            {NEXT_ACTIONS[status].length === 0 && (
              <span className="text-xs text-muted-foreground">
                Sin transiciones disponibles desde este estado.
              </span>
            )}
          </div>
        </section>
      )}

      {isEdit && (
        <section className="mt-6 rounded-xl border border-border bg-card p-5">
          <header className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight">
              Historial editorial
            </h2>
            <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              content_audit_log
            </span>
          </header>
          <p className="mt-1 text-xs text-muted-foreground">
            Bitácora append-only de creaciones, ediciones y transiciones de
            estado. Insumo oficial de auditoría (Serie 13.4).
          </p>
          <div className="mt-4 divide-y divide-border text-xs">
            {history.isLoading && (
              <p className="py-2 text-muted-foreground">Cargando historial…</p>
            )}
            {history.data && history.data.length === 0 && (
              <p className="py-2 text-muted-foreground">
                Sin eventos registrados aún.
              </p>
            )}
            {history.data?.map((h) => (
              <div
                key={h.id}
                className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider">
                    {h.action}
                  </span>
                  {h.from_status && h.to_status && (
                    <span className="text-muted-foreground">
                      {h.from_status} → <strong>{h.to_status}</strong>
                    </span>
                  )}
                  {!h.from_status && h.to_status && (
                    <span className="text-muted-foreground">
                      → <strong>{h.to_status}</strong>
                    </span>
                  )}
                </div>
                <time className="text-muted-foreground">
                  {new Date(h.created_at).toLocaleString()}
                </time>
              </div>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}

function FieldInput(props: {
  field: EditorField;
  value: string;
  onChange: (v: string) => void;
}) {
  const { field, value, onChange } = props;
  const common =
    "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary";
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {field.label}
        {field.required && <span className="ml-1 text-destructive">*</span>}
      </label>
      {field.type === "textarea" ? (
        <textarea
          required={field.required}
          rows={4}
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={common}
        />
      ) : (
        <input
          required={field.required}
          type={field.type === "number" ? "number" : "text"}
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={common}
        />
      )}
      {field.helpText && (
        <p className="text-[11px] text-muted-foreground">{field.helpText}</p>
      )}
    </div>
  );
}
