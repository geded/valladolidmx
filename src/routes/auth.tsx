import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, LockKeyhole, Mail, UserRound } from "lucide-react";
import { PublicShell } from "@/components/discovery";
import { Button } from "@/components/ui/button";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { resolveRoleHome } from "@/types/auth";
import { useTranslation } from "@/i18n/context";
import { useNavigationSession } from "@/lib/navigation";
import {
  consumeAuthReturnPath,
  describeJourneyStep,
  readAuthReturnPath,
  readJourneyPrefix,
  readPreviousRoute,
  rememberAuthReturnPath,
  type JourneyStep,
} from "@/lib/navigation/session-context";

type Mode = "signin" | "signup" | "forgot";

export const Route = createFileRoute("/auth")({
  head: () =>
    buildPublicHead({
      title: `Acceso · ${SITE.name}`,
      description: "Inicia sesión o crea tu cuenta en Valladolid.mx.",
      path: "/auth",
      noindex: true,
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
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleMode, setGoogleMode] = useState<"popup" | "redirect">("popup");
  const [welcomeName, setWelcomeName] = useState<string | null>(null);
  const [returnTarget, setReturnTarget] = useState<string | null>(null);
  const [journey, setJourney] = useState<JourneyStep[]>([]);
  const session = useNavigationSession();

  useEffect(() => {
    // El retorno explícito tiene prioridad. El rastro público cubre cualquier
    // otro llamado existente a /auth sin exigir lógica duplicada por enlace.
    const trail = readJourneyPrefix("/auth");
    const target = readAuthReturnPath() ?? readPreviousRoute() ?? trail.at(-1)?.path ?? null;
    if (target) rememberAuthReturnPath(target);
    setReturnTarget(target);
    setJourney(trail);
  }, []);

  useEffect(() => {
    if (!loading && user) {
      // Session hydrated — close the "Conectando con Google…" modal if it was open.
      setGoogleBusy(false);
      // Preserve "next" across sign-in / OAuth round-trip.
      const target = consumeAuthReturnPath() ?? resolveRoleHome(roles);
      // Splash "¡Bienvenido, {nombre}!" antes de saltar al destino.
      const meta = (user.user_metadata ?? {}) as {
        full_name?: string;
        name?: string;
        given_name?: string;
      };
      const first =
        (meta.given_name ?? meta.full_name ?? meta.name ?? user.email ?? "")
          .toString()
          .trim()
          .split(/\s+/)[0] || null;
      setWelcomeName(first);
      const timer = window.setTimeout(() => {
        void navigate({ to: target });
      }, 1200);
      return () => window.clearTimeout(timer);
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
    setGoogleMode("popup");
    setGoogleBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        // Return to /auth so the post-login effect picks up the stored "next".
        redirect_uri: `${window.location.origin}/auth`,
        extraParams: {
          // Muestra siempre el selector de cuentas: útil en dispositivos
          // compartidos o con múltiples cuentas de Google.
          prompt: "select_account",
        },
      });
      if (result.error) {
        setError(result.error.message ?? t("auth.google_error"));
        setGoogleBusy(false);
        return;
      }
      if (result.redirected) {
        // El navegador está redirigiendo a Google (full-page).
        setGoogleMode("redirect");
      }
      // If result.redirected → the browser is navigating to Google; leave modal visible.
      // If tokens were returned (popup path) → the auth effect closes the modal and redirects.
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.google_error"));
      setGoogleBusy(false);
    }
  }

  const titles: Record<Mode, string> = {
    signin: t("auth.signin"),
    signup: t("auth.signup"),
    forgot: t("auth.forgot"),
  };

  const returnLabel =
    (returnTarget ? describeJourneyStep(returnTarget)?.label : null) ?? "la página anterior";
  const crumbs = [
    { label: "Oriente Maya", to: "/oriente-maya" },
    ...(session?.destination
      ? [
          {
            label: session.destination.label,
            to: "/oriente-maya/$destino",
            params: { destino: session.destination.slug },
          },
        ]
      : []),
    // Recorrido real del explorador (Arma tu Viaje, Alux, Mapa…) antes del acceso.
    ...journey.map((step) => ({ label: step.label, to: step.path })),
    { label: t("auth.eyebrow") },
  ];

  return (
    <PublicShell crumbs={crumbs} compactCrumbsOnMobile className="pb-16 md:pb-24">
      <div className="mx-auto grid max-w-5xl items-start gap-10 pt-6 md:grid-cols-[minmax(0,0.9fr)_minmax(380px,1fr)] md:gap-16 md:pt-10 lg:gap-24">
        <header className="min-w-0 md:sticky md:top-28 md:pt-7">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            {t("auth.eyebrow")}
          </p>
          <h1 className="mt-3 max-w-xl font-serif text-4xl leading-tight text-foreground sm:text-5xl">
            {titles[mode]}
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-muted-foreground">
            {t("auth.subtitle")}
          </p>
          <div className="mt-8 hidden border-t border-border pt-6 text-sm leading-6 text-muted-foreground md:block">
            <p>Tu viaje continúa donde lo dejaste.</p>
            <p>Tu información permanece bajo tu control.</p>
          </div>
        </header>

        <section
          aria-label={titles[mode]}
          className="min-w-0 rounded-lg border border-border bg-card p-5 shadow-raised sm:p-8"
        >
          {returnTarget ? (
            <Button
              asChild
              variant="ghost"
              className="-ml-3 mb-5 justify-start px-3 text-muted-foreground"
            >
              <Link to={returnTarget}>
                <ArrowLeft aria-hidden />
                Volver a {returnLabel}
              </Link>
            </Button>
          ) : null}

          {mode !== "forgot" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogle}
                className="h-12 w-full rounded-lg bg-card text-base shadow-none hover:bg-muted hover:text-foreground"
              >
                <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.12A6.6 6.6 0 0 1 5.5 12c0-.74.13-1.46.34-2.12V7.04H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.96l3.66-2.84z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.46 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
                  />
                </svg>
                {t("auth.google")}
              </Button>
              <div className="relative my-7 text-center text-xs text-muted-foreground">
                <span className="relative z-10 bg-card px-3">{t("auth.or_email")}</span>
                <span className="absolute inset-x-0 top-1/2 h-px bg-border" aria-hidden />
              </div>
            </>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "signup" ? (
              <div>
                <label className="text-sm font-medium text-foreground" htmlFor="name">
                  {t("auth.name")}
                </label>
                <div className="relative mt-2">
                  <UserRound
                    className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-12 w-full rounded-lg border border-input bg-background pl-11 pr-4 text-base outline-none transition-shadow focus-visible:ring-focus"
                  />
                </div>
              </div>
            ) : null}

            <div>
              <label className="text-sm font-medium text-foreground" htmlFor="email">
                {t("auth.email")}
              </label>
              <div className="relative mt-2">
                <Mail
                  className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 w-full rounded-lg border border-input bg-background pl-11 pr-4 text-base outline-none transition-shadow focus-visible:ring-focus"
                />
              </div>
            </div>

            {mode !== "forgot" ? (
              <div>
                <label className="text-sm font-medium text-foreground" htmlFor="password">
                  {t("auth.password")}
                </label>
                <div className="relative mt-2">
                  <LockKeyhole
                    className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <input
                    id="password"
                    type="password"
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 w-full rounded-lg border border-input bg-background pl-11 pr-4 text-base outline-none transition-shadow focus-visible:ring-focus"
                  />
                </div>
              </div>
            ) : null}

            {error ? (
              <p
                role="alert"
                className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {error}
              </p>
            ) : null}
            {info ? (
              <p role="status" className="rounded-lg bg-success/10 px-4 py-3 text-sm text-success">
                {info}
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={busy}
              className="h-12 w-full rounded-lg bg-foreground text-base font-medium text-background shadow-none hover:bg-foreground/90"
            >
              {busy
                ? t("auth.processing")
                : mode === "signin"
                  ? t("auth.enter")
                  : mode === "signup"
                    ? t("auth.create")
                    : t("auth.send_link")}
            </Button>
          </form>

          <div className="mt-6 grid gap-2 border-t border-border pt-5 text-sm sm:grid-cols-2 sm:items-center">
            {mode === "signin" ? (
              <>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto justify-start p-0 text-muted-foreground"
                  onClick={() => setMode("forgot")}
                >
                  {t("auth.forgot_q")}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto justify-start p-0 text-foreground sm:justify-end"
                  onClick={() => setMode("signup")}
                >
                  {t("auth.create_account")}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="link"
                className="h-auto justify-start p-0 text-foreground"
                onClick={() => setMode("signin")}
              >
                {t("auth.back_to_signin")}
              </Button>
            )}
          </div>
          <p className="mt-6 border-t border-border pt-5 text-xs leading-5 text-muted-foreground md:hidden">
            Tu viaje continúa donde lo dejaste y tu información permanece bajo tu control.
          </p>
        </section>
      </div>

      {googleBusy ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="mx-4 max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-elevated">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
              <svg viewBox="0 0 24 24" className="size-6 animate-spin text-primary" aria-hidden>
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  strokeWidth="3"
                  stroke="currentColor"
                  strokeOpacity=".2"
                  fill="none"
                />
                <path
                  d="M22 12a10 10 0 0 0-10-10"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <h2 className="mt-4 text-base font-semibold">
              {googleMode === "redirect" ? "Te llevamos a Google…" : "Conectando con Google…"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {googleMode === "redirect"
                ? "Te llevamos a Google para verificar tu cuenta. Volverás automáticamente cuando termines."
                : "Se abrirá una ventana segura de Google para verificar tu cuenta. Si tu navegador la bloquea, te redirigiremos automáticamente."}
            </p>
            <button
              type="button"
              onClick={() => setGoogleBusy(false)}
              className="mt-5 text-xs font-medium text-muted-foreground underline"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      {welcomeName ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="mx-4 max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-elevated">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-2xl">
              👋
            </div>
            <h2 className="mt-4 font-serif text-2xl">¡Bienvenido, {welcomeName}!</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Preparando tu viaje por el Oriente Maya…
            </p>
          </div>
        </div>
      ) : null}
    </PublicShell>
  );
}
