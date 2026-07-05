/**
 * BecomeHostFlow — E-PS · US-EPS.3 v2
 *
 * Componente cliente que aparece cuando un viajero autenticado visita
 * /convertir-en-anfitrion. Ofrece dos ramas al estilo Airbnb/GBP:
 *   1) Buscar y reclamar un negocio ya existente en la plataforma.
 *   2) Registrar un negocio nuevo (queda pendiente de aprobación).
 *
 * No introduce infraestructura: sólo consume los RPCs SECURITY DEFINER
 * expuestos en src/lib/hosting/hosting.functions.ts.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2, CheckCircle2, Loader2, Search } from "lucide-react";
import {
  claimBusiness,
  createOwnedBusiness,
  listBusinessCategoriesForClaim,
  listPublicDestinations,
  searchBusinessesForClaim,
  type BusinessSearchHit,
} from "@/lib/hosting/hosting.functions";

type Tab = "claim" | "register";

export function BecomeHostFlow() {
  const [tab, setTab] = useState<Tab>("claim");
  return (
    <section className="mt-2">
      <div
        className="inline-flex rounded-full border border-border bg-card p-1"
        role="tablist"
      >
        <TabButton active={tab === "claim"} onClick={() => setTab("claim")}>
          Ya existe mi negocio
        </TabButton>
        <TabButton active={tab === "register"} onClick={() => setTab("register")}>
          Registrar nuevo
        </TabButton>
      </div>
      <div className="mt-6">
        {tab === "claim" ? <ClaimBranch /> : <RegisterBranch />}
      </div>
    </section>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

/* ── Rama A: reclamar empresa existente ─────────────────────────── */
function ClaimBranch() {
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [destinationId, setDestinationId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const search = useServerFn(searchBusinessesForClaim);
  const claim = useServerFn(claimBusiness);
  const listDest = useServerFn(listPublicDestinations);
  const listCats = useServerFn(listBusinessCategoriesForClaim);
  const qc = useQueryClient();

  const destinations = useQuery({
    queryKey: ["hosting-destinations"],
    queryFn: () => listDest(),
    staleTime: 5 * 60_000,
  });
  const categories = useQuery({
    queryKey: ["hosting-categories"],
    queryFn: () => listCats(),
    staleTime: 5 * 60_000,
  });

  const results = useQuery({
    queryKey: ["hosting-search", term, destinationId, categoryId, page],
    queryFn: () =>
      search({
        data: {
          q: term,
          destination_id: destinationId || null,
          category_id: categoryId || null,
          page,
          page_size: pageSize,
        },
      }),
  });

  const mutate = useMutation({
    mutationFn: (business_id: string) => claim({ data: { business_id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hosting-search"] }),
  });

  const resetPage = () => setPage(1);
  const rows = results.data?.rows ?? [];
  const total = results.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          resetPage();
          setTerm(q.trim());
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Busca tu negocio por nombre…"
            className="w-full rounded-full border border-border bg-card py-2.5 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <button
          type="submit"
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Buscar
        </button>
      </form>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <select
          value={destinationId}
          onChange={(e) => {
            setDestinationId(e.target.value);
            resetPage();
          }}
          className="rounded-full border border-border bg-card px-4 py-2 text-sm"
          aria-label="Filtrar por destino"
        >
          <option value="">Todos los destinos</option>
          {(destinations.data ?? []).map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            resetPage();
          }}
          className="rounded-full border border-border bg-card px-4 py-2 text-sm"
          aria-label="Filtrar por categoría"
        >
          <option value="">Todas las categorías</option>
          {(categories.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {total} {total === 1 ? "resultado" : "resultados"}
        </span>
        {(destinationId || categoryId || term) && (
          <button
            type="button"
            onClick={() => {
              setDestinationId("");
              setCategoryId("");
              setQ("");
              setTerm("");
              resetPage();
            }}
            className="text-primary hover:underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {results.isFetching && (
        <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" aria-hidden /> Buscando…
        </p>
      )}

      {results.data && rows.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          No encontramos negocios con esos filtros. Prueba con otro término o
          usa la pestaña <strong>Registrar nuevo</strong>.
        </p>
      )}

      <ul className="mt-4 space-y-2">
        {rows.map((row: BusinessSearchHit) => (
          <li
            key={row.id}
            className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-card p-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-primary" aria-hidden />
                <span className="truncate text-sm font-medium text-foreground">
                  {row.display_name}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {row.destination_name ?? "Sin destino"} · {row.slug}
              </p>
              {row.has_owner && (
                <p className="mt-1 text-[11px] text-amber-600">
                  Este negocio ya tiene un anfitrión asignado. Tu reclamo
                  quedará como solicitud de transferencia.
                </p>
              )}
              {row.has_pending_claim && (
                <p className="mt-1 text-[11px] text-amber-600">
                  Ya existe una solicitud pendiente para este negocio.
                </p>
              )}
            </div>
            <button
              type="button"
              disabled={row.has_pending_claim || mutate.isPending}
              onClick={() => mutate.mutate(row.id)}
              className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              Reclamar
            </button>
          </li>
        ))}
      </ul>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-40"
          >
            ← Anterior
          </button>
          <span className="text-xs text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-40"
          >
            Siguiente →
          </button>
        </div>
      )}

      {mutate.isSuccess && (
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 size-4" aria-hidden />
          <div>
            <strong>Solicitud enviada.</strong> Un administrador la revisará y
            recibirás una notificación cuando se apruebe.
          </div>
        </div>
      )}
      {mutate.error instanceof Error && (
        <p className="mt-3 text-sm text-destructive">{mutate.error.message}</p>
      )}
    </div>
  );
}

/* ── Rama B: registrar negocio nuevo ─────────────────────────────── */
function RegisterBranch() {
  const [form, setForm] = useState({
    display_name: "",
    destination_id: "",
    tagline: "",
    description: "",
  });
  const listDest = useServerFn(listPublicDestinations);
  const create = useServerFn(createOwnedBusiness);

  const destinations = useQuery({
    queryKey: ["hosting-destinations"],
    queryFn: () => listDest(),
    staleTime: 5 * 60_000,
  });

  const mutate = useMutation({
    mutationFn: () =>
      create({
        data: {
          display_name: form.display_name,
          destination_id: form.destination_id,
          tagline: form.tagline || null,
          description: form.description || null,
        },
      }),
  });

  const canSubmit =
    form.display_name.trim().length >= 2 && form.destination_id !== "";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) mutate.mutate();
      }}
      className="space-y-4"
    >
      <Field label="Nombre del negocio *">
        <input
          value={form.display_name}
          onChange={(e) =>
            setForm((f) => ({ ...f, display_name: e.target.value }))
          }
          maxLength={120}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
          required
        />
      </Field>
      <Field label="Destino *">
        <select
          value={form.destination_id}
          onChange={(e) =>
            setForm((f) => ({ ...f, destination_id: e.target.value }))
          }
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
          required
        >
          <option value="">Selecciona un destino…</option>
          {(destinations.data ?? []).map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Tagline (opcional)">
        <input
          value={form.tagline}
          onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
          maxLength={160}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
        />
      </Field>
      <Field label="Descripción breve (opcional)">
        <textarea
          value={form.description}
          onChange={(e) =>
            setForm((f) => ({ ...f, description: e.target.value }))
          }
          maxLength={2000}
          rows={4}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
        />
      </Field>

      <button
        type="submit"
        disabled={!canSubmit || mutate.isPending}
        className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {mutate.isPending ? "Enviando…" : "Enviar solicitud"}
      </button>

      {mutate.isSuccess && (
        <div className="flex items-start gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 size-4" aria-hidden />
          <div>
            <strong>¡Solicitud enviada!</strong> Tu negocio quedó en borrador y
            un administrador lo revisará. Al aprobarse, aparecerá el modo{" "}
            <strong>Empresa</strong> en tu menú de usuario.
          </div>
        </div>
      )}
      {mutate.error instanceof Error && (
        <p className="text-sm text-destructive">{mutate.error.message}</p>
      )}
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}