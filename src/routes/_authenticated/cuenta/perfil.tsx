/**
 * /cuenta/perfil — Editor del perfil del viajero (Ola 4 · Etapa 3).
 * Whitelist server-side; sólo el propio `user_id` es accesible.
 */
import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Briefcase, Headphones, Shield, Mail, UserRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  getMyTravelerProfile,
  upsertMyTravelerProfile,
  type TravelerProfileInput,
} from "@/lib/traveler/traveler-account.functions";
import {
  getMyPersonalProfile,
  upsertMyPersonalProfile,
  type PersonalProfileInput,
} from "@/lib/traveler/profile-personal.functions";
import {
  getProfileModeState,
  type ProfileMode,
} from "@/lib/profile-mode/mode.functions";
import { ROLE_LABELS } from "@/types/auth";

export const Route = createFileRoute("/_authenticated/cuenta/perfil")({
  component: CuentaPerfilPage,
});

const TRAVEL_STYLES = [
  "relax",
  "aventura",
  "cultura",
  "gastronomia",
  "naturaleza",
  "familiar",
  "negocios",
  "romantico",
];
const BUDGET_RANGES = ["economico", "medio", "premium", "lujo"];
const LANGS = ["es", "en", "fr", "de", "it", "pt"];

function CuentaPerfilPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchProfile = useServerFn(getMyTravelerProfile);
  const saveProfile = useServerFn(upsertMyTravelerProfile);
  const fetchPersonal = useServerFn(getMyPersonalProfile);
  const savePersonal = useServerFn(upsertMyPersonalProfile);
  const fetchMode = useServerFn(getProfileModeState);

  const modeQ = useQuery({
    queryKey: ["profile-mode-state"],
    queryFn: () => fetchMode(),
    enabled: Boolean(user?.id),
    staleTime: 60_000,
  });
  const active: ProfileMode = modeQ.data?.active ?? "traveler";

  const { data, isLoading } = useQuery({
    queryKey: ["traveler", "profile", user?.id],
    queryFn: () => fetchProfile(),
    enabled: Boolean(user?.id) && active === "traveler",
    staleTime: 60_000,
  });

  const { data: personal, isLoading: loadingPersonal } = useQuery({
    queryKey: ["traveler", "personal", user?.id],
    queryFn: () => fetchPersonal(),
    enabled: Boolean(user?.id) && active === "traveler",
    staleTime: 60_000,
  });

  const [form, setForm] = useState<TravelerProfileInput>({
    travel_style: null,
    budget_range: null,
    interests: [],
    preferred_destinations: [],
    preferred_language: null,
    dietary_restrictions: null,
    accessibility_needs: null,
    trip_context: {},
  });

  const [personalForm, setPersonalForm] = useState<PersonalProfileInput>({
    first_name: null,
    last_name: null,
    phone: null,
    avatar_url: null,
    country: null,
    preferred_language: null,
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      travel_style: data.travel_style,
      budget_range: data.budget_range,
      interests: data.interests,
      preferred_destinations: data.preferred_destinations,
      preferred_language: data.preferred_language,
      dietary_restrictions: data.dietary_restrictions,
      accessibility_needs: data.accessibility_needs,
      trip_context: data.trip_context,
    });
  }, [data]);

  useEffect(() => {
    if (!personal) return;
    setPersonalForm({
      first_name: personal.first_name,
      last_name: personal.last_name,
      phone: personal.phone,
      avatar_url: personal.avatar_url,
      country: personal.country,
      preferred_language: personal.preferred_language,
    });
  }, [personal]);

  const mutation = useMutation({
    mutationFn: async (payload: {
      personal: PersonalProfileInput;
      travel: TravelerProfileInput;
    }) => {
      const [p, t] = await Promise.all([
        savePersonal({ data: payload.personal }),
        saveProfile({ data: payload.travel }),
      ]);
      return { p, t };
    },
    onSuccess: ({ p, t }) => {
      queryClient.setQueryData(["traveler", "personal", user?.id], p);
      queryClient.setQueryData(["traveler", "profile", user?.id], t);
      void navigate({ to: "/cuenta" });
    },
  });

  if (modeQ.isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  if (active !== "traveler") {
    return <NonTravelerAccount mode={active} />;
  }

  if (isLoading || loadingPersonal) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  return (
    <div className="max-w-3xl">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
        Cuenta del viajero
      </p>
      <h1 className="mt-2 text-4xl">Mi perfil</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Cuéntanos sobre ti y sobre tu viaje. Alux y nuestro Concierge usan
        esta información para acompañarte mejor en el Oriente Maya de Yucatán.
      </p>

      <form
        className="mt-8 grid gap-8"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate({ personal: personalForm, travel: form });
        }}
      >
        <fieldset className="grid gap-5 rounded-2xl border border-border bg-card p-5 shadow-soft">
          <legend className="px-2 text-sm font-semibold">Sobre ti</legend>
          <p className="text-xs text-muted-foreground">
            Tu nombre y contacto para que podamos dirigirnos a ti y —si lo pides—
            que el Concierge pueda escribirte.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              label="Nombre"
              value={personalForm.first_name ?? ""}
              onChange={(v) => setPersonalForm({ ...personalForm, first_name: v || null })}
            />
            <TextField
              label="Apellido"
              value={personalForm.last_name ?? ""}
              onChange={(v) => setPersonalForm({ ...personalForm, last_name: v || null })}
            />
          </div>
          <label className="grid gap-1 text-sm">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Correo electrónico
            </span>
            <input
              type="email"
              value={personal?.email ?? user?.email ?? ""}
              disabled
              className="rounded-md border border-border bg-muted/40 px-3 py-2 text-muted-foreground"
            />
            <span className="text-[11px] text-muted-foreground">
              El correo se toma de tu inicio de sesión y no se puede cambiar aquí.
            </span>
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              label="Teléfono"
              placeholder="+52 985 000 0000"
              value={personalForm.phone ?? ""}
              onChange={(v) => setPersonalForm({ ...personalForm, phone: v || null })}
            />
            <TextField
              label="País de origen"
              placeholder="México, USA, Francia…"
              value={personalForm.country ?? ""}
              onChange={(v) => setPersonalForm({ ...personalForm, country: v || null })}
            />
          </div>
          <SelectField
            label="Idioma preferido · Alux te responderá en este idioma"
            value={personalForm.preferred_language ?? ""}
            options={LANGS}
            onChange={(v) => setPersonalForm({ ...personalForm, preferred_language: v || null })}
          />
          <TextField
            label="Foto de perfil (URL)"
            placeholder="https://…"
            value={personalForm.avatar_url ?? ""}
            onChange={(v) => setPersonalForm({ ...personalForm, avatar_url: v || null })}
          />
        </fieldset>

        <fieldset className="grid gap-5 rounded-2xl border border-border bg-card p-5 shadow-soft">
          <legend className="px-2 text-sm font-semibold">Tu estilo de viaje</legend>
          <p className="text-xs text-muted-foreground">
            Con esto Alux filtra y recomienda experiencias, hoteles y
            restaurantes alineados a lo que buscas.
          </p>
        <SelectField
          label="Estilo de viaje"
          value={form.travel_style ?? ""}
          options={TRAVEL_STYLES}
          onChange={(v) => setForm({ ...form, travel_style: v || null })}
        />
        <SelectField
          label="Rango de presupuesto"
          value={form.budget_range ?? ""}
          options={BUDGET_RANGES}
          onChange={(v) => setForm({ ...form, budget_range: v || null })}
        />
        <ListField
          label="Intereses · qué te gusta hacer (separa con comas)"
          value={(form.interests ?? []).join(", ")}
          onChange={(arr) => setForm({ ...form, interests: arr })}
        />
        <ListField
          label="Destinos preferidos del Oriente Maya (separa con comas)"
          value={(form.preferred_destinations ?? []).join(", ")}
          onChange={(arr) => setForm({ ...form, preferred_destinations: arr })}
        />
        <TextAreaField
          label="Restricciones alimentarias · filtramos restaurantes compatibles"
          value={form.dietary_restrictions ?? ""}
          onChange={(v) => setForm({ ...form, dietary_restrictions: v || null })}
        />
        <TextAreaField
          label="Necesidades de accesibilidad"
          value={form.accessibility_needs ?? ""}
          onChange={(v) => setForm({ ...form, accessibility_needs: v || null })}
        />
        </fieldset>

        {mutation.error ? (
          <p className="text-sm text-destructive">
            {String((mutation.error as Error).message)}
          </p>
        ) : null}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-pill bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {mutation.isPending ? "Guardando…" : "Guardar cambios"}
          </button>
          <button
            type="button"
            onClick={() => void navigate({ to: "/cuenta" })}
            className="rounded-pill border border-border px-5 py-2 text-sm font-medium hover:bg-accent"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border bg-background px-3 py-2"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border bg-background px-3 py-2"
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

const NON_TRAVELER_META: Record<
  Exclude<ProfileMode, "traveler">,
  { eyebrow: string; Icon: typeof Briefcase; functions: string[] }
> = {
  business: {
    eyebrow: "Modo Empresa",
    Icon: Briefcase,
    functions: [
      "Administra tu(s) empresa(s), sucursales y equipo",
      "Publica productos, promociones y eventos",
      "Consulta estadísticas, reseñas y actividad",
      "Gestiona pagos, visibilidad y suscripciones",
    ],
  },
  concierge: {
    eyebrow: "Modo Concierge",
    Icon: Headphones,
    functions: [
      "Atiende solicitudes de viajeros asignadas",
      "Envía propuestas y coordina con empresas",
      "Da seguimiento a expedientes activos",
    ],
  },
  staff: {
    eyebrow: "Modo Staff",
    Icon: Shield,
    functions: [
      "Edita contenido y plantillas del CMS",
      "Modera reseñas y publicaciones",
      "Administra usuarios, roles y operación (si aplica)",
    ],
  },
};

function NonTravelerAccount({ mode }: { mode: Exclude<ProfileMode, "traveler"> }) {
  const { authUser, role } = useAuth();
  const meta = NON_TRAVELER_META[mode];
  const { Icon } = meta;
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
        {meta.eyebrow}
      </p>
      <h1 className="mt-2 text-4xl">Mi cuenta</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Datos personales y funciones asociadas a este modo. Para editar tus
        preferencias de viaje cambia al modo <strong>Viajero</strong> desde el
        menú de tu foto.
      </p>

      <section className="mt-8 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Datos de la cuenta</h2>
        <dl className="mt-4 grid gap-4 text-sm md:grid-cols-2">
          <div className="flex items-start gap-2">
            <UserRound className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Nombre
              </dt>
              <dd className="mt-0.5">{authUser?.display_name ?? "—"}</dd>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Mail className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Correo
              </dt>
              <dd className="mt-0.5 break-all">{authUser?.email ?? "—"}</dd>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Shield className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Rol principal
              </dt>
              <dd className="mt-0.5">{role ? ROLE_LABELS[role] : "—"}</dd>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Icon className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Modo activo
              </dt>
              <dd className="mt-0.5">{meta.eyebrow.replace("Modo ", "")}</dd>
            </div>
          </div>
        </dl>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Funciones en este modo</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {meta.functions.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            to="/cuenta"
            className="inline-flex items-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Volver al resumen
          </Link>
        </div>
      </section>
    </div>
  );
}

function ListField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (arr: string[]) => void;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        type="text"
        defaultValue={value}
        onBlur={(e) =>
          onChange(
            e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          )
        }
        className="rounded-md border border-border bg-background px-3 py-2"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="rounded-md border border-border bg-background px-3 py-2"
      />
    </label>
  );
}