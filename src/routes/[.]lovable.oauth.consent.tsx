import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";

// Tipos locales para el namespace beta supabase.auth.oauth.
type OAuthAuthorizationDetails = {
  client?: { name?: string; client_uri?: string | null } | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
  scope?: string | null;
};

type OAuthNamespace = {
  getAuthorizationDetails: (
    id: string,
  ) => Promise<{ data: OAuthAuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (
    id: string,
  ) => Promise<{ data: { redirect_url?: string | null; redirect_to?: string | null } | null; error: { message: string } | null }>;
  denyAuthorization: (
    id: string,
  ) => Promise<{ data: { redirect_url?: string | null; redirect_to?: string | null } | null; error: { message: string } | null }>;
};

function oauth(): OAuthNamespace {
  return (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  head: () =>
    buildPublicHead({
      title: "Autorizar aplicación · Valladolid.mx",
      description: "Autoriza el acceso de una aplicación externa a tu cuenta de Valladolid.mx.",
      path: "/.lovable/oauth/consent",
      noindex: true,
    }),
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Falta authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      if (typeof window !== "undefined") {
        try {
          window.sessionStorage.setItem("vmx.auth.next", next);
        } catch {
          /* noop */
        }
      }
      throw redirect({ to: "/auth" });
    }
  },
  loader: async ({ location }) => {
    const params = new URLSearchParams(location.search);
    const authorizationId = params.get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) {
      if (typeof window !== "undefined") window.location.href = immediate;
      throw redirect({ href: immediate });
    }
    return data;
  },
  component: ConsentPage,
  errorComponent: ({ error }) => (
    <PublicShell>
      <main className="mx-auto max-w-lg px-6 py-16">
        <h1 className="text-2xl font-serif mb-3">No pudimos cargar la solicitud</h1>
        <p className="text-muted-foreground text-sm">
          {(error as Error)?.message ?? String(error)}
        </p>
      </main>
    </PublicShell>
  ),
});

function ConsentPage() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("El servidor de autorización no devolvió un redirect.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "una aplicación";

  return (
    <PublicShell>
      <main className="mx-auto max-w-lg px-6 py-16">
        <h1 className="text-3xl font-serif mb-4">
          Conectar {clientName} a tu cuenta de Valladolid.mx
        </h1>
        <p className="text-base text-foreground mb-6">
          Si aceptas, <strong>{clientName}</strong> podrá actuar como tú dentro del
          servidor turístico oficial de Valladolid y el Oriente Maya de Yucatán.
          En concreto, esta aplicación podrá:
        </p>
        <ul className="mb-6 space-y-2 text-sm text-foreground">
          <li className="flex gap-2"><span aria-hidden>•</span><span><strong>Consultar tu perfil de viajero</strong> (nombre, preferencias, idioma).</span></li>
          <li className="flex gap-2"><span aria-hidden>•</span><span><strong>Consultar tus planes de viaje</strong> (Mi Viaje) para ayudarte a organizarlos.</span></li>
          <li className="flex gap-2"><span aria-hidden>•</span><span><strong>Buscar información turística pública</strong> del catálogo de Valladolid.mx (destinos, negocios, experiencias, eventos).</span></li>
        </ul>
        <p className="text-sm text-muted-foreground mb-2">
          En esta versión <em>no</em> puede reservar, pagar, modificar tus planes ni
          contactar empresas en tu nombre. Todo acceso queda registrado en auditoría
          y respeta tus permisos.
        </p>
        <p className="text-xs text-muted-foreground mb-8">
          No se comparte tu contraseña. Puedes revocar el acceso cuando quieras desde
          tu cuenta. Servidor oficial:{" "}
          <code className="text-xs">https://quehacerenvalladolid.com/mcp</code>.
        </p>
        {error ? (
          <div role="alert" className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        <div className="flex gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => decide(true)}
            className="inline-flex items-center rounded-pill bg-primary px-5 py-2.5 text-primary-foreground shadow-soft hover:opacity-95 disabled:opacity-60"
          >
            {busy ? "Autorizando…" : "Autorizar"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => decide(false)}
            className="inline-flex items-center rounded-pill border border-border px-5 py-2.5 text-foreground hover:bg-muted disabled:opacity-60"
          >
            Cancelar
          </button>
        </div>
      </main>
    </PublicShell>
  );
}
