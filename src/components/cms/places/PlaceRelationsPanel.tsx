/**
 * G8-Q2B · Relaciones informativas del lugar.
 *
 * Productos, eventos y autoridad/operador. Regla vinculante: ninguna de estas
 * relaciones convierte a la empresa en propietaria ni gestora del atractivo.
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "@/lib/toast";
import {
  setPlaceAuthoritiesCms,
  setPlaceEventsCms,
  setPlaceProductsCms,
} from "@/lib/places/places-cms.functions";
import {
  PLACE_EVENT_RELATION_KINDS,
  PLACE_EVENT_RELATION_LABELS,
  PLACE_PRODUCT_RELATION_KINDS,
  PLACE_PRODUCT_RELATION_LABELS,
} from "@/lib/places/place-taxonomy";
import { resolveRelatedEntityNames } from "@/lib/related/overrides.functions";
import { CmsEntitySearchPicker, type CmsPickOption } from "@/components/cms/CmsEntitySearchPicker";
import { PlaceSection, buttonClass, inputClass, primaryButtonClass } from "./PlaceSection";

export interface ProductRelation {
  product_id: string;
  relation_kind: string;
  sort_order: number;
}
export interface EventRelation {
  event_id: string;
  relation_kind: string;
  sort_order: number;
}
export interface AuthorityRelation {
  authority_kind_id: string;
  business_id: string | null;
  authority_name: string | null;
  is_primary: boolean;
  notes?: string | null;
}

interface Props {
  placeId: string;
  products: ProductRelation[];
  events: EventRelation[];
  authorities: AuthorityRelation[];
  authorityKinds: { id: string; name: string }[];
  onChanged: () => void;
}

export function PlaceRelationsPanel(props: Props) {
  const [products, setProducts] = useState<ProductRelation[]>([]);
  const [events, setEvents] = useState<EventRelation[]>([]);
  const [authorities, setAuthorities] = useState<AuthorityRelation[]>([]);

  useEffect(() => setProducts(props.products), [props.products]);
  useEffect(() => setEvents(props.events), [props.events]);
  useEffect(() => setAuthorities(props.authorities), [props.authorities]);

  const namesFn = useServerFn(resolveRelatedEntityNames);
  const savedRefs = useMemo(
    () => [
      ...props.products.map((r) => ({ kind: "product" as const, id: r.product_id })),
      ...props.events.map((r) => ({ kind: "event" as const, id: r.event_id })),
    ],
    [props.products, props.events],
  );
  const namesQuery = useQuery({
    queryKey: ["cms", "place-relation-names", savedRefs.map((r) => `${r.kind}:${r.id}`).join(",")],
    enabled: savedRefs.length > 0,
    queryFn: () => namesFn({ data: { refs: savedRefs } }),
  });
  const savedNames = namesQuery.data?.names ?? {};
  const [pickedNames, setPickedNames] = useState<Record<string, CmsPickOption>>({});
  const remember = (kind: "product" | "event", option: CmsPickOption | null) => {
    if (option) setPickedNames((m) => ({ ...m, [`${kind}:${option.id}`]: option }));
  };
  const initialFor = (kind: "product" | "event", id: string): CmsPickOption | null => {
    if (!id) return null;
    const justPicked = pickedNames[`${kind}:${id}`];
    if (justPicked) return justPicked;
    const entry = savedNames[`${kind}:${id}`];
    return {
      id,
      name: entry?.name ?? (namesQuery.isLoading ? "Cargando nombre…" : "Sin nombre"),
      status: entry?.status ?? "",
    };
  };

  const saveProductsFn = useServerFn(setPlaceProductsCms);
  const saveEventsFn = useServerFn(setPlaceEventsCms);
  const saveAuthoritiesFn = useServerFn(setPlaceAuthoritiesCms);

  const onError = (e: unknown) =>
    toast.error(e instanceof Error ? e.message : "No se pudo guardar la relación.");

  const saveProducts = useMutation({
    mutationFn: () =>
      saveProductsFn({
        data: {
          place_id: props.placeId,
          relations: products.map((r, i) => ({
            product_id: r.product_id,
            relation_kind: r.relation_kind as (typeof PLACE_PRODUCT_RELATION_KINDS)[number],
            sort_order: i * 10,
          })),
        },
      }),
    onSuccess: () => {
      props.onChanged();
      toast.success("Productos relacionados guardados (sin conceder administración del lugar).");
    },
    onError,
  });

  const saveEvents = useMutation({
    mutationFn: () =>
      saveEventsFn({
        data: {
          place_id: props.placeId,
          relations: events.map((r, i) => ({
            event_id: r.event_id,
            relation_kind: r.relation_kind as (typeof PLACE_EVENT_RELATION_KINDS)[number],
            sort_order: i * 10,
          })),
        },
      }),
    onSuccess: () => {
      props.onChanged();
      toast.success("Eventos relacionados guardados.");
    },
    onError,
  });

  const saveAuthorities = useMutation({
    mutationFn: () =>
      saveAuthoritiesFn({
        data: {
          place_id: props.placeId,
          authorities: authorities.map((a) => ({
            authority_kind_id: a.authority_kind_id,
            business_id: a.business_id,
            authority_name: a.authority_name,
            is_primary: a.is_primary,
            notes: a.notes ?? null,
          })),
        },
      }),
    onSuccess: () => {
      props.onChanged();
      toast.success("Autoridad u operador guardado como información, sin gestión delegada.");
    },
    onError,
  });

  return (
    <PlaceSection
      id="place-relations"
      title="Relaciones"
      description="Productos, eventos y autoridad relacionada. Estas relaciones son informativas: no otorgan propiedad ni gestión del atractivo."
    >
      <div className="md:col-span-2 space-y-5">
        {/* Productos */}
        <div className="rounded-lg border border-border bg-background p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Productos o tours relacionados
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                className={buttonClass}
                onClick={() =>
                  setProducts((p) => [
                    ...p,
                    { product_id: "", relation_kind: "ofrecido", sort_order: p.length * 10 },
                  ])
                }
              >
                + Añadir
              </button>
              <button
                type="button"
                className={primaryButtonClass}
                disabled={saveProducts.isPending || products.some((r) => !r.product_id)}
                onClick={() => saveProducts.mutate()}
              >
                Guardar
              </button>
            </div>
          </div>
          <ul className="mt-3 space-y-2">
            {products.length === 0 && (
              <li className="text-xs text-muted-foreground">
                Sin productos relacionados. Pulsa «+ Añadir», escribe 2 letras del nombre y elígelo.
              </li>
            )}
            {products.map((row, index) => (
              <li key={index} className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <CmsEntitySearchPicker
                  kind="product"
                  compact
                  label="Producto o tour"
                  initial={initialFor("product", row.product_id)}
                  excludeIds={products.filter((_, i) => i !== index).map((r) => r.product_id)}
                  onPick={(option) => {
                    remember("product", option);
                    setProducts((p) =>
                      p.map((r, i) => (i === index ? { ...r, product_id: option?.id ?? "" } : r)),
                    );
                  }}
                />
                <label className="sr-only" htmlFor={`product-kind-${index}`}>
                  Tipo de relación
                </label>
                <select
                  id={`product-kind-${index}`}
                  className={`${inputClass} sm:max-w-[15rem]`}
                  value={row.relation_kind}
                  onChange={(e) =>
                    setProducts((p) =>
                      p.map((r, i) => (i === index ? { ...r, relation_kind: e.target.value } : r)),
                    )
                  }
                >
                  {PLACE_PRODUCT_RELATION_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {PLACE_PRODUCT_RELATION_LABELS[k]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={buttonClass}
                  onClick={() => setProducts((p) => p.filter((_, i) => i !== index))}
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Eventos */}
        <div className="rounded-lg border border-border bg-background p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Eventos relacionados
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                className={buttonClass}
                onClick={() =>
                  setEvents((p) => [
                    ...p,
                    { event_id: "", relation_kind: "sede", sort_order: p.length * 10 },
                  ])
                }
              >
                + Añadir
              </button>
              <button
                type="button"
                className={primaryButtonClass}
                disabled={saveEvents.isPending || events.some((r) => !r.event_id)}
                onClick={() => saveEvents.mutate()}
              >
                Guardar
              </button>
            </div>
          </div>
          <ul className="mt-3 space-y-2">
            {events.length === 0 && (
              <li className="text-xs text-muted-foreground">
                Sin eventos relacionados. Pulsa «+ Añadir», escribe 2 letras del nombre y elígelo.
              </li>
            )}
            {events.map((row, index) => (
              <li key={index} className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <CmsEntitySearchPicker
                  kind="event"
                  compact
                  label="Evento"
                  initial={initialFor("event", row.event_id)}
                  excludeIds={events.filter((_, i) => i !== index).map((r) => r.event_id)}
                  onPick={(option) => {
                    remember("event", option);
                    setEvents((p) =>
                      p.map((r, i) => (i === index ? { ...r, event_id: option?.id ?? "" } : r)),
                    );
                  }}
                />
                <label className="sr-only" htmlFor={`event-kind-${index}`}>
                  Tipo de relación
                </label>
                <select
                  id={`event-kind-${index}`}
                  className={`${inputClass} sm:max-w-[15rem]`}
                  value={row.relation_kind}
                  onChange={(e) =>
                    setEvents((p) =>
                      p.map((r, i) => (i === index ? { ...r, relation_kind: e.target.value } : r)),
                    )
                  }
                >
                  {PLACE_EVENT_RELATION_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {PLACE_EVENT_RELATION_LABELS[k]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={buttonClass}
                  onClick={() => setEvents((p) => p.filter((_, i) => i !== index))}
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Autoridades */}
        <div className="rounded-lg border border-border bg-background p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Autoridad, custodio u operador
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                className={buttonClass}
                disabled={props.authorityKinds.length === 0}
                onClick={() =>
                  setAuthorities((p) => [
                    ...p,
                    {
                      authority_kind_id: props.authorityKinds[0]?.id ?? "",
                      business_id: null,
                      authority_name: "",
                      is_primary: p.length === 0,
                    },
                  ])
                }
              >
                + Añadir
              </button>
              <button
                type="button"
                className={primaryButtonClass}
                disabled={saveAuthorities.isPending}
                onClick={() => saveAuthorities.mutate()}
              >
                Guardar
              </button>
            </div>
          </div>
          <ul className="mt-3 space-y-2">
            {authorities.length === 0 && (
              <li className="text-xs text-muted-foreground">Sin autoridad registrada.</li>
            )}
            {authorities.map((row, index) => (
              <li key={index} className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <label className="sr-only" htmlFor={`authority-kind-${index}`}>
                  Tipo de autoridad
                </label>
                <select
                  id={`authority-kind-${index}`}
                  className={`${inputClass} sm:max-w-[14rem]`}
                  value={row.authority_kind_id}
                  onChange={(e) =>
                    setAuthorities((p) =>
                      p.map((r, i) =>
                        i === index ? { ...r, authority_kind_id: e.target.value } : r,
                      ),
                    )
                  }
                >
                  {props.authorityKinds.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name}
                    </option>
                  ))}
                </select>
                <label className="sr-only" htmlFor={`authority-name-${index}`}>
                  Nombre de la autoridad
                </label>
                <input
                  id={`authority-name-${index}`}
                  className={inputClass}
                  placeholder="Nombre de la institución u operador"
                  value={row.authority_name ?? ""}
                  onChange={(e) =>
                    setAuthorities((p) =>
                      p.map((r, i) =>
                        i === index ? { ...r, authority_name: e.target.value || null } : r,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  className={buttonClass}
                  onClick={() => setAuthorities((p) => p.filter((_, i) => i !== index))}
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Registrar una autoridad es informativo. No crea gestores de lugar ni habilita
            reclamación empresarial en esta etapa.
          </p>
        </div>
      </div>
    </PlaceSection>
  );
}
