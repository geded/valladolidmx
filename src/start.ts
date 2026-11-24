import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ request, next }) => {
  const url = new URL(request.url);
  if (url.pathname.startsWith("/lovable/") || url.pathname === "/email/unsubscribe") {
    return next();
  }
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// The same request boundary runs in preview and after publishing.
const publicHtmlMiddleware = createMiddleware().server(async ({ request, next }) => {
  const { isSharedHtmlRequest, serveSharedHtml } = await import("./lib/server/public-page-cache");
  if (!isSharedHtmlRequest(request)) return next();
  return serveSharedHtml(request, async () => (await next()).response);
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware, publicHtmlMiddleware],
}));
