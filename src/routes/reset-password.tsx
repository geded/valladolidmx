import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { supabase } from "@/integrations/supabase/client";
import { SITE } from "@/config/site";

export const Route = createFileRoute("/reset-password")({
  head: () =>
    buildPublicHead({
      title: `Restablecer contraseña · ${SITE.name}`,
      description: "Define una nueva contraseña para tu cuenta.",
      path: "/reset-password",
      noindex: true,
    }),
  component: ResetPasswordRoute,
});

function ResetPasswordRoute() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // El enlace de Supabase abre la app con type=recovery en el hash y dispara PASSWORD_RECOVERY.
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    void supabase.auth.getSession().then(({ data: s }) => {
      if (s.session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Mínimo 8 caracteres.");
    if (password !== confirm) return setError("Las contraseñas no coinciden.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(error.message);
    await supabase.auth.signOut();
    void navigate({ to: "/auth" });
  }

  return (
    <PublicShell
      eyebrow="Cuenta"
      title="Restablecer contraseña"
      description="Elige una contraseña nueva para continuar."
      crumbs={[{ label: "Restablecer contraseña" }]}
    >
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6 sm:p-8">
        {!ready ? (
          <p className="text-sm text-muted-foreground">
            Abre el enlace de tu correo para continuar.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium" htmlFor="password">Nueva contraseña</label>
              <input
                id="password"
                type="password"
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="confirm">Confirmar contraseña</label>
              <input
                id="confirm"
                type="password"
                minLength={8}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            {error ? (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            ) : null}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-95 disabled:opacity-60"
            >
              {busy ? "Guardando…" : "Actualizar contraseña"}
            </button>
          </form>
        )}
      </div>
    </PublicShell>
  );
}