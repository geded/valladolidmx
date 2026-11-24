import { createFileRoute } from "@tanstack/react-router";

// Las librerías de correo se cargan sólo cuando llega un aviso.
export const Route = createFileRoute("/lovable/email/transactional/preview")({
  server: {
    handlers: {
      POST: async (ctx) => {
        const { routeOptions } = await import("@/lib/email/routes/transactional-preview.server");
        return routeOptions.server.handlers.POST(ctx as never);
      },
    },
  },
});
