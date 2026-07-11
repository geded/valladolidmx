/**
 * /cuenta/perfil-publico — Panel del perfil público del viajero (E5.4).
 *
 * Gestión de handle, visibilidad, nombre público, bio, país, idiomas y
 * avatar. Todo opt-in: privado por defecto. Upload al bucket privado
 * `avatars` bajo el prefijo `<uid>/...`; el server firma las lecturas.
 */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/useAuth";
import {
  checkHandleAvailability,
  getMyPublicProfile,
  updateMyPublicProfile,
  type HandleAvailability,
  type MyPublicProfile,
} from "@/lib/traveler/traveler-public.functions";
import { getMyPersonalProfile } from "@/lib/traveler/profile-personal.functions";
import { getMyTravelerProfile } from "@/lib/traveler/traveler-account.functions";
import { ProfileCompletionMeter } from "@/components/traveler/ProfileCompletionMeter";
import { Lock, Star, Users, Sparkles, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cuenta/perfil-publico")({
  component: PerfilPublicoPage,
});

type FormState = {
  public_handle: string;
  is_public: boolean;
  public_bio: string;
};

function toForm(p: MyPublicProfile): FormState {
  return {
    public_handle: p.public_handle ?? "",
    is_public: p.is_public,
    public_bio: p.public_bio ?? "",
  };
}

function PerfilPublicoPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fetchProfile = useServerFn(getMyPublicProfile);
  const saveProfile = useServerFn(updateMyPublicProfile);
  const checkHandle = useServerFn(checkHandleAvailability);
  const fetchPersonal = useServerFn(getMyPersonalProfile);
  const fetchTravel = useServerFn(getMyTravelerProfile);

  const { data, isLoading } = useQuery({
    queryKey: ["traveler", "public-profile", user?.id],
    queryFn: () => fetchProfile(),
    enabled: Boolean(user?.id),
    staleTime: 30_000,
  });

  const { data: personal } = useQuery({
    queryKey: ["traveler", "personal-profile", user?.id],
    queryFn: () => fetchPersonal(),
    enabled: Boolean(user?.id),
    staleTime: 30_000,
  });

  const { data: travel } = useQuery({
    queryKey: ["traveler", "travel-profile", user?.id],
    queryFn: () => fetchTravel(),
    enabled: Boolean(user?.id),
    staleTime: 30_000,
  });

  const [form, setForm] = useState<FormState>({
    public_handle: "",
    is_public: false,
    public_bio: "",
  });
  const [handleStatus, setHandleStatus] = useState<HandleAvailability | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (data) setForm(toForm(data));
  }, [data]);

  const originalHandle = data?.public_handle ?? null;

  useEffect(() => {
    const h = form.public_handle.trim().toLowerCase();
    if (!h) {
      setHandleStatus(null);
      return;
    }
    if (h === originalHandle) {
      setHandleStatus({ available: true });
      return;
    }
    setChecking(true);
    const t = setTimeout(async () => {
      try {
        const res = await checkHandle({ data: { handle: h } });
        setHandleStatus(res);
      } catch {
        setHandleStatus({ available: false, reason: "invalid_format" });
      } finally {
        setChecking(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [form.public_handle, originalHandle, checkHandle]);

  const mutation = useMutation({
    mutationFn: async (payload: FormState) => {
      return saveProfile({
        data: {
          public_handle: payload.public_handle.trim().toLowerCase() || null,
          is_public: payload.is_public,
          public_bio: payload.public_bio || null,
        },
      });
    },
    onSuccess: (result) => {
      queryClient.setQueryData(["traveler", "public-profile", user?.id], result);
      setForm(toForm(result));
    },
  });

  // Completitud: 100% requerido para publicar
  const completion = useMemo(() => {
    const p = personal;
    const t = travel;
    const checks: boolean[] = [
      Boolean(p?.first_name || p?.display_name),
      Boolean(p?.phone),
      Boolean(p?.country),
      Boolean(p?.preferred_language),
      Boolean(p?.avatar_url),
      Boolean(t?.travel_style),
      Boolean(t?.budget_range),
      (t?.interests?.length ?? 0) > 0,
      (t?.preferred_destinations?.length ?? 0) > 0,
      Boolean(t?.trip_context?.travel_window),
    ];
    const done = checks.filter(Boolean).length;
    return { done, total: checks.length, complete: done === checks.length };
  }, [personal, travel]);

  const canPublish = useMemo(() => {
    if (!completion.complete) return false;
    if (!form.public_handle.trim()) return false;
    if (handleStatus && !handleStatus.available) return false;
    return true;
  }, [completion.complete, form.public_handle, handleStatus]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  const handleFeedback = renderHandleFeedback(form.public_handle, handleStatus, checking, originalHandle);
  const publicPreview = {
    name:
      [personal?.first_name, personal?.last_name].filter(Boolean).join(" ").trim() ||
      personal?.display_name ||
      "—",
    country: personal?.country || "—",
    language: personal?.preferred_language || "—",
    avatar: data?.avatar_url || personal?.avatar_url || null,
  };

  return (
    <div className="max-w-3xl">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
        Cuenta del viajero
      </p>
      <h1 className="mt-2 text-4xl">Perfil público</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Tu perfil público es <strong>opcional</strong>. Complétalo cuando
        quieras compartir tu URL <code>/viajero/tu-handle</code> con otros
        viajeros o en redes sociales.
      </p>

      {/* Ventajas de activar el perfil público */}
      <section className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
          ¿Por qué completarlo?
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          <li className="flex items-start gap-2 text-sm">
            <Star className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span>Tus reseñas se muestran con nombre, foto y país — dan más confianza.</span>
          </li>
          <li className="flex items-start gap-2 text-sm">
            <Users className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span>Otros viajeros pueden descubrirte y aprender de tus rutas.</span>
          </li>
          <li className="flex items-start gap-2 text-sm">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span>Alux personaliza mejor sus recomendaciones para tu viaje.</span>
          </li>
          <li className="flex items-start gap-2 text-sm">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span>Accedes a promociones y experiencias reservadas a perfiles verificados.</span>
          </li>
        </ul>
      </section>

      {!completion.complete ? (
        <div className="mt-6">
          <ProfileCompletionMeter personal={personal} travel={travel} />
          <p className="mt-3 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
            <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              Para completar tu perfil público necesitas completar tu perfil personal al 100%.
              Con eso mostramos tu nombre, foto, país e idioma sin volver a
              pedírtelos aquí.
            </span>
          </p>
        </div>
      ) : null}

      <form
        className="mt-8 grid gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate(form);
        }}
      >
        {/* Vista previa de datos tomados de "Mi Perfil" */}
        <section className="rounded-2xl border border-border bg-muted/30 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Así te verán (datos de tu perfil)
            </p>
            <Link
              to="/cuenta/perfil"
              className="text-xs font-medium text-primary hover:underline"
            >
              Editar en Mi Perfil →
            </Link>
          </div>
          <div className="mt-3 flex items-center gap-4">
            {publicPreview.avatar ? (
              <img
                src={publicPreview.avatar}
                alt=""
                className="h-16 w-16 rounded-full border border-border object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-border bg-background text-[10px] text-muted-foreground">
                sin foto
              </div>
            )}
            <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Nombre</dt>
              <dd className="font-medium">{publicPreview.name}</dd>
              <dt className="text-muted-foreground">País</dt>
              <dd>{publicPreview.country}</dd>
              <dt className="text-muted-foreground">Idioma</dt>
              <dd>{publicPreview.language}</dd>
            </dl>
          </div>
        </section>

        {/* Handle */}
        <label className="grid gap-1 text-sm">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Handle público
          </span>
          <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3">
            <span className="text-sm text-muted-foreground">/viajero/</span>
            <input
              type="text"
              value={form.public_handle}
              onChange={(e) =>
                setForm({ ...form, public_handle: e.target.value.replace(/\s+/g, "") })
              }
              placeholder="tu_handle"
              maxLength={24}
              className="flex-1 bg-transparent py-2 outline-none"
              autoComplete="off"
            />
          </div>
          <span className="text-xs text-muted-foreground">
            3–24 caracteres. Solo letras, números y guion bajo. Este es el nombre único que aparecerá en tu URL pública y podrás compartir en redes sociales.
          </span>
          {handleFeedback}
        </label>

        {/* Bio */}
        <label className="grid gap-1 text-sm">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Bio corta ({form.public_bio.length}/200)
          </span>
          <textarea
            value={form.public_bio}
            onChange={(e) => setForm({ ...form, public_bio: e.target.value.slice(0, 200) })}
            rows={3}
            maxLength={200}
            className="rounded-md border border-border bg-background px-3 py-2"
            placeholder="Amante de cenotes, tacos y arte colonial."
          />
          <span className="text-xs text-muted-foreground">
            Aparece junto a tus reseñas y en tu perfil público. Cuéntale a otros viajeros qué te apasiona del Oriente Maya.
          </span>
        </label>

        {/* Toggle visibilidad */}
        <label className="flex items-start gap-3 rounded-md border border-border bg-card p-4">
          <input
            type="checkbox"
            checked={form.is_public}
            disabled={!canPublish}
            onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
            className="mt-1"
          />
          <span className="grid gap-1 text-sm">
            <span className="font-medium text-foreground">
              Completar tu perfil público
            </span>
            <span className="text-xs text-muted-foreground">
              {completion.complete
                ? "Cuando lo completas, cualquier persona con tu URL podrá ver tu nombre, foto, país e idiomas. Puedes desactivarlo en cualquier momento."
                : `Disponible cuando tu perfil esté al 100% (${completion.done}/${completion.total} listo).`}
            </span>
          </span>
        </label>

        {mutation.error ? (
          <p className="text-sm text-destructive">
            {mapError((mutation.error as Error).message)}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={mutation.isPending || (form.is_public && !canPublish)}
            className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {mutation.isPending ? "Guardando…" : "Guardar cambios"}
          </button>
          {data?.is_public && data.public_handle ? (
            <Link
              to="/viajero/$handle"
              params={{ handle: data.public_handle }}
              target="_blank"
              className="rounded-md border border-border px-5 py-2 text-sm font-medium hover:bg-accent"
            >
              Ver mi perfil público →
            </Link>
          ) : null}
        </div>
      </form>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  maxLength,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        type="text"
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border bg-background px-3 py-2"
      />
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

function renderHandleFeedback(
  handle: string,
  status: HandleAvailability | null,
  checking: boolean,
  originalHandle: string | null,
) {
  const h = handle.trim();
  if (!h) return null;
  if (checking) {
    return <span className="text-xs text-muted-foreground">Verificando…</span>;
  }
  if (h.toLowerCase() === originalHandle) {
    return <span className="text-xs text-muted-foreground">Este es tu handle actual.</span>;
  }
  if (!status) return null;
  if (status.available) {
    return <span className="text-xs text-emerald-600">✓ Disponible</span>;
  }
  return <span className="text-xs text-destructive">{reasonLabel(status.reason)}</span>;
}

function reasonLabel(reason?: HandleAvailability["reason"]): string {
  switch (reason) {
    case "taken":
      return "Ya está en uso.";
    case "reserved":
      return "Ese handle está reservado.";
    case "invalid_format":
      return "Sólo letras minúsculas, números y guion bajo.";
    case "invalid_length":
      return "Entre 3 y 24 caracteres.";
    default:
      return "No disponible.";
  }
}

function mapError(msg: string): string {
  if (msg.includes("handle_required_to_publish"))
    return "Necesitas elegir un handle antes de completar tu perfil público.";
  if (msg.includes("profile_incomplete"))
    return "Debes completar tu perfil al 100% antes de completar tu perfil público.";
  if (msg.includes("handle_taken")) return "Ese handle ya está en uso.";
  if (msg.includes("reserved_handle")) return "Ese handle está reservado.";
  if (msg.includes("invalid_handle"))
    return "El handle no cumple el formato requerido.";
  return msg;
}