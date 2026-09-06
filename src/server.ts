import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

// Lote 3L · Cabeceras de seguridad mínimas y no disruptivas. Se omiten a
// propósito CSP y X-Frame-Options: la vista previa embebida y los scripts de
// terceros ya integrados (mapas, pasarela IA) requieren un inventario aparte.
const BASELINE_SECURITY_HEADERS: ReadonlyArray<readonly [string, string]> = [
  ["x-content-type-options", "nosniff"],
  ["referrer-policy", "strict-origin-when-cross-origin"],
  // Cámara: lector QR del portal (canjear). Geolocalización: Alux con
  // consentimiento explícito. Micrófono y pagos no se usan.
  ["permissions-policy", "camera=(self), geolocation=(self), microphone=(), payment=()"],
];

function withBaselineSecurityHeaders(response: Response): Response {
  const apply = (headers: Headers) => {
    for (const [name, value] of BASELINE_SECURITY_HEADERS) {
      if (!headers.has(name)) headers.set(name, value);
    }
  };
  try {
    apply(response.headers);
    return response;
  } catch {
    // Cabeceras inmutables (p. ej. respuestas reenviadas): clonar sin tocar el body.
    const copy = new Response(response.body, response);
    apply(copy.headers);
    return copy;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return withBaselineSecurityHeaders(await normalizeCatastrophicSsrResponse(response));
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: {
          "content-type": "text/html; charset=utf-8",
          ...Object.fromEntries(BASELINE_SECURITY_HEADERS),
        },
      });
    }
  },
};
