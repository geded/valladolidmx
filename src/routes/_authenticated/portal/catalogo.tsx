/**
 * /portal/catalogo — Productos y Promociones (Ola 3 · Etapa 6).
 */
import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  archiveBusinessProduct,
  archiveBusinessPromotion,
  createBusinessProduct,
  createBusinessPromotion,
  listBusinessProducts,
  listBusinessPromotions,
  requestProductReview,
  requestPromotionReview,
  updateBusinessProduct,
  updateBusinessPromotion,
  withdrawProductReview,
  withdrawPromotionReview,
  type PortalProduct,
  type PortalPromotion,
  type ProductType,
} from "@/lib/portal/business-catalog.functions";
import { listMyBusinesses } from "@/lib/portal/portal-reads.functions";

const STORAGE_KEY = "valladolidmx.portal.activeBusinessId";
const PRODUCT_TYPES: ProductType[] = [
  "experiencia",
  "hotel",
  "restaurante",
  "evento",
  "tour",
  "transporte",
  "servicio",
  "artesanal",
];

export const Route = createFileRoute("/_authenticated/portal/catalogo")({
  component: CatalogoPage,
});

function useActiveBusinessId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    in_review: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    approved: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    published: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    archived: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${map[status] ?? "bg-muted"}`}
    >
      {status}
    </span>
  );
}

function CatalogoPage() {
  const activeBusinessId = useActiveBusinessId();
  const fetchBusinesses = useServerFn(listMyBusinesses);
  const { data: businesses = [] } = useQuery({
    queryKey: ["portal", "my-businesses"],
    queryFn: () => fetchBusinesses(),
    staleTime: 60_000,
  });
  const active = useMemo(
    () => businesses.find((b) => b.business_id === activeBusinessId) ?? null,
    [businesses, activeBusinessId],
  );
  const [tab, setTab] = useState<"productos" | "promociones">("productos");

  if (!activeBusinessId || !active) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold">Catálogo</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Selecciona una empresa activa en el panel lateral.
        </p>
        <Link to="/portal" className="mt-4 inline-block text-sm text-primary">
          Volver al resumen
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Portal Empresarial · Etapa 6
        </p>
        <h1 className="mt-1 text-3xl font-semibold">Catálogo</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {active.display_name} · Productos y promociones de tu empresa. La
          publicación final permanece reservada al equipo editorial.
        </p>
      </header>

      <div className="mb-6 inline-flex rounded-md border border-border bg-card/40 p-1">
        {(["productos", "promociones"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded px-4 py-1.5 text-sm capitalize ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "productos" ? (
        <ProductsPanel businessId={activeBusinessId} />
      ) : (
        <PromotionsPanel businessId={activeBusinessId} />
      )}
    </div>
  );
}

// ---------- Products ----------

function ProductsPanel({ businessId }: { businessId: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listBusinessProducts);
  const createFn = useServerFn(createBusinessProduct);
  const updateFn = useServerFn(updateBusinessProduct);
  const archiveFn = useServerFn(archiveBusinessProduct);
  const reqRevFn = useServerFn(requestProductReview);
  const wdRevFn = useServerFn(withdrawProductReview);

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ["portal", "products", businessId],
    queryFn: () => listFn({ data: { businessId } }),
  });

  const refresh = () =>
    qc.invalidateQueries({ queryKey: ["portal", "products", businessId] });

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState<ProductType>("experiencia");
  const [tagline, setTagline] = useState("");
  const [price, setPrice] = useState<string>("");
  const [status, setStatus] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          businessId,
          name,
          slug: slug || slugify(name),
          productType: type,
          tagline: tagline || null,
          priceAmount: price ? Number(price) : null,
        },
      }),
    onSuccess: () => {
      setName("");
      setSlug("");
      setTagline("");
      setPrice("");
      setCreating(false);
      setStatus("Producto creado.");
      refresh();
    },
    onError: (e) =>
      setStatus(e instanceof Error ? e.message : "Error al crear"),
  });

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Productos</h2>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
        >
          {creating ? "Cancelar" : "Nuevo producto"}
        </button>
      </div>
      {status && (
        <p className="mb-3 text-xs text-muted-foreground">{status}</p>
      )}

      {creating && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMut.mutate();
          }}
          className="mb-6 grid gap-3 rounded-lg border border-border bg-card/40 p-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs uppercase tracking-wide text-muted-foreground">
              Nombre
              <input
                required
                maxLength={200}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground"
              />
            </label>
            <label className="grid gap-1 text-xs uppercase tracking-wide text-muted-foreground">
              Slug
              <input
                value={slug}
                placeholder={slugify(name)}
                onChange={(e) => setSlug(e.target.value)}
                className="rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground"
              />
            </label>
            <label className="grid gap-1 text-xs uppercase tracking-wide text-muted-foreground">
              Tipo
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ProductType)}
                className="rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground"
              >
                {PRODUCT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs uppercase tracking-wide text-muted-foreground">
              Precio (MXN)
              <input
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground"
              />
            </label>
            <label className="sm:col-span-2 grid gap-1 text-xs uppercase tracking-wide text-muted-foreground">
              Tagline
              <input
                maxLength={200}
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={createMut.isPending || !name}
            className="justify-self-end rounded-md bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            {createMut.isPending ? "Creando…" : "Crear producto"}
          </button>
        </form>
      )}

      {isLoading && (
        <p className="text-sm text-muted-foreground">Cargando productos…</p>
      )}
      {error && (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Error desconocido"}
        </p>
      )}

      {!isLoading && !items.length && (
        <p className="text-sm text-muted-foreground">
          Aún no hay productos. Crea el primero con "Nuevo producto".
        </p>
      )}

      <ul className="grid gap-3">
        {items.map((p) => (
          <ProductRow
            key={p.id}
            product={p}
            onUpdate={(patch) =>
              updateFn({ data: { productId: p.id, ...patch } }).then(refresh)
            }
            onArchive={() =>
              archiveFn({ data: { productId: p.id } }).then(refresh)
            }
            onRequestReview={() =>
              reqRevFn({ data: { productId: p.id } }).then(refresh)
            }
            onWithdrawReview={() =>
              wdRevFn({ data: { productId: p.id } }).then(refresh)
            }
          />
        ))}
      </ul>
    </section>
  );
}

function ProductRow({
  product,
  onUpdate,
  onArchive,
  onRequestReview,
  onWithdrawReview,
}: {
  product: PortalProduct;
  onUpdate: (patch: {
    name?: string;
    tagline?: string | null;
    priceAmount?: number | null;
    clearPrice?: boolean;
  }) => Promise<unknown>;
  onArchive: () => Promise<unknown>;
  onRequestReview: () => Promise<unknown>;
  onWithdrawReview: () => Promise<unknown>;
}) {
  const [name, setName] = useState(product.name);
  const [tagline, setTagline] = useState(product.tagline ?? "");
  const [price, setPrice] = useState(product.price_amount?.toString() ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const dirty =
    name !== product.name ||
    (tagline || "") !== (product.tagline ?? "") ||
    price !== (product.price_amount?.toString() ?? "");

  async function run<T>(fn: () => Promise<T>) {
    setBusy(true);
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-lg border border-border bg-card/40 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            {product.product_type}
          </span>
          <StatusBadge status={product.status} />
        </div>
        <code className="text-[11px] text-muted-foreground">{product.slug}</code>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-xs uppercase tracking-wide text-muted-foreground">
          Nombre
          <input
            value={name}
            maxLength={200}
            onChange={(e) => setName(e.target.value)}
            className="rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground"
          />
        </label>
        <label className="grid gap-1 text-xs uppercase tracking-wide text-muted-foreground">
          Precio ({product.price_currency})
          <input
            type="number"
            min={0}
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground"
          />
        </label>
        <label className="sm:col-span-2 grid gap-1 text-xs uppercase tracking-wide text-muted-foreground">
          Tagline
          <input
            value={tagline}
            maxLength={200}
            onChange={(e) => setTagline(e.target.value)}
            className="rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground"
          />
        </label>
      </div>
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!dirty || busy}
          onClick={() =>
            run(() =>
              onUpdate({
                name,
                tagline: tagline || null,
                priceAmount: price ? Number(price) : null,
                clearPrice: !price,
              }),
            )
          }
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
        >
          Guardar cambios
        </button>
        {product.status === "draft" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => run(onRequestReview)}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
          >
            Solicitar revisión
          </button>
        )}
        {product.status === "in_review" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => run(onWithdrawReview)}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
          >
            Retirar revisión
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (confirm("¿Archivar este producto? Quedará registrado en auditoría."))
              run(onArchive);
          }}
          className="ml-auto rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
        >
          Archivar
        </button>
      </div>
    </li>
  );
}

// ---------- Promotions ----------

function PromotionsPanel({ businessId }: { businessId: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listBusinessPromotions);
  const createFn = useServerFn(createBusinessPromotion);
  const updateFn = useServerFn(updateBusinessPromotion);
  const archiveFn = useServerFn(archiveBusinessPromotion);
  const reqRevFn = useServerFn(requestPromotionReview);
  const wdRevFn = useServerFn(withdrawPromotionReview);

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ["portal", "promotions", businessId],
    queryFn: () => listFn({ data: { businessId } }),
  });

  const refresh = () =>
    qc.invalidateQueries({ queryKey: ["portal", "promotions", businessId] });

  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [discount, setDiscount] = useState("");
  const [starts, setStarts] = useState("");
  const [ends, setEnds] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          businessId,
          title,
          slug: slug || slugify(title),
          discountPercent: discount ? Number(discount) : null,
          startsAt: starts ? new Date(starts).toISOString() : null,
          endsAt: ends ? new Date(ends).toISOString() : null,
        },
      }),
    onSuccess: () => {
      setTitle("");
      setSlug("");
      setDiscount("");
      setStarts("");
      setEnds("");
      setCreating(false);
      setStatus("Promoción creada.");
      refresh();
    },
    onError: (e) =>
      setStatus(e instanceof Error ? e.message : "Error al crear"),
  });

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Promociones</h2>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
        >
          {creating ? "Cancelar" : "Nueva promoción"}
        </button>
      </div>
      {status && (
        <p className="mb-3 text-xs text-muted-foreground">{status}</p>
      )}

      {creating && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMut.mutate();
          }}
          className="mb-6 grid gap-3 rounded-lg border border-border bg-card/40 p-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs uppercase tracking-wide text-muted-foreground">
              Título
              <input
                required
                maxLength={200}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground"
              />
            </label>
            <label className="grid gap-1 text-xs uppercase tracking-wide text-muted-foreground">
              Slug
              <input
                value={slug}
                placeholder={slugify(title)}
                onChange={(e) => setSlug(e.target.value)}
                className="rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground"
              />
            </label>
            <label className="grid gap-1 text-xs uppercase tracking-wide text-muted-foreground">
              Descuento (%)
              <input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground"
              />
            </label>
            <div />
            <label className="grid gap-1 text-xs uppercase tracking-wide text-muted-foreground">
              Inicia
              <input
                type="datetime-local"
                value={starts}
                onChange={(e) => setStarts(e.target.value)}
                className="rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground"
              />
            </label>
            <label className="grid gap-1 text-xs uppercase tracking-wide text-muted-foreground">
              Termina
              <input
                type="datetime-local"
                value={ends}
                onChange={(e) => setEnds(e.target.value)}
                className="rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={createMut.isPending || !title}
            className="justify-self-end rounded-md bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            {createMut.isPending ? "Creando…" : "Crear promoción"}
          </button>
        </form>
      )}

      {isLoading && (
        <p className="text-sm text-muted-foreground">Cargando promociones…</p>
      )}
      {error && (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Error desconocido"}
        </p>
      )}
      {!isLoading && !items.length && (
        <p className="text-sm text-muted-foreground">
          Aún no hay promociones registradas.
        </p>
      )}

      <ul className="grid gap-3">
        {items.map((p) => (
          <PromotionRow
            key={p.id}
            promo={p}
            onUpdate={(patch) =>
              updateFn({ data: { promotionId: p.id, ...patch } }).then(refresh)
            }
            onArchive={() =>
              archiveFn({ data: { promotionId: p.id } }).then(refresh)
            }
            onRequestReview={() =>
              reqRevFn({ data: { promotionId: p.id } }).then(refresh)
            }
            onWithdrawReview={() =>
              wdRevFn({ data: { promotionId: p.id } }).then(refresh)
            }
          />
        ))}
      </ul>
    </section>
  );
}

function PromotionRow({
  promo,
  onUpdate,
  onArchive,
  onRequestReview,
  onWithdrawReview,
}: {
  promo: PortalPromotion;
  onUpdate: (patch: {
    title?: string;
    discountPercent?: number | null;
    clearDiscount?: boolean;
  }) => Promise<unknown>;
  onArchive: () => Promise<unknown>;
  onRequestReview: () => Promise<unknown>;
  onWithdrawReview: () => Promise<unknown>;
}) {
  const [title, setTitle] = useState(promo.title);
  const [discount, setDiscount] = useState(
    promo.discount_percent?.toString() ?? "",
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const dirty =
    title !== promo.title ||
    discount !== (promo.discount_percent?.toString() ?? "");

  async function run<T>(fn: () => Promise<T>) {
    setBusy(true);
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  const window =
    promo.starts_at || promo.ends_at
      ? `${promo.starts_at ? new Date(promo.starts_at).toLocaleString() : "—"} → ${promo.ends_at ? new Date(promo.ends_at).toLocaleString() : "—"}`
      : "Sin ventana definida";

  return (
    <li className="rounded-lg border border-border bg-card/40 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <StatusBadge status={promo.status} />
        <code className="text-[11px] text-muted-foreground">{promo.slug}</code>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2 grid gap-1 text-xs uppercase tracking-wide text-muted-foreground">
          Título
          <input
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground"
          />
        </label>
        <label className="grid gap-1 text-xs uppercase tracking-wide text-muted-foreground">
          Descuento (%)
          <input
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            className="rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground"
          />
        </label>
        <div className="grid gap-1 text-xs uppercase tracking-wide text-muted-foreground">
          Vigencia
          <p className="rounded border border-dashed border-border bg-background/40 px-2 py-1.5 text-sm text-foreground">
            {window}
          </p>
        </div>
      </div>
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!dirty || busy}
          onClick={() =>
            run(() =>
              onUpdate({
                title,
                discountPercent: discount ? Number(discount) : null,
                clearDiscount: !discount,
              }),
            )
          }
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
        >
          Guardar cambios
        </button>
        {promo.status === "draft" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => run(onRequestReview)}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
          >
            Solicitar revisión
          </button>
        )}
        {promo.status === "in_review" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => run(onWithdrawReview)}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
          >
            Retirar revisión
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (confirm("¿Archivar esta promoción?")) run(onArchive);
          }}
          className="ml-auto rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
        >
          Archivar
        </button>
      </div>
    </li>
  );
}