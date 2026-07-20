/**
 * Playground interno — OLA H-01 · Épica 1 · I2.
 *
 * NO afecta navegación pública, SEO ni experiencia del usuario final.
 * - Ruta bajo `/lovable/*` (namespace interno).
 * - `noindex, nofollow`.
 * - Sin migrar consumidores reales.
 */
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "@/lib/toast";
import {
  useProtectedAction,
  subscribeProtectedActionEvents,
  PendingActionRegistry,
  type ProtectedActionEvent,
  type ProtectedActionEventMeta,
} from "@/lib/protected-actions";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/lovable/protected-actions-preview")({
  head: () => ({
    meta: [
      { title: "Protected Actions · Playground" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: PlaygroundPage,
});

interface LogRow {
  ts: number;
  event: ProtectedActionEvent;
  meta: ProtectedActionEventMeta;
}

function PlaygroundPage() {
  const { user, signOut } = useAuth();
  const [log, setLog] = useState<LogRow[]>([]);
  const [ttlShort, setTtlShort] = useState(false);

  useEffect(() => {
    return subscribeProtectedActionEvents((event, meta) => {
      setLog((l) => [{ ts: Date.now(), event, meta }, ...l].slice(0, 50));
    });
  }, []);

  const fakeAction = useProtectedAction<{ label: string }, { ok: true }>({
    kind: "playground.fake_action",
    reason: "playground",
    gateCopy: {
      title: "Necesitas iniciar sesión",
      description: "para completar la acción de prueba",
    },
    ttlMs: ttlShort ? 5_000 : undefined,
    action: async ({ label }) => {
      await new Promise((r) => setTimeout(r, 400));
      toast.success(`Acción ejecutada: ${label}`);
      return { ok: true };
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Error"),
  });

  const failingAction = useProtectedAction<void, void>({
    kind: "playground.failing_action",
    action: async () => {
      throw new Error("Fallo controlado post-login");
    },
  });

  async function signOutAndClear() {
    await supabase.auth.signOut();
    void signOut();
    setLog([]);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          OLA H-01 · Épica 1 · I2
        </p>
        <h1 className="text-2xl font-semibold">Protected Actions — Playground</h1>
        <p className="text-sm text-muted-foreground">
          Ruta interna (`noindex`). No expone consumidores reales de producción.
          Sesión actual:{" "}
          <span className="font-mono">
            {user ? `authenticated (${user.id.slice(0, 8)}…)` : "guest"}
          </span>
        </p>
      </header>

      <section className="grid gap-3 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Escenarios</h2>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
            onClick={() => fakeAction.run({ label: "hola mundo" })}
            disabled={fakeAction.pending}
          >
            Ejecutar acción protegida
          </button>
          <button
            className="rounded-lg border border-border px-3 py-2 text-sm"
            onClick={() => {
              fakeAction.run({ label: "click 1" });
              fakeAction.run({ label: "click 2" });
              fakeAction.run({ label: "click 3" });
            }}
          >
            Simular doble/triple clic
          </button>
          <button
            className="rounded-lg border border-border px-3 py-2 text-sm"
            onClick={() => failingAction.run()}
          >
            Acción que falla tras login
          </button>
          <button
            className="rounded-lg border border-border px-3 py-2 text-sm"
            onClick={() => PendingActionRegistry.clear("playground.manual")}
          >
            Limpiar registry
          </button>
          {user ? (
            <button
              className="rounded-lg border border-destructive/40 px-3 py-2 text-sm text-destructive"
              onClick={() => void signOutAndClear()}
            >
              Cerrar sesión
            </button>
          ) : null}
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={ttlShort}
            onChange={(e) => setTtlShort(e.target.checked)}
          />
          TTL corto (5 s) para probar expiración
        </label>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold">Estado del registry</h2>
        <pre className="max-h-40 overflow-auto rounded-lg bg-muted/40 p-3 text-xs">
{JSON.stringify(PendingActionRegistry.peek(), null, 2)}
        </pre>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold">Log de eventos (sin PII)</h2>
        <div className="max-h-72 overflow-auto rounded-lg bg-muted/40 p-3 text-xs font-mono">
          {log.length === 0 ? (
            <p className="text-muted-foreground">Sin eventos todavía.</p>
          ) : (
            log.map((row, i) => (
              <div key={i}>
                <span className="text-muted-foreground">
                  {new Date(row.ts).toLocaleTimeString()}{" "}
                </span>
                <span>{row.event}</span>{" "}
                <span className="text-muted-foreground">
                  {JSON.stringify(row.meta)}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
