/**
 * LinkGoogleCard — Permite al viajero vincular su cuenta actual con Google
 * (o mostrar que ya está vinculada). Usa `supabase.auth.linkIdentity` que
 * mantiene el mismo `user_id` y añade el proveedor `google` al usuario.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function LinkGoogleCard() {
  const [linked, setLinked] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (cancelled) return;
      const identities = userData.user?.identities ?? [];
      const providers = new Set<string>([
        ...identities.map((i) => i.provider),
        ...(((userData.user?.app_metadata as { providers?: string[] } | undefined)?.providers) ?? []),
      ]);
      setLinked(providers.has("google"));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function link() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: { redirectTo: window.location.origin + "/cuenta" },
      });
      if (error) throw error;
    } catch (e) {
      toast.error((e as Error).message || "No se pudo iniciar la vinculación");
      setBusy(false);
    }
  }

  if (linked === null || linked) return null;

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <GoogleG className="mt-0.5 size-6 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold">Cuenta de Google</h2>
          {linked ? (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <CheckCircle2 className="size-4 text-primary" aria-hidden />
              Tu cuenta ya está vinculada. Puedes iniciar sesión con Google.
            </p>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted-foreground">
                Vincula tu cuenta con Google para iniciar sesión con un clic y
                autocompletar tu foto y nombre.
              </p>
              <button
                type="button"
                onClick={link}
                disabled={busy}
                className="mt-3 inline-flex items-center gap-2 rounded-pill border border-border bg-background px-4 py-2 text-sm font-medium shadow-soft hover:bg-accent disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <GoogleG className="size-4" />
                )}
                Vincular con Google
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function GoogleG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}