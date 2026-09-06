import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getProductAttributeEditor,
  updateProductAttributes,
} from "@/lib/portal/product-attributes.functions";
import type { TourismFilterAttributes } from "@/lib/business-attributes/types";

/**
 * Editor de características turísticas de un producto (familia `experiencias`).
 * Alimenta filtros públicos, ficha Premium y Alux. Sólo se muestra cuando el
 * tipo de producto tiene familia de atributos configurada.
 */
export function ProductAttributesPanel({ productId }: { productId: string }) {
  const getEditor = useServerFn(getProductAttributeEditor);
  const updateEditor = useServerFn(updateProductAttributes);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["product-attribute-editor", productId],
    queryFn: () => getEditor({ data: { productId } }),
  });
  const [values, setValues] = useState<TourismFilterAttributes>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!query.data) return;
    setValues(query.data.values);
    setDirty(false);
  }, [query.data]);

  const mutation = useMutation({
    mutationFn: () => updateEditor({ data: { productId, values } }),
    onSuccess: async () => {
      setDirty(false);
      await queryClient.invalidateQueries({ queryKey: ["product-attribute-editor", productId] });
    },
  });

  if (query.isLoading)
    return <p className="mt-4 text-xs text-muted-foreground">Cargando características…</p>;
  if (query.isError)
    return (
      <p className="mt-4 text-xs text-destructive">
        No se pudieron cargar las características de la experiencia.
      </p>
    );
  if (!query.data?.editable) return null;

  return (
    <section className="mt-4 rounded-lg border border-border bg-background/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
        Características de la experiencia
      </p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Selecciona únicamente lo confirmado. Lo que quede vacío no se mostrará ni se supondrá.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {query.data.definitions.map((definition) => {
          const selected = values[definition.key];
          if (definition.inputType === "single") {
            return (
              <label key={definition.key} className="block">
                <span className="text-xs font-semibold">
                  {definition.label}
                  {definition.required ? " *" : ""}
                </span>
                {definition.helpText ? (
                  <span className="mt-1 block text-[11px] text-muted-foreground">
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
            <fieldset key={definition.key} className="rounded-lg border border-border p-3">
              <legend className="px-1 text-xs font-semibold">{definition.label}</legend>
              {definition.helpText ? (
                <p className="mb-2 text-[11px] text-muted-foreground">{definition.helpText}</p>
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
        <p className="mt-3 text-xs text-destructive">
          {mutation.error instanceof Error
            ? mutation.error.message
            : "No se pudieron guardar los cambios."}
        </p>
      ) : null}
      {mutation.isSuccess && !dirty ? (
        <p className="mt-3 text-xs text-primary">Características guardadas.</p>
      ) : null}
      <button
        type="button"
        onClick={() => mutation.mutate()}
        disabled={!dirty || mutation.isPending}
        className="mt-4 min-h-11 rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
      >
        {mutation.isPending ? "Guardando…" : "Guardar características"}
      </button>
    </section>
  );
}
