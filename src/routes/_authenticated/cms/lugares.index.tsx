import { useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { StatusBadge } from "@/components/cms/EntityListView";
import { inputClass } from "@/components/cms/places/PlaceSection";
import { listPlaceFormOptions, listPlacesCms } from "@/lib/places/places-cms.functions";
import {
  zonesForDestination as selectableZonesForDestination,
  reconcileZoneForDestination,
  type TerritorialZone,
} from "@/lib/places/place-territory";

export const Route = createFileRoute("/_authenticated/cms/lugares/")({
  head: () => ({
    meta: [
      { title: "Lugares y atractivos · CMS Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LugaresPage,
});

type Row = {
  id: string;
  slug: string;
  name: string;
  status: string | null;
  destination_id: string;
  destination_zone_id: string | null;
  latitude: number | null;
  longitude: number | null;
  updated_at: string;
};

function LugaresPage() {
  const optionsFn = useServerFn(listPlaceFormOptions);
  const listFn = useServerFn(listPlacesCms);

  const [search, setSearch] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [status, setStatus] = useState("");

  const options = useQuery({
    queryKey: ["cms", "places", "options"],
    queryFn: () => optionsFn(),
  });

  const opts = (options.data ?? {}) as {
    destinations?: Array<{ id: string; name: string }>;
    zones?: TerritorialZone[];
  };

  // Addendum Q2B: el filtro de zona siempre depende del destino elegido.
  const zones = useMemo(
    () => selectableZonesForDestination(opts.zones ?? [], destinationId),
    [opts.zones, destinationId],
  );

  const selectDestination = (next: string) => {
    setDestinationId(next);
    setZoneId((current) => reconcileZoneForDestination(opts.zones ?? [], next, current));
  };

  const list = useQuery({
    queryKey: ["cms", "places", "list", { search, destinationId, zoneId, status }],
    queryFn: () =>
      listFn({
        data: {
          search: search.trim() || undefined,
          destinationId: destinationId || undefined,
          destinationZoneId: zoneId || undefined,
          status: status || undefined,
        },
      }),
  });

  const result = (list.data ?? { rows: [], total: 0 }) as { rows: Row[]; total: number };
  const destinationName = (id: string) =>
    (opts.destinations ?? []).find((d) => d.id === id)?.name ?? "—";
  const zoneName = (id: string | null) =>
    id ? ((opts.zones ?? []).find((z) => z.id === id)?.name ?? "—") : "Sin zona";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-foreground">Lugares y atractivos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cenotes, museos, plazas y patrimonio del Oriente Maya.
          </p>
        </div>
        <Link
          to="/cms/lugares/nuevo"
          className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
        >
          + Nuevo lugar
        </Link>
      </header>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="text-xs font-medium text-foreground">Buscar</span>
          <input
            className={`${inputClass} mt-1.5`}
            value={search}
            placeholder="Nombre o slug…"
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-foreground">Destino</span>
          <select
            className={`${inputClass} mt-1.5`}
            value={destinationId}
            onChange={(e) => selectDestination(e.target.value)}
          >
            <option value="">Todos los destinos</option>
            {(opts.destinations ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-foreground">Zona</span>
          <select
            className={`${inputClass} mt-1.5`}
            value={zoneId}
            disabled={!destinationId || zones.length === 0}
            onChange={(e) => setZoneId(e.target.value)}
          >
            <option value="">
              {!destinationId
                ? "Elige un destino primero"
                : zones.length === 0
                  ? "Este destino no tiene zonas"
                  : "Todas las zonas"}
            </option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-foreground">Estado</span>
          <select
            className={`${inputClass} mt-1.5`}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="draft">Borrador</option>
            <option value="in_review">En revisión</option>
            <option value="approved">Aprobado</option>
            <option value="published">Publicado</option>
            <option value="archived">Archivado</option>
          </select>
        </label>
      </div>

      <div className="mt-5 overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Destino</th>
              <th className="px-3 py-2">Zona</th>
              <th className="px-3 py-2">Ubicación</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {list.isLoading && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  Cargando lugares…
                </td>
              </tr>
            )}
            {!list.isLoading && result.rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  No hay lugares con estos filtros.
                </td>
              </tr>
            )}
            {result.rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-2">
                  <span className="font-medium">{r.name}</span>
                  <code className="ml-2 text-xs text-muted-foreground">{r.slug}</code>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {destinationName(r.destination_id)}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {zoneName(r.destination_zone_id)}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {r.latitude !== null && r.longitude !== null
                    ? "Con coordenadas"
                    : "Sin ubicación"}
                </td>
                <td className="px-3 py-2">
                  <StatusBadge value={r.status} />
                </td>
                <td className="px-3 py-2 text-right">
                  <Link
                    to="/cms/lugares/$placeId/editar"
                    params={{ placeId: r.id }}
                    className="inline-flex min-h-9 items-center rounded-md border border-border px-3 text-xs font-semibold hover:bg-accent"
                  >
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">{result.total} lugares en total.</p>
    </div>
  );
}
