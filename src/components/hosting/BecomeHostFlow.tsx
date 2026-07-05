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
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  Loader2,
  Search,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    display_name: "",
    destination_id: "",
    primary_category_id: "",
    tagline: "",
    description: "",
    address_line1: "",
    address_line2: "",
    postal_code: "",
    phone: "",
    whatsapp: "",
    email: "",
    website: "",
    verification_document_url: "",
    verification_document_name: "",
  });
  const [uploadState, setUploadState] = useState<
    "idle" | "uploading" | "done" | "error"
  >("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);

  const listDest = useServerFn(listPublicDestinations);
  const listCats = useServerFn(listBusinessCategoriesForClaim);
  const create = useServerFn(createOwnedBusiness);

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

  const mutate = useMutation({
    mutationFn: () =>
      create({
        data: {
          display_name: form.display_name,
          destination_id: form.destination_id,
          primary_category_id: form.primary_category_id || null,
          tagline: form.tagline || null,
          description: form.description,
          address_line1: form.address_line1 || null,
          address_line2: form.address_line2 || null,
          postal_code: form.postal_code || null,
          phone: form.phone || null,
          whatsapp: form.whatsapp || null,
          email: form.email || null,
          website: form.website || null,
          verification_document_url: form.verification_document_url,
        },
      }),
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const step0Ok =
    form.display_name.trim().length >= 2 &&
    form.destination_id !== "" &&
    form.primary_category_id !== "" &&
    form.description.trim().length >= 80;
  const step1Ok =
    form.address_line1.trim().length > 0 &&
    (form.phone.trim() || form.whatsapp.trim() || form.email.trim());
  const step2Ok = uploadState === "done" && !!form.verification_document_url;
  const stepValid = [step0Ok, step1Ok, step2Ok, true][step];

  async function handleUpload(file: File) {
    setUploadError(null);
    if (file.size > 8 * 1024 * 1024) {
      setUploadError("El archivo excede 8 MB.");
      return;
    }
    setUploadState("uploading");
    try {
      const { data: sess } = await supabase.auth.getUser();
      const uid = sess.user?.id;
      if (!uid) throw new Error("Debes iniciar sesión.");
      const ext = file.name.split(".").pop() || "bin";
      const path = `${uid}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("business-verification")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      set("verification_document_url", path);
      set("verification_document_name", file.name);
      setUploadState("done");
    } catch (err) {
      setUploadState("error");
      setUploadError(err instanceof Error ? err.message : "Error al subir");
    }
  }

  const steps = useMemo(
    () => ["Datos básicos", "Ubicación y contacto", "Verificación", "Revisión"],
    [],
  );

  if (mutate.isSuccess) {
    return (
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-5 text-primary" aria-hidden />
          <div className="flex-1">
            <h3 className="text-lg font-semibold">Solicitud enviada</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Un administrador revisará tu documento de verificación. Cuando
              apruebe tu identidad, verás <strong>Modo Empresa</strong> en el
              menú y podrás completar tu ficha para publicarla.
            </p>
            <button
              type="button"
              onClick={() => navigate({ to: "/cuenta" })}
              className="mt-4 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Volver a mi cuenta
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <ol className="flex items-center gap-2 text-xs">
        {steps.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={`inline-flex size-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                i < step
                  ? "bg-primary text-primary-foreground"
                  : i === step
                  ? "bg-primary/15 text-primary ring-2 ring-primary/40"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </span>
            <span
              className={`hidden sm:inline ${
                i === step ? "font-medium text-foreground" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
            {i < steps.length - 1 && (
              <span className="mx-1 hidden h-px flex-1 bg-border sm:block" />
            )}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="space-y-4">
          <Field label="Nombre del negocio *">
            <input
              value={form.display_name}
              onChange={(e) => set("display_name", e.target.value)}
              maxLength={120}
              placeholder="Ej. Hotel Casa Colonial"
              className={inputCls}
              required
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Destino *">
              <select
                value={form.destination_id}
                onChange={(e) => set("destination_id", e.target.value)}
                className={inputCls}
                required
              >
                <option value="">Selecciona…</option>
                {(destinations.data ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Categoría principal *">
              <select
                value={form.primary_category_id}
                onChange={(e) => set("primary_category_id", e.target.value)}
                className={inputCls}
                required
              >
                <option value="">Selecciona…</option>
                {(categories.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Frase corta (tagline)">
            <input
              value={form.tagline}
              onChange={(e) => set("tagline", e.target.value)}
              maxLength={160}
              placeholder="Una línea que describa tu propuesta"
              className={inputCls}
            />
          </Field>
          <Field
            label="Descripción *"
            hint={`${form.description.trim().length}/80 mínimo`}
          >
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              maxLength={2000}
              rows={5}
              placeholder="Cuenta tu historia, qué ofreces y qué te hace único en Valladolid…"
              className={inputCls}
              required
            />
          </Field>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <Field label="Dirección *">
            <input
              value={form.address_line1}
              onChange={(e) => set("address_line1", e.target.value)}
              maxLength={200}
              placeholder="Calle 41 x 40 y 42, Centro"
              className={inputCls}
              required
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Referencia (opcional)">
              <input
                value={form.address_line2}
                onChange={(e) => set("address_line2", e.target.value)}
                maxLength={200}
                className={inputCls}
              />
            </Field>
            <Field label="Código postal">
              <input
                value={form.postal_code}
                onChange={(e) => set("postal_code", e.target.value)}
                maxLength={20}
                className={inputCls}
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Teléfono">
              <input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                type="tel"
                className={inputCls}
              />
            </Field>
            <Field label="WhatsApp">
              <input
                value={form.whatsapp}
                onChange={(e) => set("whatsapp", e.target.value)}
                type="tel"
                className={inputCls}
              />
            </Field>
            <Field label="Correo público">
              <input
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                type="email"
                className={inputCls}
              />
            </Field>
            <Field label="Sitio web">
              <input
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
                type="url"
                placeholder="https://"
                className={inputCls}
              />
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">
            * Debes ingresar al menos un teléfono, WhatsApp o correo público.
          </p>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-5 text-primary" aria-hidden />
              <div className="text-sm">
                <p className="font-medium text-foreground">
                  Verificamos que tu negocio existe y que eres su representante
                </p>
                <p className="mt-1 text-muted-foreground">
                  Sube uno de estos documentos: <strong>RFC</strong>, acta
                  constitutiva, licencia municipal o comprobante de domicilio
                  del negocio. Sólo tú y los administradores pueden verlo.
                </p>
              </div>
            </div>
          </div>
          <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-border bg-card p-8 text-center transition hover:border-primary hover:bg-primary/5">
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleUpload(f);
              }}
            />
            {uploadState === "uploading" ? (
              <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-6 animate-spin" aria-hidden />
                Subiendo documento…
              </div>
            ) : uploadState === "done" ? (
              <div className="flex flex-col items-center gap-2 text-sm text-foreground">
                <FileCheck2 className="size-8 text-primary" aria-hidden />
                <span className="font-medium">
                  {form.verification_document_name}
                </span>
                <span className="text-xs text-muted-foreground">
                  Haz clic para reemplazar
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                <Upload className="size-8" aria-hidden />
                <span className="font-medium text-foreground">
                  Sube tu documento
                </span>
                <span className="text-xs">
                  PDF o imagen, máximo 8 MB
                </span>
              </div>
            )}
          </label>
          {uploadError && (
            <p className="text-sm text-destructive">{uploadError}</p>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <ReviewItem label="Nombre" value={form.display_name} />
          <ReviewItem
            label="Destino"
            value={
              destinations.data?.find((d) => d.id === form.destination_id)?.name ??
              "—"
            }
          />
          <ReviewItem
            label="Categoría"
            value={
              categories.data?.find((c) => c.id === form.primary_category_id)?.name ??
              "—"
            }
          />
          <ReviewItem label="Dirección" value={form.address_line1} />
          <ReviewItem
            label="Contacto"
            value={[form.phone, form.whatsapp, form.email].filter(Boolean).join(" · ")}
          />
          <ReviewItem
            label="Documento"
            value={form.verification_document_name || "—"}
          />
          <p className="mt-4 text-xs text-muted-foreground">
            Al enviar, tu solicitud pasa a <strong>Revisión de identidad</strong>.
            Cuando un administrador la apruebe, podrás completar tu ficha y
            enviarla a publicar.
          </p>
        </div>
      )}

      {mutate.error instanceof Error && (
        <p className="text-sm text-destructive">{mutate.error.message}</p>
      )}

      <div className="flex items-center justify-between gap-2 pt-2">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium disabled:opacity-40"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Atrás
        </button>
        {step < steps.length - 1 ? (
          <button
            type="button"
            disabled={!stepValid}
            onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Siguiente
            <ChevronRight className="size-4" aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            disabled={mutate.isPending || !step0Ok || !step1Ok || !step2Ok}
            onClick={() => mutate.mutate()}
            className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {mutate.isPending ? "Enviando…" : "Enviar solicitud"}
          </button>
        )}
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>{label}</span>
        {hint && <span className="text-[10px] opacity-70">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3 text-sm">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-right text-foreground">{value || "—"}</span>
    </div>
  );
}