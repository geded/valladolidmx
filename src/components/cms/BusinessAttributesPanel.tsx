import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getBusinessAttributeEditor,
  updateBusinessAttributes,
} from "@/lib/portal/business-attributes.functions";
import type { TourismFilterAttributes } from "@/lib/business-attributes/types";

export function BusinessAttributesPanel({ businessId }: { businessId: string }) {
  const getEditor = useServerFn(getBusinessAttributeEditor);
  const updateEditor = useServerFn(updateBusinessAttributes);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["business-attribute-editor", businessId],
    queryFn: () => getEditor({ data: { businessId } }),
  });
  const [values, setValues] = useState<TourismFilterAttributes>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!query.data) return;
    setValues(query.data.values);
    setDirty(false);
  }, [query.data]);

  const mutation = useMutation({
    mutationFn: () => updateEditor({ data: { businessId, values } }),
    onSuccess: async () => {
      setDirty(false);
      await queryClient.invalidateQueries({ queryKey: ["business-attribute-editor", businessId] });
    },
  });

  if (query.isLoading)
    return (
      <section className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
        Cargando características…
      </section>
    );
  if (query.isError)
    return (
      <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
        No se pudieron cargar las características del establecimiento.
      </section>
    );
  if (!query.data?.editable) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          Características de{" "}
          {query.data.family === "restaurantes"
            ? "restaurante"
            : query.data.family === "casas-de-vacaciones"
              ? "la casa de vacaciones"
              : "hospedaje"}
        </p>
        <h2 className="mt-2 text-2xl">Datos que alimentan filtros, ficha y Alux</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Selecciona únicamente características confirmadas. Lo que quede vacío no se mostrará ni se
          supondrá.
        </p>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {query.data.definitions.map((definition) => {
          const selected = values[definition.key];
          if (definition.inputType === "single") {
            return (
              <label key={definition.key} className="block">
                <span className="text-sm font-semibold">
                  {definition.label}
                  {definition.required ? " *" : ""}
                </span>
                {definition.helpText ? (
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {definition.helpText}
                  </span>
                ) : null}
                <select
                  value={typeof selected === "string" ? selected : ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    setValues((current) => {
                      const next = { ...current };
                      if (value) next[definition.key] = value;
                      else delete next[definition.key];
                      return next;
                    });
                    setDirty(true);
                  }}
                  className="mt-2 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
                >
                  <option value="">Sin especificar</option>
                  {definition.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            );
          }
          const chosen = Array.isArray(selected) ? selected : [];
          return (
            <fieldset key={definition.key} className="rounded-lg border border-border p-4">
              <legend className="px-1 text-sm font-semibold">{definition.label}</legend>
              {definition.helpText ? (
                <p className="mb-3 text-xs text-muted-foreground">{definition.helpText}</p>
              ) : null}
              <div className="grid gap-2 sm:grid-cols-2">
                {definition.options.map((option) => (
                  <label key={option.value} className="flex min-h-10 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={chosen.includes(option.value)}
                      onChange={(event) => {
                        setValues((current) => {
                          const previous = Array.isArray(current[definition.key])
                            ? (current[definition.key] as string[])
                            : [];
                          const nextValues = event.target.checked
                            ? [...previous, option.value]
                            : previous.filter((value) => value !== option.value);
                          const next = { ...current };
                          if (nextValues.length) next[definition.key] = nextValues;
                          else delete next[definition.key];
                          return next;
                        });
                        setDirty(true);
                      }}
                      className="size-4 rounded border-border"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>
          );
        })}
      </div>

      {mutation.isError ? (
        <p className="mt-4 text-sm text-destructive">
          {mutation.error instanceof Error
            ? mutation.error.message
            : "No se pudieron guardar los cambios."}
        </p>
      ) : null}
      {mutation.isSuccess && !dirty ? (
        <p className="mt-4 text-sm text-primary">Características guardadas.</p>
      ) : null}
      <button
        type="button"
        onClick={() => mutation.mutate()}
        disabled={!dirty || mutation.isPending}
        className="mt-5 min-h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        {mutation.isPending ? "Guardando…" : "Guardar características"}
      </button>
    </section>
  );
}
