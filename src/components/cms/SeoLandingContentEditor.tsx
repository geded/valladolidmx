/**
 * LOTE 3I.2 · Editor de contenido CMS-first de la familia
 * `premium-seo-landing` (sección Landing SEO).
 *
 * Autoría completa del modelo editorial de la landing: portada, señales de
 * confianza, beneficios, experiencias relacionadas, información práctica,
 * contexto territorial y cierre Alux. Reordena, oculta y edita sin tocar la
 * entidad canónica de origen y sin crear un editor paralelo: guarda sobre la
 * MISMA composición de 18 slots por la RPC gobernada del Experience Builder.
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDown, ArrowUp, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  getSeoLandingEditorModel,
  saveSeoLandingEditorModel,
  type JsonValue,
  type SeoLandingMediaOption,
  type SeoLandingSlotJson,
} from "@/lib/experience-builder/seo-landing/seo-landing-editor.functions";

type Row = Record<string, JsonValue>;

const field =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none ring-focus";
const area =
  "min-h-24 w-full rounded-lg border border-border bg-background p-3 text-sm outline-none ring-focus";
const chip =
  "inline-flex min-h-9 items-center gap-1.5 rounded-pill border border-border px-2.5 text-xs ring-focus hover:bg-muted/60";

const TRUST_ICONS = ["badge", "award", "star", "pin", "info"] as const;
const FEATURE_ICONS = ["sparkles", "leaf", "clock", "users", "shield", "heart"] as const;

function str(v: JsonValue | undefined): string {
  return typeof v === "string" ? v : typeof v === "number" ? String(v) : "";
}
function list(v: JsonValue | undefined): Row[] {
  return Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as Row[]) : [];
}

function Text({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {multiline ? (
        <textarea className={area} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className={field} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <select className={field} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Group({
  title,
  hint,
  hidden,
  onToggleHidden,
  children,
}: {
  title: string;
  hint?: string;
  hidden?: boolean;
  onToggleHidden?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-serif text-lg leading-tight">{title}</h3>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {onToggleHidden ? (
          <button type="button" className={chip} onClick={onToggleHidden}>
            {hidden ? "Mostrar módulo" : "Ocultar módulo"}
          </button>
        ) : null}
      </header>
      <div className={hidden ? "pointer-events-none opacity-50" : undefined}>{children}</div>
    </section>
  );
}

function RowTools({
  index,
  total,
  onMove,
  onRemove,
}: {
  index: number;
  total: number;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex shrink-0 gap-1">
      <button
        type="button"
        className={chip}
        aria-label="Subir"
        disabled={index === 0}
        onClick={() => onMove(-1)}
      >
        <ArrowUp className="size-3.5" aria-hidden />
      </button>
      <button
        type="button"
        className={chip}
        aria-label="Bajar"
        disabled={index === total - 1}
        onClick={() => onMove(1)}
      >
        <ArrowDown className="size-3.5" aria-hidden />
      </button>
      <button type="button" className={chip} aria-label="Eliminar" onClick={onRemove}>
        <Trash2 className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}

export function SeoLandingContentEditor({
  compositionId,
  onClose,
}: {
  compositionId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const loadFn = useServerFn(getSeoLandingEditorModel);
  const saveFn = useServerFn(saveSeoLandingEditorModel);
  const [slots, setSlots] = useState<Record<string, SeoLandingSlotJson> | null>(null);

  const model = useQuery({
    queryKey: ["cms", "seo-landing", "editor", compositionId],
    queryFn: () => loadFn({ data: { compositionId } }),
  });

  useEffect(() => {
    if (model.data) setSlots(model.data.slots);
  }, [model.data]);

  const mediaOptions: readonly SeoLandingMediaOption[] = useMemo(
    () => model.data?.mediaOptions ?? [],
    [model.data],
  );
  const mediaSelect = useMemo(
    () => [
      { value: "", label: "Sin fotografía acreditada" },
      ...mediaOptions.map((m) => ({ value: m.url, label: `${m.role} · ${m.alt.slice(0, 48)}` })),
    ],
    [mediaOptions],
  );

  const save = useMutation({
    mutationFn: () => saveFn({ data: { compositionId, slots: slots ?? {} } }),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ["cms", "seo-landings"] });
      toast.success(`Contenido guardado (${res.populatedSlots.length} secciones con datos).`);
    },
    onError: () => toast.error("No fue posible guardar el contenido."),
  });

  if (model.isLoading || !slots)
    return (
      <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
        Cargando contenido…
      </div>
    );
  if (model.isError)
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5 text-sm text-destructive">
        No se pudo cargar el contenido de esta landing.
      </div>
    );

  const editable = model.data?.editable !== false;
  const get = (slot: string): SeoLandingSlotJson => slots[slot] ?? {};
  const setSlot = (slot: string, patch: SeoLandingSlotJson) =>
    setSlots((prev) => ({ ...(prev ?? {}), [slot]: { ...(prev?.[slot] ?? {}), ...patch } }));
  const setRows = (slot: string, key: string, rows: Row[]) =>
    setSlot(slot, { [key]: rows as unknown as JsonValue });
  const moveRow = (rows: Row[], i: number, dir: -1 | 1) => {
    const next = [...rows];
    const j = i + dir;
    if (j < 0 || j >= next.length) return next;
    [next[i], next[j]] = [next[j]!, next[i]!];
    return next;
  };
  const toggleHidden = (slot: string) => setSlot(slot, { hidden: get(slot)["hidden"] !== true });

  const hero = get("hero");
  const intro = get("intro");
  const badges = get("badges");
  const features = get("features");
  const offers = get("offers");
  const infoGrid = get("infoGrid");
  const map = get("map");
  const alux = get("aluxPlanner");
  const trustRows = list(badges["items"]);
  const featureRows = list(features["items"]);
  const offerRows = list(offers["items"]);
  const infoRows = list(infoGrid["items"]);

  return (
    <div className="mt-4 space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-surface px-4 py-3">
        <p className="min-w-0 text-sm">
          Contenido editorial de <strong className="font-medium">{model.data?.title}</strong>
          {editable ? null : " · publicada (sólo lectura)"}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className={chip}
            disabled={!editable || save.isPending}
            onClick={() => save.mutate()}
          >
            <Save className="size-3.5" aria-hidden />
            {save.isPending ? "Guardando…" : "Guardar contenido"}
          </button>
          <button type="button" className={chip} onClick={onClose}>
            <X className="size-3.5" aria-hidden />
            Cerrar
          </button>
        </div>
      </header>

      <Group
        title="Portada"
        hint="Territorio, identidad y fotografía protagonista."
        hidden={hero["hidden"] === true}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Text
            label="Antetítulo (destino)"
            value={str(hero["eyebrow"])}
            onChange={(v) => setSlot("hero", { eyebrow: v })}
          />
          <Text
            label="Título"
            value={str(hero["title"])}
            onChange={(v) => setSlot("hero", { title: v })}
          />
          <Text
            label="Tipo / subtipo · destino"
            value={str(hero["typeLine"])}
            onChange={(v) => setSlot("hero", { typeLine: v })}
          />
          <Text
            label="Promesa editorial"
            value={str(hero["promise"])}
            onChange={(v) => setSlot("hero", { promise: v })}
          />
          <div className="sm:col-span-2">
            <Text
              label="Descripción breve"
              multiline
              value={str(hero["description"])}
              onChange={(v) => setSlot("hero", { description: v })}
            />
          </div>
          <Select
            label="Fotografía (Medios de la entidad)"
            value={str(hero["mediaUrl"])}
            options={mediaSelect}
            onChange={(v) => {
              const found = mediaOptions.find((m) => m.url === v);
              setSlot("hero", { mediaUrl: v, mediaAlt: found?.alt ?? str(hero["mediaAlt"]) });
            }}
          />
          <Text
            label="Texto alternativo"
            value={str(hero["mediaAlt"])}
            onChange={(v) => setSlot("hero", { mediaAlt: v })}
          />
          <Text
            label="Punto focal (ej. 50% 40%)"
            value={str(hero["mediaFocal"])}
            onChange={(v) => setSlot("hero", { mediaFocal: v })}
          />
        </div>
      </Group>

      <Group
        title="Franja de confianza"
        hint="Hasta cuatro señales verificables. Sin verificar, se marcan como tales."
        hidden={badges["hidden"] === true}
        onToggleHidden={() => toggleHidden("badges")}
      >
        <ul className="space-y-3">
          {trustRows.map((row, i) => (
            <li key={i} className="rounded-xl border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                  <Select
                    label="Icono"
                    value={str(row["icon"]) || "badge"}
                    options={TRUST_ICONS.map((v) => ({ value: v, label: v }))}
                    onChange={(v) =>
                      setRows(
                        "badges",
                        "items",
                        trustRows.map((r, j) => (i === j ? { ...r, icon: v } : r)),
                      )
                    }
                  />
                  <Text
                    label="Etiqueta"
                    value={str(row["label"])}
                    onChange={(v) =>
                      setRows(
                        "badges",
                        "items",
                        trustRows.map((r, j) => (i === j ? { ...r, label: v } : r)),
                      )
                    }
                  />
                  <Text
                    label="Valor"
                    value={str(row["value"])}
                    onChange={(v) =>
                      setRows(
                        "badges",
                        "items",
                        trustRows.map((r, j) => (i === j ? { ...r, value: v } : r)),
                      )
                    }
                  />
                  <Text
                    label="Fuente / detalle"
                    value={str(row["detail"])}
                    onChange={(v) =>
                      setRows(
                        "badges",
                        "items",
                        trustRows.map((r, j) => (i === j ? { ...r, detail: v } : r)),
                      )
                    }
                  />
                  <Select
                    label="Estado"
                    value={str(row["status"]) || "verified"}
                    options={[
                      { value: "verified", label: "Verificada" },
                      { value: "pending", label: "Por verificar" },
                    ]}
                    onChange={(v) =>
                      setRows(
                        "badges",
                        "items",
                        trustRows.map((r, j) => (i === j ? { ...r, status: v } : r)),
                      )
                    }
                  />
                  <Select
                    label="Visibilidad"
                    value={row["hidden"] === true ? "hidden" : "visible"}
                    options={[
                      { value: "visible", label: "Visible" },
                      { value: "hidden", label: "Oculta" },
                    ]}
                    onChange={(v) =>
                      setRows(
                        "badges",
                        "items",
                        trustRows.map((r, j) => (i === j ? { ...r, hidden: v === "hidden" } : r)),
                      )
                    }
                  />
                </div>
                <RowTools
                  index={i}
                  total={trustRows.length}
                  onMove={(d) => setRows("badges", "items", moveRow(trustRows, i, d))}
                  onRemove={() =>
                    setRows(
                      "badges",
                      "items",
                      trustRows.filter((_, j) => j !== i),
                    )
                  }
                />
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className={`${chip} mt-3`}
          disabled={trustRows.length >= 4}
          onClick={() =>
            setRows("badges", "items", [
              ...trustRows,
              { id: `trust-${Date.now()}`, icon: "badge", label: "", status: "pending" },
            ])
          }
        >
          <Plus className="size-3.5" aria-hidden />
          Añadir señal
        </button>
      </Group>

      <Group
        title="Por qué es extraordinario"
        hidden={intro["hidden"] === true}
        onToggleHidden={() => toggleHidden("intro")}
      >
        <div className="grid gap-3">
          <Text
            label="Título"
            value={str(intro["title"])}
            onChange={(v) => setSlot("intro", { title: v })}
          />
          <Text
            label="Texto editorial"
            multiline
            value={str(intro["body"])}
            onChange={(v) => setSlot("intro", { body: v })}
          />
        </div>
      </Group>

      <Group
        title="Beneficios y atributos"
        hint="Hasta cuatro, con icono."
        hidden={features["hidden"] === true}
        onToggleHidden={() => toggleHidden("features")}
      >
        <ul className="space-y-3">
          {featureRows.map((row, i) => (
            <li key={i} className="flex items-start gap-2 rounded-xl border border-border p-3">
              <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-3">
                <Select
                  label="Icono"
                  value={str(row["icon"]) || "sparkles"}
                  options={FEATURE_ICONS.map((v) => ({ value: v, label: v }))}
                  onChange={(v) =>
                    setRows(
                      "features",
                      "items",
                      featureRows.map((r, j) => (i === j ? { ...r, icon: v } : r)),
                    )
                  }
                />
                <Text
                  label="Etiqueta"
                  value={str(row["label"])}
                  onChange={(v) =>
                    setRows(
                      "features",
                      "items",
                      featureRows.map((r, j) => (i === j ? { ...r, label: v } : r)),
                    )
                  }
                />
                <Text
                  label="Detalle"
                  value={str(row["detail"])}
                  onChange={(v) =>
                    setRows(
                      "features",
                      "items",
                      featureRows.map((r, j) => (i === j ? { ...r, detail: v } : r)),
                    )
                  }
                />
              </div>
              <RowTools
                index={i}
                total={featureRows.length}
                onMove={(d) => setRows("features", "items", moveRow(featureRows, i, d))}
                onRemove={() =>
                  setRows(
                    "features",
                    "items",
                    featureRows.filter((_, j) => j !== i),
                  )
                }
              />
            </li>
          ))}
        </ul>
        <button
          type="button"
          className={`${chip} mt-3`}
          disabled={featureRows.length >= 4}
          onClick={() =>
            setRows("features", "items", [
              ...featureRows,
              { id: `feature-${Date.now()}`, icon: "sparkles", label: "" },
            ])
          }
        >
          <Plus className="size-3.5" aria-hidden />
          Añadir beneficio
        </button>
      </Group>

      <Group
        title="Experiencias destacadas"
        hint="Relaciones canónicas por identificador real; sin imagen no se inventa una."
        hidden={offers["hidden"] === true}
        onToggleHidden={() => toggleHidden("offers")}
      >
        <Text
          label="Título de la sección"
          value={str(offers["heading"])}
          onChange={(v) => setSlot("offers", { heading: v })}
        />
        <ul className="mt-3 space-y-3">
          {offerRows.map((row, i) => (
            <li key={i} className="flex items-start gap-2 rounded-xl border border-border p-3">
              <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                <Text
                  label="Identificador canónico"
                  value={str(row["id"])}
                  onChange={(v) =>
                    setRows(
                      "offers",
                      "items",
                      offerRows.map((r, j) => (i === j ? { ...r, id: v } : r)),
                    )
                  }
                />
                <Text
                  label="Nombre"
                  value={str(row["title"])}
                  onChange={(v) =>
                    setRows(
                      "offers",
                      "items",
                      offerRows.map((r, j) => (i === j ? { ...r, title: v } : r)),
                    )
                  }
                />
                <Text
                  label="Resumen"
                  value={str(row["subtitle"])}
                  onChange={(v) =>
                    setRows(
                      "offers",
                      "items",
                      offerRows.map((r, j) => (i === j ? { ...r, subtitle: v } : r)),
                    )
                  }
                />
                <Text
                  label="Enlace canónico"
                  value={str(row["href"])}
                  onChange={(v) =>
                    setRows(
                      "offers",
                      "items",
                      offerRows.map((r, j) => (i === j ? { ...r, href: v } : r)),
                    )
                  }
                />
                <Select
                  label="Imagen (Medios)"
                  value={str(row["imageUrl"])}
                  options={mediaSelect}
                  onChange={(v) => {
                    const found = mediaOptions.find((m) => m.url === v);
                    setRows(
                      "offers",
                      "items",
                      offerRows.map((r, j) =>
                        i === j ? { ...r, imageUrl: v, imageAlt: found?.alt ?? "" } : r,
                      ),
                    );
                  }}
                />
                <Text
                  label="Etiquetas (separadas por coma)"
                  value={(Array.isArray(row["tags"]) ? (row["tags"] as string[]) : []).join(", ")}
                  onChange={(v) =>
                    setRows(
                      "offers",
                      "items",
                      offerRows.map((r, j) =>
                        i === j
                          ? {
                              ...r,
                              tags: v
                                .split(",")
                                .map((t) => t.trim())
                                .filter(Boolean),
                            }
                          : r,
                      ),
                    )
                  }
                />
              </div>
              <RowTools
                index={i}
                total={offerRows.length}
                onMove={(d) => setRows("offers", "items", moveRow(offerRows, i, d))}
                onRemove={() =>
                  setRows(
                    "offers",
                    "items",
                    offerRows.filter((_, j) => j !== i),
                  )
                }
              />
            </li>
          ))}
        </ul>
        <button
          type="button"
          className={`${chip} mt-3`}
          onClick={() =>
            setRows("offers", "items", [...offerRows, { id: `offer-${Date.now()}`, title: "" }])
          }
        >
          <Plus className="size-3.5" aria-hidden />
          Añadir experiencia
        </button>
      </Group>

      <Group
        title="Información para tu visita"
        hidden={infoGrid["hidden"] === true}
        onToggleHidden={() => toggleHidden("infoGrid")}
      >
        <Text
          label="Título de la sección"
          value={str(infoGrid["heading"])}
          onChange={(v) => setSlot("infoGrid", { heading: v })}
        />
        <ul className="mt-3 space-y-3">
          {infoRows.map((row, i) => (
            <li key={i} className="flex items-start gap-2 rounded-xl border border-border p-3">
              <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                <Text
                  label="Dato"
                  value={str(row["label"])}
                  onChange={(v) =>
                    setRows(
                      "infoGrid",
                      "items",
                      infoRows.map((r, j) => (i === j ? { ...r, label: v } : r)),
                    )
                  }
                />
                <Text
                  label="Valor"
                  value={str(row["value"])}
                  onChange={(v) =>
                    setRows(
                      "infoGrid",
                      "items",
                      infoRows.map((r, j) => (i === j ? { ...r, value: v } : r)),
                    )
                  }
                />
              </div>
              <RowTools
                index={i}
                total={infoRows.length}
                onMove={(d) => setRows("infoGrid", "items", moveRow(infoRows, i, d))}
                onRemove={() =>
                  setRows(
                    "infoGrid",
                    "items",
                    infoRows.filter((_, j) => j !== i),
                  )
                }
              />
            </li>
          ))}
        </ul>
        <button
          type="button"
          className={`${chip} mt-3`}
          onClick={() =>
            setRows("infoGrid", "items", [
              ...infoRows,
              { id: `info-${Date.now()}`, label: "", value: "" },
            ])
          }
        >
          <Plus className="size-3.5" aria-hidden />
          Añadir dato
        </button>
      </Group>

      <Group
        title="Contexto territorial"
        hidden={map["hidden"] === true}
        onToggleHidden={() => toggleHidden("map")}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Text
            label="Título"
            value={str(map["heading"])}
            onChange={(v) => setSlot("map", { heading: v })}
          />
          <Text
            label="Destino"
            value={str(map["destinationName"])}
            onChange={(v) => setSlot("map", { destinationName: v })}
          />
          <Text
            label="Dirección"
            value={str(map["address"])}
            onChange={(v) => setSlot("map", { address: v })}
          />
          <Text
            label="Distancia / proximidad"
            value={str(map["distanceLabel"])}
            onChange={(v) => setSlot("map", { distanceLabel: v })}
          />
          <Text
            label="Latitud"
            value={str(map["latitude"])}
            onChange={(v) => setSlot("map", { latitude: v === "" ? null : Number(v) })}
          />
          <Text
            label="Longitud"
            value={str(map["longitude"])}
            onChange={(v) => setSlot("map", { longitude: v === "" ? null : Number(v) })}
          />
          <div className="sm:col-span-2">
            <Text
              label="Texto territorial"
              multiline
              value={str(map["body"])}
              onChange={(v) => setSlot("map", { body: v })}
            />
          </div>
          <Text
            label="Enlace al destino"
            value={str(map["href"])}
            onChange={(v) => setSlot("map", { href: v })}
          />
          <Select
            label="Imagen contextual (Medios)"
            value={str(map["mediaUrl"])}
            options={mediaSelect}
            onChange={(v) => {
              const found = mediaOptions.find((m) => m.url === v);
              setSlot("map", { mediaUrl: v, mediaAlt: found?.alt ?? "" });
            }}
          />
        </div>
      </Group>

      <Group
        title="Cierre con Alux"
        hidden={alux["hidden"] === true}
        onToggleHidden={() => toggleHidden("aluxPlanner")}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Text
            label="Título"
            value={str(alux["heading"])}
            onChange={(v) => setSlot("aluxPlanner", { heading: v })}
          />
          <Text
            label="Texto de la acción"
            value={str(alux["ctaLabel"])}
            onChange={(v) => setSlot("aluxPlanner", { ctaLabel: v })}
          />
          <div className="sm:col-span-2">
            <Text
              label="Mensaje"
              value={str(alux["body"])}
              onChange={(v) => setSlot("aluxPlanner", { body: v })}
            />
          </div>
        </div>
      </Group>
    </div>
  );
}
