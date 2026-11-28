/**
 * /portal/presencia — Contactos, ubicaciones, horarios y redes sociales
 * de la empresa activa (Ola 3 · Etapa 4 · Plan 14.30).
 *
 * Toda mutación pasa por server functions con requireSupabaseAuth +
 * has_business_access('editor'). Cambios relevantes quedan auditados
 * via log_business_presence_audit (SECURITY DEFINER, gate dedicado).
 * El Portal Empresarial no muta directamente sobre el cliente del CMS.
 */
import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { portalErrorMessage } from "@/lib/portal/error-messages";
import { locationEditorPatch } from "@/lib/portal/location-editor";
import { toast } from "sonner";
import {
  createBusinessContact,
  createBusinessHour,
  createBusinessLocation,
  createBusinessSocialLink,
  deleteBusinessContact,
  deleteBusinessHour,
  deleteBusinessLocation,
  deleteBusinessSocialLink,
  listBusinessContacts,
  listBusinessHours,
  listBusinessLocations,
  listBusinessSocialLinks,
  updateBusinessLocation,
  type PortalContact,
  type PortalHour,
  type PortalLocation,
  type PortalSocialLink,
} from "@/lib/portal/business-presence.functions";

const STORAGE_KEY = "valladolidmx.portal.activeBusinessId";

export const Route = createFileRoute("/_authenticated/portal/presencia")({
  head: () => ({
    meta: [
      { title: "Contactos y ubicaciones de tu empresa · Valladolid.mx" },
      {
        name: "description",
        content:
          "Administra las ubicaciones, contactos, horarios y redes sociales de tu empresa en Valladolid.mx.",
      },
      { property: "og:title", content: "Contactos y ubicaciones de tu empresa · Valladolid.mx" },
      {
        property: "og:description",
        content: "Administra los datos de presencia de tu empresa desde el Portal empresarial.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PresenciaPage,
});

function useActiveBusinessId(): string | null {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setId(window.localStorage.getItem(STORAGE_KEY));
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setId(e.newValue);
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);
  return id;
}

type Tab = "contactos" | "ubicaciones" | "horarios" | "redes";
const TABS: { id: Tab; label: string }[] = [
  { id: "contactos", label: "Contactos" },
  { id: "ubicaciones", label: "Ubicaciones" },
  { id: "horarios", label: "Horarios" },
  { id: "redes", label: "Redes sociales" },
];

function PresenciaPage() {
  const businessId = useActiveBusinessId();
  const [tab, setTab] = useState<Tab>("contactos");

  if (!businessId) {
    return (
      <EmptyState
        title="Selecciona una empresa"
        body="Elige la empresa activa en el menú lateral para administrar su presencia."
      />
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
          Portal Empresarial
        </p>
        <h1 className="mt-1 text-3xl font-semibold">Presencia de la empresa</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Administra los datos de contacto, ubicaciones físicas, horarios de atención y enlaces a
          redes sociales. Sólo propietarios, gerentes y editores con acceso a esta empresa pueden
          modificar esta información.
        </p>
      </header>

      <nav className="flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={[
              "rounded-t-md px-4 py-2 text-sm",
              tab === t.id
                ? "border-b-2 border-primary font-semibold text-primary"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "contactos" && <ContactsPanel businessId={businessId} />}
      {tab === "ubicaciones" && <LocationsPanel key={businessId} businessId={businessId} />}
      {tab === "horarios" && <HoursPanel businessId={businessId} />}
      {tab === "redes" && <SocialPanel businessId={businessId} />}
    </div>
  );
}

// --- helpers UI -----------------------------------------------------------

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card/40 p-10 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function PanelHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function ErrorBanner({ error }: { error: unknown }) {
  if (!error) return null;
  const msg = portalErrorMessage(error);
  return (
    <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
      {msg}
    </p>
  );
}

// --- Contactos ------------------------------------------------------------

function ContactsPanel({ businessId }: { businessId: string }) {
  const qc = useQueryClient();
  const list = useServerFn(listBusinessContacts);
  const create = useServerFn(createBusinessContact);
  const del = useServerFn(deleteBusinessContact);

  const q = useQuery({
    queryKey: ["portal", businessId, "contacts"],
    queryFn: () => list({ data: { businessId } }),
  });

  const createMut = useMutation({
    mutationFn: (data: {
      contact_type: string;
      value: string;
      label: string | null;
      is_public: boolean;
    }) => create({ data: { businessId, ...data } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal", businessId, "contacts"] }),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { businessId, id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal", businessId, "contacts"] }),
  });

  return (
    <section className="space-y-5">
      <PanelHeader
        title="Contactos"
        description="Teléfonos, correos y enlaces de contacto. Marca como públicos sólo los que pueden mostrarse en la ficha pública."
      />

      <ContactForm pending={createMut.isPending} onSubmit={(d) => createMut.mutate(d)} />
      <ErrorBanner error={createMut.error} />

      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : q.error ? (
        <ErrorBanner error={q.error} />
      ) : !q.data?.length ? (
        <p className="text-sm text-muted-foreground">Sin contactos registrados.</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {q.data.map((c: PortalContact) => (
            <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium">
                  {c.label ?? c.contact_type}
                  <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {c.contact_type}
                  </span>
                  {c.is_public ? (
                    <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      Público
                    </span>
                  ) : (
                    <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      Privado
                    </span>
                  )}
                </p>
                <p className="truncate text-muted-foreground">{c.value}</p>
              </div>
              <button
                type="button"
                disabled={delMut.isPending}
                onClick={() => {
                  if (confirm("¿Eliminar este contacto?")) delMut.mutate(c.id);
                }}
                className="rounded-md border border-border px-3 py-1 text-xs hover:bg-accent"
              >
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}
      <ErrorBanner error={delMut.error} />
    </section>
  );
}

function ContactForm({
  pending,
  onSubmit,
}: {
  pending: boolean;
  onSubmit: (d: {
    contact_type: string;
    value: string;
    label: string | null;
    is_public: boolean;
  }) => void;
}) {
  const [type, setType] = useState("phone");
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSubmit({
      contact_type: type,
      value: value.trim(),
      label: label.trim() ? label.trim() : null,
      is_public: isPublic,
    });
    setValue("");
    setLabel("");
  };

  return (
    <form
      onSubmit={submit}
      className="grid gap-3 rounded-md border border-border bg-card/40 p-4 sm:grid-cols-[140px_1fr_1fr_auto]"
    >
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
      >
        <option value="phone">Teléfono</option>
        <option value="whatsapp">WhatsApp</option>
        <option value="email">Correo</option>
        <option value="website">Sitio web</option>
        <option value="other">Otro</option>
      </select>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Valor (número, correo o URL)"
        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Etiqueta (opcional)"
        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          Público
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-95 disabled:opacity-60"
        >
          Añadir
        </button>
      </div>
    </form>
  );
}

// --- Ubicaciones ----------------------------------------------------------

function LocationsPanel({ businessId }: { businessId: string }) {
  const qc = useQueryClient();
  const list = useServerFn(listBusinessLocations);
  const create = useServerFn(createBusinessLocation);
  const del = useServerFn(deleteBusinessLocation);
  const update = useServerFn(updateBusinessLocation);
  const [editing, setEditing] = useState<PortalLocation | null>(null);
  const [formVersion, setFormVersion] = useState(0);

  const q = useQuery({
    queryKey: ["portal", businessId, "locations"],
    queryFn: () => list({ data: { businessId } }),
  });

  const createMut = useMutation({
    mutationFn: (data: {
      label: string | null;
      address_line1: string | null;
      address_line2: string | null;
      postal_code: string | null;
      latitude: number | null;
      longitude: number | null;
      is_primary: boolean;
    }) => create({ data: { businessId, ...data } }),
    onSuccess: () => {
      setFormVersion((v) => v + 1);
      toast.success("Ubicación añadida");
      return qc.invalidateQueries({ queryKey: ["portal", businessId, "locations"] });
    },
  });

  const updateMut = useMutation({
    mutationFn: (patch: ReturnType<typeof locationEditorPatch>) => {
      if (!editing) throw new Error("empty_patch");
      return update({ data: { businessId, id: editing.id, patch } });
    },
    onSuccess: () => {
      setEditing(null);
      setFormVersion((v) => v + 1);
      toast.success("Ubicación actualizada");
      return qc.invalidateQueries({ queryKey: ["portal", businessId, "locations"] });
    },
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { businessId, id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal", businessId, "locations"] }),
  });

  return (
    <section className="space-y-5">
      <PanelHeader
        title="Ubicaciones"
        description="Direcciones físicas asociadas a esta empresa. Marca una como principal para que sea la predeterminada en la ficha pública."
      />

      <LocationForm
        key={`${editing?.id ?? "new"}-${formVersion}`}
        initial={editing}
        pending={createMut.isPending || updateMut.isPending}
        onCancel={() => {
          setEditing(null);
          updateMut.reset();
          createMut.reset();
        }}
        onSubmit={(d) => (editing ? updateMut.mutate(d) : createMut.mutate(d))}
      />
      <ErrorBanner error={editing ? updateMut.error : createMut.error} />

      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : q.error ? (
        <ErrorBanner error={q.error} />
      ) : !q.data?.length ? (
        <p className="text-sm text-muted-foreground">Sin ubicaciones registradas.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {q.data.map((l: PortalLocation) => (
            <li
              key={l.id}
              className="space-y-1 rounded-md border border-border bg-card/40 p-4 text-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">
                  {l.label ?? "Ubicación"}
                  {l.is_primary && (
                    <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      Principal
                    </span>
                  )}
                </p>
                <div className="flex shrink-0 flex-wrap gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={createMut.isPending || updateMut.isPending}
                    onClick={() => {
                      updateMut.reset();
                      createMut.reset();
                      setEditing(l);
                      document
                        .getElementById("location-form")
                        ?.scrollIntoView({ block: "center", behavior: "smooth" });
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    disabled={delMut.isPending}
                    onClick={() => {
                      if (confirm("¿Eliminar esta ubicación?")) delMut.mutate(l.id);
                    }}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
              <p className="text-muted-foreground">
                {l.address_line1 ?? "—"}
                {l.address_line2 ? `, ${l.address_line2}` : ""}
              </p>
              {l.postal_code && <p className="text-xs text-muted-foreground">CP {l.postal_code}</p>}
              {(l.latitude !== null || l.longitude !== null) && (
                <p className="text-xs text-muted-foreground">
                  {l.latitude}, {l.longitude}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      <ErrorBanner error={delMut.error} />
    </section>
  );
}

function LocationForm({
  pending,
  onSubmit,
  initial,
  onCancel,
}: {
  initial: PortalLocation | null;
  onCancel: () => void;
  pending: boolean;
  onSubmit: (d: {
    label: string | null;
    address_line1: string | null;
    address_line2: string | null;
    postal_code: string | null;
    latitude: number | null;
    longitude: number | null;
    is_primary: boolean;
  }) => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [a1, setA1] = useState(initial?.address_line1 ?? "");
  const [a2, setA2] = useState(initial?.address_line2 ?? "");
  const [cp, setCp] = useState(initial?.postal_code ?? "");
  const [lat, setLat] = useState(
    initial?.latitude === null || initial?.latitude === undefined ? "" : String(initial.latitude),
  );
  const [lng, setLng] = useState(
    initial?.longitude === null || initial?.longitude === undefined
      ? ""
      : String(initial.longitude),
  );
  const [primary, setPrimary] = useState(initial?.is_primary ?? false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(
      locationEditorPatch({
        label,
        address: a1,
        references: a2,
        postalCode: cp,
        latitude: lat,
        longitude: lng,
        primary,
      }),
    );
  };

  return (
    <form
      id="location-form"
      onSubmit={submit}
      className="grid gap-3 rounded-md border border-border bg-card/40 p-4 sm:grid-cols-2"
    >
      {initial && <p className="text-sm font-semibold sm:col-span-2">Editar ubicación</p>}
      <input
        value={label}
        aria-label="Nombre de la ubicación"
        maxLength={120}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Nombre de la ubicación (Sucursal centro…)"
        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <input
        value={cp}
        aria-label="Código postal"
        maxLength={24}
        onChange={(e) => setCp(e.target.value)}
        placeholder="Código postal"
        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <input
        value={a1}
        aria-label="Dirección"
        maxLength={240}
        onChange={(e) => setA1(e.target.value)}
        placeholder="Dirección línea 1"
        className="rounded-md border border-border bg-background px-3 py-2 text-sm sm:col-span-2"
      />
      <input
        value={a2}
        aria-label="Referencias de la dirección"
        maxLength={240}
        onChange={(e) => setA2(e.target.value)}
        placeholder="Dirección línea 2"
        className="rounded-md border border-border bg-background px-3 py-2 text-sm sm:col-span-2"
      />
      <input
        value={lat}
        aria-label="Latitud"
        type="number"
        step="any"
        min={-90}
        max={90}
        onChange={(e) => setLat(e.target.value)}
        placeholder="Latitud (-90 a 90)"
        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <input
        value={lng}
        aria-label="Longitud"
        type="number"
        step="any"
        min={-180}
        max={180}
        onChange={(e) => setLng(e.target.value)}
        placeholder="Longitud (-180 a 180)"
        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={primary} onChange={(e) => setPrimary(e.target.checked)} />
        Marcar como ubicación principal
      </label>
      <div className="flex gap-2 sm:justify-self-end">
        {initial && (
          <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : initial ? "Guardar cambios" : "Añadir ubicación"}
        </Button>
      </div>
    </form>
  );
}

// --- Horarios -------------------------------------------------------------

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function HoursPanel({ businessId }: { businessId: string }) {
  const qc = useQueryClient();
  const list = useServerFn(listBusinessHours);
  const create = useServerFn(createBusinessHour);
  const del = useServerFn(deleteBusinessHour);

  const q = useQuery({
    queryKey: ["portal", businessId, "hours"],
    queryFn: () => list({ data: { businessId } }),
  });

  const createMut = useMutation({
    mutationFn: (data: {
      day_of_week: number;
      is_closed: boolean;
      opens_at: string | null;
      closes_at: string | null;
      notes: string | null;
    }) => create({ data: { businessId, ...data } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal", businessId, "hours"] }),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { businessId, id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal", businessId, "hours"] }),
  });

  return (
    <section className="space-y-5">
      <PanelHeader
        title="Horarios de atención"
        description="Define una o varias franjas por día. Marca el día como cerrado si no hay atención."
      />

      <HourForm pending={createMut.isPending} onSubmit={(d) => createMut.mutate(d)} />
      <ErrorBanner error={createMut.error} />

      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : q.error ? (
        <ErrorBanner error={q.error} />
      ) : !q.data?.length ? (
        <p className="text-sm text-muted-foreground">Sin horarios registrados.</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {q.data.map((h: PortalHour) => (
            <li key={h.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{DAY_NAMES[h.day_of_week] ?? `Día ${h.day_of_week}`}</p>
                <p className="text-xs text-muted-foreground">
                  {h.is_closed ? "Cerrado" : `${h.opens_at ?? "??"} – ${h.closes_at ?? "??"}`}
                  {h.notes ? ` · ${h.notes}` : ""}
                </p>
              </div>
              <button
                type="button"
                disabled={delMut.isPending}
                onClick={() => {
                  if (confirm("¿Eliminar esta franja?")) delMut.mutate(h.id);
                }}
                className="rounded-md border border-border px-3 py-1 text-xs hover:bg-accent"
              >
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}
      <ErrorBanner error={delMut.error} />
    </section>
  );
}

function HourForm({
  pending,
  onSubmit,
}: {
  pending: boolean;
  onSubmit: (d: {
    day_of_week: number;
    is_closed: boolean;
    opens_at: string | null;
    closes_at: string | null;
    notes: string | null;
  }) => void;
}) {
  const [day, setDay] = useState(1);
  const [closed, setClosed] = useState(false);
  const [opens, setOpens] = useState("09:00");
  const [closes, setCloses] = useState("18:00");
  const [notes, setNotes] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      day_of_week: day,
      is_closed: closed,
      opens_at: closed ? null : opens,
      closes_at: closed ? null : closes,
      notes: notes.trim() || null,
    });
    setNotes("");
  };

  return (
    <form
      onSubmit={submit}
      className="grid gap-3 rounded-md border border-border bg-card/40 p-4 sm:grid-cols-[150px_120px_120px_1fr_auto]"
    >
      <select
        value={day}
        onChange={(e) => setDay(Number(e.target.value))}
        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
      >
        {DAY_NAMES.map((n, i) => (
          <option key={i} value={i}>
            {n}
          </option>
        ))}
      </select>
      <input
        type="time"
        value={opens}
        onChange={(e) => setOpens(e.target.value)}
        disabled={closed}
        className="rounded-md border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
      />
      <input
        type="time"
        value={closes}
        onChange={(e) => setCloses(e.target.value)}
        disabled={closed}
        className="rounded-md border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
      />
      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notas (opcional)"
        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={closed} onChange={(e) => setClosed(e.target.checked)} />
          Cerrado
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-95 disabled:opacity-60"
        >
          Añadir
        </button>
      </div>
    </form>
  );
}

// --- Redes sociales -------------------------------------------------------

const PLATFORMS = [
  "facebook",
  "instagram",
  "tiktok",
  "youtube",
  "x",
  "twitter",
  "linkedin",
  "threads",
  "other",
];

function SocialPanel({ businessId }: { businessId: string }) {
  const qc = useQueryClient();
  const list = useServerFn(listBusinessSocialLinks);
  const create = useServerFn(createBusinessSocialLink);
  const del = useServerFn(deleteBusinessSocialLink);

  const q = useQuery({
    queryKey: ["portal", businessId, "social"],
    queryFn: () => list({ data: { businessId } }),
  });

  const createMut = useMutation({
    mutationFn: (data: { platform: string; url: string }) =>
      create({ data: { businessId, ...data } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal", businessId, "social"] }),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { businessId, id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal", businessId, "social"] }),
  });

  const [platform, setPlatform] = useState("instagram");
  const [url, setUrl] = useState("");

  return (
    <section className="space-y-5">
      <PanelHeader
        title="Redes sociales"
        description="Enlaces a perfiles oficiales. Sólo URLs http/https son aceptadas."
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!url.trim()) return;
          createMut.mutate({ platform, url: url.trim() }, { onSuccess: () => setUrl("") });
        }}
        className="grid gap-3 rounded-md border border-border bg-card/40 p-4 sm:grid-cols-[160px_1fr_auto]"
      >
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm capitalize"
        >
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={createMut.isPending}
          className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-95 disabled:opacity-60"
        >
          Añadir
        </button>
      </form>
      <ErrorBanner error={createMut.error} />

      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : q.error ? (
        <ErrorBanner error={q.error} />
      ) : !q.data?.length ? (
        <p className="text-sm text-muted-foreground">Sin redes registradas.</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {q.data.map((s: PortalSocialLink) => (
            <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium capitalize">{s.platform}</p>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-xs text-primary hover:underline"
                >
                  {s.url}
                </a>
              </div>
              <button
                type="button"
                disabled={delMut.isPending}
                onClick={() => {
                  if (confirm("¿Eliminar este enlace?")) delMut.mutate(s.id);
                }}
                className="rounded-md border border-border px-3 py-1 text-xs hover:bg-accent"
              >
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}
      <ErrorBanner error={delMut.error} />
    </section>
  );
}
