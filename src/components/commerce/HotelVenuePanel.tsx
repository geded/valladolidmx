/**
 * Restaurante del hotel · panel del Portal.
 *
 * Permite al equipo de un negocio anfitrión (hotel) mostrar los negocios que
 * están dentro de él, y al del negocio vinculado ver a qué hotel pertenece.
 * Solo se puede vincular cuando la persona administra los dos negocios.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link2, X } from "lucide-react";
import {
  linkVenue,
  listVenueLinks,
  searchVenueCandidates,
  unlinkVenue,
} from "@/lib/commerce/hotel-venue.functions";
import { filterVenueCandidates, venueLinkProblem } from "@/lib/commerce/hotel-venue";

export function HotelVenuePanel({ businessId }: { businessId: string }) {
  const queryClient = useQueryClient();
  const read = useServerFn(listVenueLinks);
  const search = useServerFn(searchVenueCandidates);
  const add = useServerFn(linkVenue);
  const drop = useServerFn(unlinkVenue);

  const [term, setTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const links = useQuery({
    queryKey: ["hotel-venue-links", businessId],
    queryFn: () => read({ data: { businessId } }),
  });
  const canManage = links.data?.canManage === true;

  const candidates = useQuery({
    queryKey: ["hotel-venue-candidates", businessId, term.trim().toLowerCase()],
    enabled: canManage && term.trim().length > 1,
    staleTime: 30_000,
    queryFn: () => search({ data: { term: term.trim() } }),
  });

  const link = useMutation({
    mutationFn: (venueId: string) => add({ data: { hostBusinessId: businessId, venueBusinessId: venueId } }),
    onSuccess: () => {
      setError(null);
      setTerm("");
      void queryClient.invalidateQueries({ queryKey: ["hotel-venue-links"] });
      void queryClient.invalidateQueries({ queryKey: ["hotel-venue-section"] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : "No se pudo crear el vínculo."),
  });

  const remove = useMutation({
    mutationFn: (linkId: string) => drop({ data: { linkId } }),
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["hotel-venue-links"] });
      void queryClient.invalidateQueries({ queryKey: ["hotel-venue-section"] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : "No se pudo quitar el vínculo."),
  });

  const venues = links.data?.venues ?? [];
  const hosts = links.data?.hosts ?? [];
  const visible = filterVenueCandidates(candidates.data ?? [], { selfId: businessId, current: venues, term });

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Restaurante del hotel
      </h2>
      <p className="mt-2 text-xs text-muted-foreground">
        Muestra en la ficha de este negocio los restaurantes o cafeterías que están dentro de él.
        Para vincularlos necesitas administrar los dos negocios.
      </p>

      {error ? (
        <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}

      {venues.length ? (
        <ul className="mt-4 space-y-2">
          {venues.map((v) => (
            <li key={v.link_id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
              <span className="min-w-0 truncate text-sm">{v.name}</span>
              {canManage ? (
                <button
                  type="button"
                  onClick={() => remove.mutate(v.link_id)}
                  disabled={remove.isPending}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-semibold disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                  Quitar
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {canManage ? (
        <div className="mt-4">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="venue-search">
            Buscar negocio para vincular
          </label>
          <input
            id="venue-search"
            value={term}
            onChange={(e) => {
              setError(null);
              setTerm(e.target.value);
            }}
            placeholder="Escribe al menos dos letras del nombre"
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          {term.trim().length > 1 ? (
            <ul className="mt-2 space-y-2">
              {visible.map((c) => {
                const blocked = venueLinkProblem({ hostId: businessId, venueId: c.id, current: venues });
                return (
                  <li key={c.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                    <span className="min-w-0 truncate text-sm">{c.name}</span>
                    <button
                      type="button"
                      onClick={() => link.mutate(c.id)}
                      disabled={Boolean(blocked) || link.isPending}
                      title={blocked ?? undefined}
                      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      <Link2 className="h-3.5 w-3.5" aria-hidden />
                      Vincular
                    </button>
                  </li>
                );
              })}
              {!visible.length && !candidates.isFetching ? (
                <li className="px-1 text-xs text-muted-foreground">
                  No encontramos otro negocio que puedas administrar con ese nombre.
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      ) : null}

      {hosts.length ? (
        <p className="mt-4 text-xs text-muted-foreground">
          Este negocio está vinculado como restaurante de: {hosts.map((h) => h.name).join(", ")}.
        </p>
      ) : null}
    </section>
  );
}
