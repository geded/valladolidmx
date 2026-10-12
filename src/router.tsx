import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { routeTree } from "./routeTree.gen";

function DefaultErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  // El visitante nunca ve el mensaje técnico: se registra para diagnóstico y
  // se ofrece un reintento inmediato, porque la mayoría de estos fallos son
  // lecturas momentáneas que se resuelven al repetir la petición.
  console.error(error);
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
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: DefaultErrorComponent,
  });

  setupRouterSsrQueryIntegration({ router, queryClient });
  return router;
};
