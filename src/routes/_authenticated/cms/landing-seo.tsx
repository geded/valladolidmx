/**
 * LOTE 3I · /cms/landing-seo — Sección central "Landing SEO".
 *
 * Administración CMS-first de la familia `premium-seo-landing`:
 * listar, buscar, filtrar, crear (idempotente) y abrir en el Experience
 * Builder único. No existe editor paralelo: "Abrir" siempre navega a
 * `/cms/experience-builder`.
 */
import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, ExternalLink, Search } from "lucide-react";
import { toast } from "@/lib/toast";
import { useAuth } from "@/hooks/useAuth";
import {
  canManageSeoLandings,
  SEO_LANDING_ENTITY_TYPES,
  type SeoLandingEntityType,
} from "@/lib/experience-builder/seo-landing/seo-landing-creation";
import { createSeoLandingDraft } from "@/lib/experience-builder/seo-landing/seo-landing-creation.functions";
import {
  listSeoLandingsCms,
  searchSeoLandingEntities,
  type SeoLandingAdminRow,
} from "@/lib/experience-builder/seo-landing/seo-landing-admin.functions";

export const Route = createFileRoute("/_authenticated/cms/landing-seo")({
  head: () => ({
    meta: [{ title: "Landing SEO · CMS Studio" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: LandingSeoPage,
});

const ENTITY_LABEL: Record<SeoLandingEntityType, string> = {
  business: "Empresa",
  product: "Producto",
  place: "Lugar",
};

const fieldClass =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none ring-focus";

function LandingSeoPage() {
  const { roles } = useAuth();
  const allowed = canManageSeoLandings(roles);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const listFn = useServerFn(listSeoLandingsCms);
  const searchFn = useServerFn(searchSeoLandingEntities);
  const createFn = useServerFn(createSeoLandingDraft);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [entityType, setEntityType] = useState("");
  const [destination, setDestination] = useState("");
  const [robots, setRobots] = useState("");

  const [pickerType, setPickerType] = useState<SeoLandingEntityType>("business");
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  const list = useQuery({
    queryKey: ["cms", "seo-landings"],
    queryFn: () => listFn(),
    enabled: allowed,
  });

  const candidates = useQuery({
    queryKey: ["cms", "seo-landings", "candidates", pickerType, pickerSearch],
    queryFn: () => searchFn({ data: { entityType: pickerType, search: pickerSearch } }),
    enabled: allowed && pickerOpen,
  });

  const create = useMutation({
    mutationFn: (input: { entityType: SeoLandingEntityType; entityId: string }) =>
      createFn({ data: input }),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ["cms", "seo-landings"] });
      toast.success(res.created ? "Landing SEO creada como borrador." : "Ya existía; se abre.");
      setPickerOpen(false);
      void navigate({
        to: "/cms/experience-builder",
        search: { page: res.id, mode: undefined, block: undefined },
      });
    },
    onError: (error) => {
      console.error("[seo-landing-create]", error);
      toast.error(error instanceof Error ? error.message : "No fue posible crear la Landing SEO.");
    },
  });

  const rows = useMemo(() => list.data?.rows ?? [], [list.data]);
  const destinations = useMemo(
    () => [...new Set(rows.map((r) => r.destinationSlug).filter(Boolean))] as string[],
    [rows],
  );

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        const term = search.trim().toLowerCase();
        if (
          term &&
          ![row.title, row.slug, row.entityName ?? ""].some((v) => v.toLowerCase().includes(term))
        )
          return false;
        if (status && row.status !== status) return false;
        if (entityType && row.entityType !== entityType) return false;
        if (destination && row.destinationSlug !== destination) return false;
        if (robots && !row.robots.includes(robots)) return false;
        return true;
      }),
    [rows, search, status, entityType, destination, robots],
  );

  if (!allowed) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Esta sección está reservada a los roles editoriales.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            Experience Builder
          </p>
          <h1 className="mt-1 font-serif text-2xl">Landing SEO</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Landings editoriales premium creadas desde entidades canónicas reales. Nacen como
            borrador <code className="text-xs">noindex,nofollow</code> y se editan en el Experience
            Builder único.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-pill bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-focus"
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          Crear Landing SEO
        </button>
      </header>

      {pickerOpen && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Selecciona la entidad canónica de origen</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-[160px_1fr]">
            <select
              className={fieldClass}
              value={pickerType}
              onChange={(e) => setPickerType(e.target.value as SeoLandingEntityType)}
            >
              {SEO_LANDING_ENTITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ENTITY_LABEL[t]}
                </option>
              ))}
            </select>
            <label className="relative block">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                className={`${fieldClass} pl-9`}
                placeholder="Buscar por nombre…"
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
              />
            </label>
          </div>
          <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-border">
            {candidates.isLoading ? (
              <p className="p-3 text-sm text-muted-foreground">Cargando entidades…</p>
            ) : candidates.isError ? (
              <p className="p-3 text-sm text-destructive">No se pudieron cargar las entidades.</p>
            ) : (candidates.data?.items.length ?? 0) === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">Sin resultados.</p>
            ) : (
              <ul className="divide-y divide-border">
                {candidates.data?.items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      disabled={create.isPending}
                      onClick={() =>
                        create.mutate({ entityType: item.entityType, entityId: item.id })
                      }
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/60 disabled:opacity-60"
                    >
                      <span className="min-w-0 truncate">{item.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">/{item.slug}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <input
          className={fieldClass}
          placeholder="Buscar landing o entidad…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={fieldClass}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Estado"
        >
          <option value="">Todos los estados</option>
          <option value="draft">Borrador</option>
          <option value="published">Publicada</option>
        </select>
        <select
          className={fieldClass}
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          aria-label="Tipo de entidad"
        >
          <option value="">Todo tipo de entidad</option>
          {SEO_LANDING_ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {ENTITY_LABEL[t]}
            </option>
          ))}
        </select>
        <select
          className={fieldClass}
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          aria-label="Destino"
        >
          <option value="">Todos los destinos</option>
          {destinations.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          className={fieldClass}
          value={robots}
          onChange={(e) => setRobots(e.target.value)}
          aria-label="Directiva de indexación"
        >
          <option value="">Toda directiva</option>
          <option value="noindex">noindex</option>
          <option value="index,follow">index,follow</option>
        </select>
      </section>

      {list.isLoading ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Cargando landings…
        </p>
      ) : list.isError ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5 text-sm">
          <p className="font-semibold text-destructive">No se pudieron cargar las landings.</p>
          <button
            type="button"
            onClick={() => void list.refetch()}
            className="mt-3 rounded-md border border-destructive/40 px-3 py-1.5 text-xs text-destructive"
          >
            Reintentar
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          No hay landings que coincidan con los filtros.
        </p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {filtered.map((row) => (
            <LandingCard key={row.id} row={row} />
          ))}
        </ul>
      )}
    </div>
  );
}

function LandingCard({ row }: { row: SeoLandingAdminRow }) {
  const navigate = useNavigate();
  const published = row.status === "published" || Boolean(row.publishedAt);
  return (
    <li className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-serif text-lg">{row.title}</h3>
          <p className="truncate text-xs text-muted-foreground">/{row.slug}</p>
        </div>
        <span
          className={`shrink-0 rounded-pill px-2.5 py-1 text-[11px] font-medium ${
            published ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"
          }`}
        >
          {published ? "Publicada" : "Borrador"}
        </span>
      </div>

      <dl className="mt-3 grid gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2">
        <Row
          label="Entidad de origen"
          value={
            row.entityName
              ? `${row.entityName} · ${ENTITY_LABEL[row.entityType ?? "business"]}`
              : row.legacy
                ? "Landing legacy (sin entidad vinculada)"
                : "—"
          }
        />
        <Row label="Destino" value={row.destinationSlug ?? "—"} />
        <Row label="Plantilla" value={row.template ? `${row.template} · ${row.variant}` : "—"} />
        <Row label="Canonical" value={row.canonical ?? "—"} />
        <Row label="Robots" value={row.robots} />
        <Row label="Actualizada" value={new Date(row.updatedAt).toLocaleString("es-MX")} />
      </dl>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            void navigate({
              to: "/cms/experience-builder",
              search: { page: row.id, mode: undefined, block: undefined },
            })
          }
          className="inline-flex items-center gap-1.5 rounded-pill border border-border px-3 py-1.5 text-xs font-medium ring-focus hover:bg-muted/60"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          Abrir en el Experience Builder
        </button>
      </div>
    </li>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate">{value}</dd>
    </div>
  );
}
