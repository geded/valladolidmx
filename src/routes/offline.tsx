import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";

export const Route = createFileRoute("/offline")({
  head: () =>
    buildPublicHead({
      title: `Sin conexión — ${SITE.name}`,
      description:
        "Estás sin conexión. Cuando vuelvas a estar en línea, el contenido se actualizará automáticamente.",
      path: "/offline",
      ogType: "website",
      noindex: true,
    }),
  component: OfflinePage,
});

function OfflinePage() {
  // Autorreparación: si el navegador SÍ tiene red, esta pantalla es un falso
  // positivo servido por un Service Worker antiguo. Se limpian cachés, se
  // desregistra el SW y se vuelve a cargar contra la red una sola vez.
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.top !== window.self) return;
    // Reintento acotado en el tiempo: antes bastaba un intento fallido para
    // dejar al visitante atrapado en esta pantalla durante toda la sesión.
    const now = Date.now();
    let last = 0;
    try {
      last = Number(window.sessionStorage.getItem("vmx.offline.recovered.at") ?? "0");
    } catch {
      /* noop */
    }
    const recover = () => {
      setRecovering(true);
      void (async () => {
        try {
          window.sessionStorage.setItem("vmx.offline.recovered.at", String(Date.now()));
        } catch {
          /* noop */
        }
        try {
          if ("caches" in window) {
            const names = await caches.keys();
            await Promise.all(names.map((n) => caches.delete(n)));
          }
          if ("serviceWorker" in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map((r) => r.unregister()));
          }
        } catch {
          /* noop */
        }
        window.location.replace("/");
      })();
    };

    // Vuelve a intentar si pasó más de un minuto desde el último intento.
    if (navigator.onLine && now - last > 60_000) recover();

    const onOnline = () => recover();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  if (recovering) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <p className="text-sm text-muted-foreground">Recuperando conexión…</p>
      </div>
    );
  }

  return (
    <PublicShell>
      <section className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
          Modo sin conexión
        </p>
        <h1 className="mt-2 text-3xl md:text-4xl">Estás sin conexión</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          No pudimos alcanzar la red. Puedes seguir navegando el contenido que ya hayas visitado;
          puede estar desactualizado hasta que recuperes conexión.
        </p>
        <div
          role="status"
          aria-live="polite"
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs text-muted-foreground"
        >
          Contenido posiblemente desactualizado · se actualizará al reconectar.
        </div>
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") window.location.reload();
          }}
          className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-95"
        >
          Reintentar
        </button>
      </section>
    </PublicShell>
  );
}
