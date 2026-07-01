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
  return (
    <PublicShell>
      <section className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
          Modo sin conexión
        </p>
        <h1 className="mt-2 text-3xl md:text-4xl">Estás sin conexión</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          No pudimos alcanzar la red. Puedes seguir navegando el contenido que ya
          hayas visitado; puede estar desactualizado hasta que recuperes conexión.
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