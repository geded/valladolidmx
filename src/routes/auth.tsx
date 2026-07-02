import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageShell } from "@/components/common/PageShell";
import { SITE } from "@/config/site";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { resolveRoleHome } from "@/types/auth";
import { useTranslation } from "@/i18n/context";

type Mode = "signin" | "signup" | "forgot";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: `Acceso · ${SITE.name}` },
      { name: "description", content: "Inicia sesión o crea tu cuenta en Valladolid.mx." },
      { property: "og:title", content: `Acceso · ${SITE.name}` },
      { property: "og:description", content: "Inicia sesión o crea tu cuenta en Valladolid.mx." },
    ],
  }),
  component: AuthRoute,
});

function AuthRoute() {
  const { user, loading, roles } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      const home = resolveRoleHome(roles);
      void navigate({ to: home });
    }
  }, [loading, user, roles, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Redirección por rol gestionada por el effect cuando `roles` se hidrate.
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        setInfo(t("auth.signup_info"));
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setInfo(t("auth.reset_info"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.unexpected"));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError(result.error.message ?? t("auth.google_error"));
    }
  }

  const titles: Record<Mode, string> = {
    signin: t("auth.signin"),
    signup: t("auth.signup"),
    forgot: t("auth.forgot"),
  };

  return (
    <PageShell
      eyebrow={t("auth.eyebrow")}
      title={titles[mode]}
      description={t("auth.subtitle")}
      crumbs={[{ label: t("auth.eyebrow") }]}
    >
      <div className="mx-auto max-w-md space-y-6 rounded-2xl border border-border bg-card p-6 sm:p-8">
        {mode !== "forgot" ? (
          <>
            <button
              type="button"
              onClick={handleGoogle}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-accent"
            >
              <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.12A6.6 6.6 0 0 1 5.5 12c0-.74.13-1.46.34-2.12V7.04H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.96l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.46 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
              </svg>
              {t("auth.google")}
            </button>
            <div className="relative text-center text-xs text-muted-foreground">
              <span className="bg-card px-2 relative z-10">{t("auth.or_email")}</span>
              <span className="absolute left-0 right-0 top-1/2 h-px bg-border" aria-hidden />
            </div>
          </>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" ? (
            <div>
              <label className="text-sm font-medium" htmlFor="name">{t("auth.name")}</label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          ) : null}

          <div>
            <label className="text-sm font-medium" htmlFor="email">{t("auth.email")}</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>

          {mode !== "forgot" ? (
            <div>
              <label className="text-sm font-medium" htmlFor="password">{t("auth.password")}</label>
              <input
                id="password"
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          ) : null}

          {error ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          ) : null}
          {info ? (
            <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">{info}</p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-95 disabled:opacity-60"
          >
            {busy ? t("auth.processing") : mode === "signin" ? t("auth.enter") : mode === "signup" ? t("auth.create") : t("auth.send_link")}
          </button>
        </form>

        <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
          {mode === "signin" ? (
            <>
              <button type="button" className="underline" onClick={() => setMode("forgot")}>
                {t("auth.forgot_q")}
              </button>
              <button type="button" className="underline" onClick={() => setMode("signup")}>
                {t("auth.create_account")}
              </button>
            </>
          ) : (
            <button type="button" className="underline" onClick={() => setMode("signin")}>
              {t("auth.back_to_signin")}
            </button>
          )}
        </div>
      </div>
    </PageShell>
  );
}
