import { QueryClient, QueryClientProvider, queryOptions, useQuery } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { I18nProvider } from "@/i18n/context";
import { AuthProvider } from "@/hooks/useAuth";
import {
  PublicHeader,
  PublicFooter,
  OfflineBanner,
  SyncStatusBanner,
  UpdateBanner,
} from "@/components/discovery";
import { AluxFloatingTrigger } from "@/components/layout/AluxFloatingTrigger";
import { registerServiceWorker, checkForUpdate } from "@/pwa/register-sw";
import { startSyncRunner } from "@/pwa/sync-runner";
import { SITE } from "@/config/site";
import { getPublishedHomeComposition } from "@/lib/experience-builder/public-reads.functions";

const rootPublishedHomeQuery = queryOptions({
  queryKey: ["eb", "published-home", "default"],
  queryFn: () => getPublishedHomeComposition({ data: { variant_key: "default" } }),
  staleTime: 60_000,
});

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">404</p>
        <h1 className="mt-2 text-4xl">No encontramos esa página</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Puede que la hayamos movido o que esté llegando próximamente.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-95"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl">Algo no cargó</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Intenta de nuevo o vuelve al inicio.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95"
          >
            Reintentar
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-border bg-card px-5 py-2 text-sm font-medium text-foreground hover:bg-accent"
          >
            Inicio
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: SITE.theme_color },
      { title: `${SITE.name} — ${SITE.tagline}` },
      { name: "description", content: SITE.default_description },
      { name: "author", content: SITE.name },
      { property: "og:site_name", content: SITE.name },
      { property: "og:title", content: `${SITE.name} — ${SITE.tagline}` },
      { property: "og:description", content: SITE.default_description },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "es_MX" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: `${SITE.name} — ${SITE.tagline}` },
      { name: "twitter:description", content: SITE.default_description },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: SITE.name },
      { name: "format-detection", content: "telephone=no" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "apple-touch-icon", href: "/logo.png" },
      // Tipografía centralizada vía tokens. Cargada por <link> según Tailwind v4.
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=Tangerine:wght@400;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const headerVariant = pathname === "/" ? "overlay" : "solid";
  // Rutas con shell propio (CMS Studio, Portal Empresarial, Admin, Cuenta).
  // No deben renderizar el header/footer/Alux públicos para evitar doble chrome.
  const isAppShellRoute =
    pathname.startsWith("/cms") ||
    pathname.startsWith("/portal") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/cuenta") ||
    pathname.startsWith("/concierge") ||
    pathname.startsWith("/empresa");

  // Fase 0: limpia SWs huérfanos (PWA skill compliance). En fase futura,
  // este punto se cambia por registro real con vite-plugin-pwa.
  useEffect(() => {
    void registerServiceWorker();
    startSyncRunner();
    // Graceful Upgrade · comprobación oportunista al recuperar visibilidad.
    const onVisible = () => {
      if (document.visibilityState === "visible") void checkForUpdate();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
        >
          Saltar al contenido
        </a>
        {!isAppShellRoute ? <PublicChrome pathname={pathname} headerVariant={headerVariant} position="header" /> : null}
        {!isAppShellRoute ? <OfflineBanner /> : null}
        <SyncStatusBanner />
        <UpdateBanner />
        <Outlet />
        {!isAppShellRoute ? <PublicChrome pathname={pathname} headerVariant={headerVariant} position="footer" /> : null}
        {!isAppShellRoute ? <AluxFloatingTrigger /> : null}
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

function PublicChrome({
  pathname, headerVariant, position,
}: { pathname: string; headerVariant: "solid" | "overlay"; position: "header" | "footer" }) {
  const { data: published } = useQuery({
    ...rootPublishedHomeQuery,
    enabled: pathname === "/",
  });
  const config = published?.snapshot?.chrome?.[position];

  if (position === "header") {
    return <PublicHeader variant={headerVariant} config={config} />;
  }

  return <PublicFooter config={config} />;
}
