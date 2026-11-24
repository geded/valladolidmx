import { createFileRoute } from "@tanstack/react-router";

// Las librerías de correo se cargan sólo cuando llega un aviso.
export const Route = createFileRoute("/lovable/email/events")({
  server: {
    handlers: {
      POST: async (ctx) => {
        const { routeOptions } = await import("@/lib/email/routes/events.server");
        return routeOptions.server.handlers.POST(ctx as never);
      },
    },
  },
});
