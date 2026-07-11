import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/unsubscribe")({
  ssr: false,
  component: UnsubscribePage,
  head: () => ({
    meta: [
      { title: "Cancelar suscripción · Valladolid.mx" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type State =
  | { kind: "loading" }
  | { kind: "ready"; email: string }
  | { kind: "already" }
  | { kind: "invalid" }
  | { kind: "success" }
  | { kind: "error"; message: string };

function UnsubscribePage() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [submitting, setSubmitting] = useState(false);
  const token =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("token") ?? ""
      : "";

  useEffect(() => {
    if (!token) {
      setState({ kind: "invalid" });
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `/email/unsubscribe?token=${encodeURIComponent(token)}`,
        );
        const body = await res.json().catch(() => ({}));
        if (res.ok && body?.email) {
          setState({ kind: "ready", email: body.email });
        } else if (body?.already) {
          setState({ kind: "already" });
        } else {
          setState({ kind: "invalid" });
        }
      } catch (e) {
        setState({ kind: "error", message: String(e) });
      }
    })();
  }, [token]);

  async function confirm() {
    setSubmitting(true);
    try {
      const res = await fetch("/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (res.ok) setState({ kind: "success" });
      else setState({ kind: "error", message: `HTTP ${res.status}` });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
        Valladolid.mx
      </div>
      {state.kind === "loading" && <p>Validando enlace…</p>}
      {state.kind === "invalid" && (
        <>
          <h1 className="text-2xl font-semibold">Enlace no válido</h1>
          <p className="text-muted-foreground">
            El enlace expiró o ya fue usado. Puedes gestionar tus preferencias
            desde tu cuenta.
          </p>
        </>
      )}
      {state.kind === "already" && (
        <>
          <h1 className="text-2xl font-semibold">Ya estás dado de baja</h1>
          <p className="text-muted-foreground">
            No recibirás más correos de esta lista.
          </p>
        </>
      )}
      {state.kind === "ready" && (
        <>
          <h1 className="text-2xl font-semibold">
            ¿Cancelar los correos a {state.email}?
          </h1>
          <p className="text-muted-foreground">
            Dejarás de recibir notificaciones de esta lista.
          </p>
          <Button onClick={confirm} disabled={submitting} size="lg">
            {submitting ? "Cancelando…" : "Sí, cancelar suscripción"}
          </Button>
        </>
      )}
      {state.kind === "success" && (
        <>
          <h1 className="text-2xl font-semibold">Suscripción cancelada</h1>
          <p className="text-muted-foreground">
            Listo. Puedes cerrar esta ventana.
          </p>
        </>
      )}
      {state.kind === "error" && (
        <>
          <h1 className="text-2xl font-semibold">Ocurrió un error</h1>
          <p className="text-muted-foreground">{state.message}</p>
        </>
      )}
    </main>
  );
}