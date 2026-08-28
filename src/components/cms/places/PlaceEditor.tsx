/**
 * G8-Q2B · Editor de Lugares y Atractivos del CMS.
 *
 * Agrupa el formulario por secciones (identidad y territorio, ubicación,
 * contenido, visita, contacto, medios y relaciones). Presentación pura:
 * toda validación y autorización efectiva ocurre en las server functions
 * de `places-cms.functions.ts`.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "@/lib/toast";
import { StatusBadge } from "@/components/cms/EntityListView";
import {
  checkPlaceDuplicates,
  createPlaceCms,
  getPlaceCms,
  listPlaceFormOptions,
  setPlaceCategoriesCms,
  setPlaceLocation,
  setPlaceType,
  transitionPlaceStatus,
  updatePlaceCms,
} from "@/lib/places/places-cms.functions";
import { PLACE_ADMISSION_KINDS } from "@/lib/places/place-taxonomy";
import { placeDetailsPatchSchema } from "@/lib/places/places-cms-contracts";
import type { ContentStatus } from "@/lib/cms/workflow";
import {
  PlaceField,
  PlaceSection,
  buttonClass,
  inputClass,
  primaryButtonClass,
  textareaClass,
} from "./PlaceSection";
import { PlaceHoursPanel, type HoursRow } from "./PlaceHoursPanel";
import { PlaceMediaPanel, type PlaceMediaAsset, type PlaceMediaRow } from "./PlaceMediaPanel";
import {
  PlaceRelationsPanel,
  type AuthorityRelation,
  type EventRelation,
  type ProductRelation,
} from "./PlaceRelationsPanel";

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

type Values = Record<string, string>;

const TEXT_FIELDS = [
  "official_name",
  "short_description",
  "description",
  "directions",
  "address_line",
  "google_place_id",
  "best_time_to_visit",
  "entry_fee_notes",
  "contact_phone",
  "contact_whatsapp",
  "contact_email",
  "contact_website",
  "price_currency",
] as const;

interface Props {
  placeId?: string;
}

export function PlaceEditor({ placeId }: Props) {
  const navigate = useNavigate();
  const isEdit = Boolean(placeId);

  const optionsFn = useServerFn(listPlaceFormOptions);
  const detailFn = useServerFn(getPlaceCms);
  const createFn = useServerFn(createPlaceCms);
  const updateFn = useServerFn(updatePlaceCms);
  const locationFn = useServerFn(setPlaceLocation);
  const typeFn = useServerFn(setPlaceType);
  const categoriesFn = useServerFn(setPlaceCategoriesCms);
  const transitionFn = useServerFn(transitionPlaceStatus);
  const duplicatesFn = useServerFn(checkPlaceDuplicates);

  const options = useQuery({
    queryKey: ["cms", "places", "options"],
    queryFn: () => optionsFn(),
  });

  const detail = useQuery({
    queryKey: ["cms", "places", "detail", placeId],
    queryFn: () => detailFn({ data: { placeId: placeId! } }),
    enabled: isEdit,
  });

  type NamedRow = { id: string; name: string };
  const opts = (options.data ?? {}) as {
    destinations?: NamedRow[];
    zones?: TerritorialZone[];
    placeTypes?: NamedRow[];
    categories?: NamedRow[];
    authorityKinds?: NamedRow[];
  };
  const det = (detail.data ?? {}) as {
    place?: Record<string, unknown>;
    categoryIds?: string[];
    hours?: unknown[];
    media?: unknown[];
    assets?: unknown[];
    products?: unknown[];
    events?: unknown[];
    authorities?: unknown[];
  };

  /* ── Alta ─────────────────────────────────────────────────────────── */
  const [newPlace, setNewPlace] = useState({
    name: "",
    slug: "",
    destination_id: "",
    place_type_id: "",
    description: "",
  });
  const [duplicates, setDuplicates] = useState<Array<{ place_name: string; slug: string }>>([]);

  useEffect(() => {
    if (isEdit || newPlace.name.trim().length < 3) {
      setDuplicates([]);
      return;
    }
    const handle = setTimeout(() => {
      void duplicatesFn({ data: { name: newPlace.name } })
        .then((res) => setDuplicates(res.warnings as Array<{ place_name: string; slug: string }>))
        .catch(() => setDuplicates([]));
    }, 400);
    return () => clearTimeout(handle);
  }, [duplicatesFn, isEdit, newPlace.name]);

  const create = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          name: newPlace.name.trim(),
          slug: newPlace.slug.trim(),
          destination_id: newPlace.destination_id,
          place_type_id: newPlace.place_type_id,
          description: newPlace.description.trim() || undefined,
        },
      }),
    onSuccess: (res) => {
      toast.success("Lugar creado como borrador. No se publica automáticamente.");
      navigate({ to: `/cms/lugares/${res.id}/editar` as never });
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "No se pudo crear el lugar."),
  });

  /* ── Edición ──────────────────────────────────────────────────────── */
  const place = det.place as Record<string, unknown> | undefined;
  const [values, setValues] = useState<Values>({});
  const [zoneId, setZoneId] = useState("");
  const [admission, setAdmission] = useState("");
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [duration, setDuration] = useState("");
  const [highlights, setHighlights] = useState("");
  const [amenities, setAmenities] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (!place) return;
    const next: Values = {};
    for (const key of TEXT_FIELDS) next[key] = (place[key] as string | null) ?? "";
    setValues(next);
    setZoneId((place.destination_zone_id as string | null) ?? "");
    setAdmission((place.admission_kind as string | null) ?? "");
    setPriceFrom(place.price_from === null || place.price_from === undefined ? "" : String(place.price_from));
    setPriceTo(place.price_to === null || place.price_to === undefined ? "" : String(place.price_to));
    setDuration(
      place.visit_duration_minutes === null || place.visit_duration_minutes === undefined
        ? ""
        : String(place.visit_duration_minutes),
    );
    setHighlights(Array.isArray(place.highlights) ? (place.highlights as string[]).join("\n") : "");
    setAmenities(Array.isArray(place.amenities) ? (place.amenities as string[]).join("\n") : "");
    setLatitude(place.latitude === null || place.latitude === undefined ? "" : String(place.latitude));
    setLongitude(place.longitude === null || place.longitude === undefined ? "" : String(place.longitude));
    setCategoryIds(det.categoryIds ?? []);
  }, [place, det.categoryIds]);

  const zonesForDestination = useMemo(() => {
    const destinationId = (place?.destination_id as string | undefined) ?? "";
    return (opts.zones ?? []).filter(
      (z: { destination_id: string }) => z.destination_id === destinationId,
    );
  }, [opts.zones, place?.destination_id]);

  const buildPatch = () => {
    const text = (key: string) => {
      const raw = (values[key] ?? "").trim();
      return raw === "" ? null : raw;
    };
    const list = (raw: string) =>
      raw
        .split(/[\n]+/)
        .map((s) => s.trim())
        .filter(Boolean);
    return {
      destination_zone_id: zoneId || null,
      official_name: text("official_name"),
      short_description: text("short_description"),
      description: text("description"),
      directions: text("directions"),
      address_line: text("address_line"),
      google_place_id: text("google_place_id"),
      best_time_to_visit: text("best_time_to_visit"),
      entry_fee_notes: text("entry_fee_notes"),
      contact_phone: text("contact_phone"),
      contact_whatsapp: text("contact_whatsapp"),
      contact_email: text("contact_email"),
      contact_website: text("contact_website"),
      price_currency: (values.price_currency || "MXN").trim().toUpperCase(),
      admission_kind: admission ? (admission as (typeof PLACE_ADMISSION_KINDS)[number]) : null,
      price_from: priceFrom === "" ? null : Number(priceFrom),
      price_to: priceTo === "" ? null : Number(priceTo),
      visit_duration_minutes: duration === "" ? null : Number(duration),
      highlights: list(highlights),
      amenities: list(amenities),
    };
  };

  const save = useMutation({
    mutationFn: async () => {
      const parsed = placeDetailsPatchSchema.safeParse(buildPatch());
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
      return updateFn({
        data: {
          place_id: placeId!,
          expected_updated_at: String(place?.updated_at ?? ""),
          patch: parsed.data,
        },
      });
    },
    onSuccess: async () => {
      setFieldError(null);
      toast.success("Cambios guardados.");
      await detail.refetch();
    },
    onError: (e) => {
      const message = e instanceof Error ? e.message : "No se pudo guardar.";
      setFieldError(
        message === "conflict_stale_record"
          ? "Otra persona editó este lugar mientras trabajabas. Recarga para ver la versión más reciente."
          : message,
      );
      toast.error(message);
    },
  });

  const saveLocation = useMutation({
    mutationFn: () =>
      locationFn({
        data: {
          place_id: placeId!,
          latitude: Number(latitude),
          longitude: Number(longitude),
        },
      }),
    onSuccess: async () => {
      toast.success("Ubicación actualizada.");
      await detail.refetch();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Ubicación inválida."),
  });

  const saveType = useMutation({
    mutationFn: (typeId: string) =>
      typeFn({ data: { place_id: placeId!, place_type_id: typeId } }),
    onSuccess: async () => {
      toast.success("Tipo de lugar actualizado.");
      await detail.refetch();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo cambiar el tipo."),
  });

  const saveCategories = useMutation({
    mutationFn: () =>
      categoriesFn({ data: { place_id: placeId!, category_ids: categoryIds } }),
    onSuccess: async () => {
      toast.success("Categorías guardadas.");
      await detail.refetch();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudieron guardar."),
  });

  const transition = useMutation({
    mutationFn: (to: ContentStatus) => transitionFn({ data: { place_id: placeId!, to } }),
    onSuccess: async () => {
      toast.success("Estado actualizado.");
      await detail.refetch();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Transición denegada."),
  });

  /* ── Render: alta ─────────────────────────────────────────────────── */
  if (!isEdit) {
    const ready =
      newPlace.name.trim().length >= 2 &&
      newPlace.slug.trim().length >= 2 &&
      newPlace.destination_id &&
      newPlace.place_type_id;
    return (
      <section className="mx-auto w-full max-w-3xl space-y-5">
        <header className="border-b border-border pb-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
            Lugares y atractivos
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Nuevo lugar o atractivo</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            El alta se crea siempre como borrador. No hay publicación automática ni clasificación
            silenciosa: el tipo de lugar es obligatorio y explícito.
          </p>
        </header>

        {duplicates.length > 0 && (
          <div
            role="status"
            className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs"
          >
            <p className="font-semibold">Posible duplicado</p>
            <ul className="mt-1 list-disc pl-4">
              {duplicates.map((d) => (
                <li key={d.slug}>
                  {d.place_name} <code className="text-muted-foreground">/{d.slug}</code>
                </li>
              ))}
            </ul>
          </div>
        )}

        <PlaceSection
          id="place-new"
          title="Identidad y territorio"
          description="Nombre, slug, destino y tipo quedan protegidos después del alta."
        >
          <PlaceField name="new-name" label="Nombre" required>
            {({ id, describedBy }) => (
              <input
                id={id}
                aria-describedby={describedBy}
                className={inputClass}
                value={newPlace.name}
                onChange={(e) => setNewPlace((p) => ({ ...p, name: e.target.value }))}
              />
            )}
          </PlaceField>
          <PlaceField
            name="new-slug"
            label="Slug"
            required
            help="Minúsculas y guiones, sin acentos ni espacios."
          >
            {({ id, describedBy }) => (
              <input
                id={id}
                aria-describedby={describedBy}
                className={inputClass}
                value={newPlace.slug}
                onChange={(e) => setNewPlace((p) => ({ ...p, slug: e.target.value }))}
              />
            )}
          </PlaceField>
          <PlaceField name="new-destination" label="Destino" required>
            {({ id }) => (
              <select
                id={id}
                className={inputClass}
                value={newPlace.destination_id}
                onChange={(e) => setNewPlace((p) => ({ ...p, destination_id: e.target.value }))}
              >
                <option value="">Selecciona un destino…</option>
                {(opts.destinations ?? []).map((d: { id: string; name: string }) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}
          </PlaceField>
          <PlaceField name="new-type" label="Tipo de lugar" required>
            {({ id }) => (
              <select
                id={id}
                className={inputClass}
                value={newPlace.place_type_id}
                onChange={(e) => setNewPlace((p) => ({ ...p, place_type_id: e.target.value }))}
              >
                <option value="">Selecciona un tipo…</option>
                {(opts.placeTypes ?? []).map((t: { id: string; name: string }) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
          </PlaceField>
          <PlaceField name="new-description" label="Descripción inicial" wide>
            {({ id }) => (
              <textarea
                id={id}
                className={textareaClass}
                value={newPlace.description}
                onChange={(e) => setNewPlace((p) => ({ ...p, description: e.target.value }))}
              />
            )}
          </PlaceField>
        </PlaceSection>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={primaryButtonClass}
            disabled={!ready || create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending ? "Creando…" : "Crear borrador"}
          </button>
          <button
            type="button"
            className={buttonClass}
            onClick={() => navigate({ to: "/cms/lugares" as never })}
          >
            Cancelar
          </button>
        </div>
      </section>
    );
  }

  /* ── Render: edición ──────────────────────────────────────────────── */
  if (detail.isLoading) {
    return (
      <p role="status" className="py-10 text-center text-sm text-muted-foreground">
        Cargando lugar…
      </p>
    );
  }
  if (detail.isError || !place) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-destructive/40 bg-destructive/5 p-5 text-sm">
        <p className="font-semibold text-destructive">No se pudo cargar el lugar.</p>
        <p className="mt-1 text-destructive/80">
          {detail.error instanceof Error ? detail.error.message : "Error desconocido."}
        </p>
        <button type="button" className={`${buttonClass} mt-3`} onClick={() => void detail.refetch()}>
          Reintentar
        </button>
      </div>
    );
  }

  const status = (place.status as ContentStatus) ?? "draft";
  const set = (key: string) => (value: string) => setValues((v) => ({ ...v, [key]: value }));

  return (
    <section className="mx-auto w-full max-w-4xl space-y-5 pb-16">
      <header className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
            Lugares y atractivos
          </p>
          <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight">
            {String(place.name)}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            <code>/{String(place.slug)}</code> · nombre, slug y destino son campos protegidos.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Estado:</span>
          <StatusBadge value={status} />
        </div>
      </header>

      {fieldError && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {fieldError}
        </div>
      )}

      <PlaceSection
        id="place-identity"
        title="Identidad y territorio"
        description="El tipo se cambia por endpoint gobernado; las categorías son autoridad de descubrimiento independiente."
      >
        <PlaceField name="type" label="Tipo de lugar">
          {({ id }) => (
            <select
              id={id}
              className={inputClass}
              value={(place.place_type_id as string | null) ?? ""}
              onChange={(e) => e.target.value && saveType.mutate(e.target.value)}
            >
              <option value="">Sin tipo asignado</option>
              {(opts.placeTypes ?? []).map((t: { id: string; name: string }) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
        </PlaceField>
        <PlaceField name="zone" label="Zona territorial">
          {({ id }) => (
            <select
              id={id}
              className={inputClass}
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
            >
              <option value="">Sin zona</option>
              {zonesForDestination.map((z: { id: string; name: string }) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          )}
        </PlaceField>
        <PlaceField name="official_name" label="Nombre oficial">
          {({ id }) => (
            <input
              id={id}
              className={inputClass}
              value={values.official_name ?? ""}
              onChange={(e) => set("official_name")(e.target.value)}
            />
          )}
        </PlaceField>
        <div className="md:col-span-2">
          <fieldset>
            <legend className="text-xs font-medium">Categorías de descubrimiento</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {(opts.categories ?? []).map((c: { id: string; name: string }) => {
                const checked = categoryIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3 text-xs ${
                      checked ? "border-primary bg-primary/10 text-primary" : "border-border"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="size-4"
                      checked={checked}
                      onChange={() =>
                        setCategoryIds((prev) =>
                          prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id],
                        )
                      }
                    />
                    {c.name}
                  </label>
                );
              })}
            </div>
            <button
              type="button"
              className={`${buttonClass} mt-3`}
              disabled={saveCategories.isPending}
              onClick={() => saveCategories.mutate()}
            >
              Guardar categorías
            </button>
          </fieldset>
        </div>
      </PlaceSection>

      <PlaceSection
        id="place-location"
        title="Ubicación"
        description="Latitud y longitud son obligatorias: sin coordenadas el lugar no puede avanzar de borrador."
        actions={
          <button
            type="button"
            className={primaryButtonClass}
            disabled={saveLocation.isPending || latitude === "" || longitude === ""}
            onClick={() => saveLocation.mutate()}
          >
            Guardar ubicación
          </button>
        }
      >
        <PlaceField name="latitude" label="Latitud" required>
          {({ id }) => (
            <input
              id={id}
              inputMode="decimal"
              className={inputClass}
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
            />
          )}
        </PlaceField>
        <PlaceField name="longitude" label="Longitud" required>
          {({ id }) => (
            <input
              id={id}
              inputMode="decimal"
              className={inputClass}
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
            />
          )}
        </PlaceField>
        <PlaceField name="address_line" label="Dirección" wide>
          {({ id }) => (
            <input
              id={id}
              className={inputClass}
              value={values.address_line ?? ""}
              onChange={(e) => set("address_line")(e.target.value)}
            />
          )}
        </PlaceField>
        <PlaceField name="directions" label="Cómo llegar" wide>
          {({ id }) => (
            <textarea
              id={id}
              className={textareaClass}
              value={values.directions ?? ""}
              onChange={(e) => set("directions")(e.target.value)}
            />
          )}
        </PlaceField>
      </PlaceSection>

      <PlaceSection id="place-content" title="Contenido">
        <PlaceField name="short_description" label="Descripción corta" wide>
          {({ id }) => (
            <textarea
              id={id}
              className={textareaClass}
              value={values.short_description ?? ""}
              onChange={(e) => set("short_description")(e.target.value)}
            />
          )}
        </PlaceField>
        <PlaceField name="description" label="Descripción completa" wide>
          {({ id }) => (
            <textarea
              id={id}
              className={`${textareaClass} min-h-[180px]`}
              value={values.description ?? ""}
              onChange={(e) => set("description")(e.target.value)}
            />
          )}
        </PlaceField>
        <PlaceField name="highlights" label="Recomendaciones" help="Una idea por línea.">
          {({ id }) => (
            <textarea
              id={id}
              className={textareaClass}
              value={highlights}
              onChange={(e) => setHighlights(e.target.value)}
            />
          )}
        </PlaceField>
        <PlaceField
          name="amenities"
          label="Servicios y accesibilidad"
          help="Una amenidad por línea (estacionamiento, rampa, sanitarios…)."
        >
          {({ id }) => (
            <textarea
              id={id}
              className={textareaClass}
              value={amenities}
              onChange={(e) => setAmenities(e.target.value)}
            />
          )}
        </PlaceField>
      </PlaceSection>

      <PlaceSection id="place-visit" title="Visita">
        <PlaceField name="admission_kind" label="Tipo de admisión">
          {({ id }) => (
            <select
              id={id}
              className={inputClass}
              value={admission}
              onChange={(e) => setAdmission(e.target.value)}
            >
              <option value="">Sin definir</option>
              {PLACE_ADMISSION_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          )}
        </PlaceField>
        <PlaceField name="visit_duration_minutes" label="Duración sugerida (min)">
          {({ id }) => (
            <input
              id={id}
              inputMode="numeric"
              className={inputClass}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          )}
        </PlaceField>
        <PlaceField name="price_from" label="Precio mínimo">
          {({ id }) => (
            <input
              id={id}
              inputMode="decimal"
              className={inputClass}
              value={priceFrom}
              onChange={(e) => setPriceFrom(e.target.value)}
            />
          )}
        </PlaceField>
        <PlaceField name="price_to" label="Precio máximo">
          {({ id }) => (
            <input
              id={id}
              inputMode="decimal"
              className={inputClass}
              value={priceTo}
              onChange={(e) => setPriceTo(e.target.value)}
            />
          )}
        </PlaceField>
        <PlaceField name="price_currency" label="Moneda" help="Código ISO (MXN, USD, EUR).">
          {({ id }) => (
            <input
              id={id}
              className={inputClass}
              value={values.price_currency ?? ""}
              onChange={(e) => set("price_currency")(e.target.value.toUpperCase())}
            />
          )}
        </PlaceField>
        <PlaceField name="best_time_to_visit" label="Mejor momento para visitar">
          {({ id }) => (
            <input
              id={id}
              className={inputClass}
              value={values.best_time_to_visit ?? ""}
              onChange={(e) => set("best_time_to_visit")(e.target.value)}
            />
          )}
        </PlaceField>
        <PlaceField name="entry_fee_notes" label="Condiciones de acceso" wide>
          {({ id }) => (
            <textarea
              id={id}
              className={textareaClass}
              value={values.entry_fee_notes ?? ""}
              onChange={(e) => set("entry_fee_notes")(e.target.value)}
            />
          )}
        </PlaceField>
      </PlaceSection>

      <PlaceSection id="place-contact" title="Contacto">
        <PlaceField name="contact_phone" label="Teléfono">
          {({ id }) => (
            <input
              id={id}
              className={inputClass}
              value={values.contact_phone ?? ""}
              onChange={(e) => set("contact_phone")(e.target.value)}
            />
          )}
        </PlaceField>
        <PlaceField name="contact_whatsapp" label="WhatsApp" help="Formato E.164: +5219851234567.">
          {({ id }) => (
            <input
              id={id}
              className={inputClass}
              value={values.contact_whatsapp ?? ""}
              onChange={(e) => set("contact_whatsapp")(e.target.value)}
            />
          )}
        </PlaceField>
        <PlaceField name="contact_email" label="Correo">
          {({ id }) => (
            <input
              id={id}
              type="email"
              className={inputClass}
              value={values.contact_email ?? ""}
              onChange={(e) => set("contact_email")(e.target.value)}
            />
          )}
        </PlaceField>
        <PlaceField name="contact_website" label="Sitio web" help="Debe iniciar con https://">
          {({ id }) => (
            <input
              id={id}
              className={inputClass}
              value={values.contact_website ?? ""}
              onChange={(e) => set("contact_website")(e.target.value)}
            />
          )}
        </PlaceField>
      </PlaceSection>

      <div className="sticky bottom-0 z-10 flex flex-wrap gap-3 border-t border-border bg-background/95 py-3 backdrop-blur">
        <button
          type="button"
          className={primaryButtonClass}
          disabled={save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? "Guardando…" : "Guardar cambios"}
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={() => navigate({ to: "/cms/lugares" as never })}
        >
          Volver al listado
        </button>
      </div>

      <PlaceHoursPanel
        placeId={placeId!}
        initial={(det.hours ?? []) as HoursRow[]}
        onSaved={() => void detail.refetch()}
      />

      <PlaceMediaPanel
        placeId={placeId!}
        media={(det.media ?? []) as PlaceMediaRow[]}
        assets={(det.assets ?? []) as PlaceMediaAsset[]}
        onChanged={() => void detail.refetch()}
      />

      <PlaceRelationsPanel
        placeId={placeId!}
        products={(det.products ?? []) as ProductRelation[]}
        events={(det.events ?? []) as EventRelation[]}
        authorities={(det.authorities ?? []) as AuthorityRelation[]}
        authorityKinds={(opts.authorityKinds ?? []) as { id: string; name: string }[]}
        onChanged={() => void detail.refetch()}
      />

      <PlaceSection
        id="place-workflow"
        title="Workflow editorial"
        description="draft → in_review → approved → published → archived. Publicar exige coordenadas, tipo, descripción corta y medios aprobados."
      >
        <div className="md:col-span-2 flex flex-wrap gap-2">
          {NEXT_ACTIONS[status].map((action) => (
            <button
              key={action.to}
              type="button"
              className={buttonClass}
              disabled={transition.isPending}
              onClick={() => transition.mutate(action.to)}
            >
              {action.label}
            </button>
          ))}
        </div>
      </PlaceSection>
    </section>
  );
}
