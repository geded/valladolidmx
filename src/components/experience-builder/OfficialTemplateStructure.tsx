/**
 * Estructura Oficial de Plantillas — vista dentro del Panel de Páginas.
 *
 * No es un editor nuevo: sólo ordena por familia las plantillas ya
 * aprobadas y abre la página de trabajo correspondiente en el Studio
 * existente. Deriva su contenido de `official-template-structure`.
 */
import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Layers, Loader2, Plus } from "lucide-react";
import {
  buildOfficialTemplateStructure,
  type OfficialTemplateEntry,
} from "@/lib/experience-builder/official-template-structure";
import type { StudioPageRow } from "@/lib/experience-builder/studio.functions";

export interface OfficialTemplateStructureProps {
  rows: StudioPageRow[];
  loading: boolean;
  busyId: string | null;
  /** Abre la página de trabajo existente. */
  onOpenSlug: (slug: string) => void;
  /** Crea la página de trabajo con la plantilla aprobada de esa sección. */
  onCreateFromTemplate: (entry: OfficialTemplateEntry) => void | Promise<void>;
}

export function OfficialTemplateStructure({
  rows,
  loading,
  busyId,
  onOpenSlug,
  onCreateFromTemplate,
}: OfficialTemplateStructureProps) {
  const families = useMemo(() => buildOfficialTemplateStructure(), []);
  const total = useMemo(
    () => families.reduce((acc, f) => acc + f.entries.length, 0),
    [families],
  );
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const bySlug = useMemo(() => {
    const map = new Map<string, StudioPageRow>();
    for (const r of rows) map.set(r.slug, r);
    return map;
  }, [rows]);

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <header className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
          Estructura del sitio
        </p>
        <h3 className="mt-1 text-base font-semibold sm:text-lg">Plantillas oficiales</h3>
        <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
          {total} plantillas aprobadas, agrupadas por sección. Desde aquí entras a corregir textos,
          imágenes, enlaces y el orden de las secciones. Al crear una página nueva en una sección,
          el sistema asigna sola la plantilla de esa sección.
        </p>
      </header>

      <div className="mt-3 space-y-2">
        {families.map((family) => {
          const open = !collapsed[family.key];
          return (
            <div key={family.key} className="overflow-hidden rounded-xl border border-border">
              <button
                type="button"
                onClick={() => setCollapsed((p) => ({ ...p, [family.key]: open }))}
                className="flex w-full items-center gap-2 bg-muted/40 px-3 py-2 text-left hover:bg-accent/40"
                aria-expanded={open}
              >
                {open ? (
                  <ChevronDown className="size-3.5 shrink-0" aria-hidden />
                ) : (
                  <ChevronRight className="size-3.5 shrink-0" aria-hidden />
                )}
                <Layers className="size-3.5 shrink-0 text-primary" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{family.label}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {family.purpose}
                  </span>
                </span>
                <span className="shrink-0 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {family.entries.length}
                </span>
              </button>

              {open ? (
                <ul className="divide-y divide-border">
                  {family.entries.map((entry) => {
                    const row = entry.workingSlug ? (bySlug.get(entry.workingSlug) ?? null) : null;
                    return (
                      <li
                        key={entry.id}
                        className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{entry.name}</p>
                          <p className="line-clamp-2 text-[11px] text-muted-foreground">
                            {entry.description}
                          </p>
                          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                            {entry.publicRoute}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <StateBadge entry={entry} row={row} loading={loading} />
                          {row ? (
                            <button
                              type="button"
                              onClick={() => onOpenSlug(row.slug)}
                              className="rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium hover:bg-accent"
                            >
                              Abrir
                            </button>
                          ) : entry.creatable ? (
                            <button
                              type="button"
                              disabled={busyId === entry.id}
                              onClick={() => void onCreateFromTemplate(entry)}
                              className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground hover:opacity-95 disabled:opacity-60"
                            >
                              {busyId === entry.id ? (
                                <Loader2 className="size-3 animate-spin" aria-hidden />
                              ) : (
                                <Plus className="size-3" aria-hidden />
                              )}
                              Crear página
                            </button>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function StateBadge({
  entry,
  row,
  loading,
}: {
  entry: OfficialTemplateEntry;
  row: StudioPageRow | null;
  loading: boolean;
}) {
  let label = "Sin página creada";
  if (loading) label = "Cargando…";
  else if (row) label = row.published_at ? "Publicada" : "Borrador";
  else if (!entry.workingSlug) label = "Automática";
  return (
    <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      {label}
    </span>
  );
}
