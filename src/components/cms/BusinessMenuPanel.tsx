/**
 * BusinessMenuPanel — Carta del restaurante o cafetería dentro de la ficha.
 *
 * Se usa igual en el CMS (editor de empresa) y en el Portal de la empresa.
 * El editor sube fotos o el PDF de la carta, Alux la convierte en lista y la
 * persona revisa nombres y precios antes de guardar. Nada se guarda solo.
 * Los precios son de referencia: los platillos no se venden en línea.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  getBusinessMenu,
  readMenuFromFiles,
  saveBusinessMenu,
} from "@/lib/menu/menu.functions";
import {
  MENU_DEFAULT_SECTION,
  MENU_FILE_MAX_BYTES,
  MENU_FILE_MAX_COUNT,
  MENU_TAGS,
  MENU_TAG_KEYS,
  groupMenuBySection,
  mergeMenuItems,
  normalizeMenuItems,
  type MenuItem,
  type MenuTag,
} from "@/lib/menu/menu-model";
import { useLocalFormDraft } from "@/lib/cms/use-local-form-draft";
import { localDraftKey, sameDraftValues } from "@/lib/cms/local-draft";

/** Fila en pantalla: lleva una llave estable aunque aún no tenga id guardado. */
type Row = MenuItem & { key: string; fresh?: boolean };

let rowSeq = 0;
const toRows = (items: readonly MenuItem[], fresh = false): Row[] =>
  items.map((i) => ({ ...i, key: i.id ?? `n${++rowSeq}`, ...(fresh ? { fresh: true } : {}) }));
const toItems = (rows: readonly Row[]): MenuItem[] =>
  normalizeMenuItems(rows.map(({ key: _k, fresh: _f, ...item }) => item));

/** Reduce fotos grandes del celular antes de enviarlas (máx. 2000 px, JPEG). */
async function fileToPayload(file: File): Promise<{ name: string; mimeType: string; base64: string }> {
  const toBase64 = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  if (file.type === "application/pdf") {
    return { name: file.name, mimeType: file.type, base64: await toBase64(file) };
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
  return { name: file.name, mimeType: "image/jpeg", base64: await toBase64(blob ?? file) };
}

export function BusinessMenuPanel({ businessId }: { businessId: string }) {
  const getFn = useServerFn(getBusinessMenu);
  const saveFn = useServerFn(saveBusinessMenu);
  const readFn = useServerFn(readMenuFromFiles);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["business-menu", businessId],
    queryFn: () => getFn({ data: { businessId } }),
  });

  const saved = useMemo(() => query.data?.items ?? [], [query.data]);
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState("");
  const [readNote, setReadNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const items = useMemo(() => toItems(rows), [rows]);
  const dirty = !sameDraftValues(items, saved);

  const draft = useLocalFormDraft<MenuItem[]>({
    key: query.data ? localDraftKey("business_menu", businessId) : null,
    value: items,
    isDirty: (v) => !sameDraftValues(v, saved),
    sanitize: (raw) => {
      const list = normalizeMenuItems(raw);
      return list.length || Array.isArray(raw) ? list : null;
    },
  });
  const takeDraft = draft.take;
  const loadedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!query.data || loadedFor.current === businessId) return;
    loadedFor.current = businessId;
    const recovered = takeDraft(query.data.items);
    setRows(toRows(recovered ?? query.data.items));
  }, [query.data, businessId, takeDraft]);

  const update = useCallback((key: string, patch: Partial<MenuItem>) => {
    setRows((current) => current.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }, []);

  const save = useMutation({
    mutationFn: () => saveFn({ data: { businessId, items } }),
    onSuccess: async (res) => {
      draft.clear();
      setReadNote(null);
      loadedFor.current = null;
      await queryClient.invalidateQueries({ queryKey: ["business-menu", businessId] });
      toast.success(`Carta guardada: ${res.saved} ${res.saved === 1 ? "opción" : "opciones"}.`);
    },
    onError: () => toast.error("No se pudo guardar la carta. Revisa tu conexión e intenta de nuevo."),
  });

  const read = useMutation({
    mutationFn: async (files: File[]) => {
      const payload = await Promise.all(files.map(fileToPayload));
      return readFn({ data: { businessId, files: payload } });
    },
    onSuccess: (res) => {
      if (res.problem || res.items.length === 0) {
        toast.error(res.problem ?? "Alux no encontró platillos en el archivo.");
        return;
      }
      const before = new Set(rows.map((r) => `${r.section}|${r.name}`.toLowerCase()));
      const merged = mergeMenuItems(items, res.items);
      const keyByItem = new Map(rows.map((r) => [`${r.section}|${r.name}`.toLowerCase(), r.key]));
      setRows(
        merged.map((i) => {
          const k = `${i.section}|${i.name}`.toLowerCase();
          return { ...i, key: keyByItem.get(k) ?? `n${++rowSeq}`, ...(before.has(k) ? {} : { fresh: true }) };
        }),
      );
      const added = merged.length - rows.length;
      setReadNote(
        `Alux leyó ${res.items.length} opciones${added > 0 ? ` (${added} nuevas)` : ""}. Revisa nombres y precios y luego toca «Guardar carta».`,
      );
    },
    onError: () => toast.error("No se pudo leer el archivo. Prueba con una foto más clara o un PDF."),
  });

  const onFiles = (list: FileList | null) => {
    const files = Array.from(list ?? []).slice(0, MENU_FILE_MAX_COUNT);
    if (fileRef.current) fileRef.current.value = "";
    if (!files.length) return;
    const tooBig = files.find((f) => f.type === "application/pdf" && f.size > MENU_FILE_MAX_BYTES);
    if (tooBig) {
      toast.error("El PDF pesa más de 8 MB. Envía fotos de cada página o un PDF más ligero.");
      return;
    }
    read.mutate(files);
  };

  if (query.isLoading)
    return (
      <section className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
        Cargando la carta…
      </section>
    );
  if (query.isError)
    return (
      <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
        No se pudo cargar la carta del establecimiento.
      </section>
    );
  if (!query.data?.applies) return null;

  const needle = filter.trim().toLowerCase();
  const visible = needle
    ? rows.filter((r) => `${r.name} ${r.section} ${r.description ?? ""}`.toLowerCase().includes(needle))
    : rows;
  const groups = groupMenuBySection(visible as MenuItem[]) as { section: string; items: Row[] }[];

  const addItem = (section: string) =>
    setRows((current) => {
      const lastIndex = current.map((r) => r.section).lastIndexOf(section);
      const row: Row = {
        key: `n${++rowSeq}`,
        id: null,
        section,
        name: "",
        description: null,
        priceAmount: null,
        priceCurrency: "MXN",
        tags: [],
        isAvailable: true,
        fresh: true,
      };
      const next = [...current];
      next.splice(lastIndex >= 0 ? lastIndex + 1 : next.length, 0, row);
      return next;
    });

  const renameSection = (from: string, to: string) =>
    setRows((current) => current.map((r) => (r.section === from ? { ...r, section: to } : r)));

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Carta</p>
        <h2 className="mt-2 text-2xl">Platillos y bebidas</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Sube fotos o el PDF de la carta y Alux la acomoda por secciones. Revisa y corrige antes de
          guardar. Con la carta, Alux recomienda este lugar cuando alguien busca algo que aquí se
          sirve. Los precios son de referencia: los platillos no se venden en línea.
        </p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          multiple
          className="hidden"
          aria-label="Fotos o PDF de la carta"
          onChange={(e) => onFiles(e.target.files)}
        />
        <Button type="button" onClick={() => fileRef.current?.click()} disabled={read.isPending}>
          {read.isPending ? "Alux está leyendo la carta…" : "Subir fotos o PDF de la carta"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const name = rows.length ? "Nueva sección" : MENU_DEFAULT_SECTION;
            addItem(name);
          }}
        >
          Agregar a mano
        </Button>
        <span className="text-xs text-muted-foreground">
          Hasta {MENU_FILE_MAX_COUNT} fotos a la vez o un PDF (máx. 8 MB). Puede tardar un minuto.
        </span>
      </div>

      {draft.recoveredAt ? (
        <p className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
          Recuperamos la carta que no habías guardado en este equipo. Revísala y toca «Guardar carta».
        </p>
      ) : null}
      {readNote ? (
        <p className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">{readNote}</p>
      ) : null}

      {rows.length > 12 ? (
        <Input
          className="mt-5 max-w-sm"
          placeholder="Buscar en la carta…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      ) : null}

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Todavía no hay carta. Sube una foto o agrégala a mano.
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          {groups.map((group) => (
            <div key={group.section} className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex-1 min-w-[12rem]">
                  <span className="text-xs font-medium text-muted-foreground">Sección</span>
                  <Input
                    defaultValue={group.section}
                    onBlur={(e) => {
                      const next = e.target.value.trim() || MENU_DEFAULT_SECTION;
                      if (next !== group.section) renameSection(group.section, next);
                    }}
                  />
                </label>
                <span className="mt-4 text-xs text-muted-foreground">
                  {group.items.length} {group.items.length === 1 ? "opción" : "opciones"}
                </span>
              </div>
              <ul className="mt-3 divide-y divide-border">
                {group.items.map((row) => (
                  <MenuRow
                    key={row.key}
                    row={row}
                    onChange={(patch) => update(row.key, patch)}
                    onRemove={() => setRows((c) => c.filter((r) => r.key !== row.key))}
                  />
                ))}
              </ul>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => addItem(group.section)}
              >
                + Agregar en «{group.section}»
              </Button>
            </div>
          ))}
        </div>
      )}

      {dirty ? (
        <div className="sticky bottom-3 z-10 mt-6 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/95 p-3 shadow-elevated backdrop-blur">
          <span className="mr-auto text-sm">Tienes cambios sin guardar en la carta.</span>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              draft.clear();
              setReadNote(null);
              setRows(toRows(saved));
            }}
            disabled={save.isPending}
          >
            Descartar cambios
          </Button>
          <Button type="button" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Guardando…" : "Guardar carta"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function MenuRow({
  row,
  onChange,
  onRemove,
}: {
  row: Row;
  onChange: (patch: Partial<MenuItem>) => void;
  onRemove: () => void;
}) {
  const toggleTag = (tag: MenuTag) =>
    onChange({ tags: row.tags.includes(tag) ? row.tags.filter((t) => t !== tag) : [...row.tags, tag] });
  return (
    <li className={`py-3 ${row.fresh ? "rounded-md bg-primary/5 px-2" : ""}`}>
      <div className="grid gap-2 sm:grid-cols-[1fr_8rem]">
        <Input
          aria-label="Nombre del platillo o bebida"
          placeholder="Nombre (ej. Café de olla)"
          value={row.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">$</span>
          <Input
            aria-label="Precio de referencia"
            inputMode="decimal"
            placeholder="Precio"
            value={row.priceAmount ?? ""}
            onChange={(e) => {
              const v = e.target.value.replace(",", ".");
              const n = v === "" ? null : Number(v);
              onChange({ priceAmount: n === null || Number.isFinite(n) ? n : row.priceAmount });
            }}
          />
        </div>
      </div>
      <Input
        className="mt-2"
        aria-label="Descripción corta"
        placeholder="Descripción corta (opcional)"
        value={row.description ?? ""}
        onChange={(e) => onChange({ description: e.target.value || null })}
      />
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {MENU_TAG_KEYS.map((tag) => {
          const on = row.tags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              aria-pressed={on}
              onClick={() => toggleTag(tag)}
              className={`rounded-pill border px-2.5 py-0.5 text-xs transition-colors ${
                on
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              {MENU_TAGS[tag]}
            </button>
          );
        })}
        <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <Switch checked={row.isAvailable} onCheckedChange={(v) => onChange({ isAvailable: v })} />
          {row.isAvailable ? "Disponible" : "No disponible por ahora"}
        </label>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
          Quitar
        </Button>
      </div>
      {row.fresh ? <p className="mt-1 text-xs text-primary">Nuevo · revisa antes de guardar</p> : null}
    </li>
  );
}
