/**
 * CmsEntitySearchPicker — buscador compartido del CMS para elegir una empresa,
 * producto, destino o evento por su nombre (2 letras, sin acentos), sin pedir
 * al editor ningún código interno.
 *
 * Reutiliza las lecturas editoriales de `src/lib/cms/reads.functions.ts`. Lo
 * usan el panel «Lista recomendada» de cada ficha, la página
 * `/cms/relacionados` y las relaciones de Lugares.
 */
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { RelatedEntityKind } from "@/lib/related/overrides.functions";
import { KIND_LABELS } from "@/lib/related/related-overrides-ui";
import { CMS_SEARCH_DEBOUNCE_MS, CMS_SEARCH_MIN_CHARS } from "@/lib/cms/accent-search";
import { getEditorialStatusLabel } from "@/lib/cms/editorial-language";
import {
  listBusinessesCms,
  listDestinationsCms,
  listEventsCms,
  listProductsCms,
} from "@/lib/cms/reads.functions";

export interface CmsPickOption {
  id: string;
  name: string;
  status: string;
}

function useEntitySearch(kind: RelatedEntityKind, term: string) {
  const [debounced, setDebounced] = useState("");
  const businessesFn = useServerFn(listBusinessesCms);
  const productsFn = useServerFn(listProductsCms);
  const destinationsFn = useServerFn(listDestinationsCms);
  const eventsFn = useServerFn(listEventsCms);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), CMS_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [term]);

  const enabled = debounced.length >= CMS_SEARCH_MIN_CHARS;

  const query = useQuery({
    queryKey: ["cms", "entity-search", kind, debounced] as const,
    enabled,
    queryFn: async (): Promise<CmsPickOption[]> => {
      const data = { search: debounced, limit: 8 };
      if (kind === "business") {
        const r = await businessesFn({ data });
        return (r.rows ?? []).map((row) => ({
          id: row.id,
          name: row.display_name,
          status: row.status,
        }));
      }
      if (kind === "product") {
        const r = await productsFn({ data });
        return (r.rows ?? []).map((row) => ({ id: row.id, name: row.name, status: row.status }));
      }
      if (kind === "destination") {
        const r = await destinationsFn({ data });
        return (r.rows ?? []).map((row) => ({ id: row.id, name: row.name, status: row.status }));
      }
      const r = await eventsFn({ data });
      return (r.rows ?? []).map((row) => ({ id: row.id, name: row.title, status: row.status }));
    },
  });

  return {
    options: query.data ?? [],
    isSearching: enabled && query.isFetching,
    ready: enabled,
  };
}

interface Props {
  kind: RelatedEntityKind;
  /** Texto encima del buscador. Por omisión: «Empresa que quieres ajustar». */
  label?: string;
  /** Ficha que no se puede elegir (normalmente la que se está editando). */
  excludeIds?: readonly string[];
  /** Nombre ya elegido (por ejemplo, al editar una fila guardada). */
  initial?: CmsPickOption | null;
  onPick: (option: CmsPickOption | null) => void;
  compact?: boolean;
}

export function CmsEntitySearchPicker({
  kind,
  label,
  excludeIds = [],
  initial = null,
  onPick,
  compact = false,
}: Props) {
  const [term, setTerm] = useState("");
  const [picked, setPicked] = useState<CmsPickOption | null>(initial);
  const { options, isSearching, ready } = useEntitySearch(kind, term);

  useEffect(() => {
    setPicked(initial);
  }, [initial?.id, initial?.name]);

  const visible = options.filter((o) => !excludeIds.includes(o.id));
  const caption = label ?? `${KIND_LABELS[kind]} que quieres ajustar`;

  return (
    <div className="min-w-0 flex-1">
      <label className="block text-xs">
        <span className={compact ? "sr-only" : "mb-1 block text-muted-foreground"}>{caption}</span>
        <input
          value={picked ? picked.name : term}
          readOnly={Boolean(picked)}
          onChange={(e) => {
            setPicked(null);
            setTerm(e.target.value);
          }}
          placeholder={`Escribe ${CMS_SEARCH_MIN_CHARS} o más letras del nombre y elige`}
          className="h-9 w-full rounded-md border bg-background px-2 text-sm"
        />
      </label>

      {picked && (
        <div className="mt-1 flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">
            Elegido: {picked.name}
            {picked.status && picked.status !== "published"
              ? ` · ${getEditorialStatusLabel(picked.status).toLowerCase()}`
              : ""}
          </span>
          <button
            type="button"
            onClick={() => {
              setPicked(null);
              setTerm("");
              onPick(null);
            }}
            className="rounded-md border px-2 py-0.5 text-[11px] hover:bg-muted"
          >
            Cambiar
          </button>
        </div>
      )}

      {!picked && ready && (
        <ul className="mt-1 max-h-48 overflow-y-auto rounded-md border bg-background">
          {isSearching && visible.length === 0 && (
            <li className="px-2 py-1.5 text-xs text-muted-foreground">Buscando…</li>
          )}
          {!isSearching && visible.length === 0 && (
            <li className="px-2 py-1.5 text-xs text-muted-foreground">
              No encontramos nada con «{term.trim()}». Prueba con otras letras.
            </li>
          )}
          {visible.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => {
                  setPicked(o);
                  onPick(o);
                }}
                className="flex w-full items-baseline justify-between gap-2 px-2 py-1.5 text-left text-xs hover:bg-muted"
              >
                <span className="min-w-0 flex-1 truncate font-medium">{o.name}</span>
                {o.status !== "published" && (
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {getEditorialStatusLabel(o.status).toLowerCase()}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
