/**
 * /cuenta/perfil — Editor del perfil del viajero (Ola 4 · Etapa 3).
 * Whitelist server-side; sólo el propio `user_id` es accesible.
 */
import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Briefcase,
  Headphones,
  Shield,
  Mail,
  UserRound,
  Sparkles,
  Check,
} from "lucide-react";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
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
import { AvatarUploader } from "@/components/traveler/AvatarUploader";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/cuenta/perfil")({
  component: CuentaPerfilPage,
});

const TRAVEL_STYLES: { value: string; label: string; emoji: string }[] = [
  { value: "relax", label: "Relax", emoji: "🧘" },
  { value: "aventura", label: "Aventura", emoji: "🌿" },
  { value: "cultura", label: "Cultura", emoji: "🏛️" },
  { value: "gastronomia", label: "Gastronomía", emoji: "🥘" },
  { value: "naturaleza", label: "Naturaleza", emoji: "🌊" },
  { value: "familiar", label: "Familiar", emoji: "👨‍👩‍👧" },
  { value: "negocios", label: "Negocios", emoji: "💼" },
  { value: "romantico", label: "Romántico", emoji: "💛" },
];

const BUDGET_RANGES: { value: string; label: string; hint: string }[] = [
  { value: "economico", label: "Económico", hint: "Mochilero, hostales" },
  { value: "medio", label: "Medio", hint: "Hoteles boutique" },
  { value: "premium", label: "Premium", hint: "Haciendas, experiencias" },
  { value: "lujo", label: "Lujo", hint: "Todo incluido, privado" },
];

const LANGS: { value: string; label: string; flag: string }[] = [
  { value: "es", label: "Español", flag: "🇲🇽" },
  { value: "en", label: "English", flag: "🇺🇸" },
  { value: "fr", label: "Français", flag: "🇫🇷" },
  { value: "de", label: "Deutsch", flag: "🇩🇪" },
  { value: "it", label: "Italiano", flag: "🇮🇹" },
  { value: "pt", label: "Português", flag: "🇧🇷" },
];

const INTEREST_SUGGESTIONS = [
  "Cenotes",
  "Ruinas mayas",
  "Gastronomía yucateca",
  "Playas",
  "Mercados",
  "Fotografía",
  "Snorkel",
  "Bici",
  "Vida nocturna",
  "Artesanías",
  "Arquitectura colonial",
  "Bienestar",
];

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
      toast.success("Perfil actualizado. Alux ya lo tiene en cuenta.");
      void navigate({ to: "/cuenta" });
    },
    onError: (e) => toast.error((e as Error).message || "No se pudo guardar."),
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

  const filledCount = [
    personalForm.first_name,
    personalForm.phone,
    personalForm.country,
    personalForm.preferred_language,
    personalForm.avatar_url,
    form.travel_style,
    form.budget_range,
    (form.interests ?? []).length > 0 ? "x" : null,
    (form.preferred_destinations ?? []).length > 0 ? "x" : null,
    form.trip_context?.travel_window,
  ].filter(Boolean).length;
  const pct = Math.round((filledCount / 10) * 100);

  const interests = form.interests ?? [];

  function toggleInterest(value: string) {
    const set = new Set(interests);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    setForm({ ...form, interests: Array.from(set) });
  }

  return (
    <div className="max-w-3xl">
      <header className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-soft">
        <div className="flex items-start gap-4">
          <AvatarUploader
            userId={user?.id}
            currentUrl={personalForm.avatar_url ?? personal?.avatar_url}
            displayName={
              personalForm.first_name ||
              personal?.display_name ||
              user?.email
            }
            onUploaded={(url) => setPersonalForm({ ...personalForm, avatar_url: url })}
          />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
              <Sparkles className="size-3" aria-hidden /> Tu perfil de viaje
            </p>
            <h1 className="mt-1 text-2xl font-semibold leading-tight sm:text-3xl">
              {personalForm.first_name
                ? `Hola, ${personalForm.first_name}`
                : "Cuéntanos quién viaja"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Cada dato ayuda a Alux a recomendarte lo mejor del Oriente Maya de Yucatán.
            </p>
            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                <span>{filledCount}/10 completado</span>
                <span>{pct}%</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <form
        className="mt-6 grid gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate({ personal: personalForm, travel: form });
        }}
      >
        <SectionCard
          eyebrow="1 · Sobre ti"
          title="Datos de contacto"
          subtitle="Para dirigirnos a ti por tu nombre y —si lo pides— que el Concierge pueda escribirte."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              label="Nombre"
              value={personalForm.first_name ?? ""}
              onChange={(v) => setPersonalForm({ ...personalForm, first_name: v || null })}
              placeholder="María"
            />
            <TextField
              label="Apellido"
              value={personalForm.last_name ?? ""}
              onChange={(v) => setPersonalForm({ ...personalForm, last_name: v || null })}
              placeholder="González"
            />
          </div>

          <FieldShell
            label="Correo electrónico"
            hint="Se toma de tu inicio de sesión."
          >
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              <Mail className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{personal?.email ?? user?.email ?? "—"}</span>
            </div>
          </FieldShell>

          <FieldShell
            label="Teléfono"
            hint="Con lada internacional. Elige tu país en la bandera."
          >
            <PhoneInput
              defaultCountry="mx"
              value={personalForm.phone ?? ""}
              onChange={(v) =>
                setPersonalForm({ ...personalForm, phone: v || null })
              }
              inputClassName="!w-full !rounded-r-md !border-border !bg-background !py-2 !text-sm"
              countrySelectorStyleProps={{
                buttonClassName:
                  "!rounded-l-md !border-border !bg-background !py-2 !px-2",
              }}
              className="w-full"
            />
          </FieldShell>

          <FieldShell
            label="País de origen"
            hint="Alux ajusta moneda, husos horarios y consejos de aduanas."
          >
            <CountrySelect
              value={personalForm.country ?? ""}
              onChange={(v) => setPersonalForm({ ...personalForm, country: v || null })}
            />
          </FieldShell>

          <FieldShell
            label="Idioma preferido"
            hint="Alux te responderá en este idioma."
          >
            <div className="flex flex-wrap gap-2">
              {LANGS.map((l) => (
                <ChipButton
                  key={l.value}
                  active={personalForm.preferred_language === l.value}
                  onClick={() =>
                    setPersonalForm({ ...personalForm, preferred_language: l.value })
                  }
                >
                  <span aria-hidden>{l.flag}</span> {l.label}
                </ChipButton>
              ))}
            </div>
          </FieldShell>
        </SectionCard>

        <SectionCard
          eyebrow="2 · Tu estilo de viaje"
          title="¿Cómo te gusta viajar?"
          subtitle="Alux usa esto para filtrar experiencias, hoteles y restaurantes."
        >
          <FieldShell label="Estilo de viaje">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TRAVEL_STYLES.map((s) => (
                <ChipButton
                  key={s.value}
                  active={form.travel_style === s.value}
                  onClick={() => setForm({ ...form, travel_style: s.value })}
                  block
                >
                  <span aria-hidden className="text-base">{s.emoji}</span> {s.label}
                </ChipButton>
              ))}
            </div>
          </FieldShell>

          <FieldShell label="Rango de presupuesto por noche">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {BUDGET_RANGES.map((b) => (
                <button
                  key={b.value}
                  type="button"
                  onClick={() => setForm({ ...form, budget_range: b.value })}
                  className={`rounded-xl border p-3 text-left transition ${
                    form.budget_range === b.value
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-between text-sm font-medium">
                    {b.label}
                    {form.budget_range === b.value && (
                      <Check className="size-3.5 text-primary" aria-hidden />
                    )}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {b.hint}
                  </div>
                </button>
              ))}
            </div>
          </FieldShell>

          <FieldShell
            label="Intereses"
            hint="Elige todos los que apliquen."
          >
            <div className="flex flex-wrap gap-2">
              {INTEREST_SUGGESTIONS.map((i) => (
                <ChipButton
                  key={i}
                  active={interests.includes(i)}
                  onClick={() => toggleInterest(i)}
                >
                  {interests.includes(i) && <Check className="size-3" aria-hidden />}
                  {i}
                </ChipButton>
              ))}
            </div>
          </FieldShell>

          <ListField
            label="Destinos preferidos del Oriente Maya"
            placeholder="Valladolid, Izamal, Ek Balam…"
            value={(form.preferred_destinations ?? []).join(", ")}
            onChange={(arr) => setForm({ ...form, preferred_destinations: arr })}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <TextAreaField
              label="Restricciones alimentarias"
              hint="Filtramos restaurantes compatibles."
              placeholder="Vegetariano, sin gluten, alergia a mariscos…"
              value={form.dietary_restrictions ?? ""}
              onChange={(v) => setForm({ ...form, dietary_restrictions: v || null })}
            />
            <TextAreaField
              label="Necesidades de accesibilidad"
              hint="Priorizamos lugares accesibles."
              placeholder="Silla de ruedas, movilidad reducida…"
              value={form.accessibility_needs ?? ""}
              onChange={(v) => setForm({ ...form, accessibility_needs: v || null })}
            />
          </div>
        </SectionCard>

        {mutation.error ? (
          <p className="text-sm text-destructive">
            {String((mutation.error as Error).message)}
          </p>
        ) : null}

        <div className="sticky bottom-0 -mx-1 flex items-center justify-end gap-3 rounded-2xl border border-border bg-card/95 p-3 backdrop-blur">
          <button
            type="button"
            onClick={() => void navigate({ to: "/cuenta" })}
            className="rounded-pill border border-border px-5 py-2 text-sm font-medium hover:bg-accent"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-pill bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-soft hover:opacity-90 disabled:opacity-60"
          >
            {mutation.isPending ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}

function SectionCard({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-lg font-semibold">{title}</h2>
      {subtitle && (
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      )}
      <div className="mt-5 grid gap-5">{children}</div>
    </section>
  );
}

function FieldShell({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

function ChipButton({
  active,
  onClick,
  children,
  block,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  block?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-pill border px-3 py-1.5 text-sm transition ${
        block ? "w-full" : ""
      } ${
        active
          ? "border-primary bg-primary/10 font-medium text-primary"
          : "border-border bg-background hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

const COUNTRIES = [
  { code: "MX", flag: "🇲🇽", name: "México" },
  { code: "US", flag: "🇺🇸", name: "Estados Unidos" },
  { code: "CA", flag: "🇨🇦", name: "Canadá" },
  { code: "AR", flag: "🇦🇷", name: "Argentina" },
  { code: "CL", flag: "🇨🇱", name: "Chile" },
  { code: "CO", flag: "🇨🇴", name: "Colombia" },
  { code: "PE", flag: "🇵🇪", name: "Perú" },
  { code: "BR", flag: "🇧🇷", name: "Brasil" },
  { code: "ES", flag: "🇪🇸", name: "España" },
  { code: "FR", flag: "🇫🇷", name: "Francia" },
  { code: "DE", flag: "🇩🇪", name: "Alemania" },
  { code: "IT", flag: "🇮🇹", name: "Italia" },
  { code: "GB", flag: "🇬🇧", name: "Reino Unido" },
  { code: "PT", flag: "🇵🇹", name: "Portugal" },
  { code: "NL", flag: "🇳🇱", name: "Países Bajos" },
  { code: "CH", flag: "🇨🇭", name: "Suiza" },
  { code: "JP", flag: "🇯🇵", name: "Japón" },
  { code: "AU", flag: "🇦🇺", name: "Australia" },
];

function CountrySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const known = COUNTRIES.find((c) => c.name === value);
  return (
    <div className="flex items-center gap-2">
      <span className="text-xl" aria-hidden>
        {known?.flag ?? "🌎"}
      </span>
      <select
        value={known ? known.name : ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      >
        <option value="">Selecciona tu país</option>
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.name}>
            {c.flag} {c.name}
          </option>
        ))}
      </select>
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