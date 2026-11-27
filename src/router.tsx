import { QueryClient } from "@tanstack/react-query";
import { createRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { routeTree } from "./routeTree.gen";
import { PageSkeleton } from "@/components/common/PageSkeleton";

function DefaultErrorComponent({ error, reset }: ErrorComponentProps) {
  // El visitante nunca ve el mensaje técnico: se registra para diagnóstico y
  // se ofrece un reintento inmediato, porque la mayoría de estos fallos son
  // lecturas momentáneas que se resuelven al repetir la petición.
  console.error(error);
  // Tras publicar, una pestaña o app instalada abierta puede pedir piezas de
  // la versión anterior que ya no existen: se recarga una sola vez.
  if (typeof window !== "undefined" && /dynamically imported module|Importing a module script failed|Failed to fetch|Load failed|error loading dynamically/i.test(String((error as Error)?.message ?? error))) {
    const key = "vmx.error-reload-at";
    const last = Number(window.sessionStorage.getItem(key) ?? 0);
    if (Date.now() - last > 60_000) {
      window.sessionStorage.setItem(key, String(Date.now()));
      window.location.reload();
    }
  }
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-background p-8">
      <div className="max-w-md text-center">
        <h2 className="font-serif text-2xl text-foreground">No pudimos mostrar esta sección</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La conexión falló por un momento. Vuelve a intentarlo; tu recorrido se conserva.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 inline-flex h-11 items-center justify-center rounded-pill bg-primary px-6 text-sm font-medium text-primary-foreground shadow-soft ring-focus transition hover:opacity-90"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Evita que cada lista hidratada desde SSR se vuelva a pedir al
        // instante (causa del segundo pintado en las superficies públicas).
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Al tocar o señalar un enlace se adelanta la siguiente página; lo
    // adelantado sirve 30 s para que el clic no la vuelva a pedir.
    defaultPreload: "intent",
    defaultPreloadStaleTime: 30_000,
    defaultErrorComponent: DefaultErrorComponent,
    // Si la siguiente página tarda, se muestra su esqueleto en vez de blanco.
    defaultPendingComponent: PageSkeleton,
    defaultPendingMs: 300,
    defaultPendingMinMs: 300,
  });

  setupRouterSsrQueryIntegration({ router, queryClient });
  return router;
};
