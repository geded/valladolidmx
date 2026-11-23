/**
 * StoreProductsPanel — productos de tienda de una empresa con venta en línea
 * (fase 2). Sólo Administración: alta en grupo desde foto/PDF de la lista de
 * precios (lectura de Alux, la persona revisa) o pegando la hoja de cálculo,
 * y ajuste de precio y piezas. Las fotos se agregan en la edición del producto.
 */
import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fileToPayload } from "@/components/cms/BusinessMenuPanel";
import { readMenuFromFiles } from "@/lib/menu/menu.functions";
import { MENU_FILE_MAX_COUNT } from "@/lib/menu/menu-model";
import {
  createStoreProducts,
  listStoreProducts,
  updateStoreProduct,
  type StoreProductRow,
} from "@/lib/commerce/store-orders.functions";
import { parseStoreSheet, type StoreSheetRow } from "@/lib/commerce/store-catalog";

interface DraftRow extends StoreSheetRow {
  key: string;
}
let seq = 0;
const withKeys = (rows: StoreSheetRow[]): DraftRow[] => rows.map((r) => ({ ...r, key: `d${++seq}` }));

function money(pesos: number): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 }).format(pesos);
}

export function StoreProductsPanel({ businessId }: { businessId: string }) {
  const listFn = useServerFn(listStoreProducts);
  const createFn = useServerFn(createStoreProducts);
  const readFn = useServerFn(readMenuFromFiles);
  const qc = useQueryClient();
  const queryKey = ["store-products", businessId];
  const list = useQuery({ queryKey, queryFn: () => listFn({ data: { businessId } }) });

  const [sheet, setSheet] = useState("");
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [reading, setReading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const create = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          businessId,
          items: drafts.map((d) => ({ name: d.name, price: d.price, stock: d.stock, description: d.description })),
        },
      }),
    onSuccess: async (r) => {
      toast.success(r.created === 1 ? "1 producto a la venta" : `${r.created} productos a la venta`);
      setDrafts([]);
      setSheet("");
      await qc.invalidateQueries({ queryKey });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function readSheet() {
    const r = parseStoreSheet(sheet);
    if (r.problems.length)
      toast.warning(`No entendí ${r.problems.length} línea(s): ${r.problems.map((p) => p.line).join(", ")}`);
    setDrafts((cur) => [...cur, ...withKeys(r.rows)]);
  }

  async function readFiles(files: FileList | null) {
    if (!files?.length) return;
    setReading(true);
    try {
      const payload = await Promise.all(Array.from(files).slice(0, MENU_FILE_MAX_COUNT).map(fileToPayload));
      const res = await readFn({ data: { businessId, files: payload } });
      if (res.problem) toast.error(res.problem);
      const rows = res.items
        .filter((i) => i.priceAmount !== null && i.priceAmount > 0)
        .map((i) => ({ name: i.name, price: i.priceAmount as number, stock: null, description: i.description }));
      const skipped = res.items.length - rows.length;
      if (skipped > 0) toast.warning(`${skipped} producto(s) sin precio: agrégalos a mano.`);
      setDrafts((cur) => [...cur, ...withKeys(rows)]);
    } catch {
      toast.error("No se pudo leer el archivo. Intenta con otra foto o PDF.");
    } finally {
      setReading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const patch = (key: string, p: Partial<DraftRow>) =>
    setDrafts((cur) => cur.map((d) => (d.key === key ? { ...d, ...p } : d)));

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Tienda · solo administrador</p>
      <h2 className="mt-2 text-xl">Productos a la venta</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Cada producto tiene precio y piezas. Al venderse se descuentan; sin piezas deja de venderse solo. Deja
        «piezas» vacío si no hay límite.
      </p>

      {list.isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Cargando productos…</p>
      ) : (list.data ?? []).length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Aún no hay productos de tienda.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
          {(list.data ?? []).map((p) => (
            <StoreProductLine key={p.id} product={p} onSaved={() => qc.invalidateQueries({ queryKey })} />
          ))}
        </ul>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-sm font-semibold">Desde una foto o PDF de la lista de precios</p>
          <p className="mt-1 text-xs text-muted-foreground">Alux lee la lista y tú revisas antes de guardar.</p>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={(e) => void readFiles(e.target.files)}
          />
          <Button type="button" variant="outline" className="mt-2" disabled={reading} onClick={() => fileRef.current?.click()}>
            {reading ? "Alux está leyendo…" : "Subir foto o PDF"}
          </Button>
        </div>
        <div>
          <p className="text-sm font-semibold">Pegando la hoja de cálculo</p>
          <p className="mt-1 text-xs text-muted-foreground">Una línea por producto: nombre, precio, piezas.</p>
          <Textarea
            value={sheet}
            onChange={(e) => setSheet(e.target.value)}
            rows={3}
            className="mt-2"
            placeholder={"Bolso bordado, 890, 5\nHamaca matrimonial, 1250, 2"}
          />
          <Button type="button" variant="outline" className="mt-2" disabled={!sheet.trim()} onClick={readSheet}>
            Revisar lista
          </Button>
        </div>
      </div>

      {drafts.length ? (
        <div className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <p className="text-sm font-semibold">Revisa antes de poner a la venta ({drafts.length})</p>
          <ul className="mt-3 space-y-2">
            {drafts.map((d) => (
              <li key={d.key} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 sm:grid-cols-[1fr_6rem_5rem_auto]">
                <Input className="col-span-3 sm:col-span-1" value={d.name} onChange={(e) => patch(d.key, { name: e.target.value })} aria-label="Nombre" />
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={String(d.price)}
                  onChange={(e) => patch(d.key, { price: Number(e.target.value) })}
                  aria-label="Precio en pesos"
                />
                <Input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={d.stock === null ? "" : String(d.stock)}
                  placeholder="Piezas"
                  onChange={(e) => patch(d.key, { stock: e.target.value === "" ? null : Math.max(0, Math.floor(Number(e.target.value))) })}
                  aria-label="Piezas disponibles"
                />
                <Button type="button" variant="ghost" size="sm" onClick={() => setDrafts((c) => c.filter((x) => x.key !== d.key))}>
                  Quitar
                </Button>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setDrafts([])}>
              Descartar
            </Button>
            <Button
              type="button"
              onClick={() => create.mutate()}
              disabled={create.isPending || drafts.some((d) => !d.name.trim() || !(d.price > 0))}
            >
              {create.isPending ? "Guardando…" : "Poner a la venta"}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function StoreProductLine({ product, onSaved }: { product: StoreProductRow; onSaved: () => void }) {
  const updateFn = useServerFn(updateStoreProduct);
  const [price, setPrice] = useState(product.priceCents !== null ? String(product.priceCents / 100) : "");
  const [stock, setStock] = useState(product.stock === null ? "" : String(product.stock));
  const dirty =
    price !== (product.priceCents !== null ? String(product.priceCents / 100) : "") ||
    stock !== (product.stock === null ? "" : String(product.stock));
  const save = useMutation({
    mutationFn: () =>
      updateFn({
        data: { productId: product.id, price: Number(price), stock: stock === "" ? null : Math.max(0, Math.floor(Number(stock))) },
      }),
    onSuccess: () => {
      toast.success("Producto actualizado");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <li className="flex flex-wrap items-center gap-3 p-3">
      <div className="min-w-0 basis-full sm:basis-auto sm:flex-1">
        <p className="text-sm font-medium">{product.name}</p>
        <p className="text-xs text-muted-foreground">
          {product.enabled ? "A la venta" : "Sin venta en línea"}
          {product.stock === 0 ? " · Agotado" : ""}
          {product.priceCents !== null ? ` · ${money(product.priceCents / 100)}` : ""} ·{" "}
          <Link to="/cms/productos/$productId/editar" params={{ productId: product.id }} className="underline">
            Fotos y descripción
          </Link>
        </p>
      </div>
      <Input
        type="number"
        inputMode="decimal"
        min="0"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        className="w-24"
        aria-label={`Precio de ${product.name}`}
      />
      <Input
        type="number"
        inputMode="numeric"
        min="0"
        value={stock}
        placeholder="Sin límite"
        onChange={(e) => setStock(e.target.value)}
        className="w-24"
        aria-label={`Piezas de ${product.name}`}
      />
      <Button type="button" size="sm" variant="outline" disabled={!dirty || save.isPending || !(Number(price) > 0)} onClick={() => save.mutate()}>
        Guardar
      </Button>
    </li>
  );
}
