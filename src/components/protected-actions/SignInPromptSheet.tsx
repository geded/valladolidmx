/**
 * SignInPromptSheet — host global del gate de identidad.
 * (OLA H-01 · Épica 1 · I2)
 *
 * Suscribe al `SheetController` y renderiza un `BottomSheet` (mismo
 * primitivo del Workspace) con opciones de login. Al detectar sesión
 * (`user` en `useAuth`) cierra el sheet — el `ProtectedActionResumeRunner`
 * se encarga de ejecutar la acción pendiente.
 *
 * Sin acoplamiento a Mi Viaje / Favoritos / Concierge.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  SheetController,
  type ActiveGate,
} from "@/lib/protected-actions/sheet-controller";
import { PendingActionRegistry } from "@/lib/protected-actions/registry";
import { emitProtectedActionEvent } from "@/lib/protected-actions/observability";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n/context";
import { BottomSheet } from "@/components/workspace/BottomSheet";

export function SignInPromptSheet() {
  const [gate, setGate] = useState<ActiveGate | null>(() => SheetController.current());
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => SheetController.subscribe(setGate), []);

  // Si aparece sesión mientras el sheet está abierto, cierra: el
  // ResumeRunner ejecutará la acción pendiente.
  useEffect(() => {
    if (user && gate) {
      SheetController.close();
    }
  }, [user, gate]);

  if (!gate) return null;

  return (
    <BottomSheet
      open
      onOpenChange={(open) => {
        if (open) return;
        // Cierre por overlay o botón → dismiss.
        PendingActionRegistry.cancel(gate.record.id, "dismissed");
        emitProtectedActionEvent("protected_action.dismissed", {
          actionId: gate.record.id,
          kind: gate.record.kind,
        });
        SheetController.close();
      }}
      title={gate.copy.title ?? t("protected_actions.title")}
      description={gate.copy.description ?? t("protected_actions.description")}
      snap="half"
    >
      <GateBody gate={gate} navigate={navigate} />
    </BottomSheet>
  );
}

function GateBody({
  gate,
  navigate,
}: {
  gate: ActiveGate;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<null | "email" | "google" | "magic">(null);
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);

  function handleAuthRequested(method: string) {
    emitProtectedActionEvent("protected_action.auth_requested", {
      actionId: gate.record.id,
      kind: gate.record.kind,
      reason: method,
    });
  }

  async function onEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy("email");
    handleAuthRequested("email");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // ResumeRunner + effect en el host cerrarán el sheet y ejecutarán.
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("auth.unexpected");
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  }

  async function onGoogle() {
    setError(null);
    setBusy("google");
    handleAuthRequested("google");
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw new Error(result.error.message ?? t("auth.google_error"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("auth.google_error");
      setError(msg);
      toast.error(msg);
      setBusy(null);
    }
  }

  async function onMagicLink() {
    if (!email) {
      setError(t("protected_actions.email_required"));
      return;
    }
    setError(null);
    setBusy("magic");
    handleAuthRequested("magic_link");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      setMagicSent(true);
      toast.success(t("protected_actions.magic_sent"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("auth.unexpected");
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  }

  function onGoFullAuth() {
    // Escape hatch — no cancela la acción pendiente; el ResumeRunner
    // reanudará cuando la sesión aparezca en la misma pestaña.
    void navigate({ to: "/auth" });
    SheetController.close();
  }

  function onDismiss() {
    PendingActionRegistry.cancel(gate.record.id, "dismissed");
    emitProtectedActionEvent("protected_action.dismissed", {
      actionId: gate.record.id,
      kind: gate.record.kind,
    });
    SheetController.close();
  }

  return (
    <div className="space-y-4 pb-6">
      <button
        type="button"
        onClick={onGoogle}
        disabled={busy !== null}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-accent disabled:opacity-60"
      >
        {busy === "google" ? t("auth.processing") : t("auth.google")}
      </button>

      <div className="relative text-center text-xs text-muted-foreground">
        <span className="bg-card px-2 relative z-10">{t("auth.or_email")}</span>
        <span className="absolute left-0 right-0 top-1/2 h-px bg-border" aria-hidden />
      </div>

      <form onSubmit={onEmailLogin} className="space-y-3">
        <input
          type="email"
          autoComplete="email"
          placeholder={t("auth.email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          type="password"
          autoComplete="current-password"
          placeholder={t("auth.password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={busy !== null || !email || !password}
          className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-95 disabled:opacity-60"
        >
          {busy === "email" ? t("auth.processing") : t("auth.enter")}
        </button>
      </form>

      <button
        type="button"
        onClick={onMagicLink}
        disabled={busy !== null || magicSent}
        className="w-full rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:bg-accent disabled:opacity-60"
      >
        {magicSent
          ? t("protected_actions.magic_sent")
          : busy === "magic"
          ? t("auth.processing")
          : t("protected_actions.magic_cta")}
      </button>

      {error ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      ) : null}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <button type="button" className="underline" onClick={onGoFullAuth}>
          {t("protected_actions.go_full_auth")}
        </button>
        <button type="button" className="underline" onClick={onDismiss}>
          {gate.copy.dismissCta ?? t("protected_actions.dismiss")}
        </button>
      </div>
    </div>
  );
}
