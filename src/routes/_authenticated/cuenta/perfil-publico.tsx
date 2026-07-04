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
import { supabase } from "@/integrations/supabase/client";
import {
  checkHandleAvailability,
  getMyPublicProfile,
  updateMyPublicProfile,
  type HandleAvailability,
  type MyPublicProfile,
} from "@/lib/traveler/traveler-public.functions";

export const Route = createFileRoute("/_authenticated/cuenta/perfil-publico")({
  component: PerfilPublicoPage,
});

type FormState = {
  public_handle: string;
  is_public: boolean;
  public_display_name: string;
  public_bio: string;
  home_country: string;
  languages: string;
  avatar_url: string | null;
};

function toForm(p: MyPublicProfile): FormState {
  return {
    public_handle: p.public_handle ?? "",
    is_public: p.is_public,
    public_display_name: p.public_display_name ?? "",
    public_bio: p.public_bio ?? "",
    home_country: p.home_country ?? "",
    languages: p.languages.join(", "),
    avatar_url: p.avatar_url,
  };
}

function PerfilPublicoPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fetchProfile = useServerFn(getMyPublicProfile);
  const saveProfile = useServerFn(updateMyPublicProfile);
  const checkHandle = useServerFn(checkHandleAvailability);

  const { data, isLoading } = useQuery({
    queryKey: ["traveler", "public-profile", user?.id],
    queryFn: () => fetchProfile(),
    enabled: Boolean(user?.id),
    staleTime: 30_000,
  });

  const [form, setForm] = useState<FormState>({
    public_handle: "",
    is_public: false,
    public_display_name: "",
    public_bio: "",
    home_country: "",
    languages: "",
    avatar_url: null,
  });
  const [handleStatus, setHandleStatus] = useState<HandleAvailability | null>(null);
  const [checking, setChecking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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
      const langs = payload.languages
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      return saveProfile({
        data: {
          public_handle: payload.public_handle.trim().toLowerCase() || null,
          is_public: payload.is_public,
          public_display_name: payload.public_display_name || null,
          public_bio: payload.public_bio || null,
          home_country: payload.home_country || null,
          languages: langs,
          avatar_url: payload.avatar_url,
        },
      });
    },
    onSuccess: (result) => {
      queryClient.setQueryData(["traveler", "public-profile", user?.id], result);
      setForm(toForm(result));
    },
  });

  const canPublish = useMemo(() => {
    if (!form.public_handle.trim()) return false;
    if (handleStatus && !handleStatus.available) return false;
    return true;
  }, [form.public_handle, handleStatus]);

  async function handleAvatarChange(file: File) {
    if (!user?.id) return;
    setUploadError(null);
    if (!file.type.startsWith("image/")) {
      setUploadError("Sólo imágenes (jpg, png, webp).");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setUploadError("La imagen debe pesar menos de 3 MB.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const saved = await saveProfile({ data: { avatar_url: path } });
      queryClient.setQueryData(["traveler", "public-profile", user?.id], saved);
      setForm(toForm(saved));
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  const handleFeedback = renderHandleFeedback(form.public_handle, handleStatus, checking, originalHandle);

  return (
    <div className="max-w-3xl">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
        Cuenta del viajero
      </p>
      <h1 className="mt-2 text-4xl">Perfil público</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Tu perfil es <strong>privado por defecto</strong>. Actívalo cuando
        quieras compartir tu URL <code>/viajero/tu-handle</code> con otros
        viajeros o en redes sociales.
      </p>

      <form
        className="mt-8 grid gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate(form);
        }}
      >
        {/* Avatar */}
        <div className="grid gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Foto de perfil
          </span>
          <div className="flex items-center gap-4">
            {form.avatar_url ? (
              <img
                src={form.avatar_url}
                alt="Avatar actual"
                className="h-20 w-20 rounded-full border border-border object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-border bg-muted text-xs text-muted-foreground">
                sin foto
              </div>
            )}
            <label className="cursor-pointer rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">
              {uploading ? "Subiendo…" : "Cambiar foto"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleAvatarChange(f);
                }}
              />
            </label>
          </div>
          {uploadError ? (
            <p className="text-xs text-destructive">{uploadError}</p>
          ) : null}
        </div>

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
            3–24 caracteres. Solo letras, números y guion bajo.
          </span>
          {handleFeedback}
        </label>

        {/* Display name */}
        <TextField
          label="Nombre público"
          value={form.public_display_name}
          maxLength={60}
          placeholder="Ej. Mariana R."
          onChange={(v) => setForm({ ...form, public_display_name: v })}
          hint="Cómo apareces en tu perfil. Si lo dejas vacío se muestra tu handle."
        />

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
        </label>

        <TextField
          label="País de origen"
          value={form.home_country}
          maxLength={60}
          placeholder="Ej. México"
          onChange={(v) => setForm({ ...form, home_country: v })}
        />

        <TextField
          label="Idiomas (separa con comas)"
          value={form.languages}
          maxLength={80}
          placeholder="es, en, fr"
          onChange={(v) => setForm({ ...form, languages: v.toLowerCase() })}
        />

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
              Hacer mi perfil público
            </span>
            <span className="text-xs text-muted-foreground">
              Cuando está activo, cualquier persona con tu URL podrá ver tu
              nombre público, foto, país e idiomas. Puedes desactivarlo en
              cualquier momento.
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
    return "Necesitas elegir un handle antes de publicar tu perfil.";
  if (msg.includes("handle_taken")) return "Ese handle ya está en uso.";
  if (msg.includes("reserved_handle")) return "Ese handle está reservado.";
  if (msg.includes("invalid_handle"))
    return "El handle no cumple el formato requerido.";
  return msg;
}