import { QueryClient, QueryClientProvider, queryOptions } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { I18nProvider } from "@/i18n/context";
import { AuthProvider } from "@/hooks/useAuth";
import { PublicHeader, PublicFooter, OfflineBanner } from "@/components/discovery";
// H2·P3 · C1 — Lazy Toaster: `sonner` y su `<Toaster />` sólo se
// descargan cuando el shim `@/lib/toast` dispara el primer toast, o
// tras el prefetch en idle. Antes viajaban en el entry para el 100 %
// de visitantes anónimos.
// H2·P3 — Diferimos widgets globales que sólo aportan comportamiento
// post-hidratación (chip flotante, observadores, sheets on-demand).
// Cada uno reserva un fallback null: al renderizar únicamente después
// del primer paint no hay saltos visuales (CLS = 0). El `Suspense`
// mantiene disponibilidad funcional intacta — cuando el usuario
// interactúa (clic, hidratación completa, evento) el chunk ya está en
// caché del router (`preload` durante idle vía onIdlePrefetchWidgets).
import * as React from "react";
const AluxMemorySyncRunner = React.lazy(() =>
  import("@/components/alux/AluxMemorySyncRunner").then((m) => ({
    default: m.AluxMemorySyncRunner,
  })),
);
const AluxFloatingTrigger = React.lazy(() =>
  import("@/components/layout/AluxFloatingTrigger").then((m) => ({
    default: m.AluxFloatingTrigger,
  })),
);
const FloatingTravelPlanDock = React.lazy(() =>
  import("@/components/travel-plan/FloatingTravelPlanDock").then((m) => ({
    default: m.FloatingTravelPlanDock,
  })),
);
const ConciergeProposalObserver = React.lazy(() =>
  import("@/components/travel-plan/ConciergeProposalObserver").then((m) => ({
    default: m.ConciergeProposalObserver,
  })),
);
// H2·P2 — Aislamiento del Studio: el botón "Editar esta página"
// renderiza null para todo visitante que no sea editor. Se difiere
// para que su código no viaje en el entry principal.
const EditThisPageButton = React.lazy(() =>
  import("@/components/experience-builder/EditThisPageButton").then((m) => ({
    default: m.EditThisPageButton,
  })),
);
const SignInPromptSheet = React.lazy(() =>
  import("@/components/protected-actions/SignInPromptSheet").then((m) => ({
    default: m.SignInPromptSheet,
  })),
);
const AnonymousDraftImportRunner = React.lazy(() =>
  import("@/components/traveler/AnonymousDraftImportRunner").then((m) => ({
    default: m.AnonymousDraftImportRunner,
  })),
);
// Monitor de usuarios · M1 — sonda de señales de página (no pinta nada).
const PageSignalsProbe = React.lazy(() =>
  import("@/components/analytics/PageSignalsProbe").then((m) => ({
    default: m.PageSignalsProbe,
  })),
);
const SyncStatusBanner = React.lazy(() =>
  import("@/components/discovery/SyncStatusBanner").then((m) => ({
    default: m.SyncStatusBanner,
  })),
);
const UpdateBanner = React.lazy(() =>
  import("@/components/discovery/UpdateBanner").then((m) => ({
    default: m.UpdateBanner,
  })),
);
// H2·P3 · C1 — el host es tiny y necesita montar su useEffect cuanto
// antes para suscribirse al bus del shim; el peso real de `sonner` se
// difiere dentro de `LazyToasterHost` con un React.lazy interno.
import { LazyToasterHost } from "@/components/ui/LazyToasterHost";
import { SITE } from "@/config/site";
import { ACTIVE_BRAND, ACTIVE_BRAND_THEME_STYLE } from "@/config/brand";
import { BrandProvider, brandSettingsQueryOptions } from "@/lib/brand/brand-context";
import {
  BRAND_SETTINGS_DEFAULTS,
  normalizeBrandSettings,
} from "@/lib/brand/brand-settings.functions";
import { aluxPaletteStyle, brandPaletteStyle } from "@/lib/brand/brand-theme";
import {
  institutionalAuthorityQueryOptions,
  useInstitutionalAuthority,
} from "@/lib/institutional/institutional-context";

import { organizationJsonLd, websiteJsonLd } from "@/lib/discovery/seo";
import { getPublishedHomeComposition } from "@/lib/experience-builder/public-reads.functions";
import { ProtectedActionResumeRunner } from "@/lib/protected-actions";
import { GlobalNavigationSessionBridge } from "@/components/navigation/NavigationSessionBridge";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SkipLink } from "@/components/ui/SkipLink";
import { getOmxdsVisualFoundationsFlag } from "@/lib/omxds/visual-foundations-flag.server";
import { SITE_DOMAIN_DEFAULTS, getSiteDomainSettings } from "@/lib/settings/site-domains.functions";
import { setCanonicalDomain } from "@/config/site";

const OMXDS_THEME_BOOTSTRAP = `(()=>{try{const r=document.documentElement;if(r.dataset.omxdsVisualFoundations!=="enabled")return;const k="valladolidmx:theme";const s=localStorage.getItem(k);const t=s==="sol"||s==="luna"?s:matchMedia("(prefers-color-scheme: dark)").matches?"luna":"sol";r.classList.toggle("dark",t==="luna");r.dataset.theme=t;r.style.colorScheme=t==="luna"?"dark":"light"}catch{}})();`;

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

/**
 * Adenda 15.10.6 · Offline First — Diagnóstico 2026-09-21.
 * Sin conexión, cualquier fallo de red terminaba en el mensaje genérico de
 * error. Aquí se distingue "sin conexión" de "error real": se informa con
 * lenguaje claro y se reintenta automáticamente al recuperar la red.
 * No cachea, no persiste y no altera ninguna plantilla pública.
 */
function isOfflineLikeError(error: Error): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const message = `${error?.name ?? ""} ${error?.message ?? ""}`.toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("network request failed") ||
    message.includes("load failed") ||
    message.includes("err_internet_disconnected")
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const offline = isOfflineLikeError(error);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  useEffect(() => {
    if (!offline || typeof window === "undefined") return;
    const retry = () => {
      setRetrying(true);
      void router.invalidate();
      reset();
    };
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [offline, reset, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl">{offline ? "Sin conexión" : "Algo no cargó"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {offline
            ? "No hay conexión a internet. Puedes seguir viendo las páginas que ya visitaste; el resto se cargará solo cuando vuelva la señal."
            : "Intenta de nuevo o vuelve al inicio."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              setRetrying(true);
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95"
          >
            {retrying ? "Reintentando…" : "Reintentar"}
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

/**
 * Lote 3B · C — Sincroniza la autoridad institucional administrada en el
 * CMS con el store sincrónico que consultan los distintivos. No pinta
 * nada: cero impacto visual.
 */
function InstitutionalAuthoritySync() {
  useInstitutionalAuthority();
  return null;
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: async ({ context }) => {
    // Lote 3B · B — La identidad de marca administrable se precarga en SSR
    // para que header, pie y superficies públicas la pinten sin parpadeo.
    // Fail-safe: ante cualquier error se conserva el fallback de código.
    const [omxdsVisualFoundationsEnabled, brandSettings, , publishedHome, siteDomains] =
      await Promise.all([
        // Offline First: sin red esta bandera fallaba y derribaba toda la
        // aplicación. Fail-safe al valor de código, como el resto del loader.
        getOmxdsVisualFoundationsFlag().catch(() => false),
        context.queryClient
          .ensureQueryData(brandSettingsQueryOptions)
          .catch(() => BRAND_SETTINGS_DEFAULTS),
        // Lote 3B · C — Autoridad institucional vigente (distintivos).
        context.queryClient.ensureQueryData(institutionalAuthorityQueryOptions).catch(() => null),
        // El chrome público debe llegar en la primera respuesta para evitar que
        // header y footer cambien de geometría después de hidratar React.
        context.queryClient.ensureQueryData(rootPublishedHomeQuery).catch(() => null),
        // Configuración → Dominios: dominio canónico administrable.
        getSiteDomainSettings().catch(() => SITE_DOMAIN_DEFAULTS),
      ]);

    // Aplica el dominio canónico vigente en SSR (antes de generar head/canonical).
    setCanonicalDomain(siteDomains.primaryDomain);

    return {
      omxdsVisualFoundationsEnabled,
      brandSettings: normalizeBrandSettings(brandSettings),
      publishedHome,
      siteDomains,
    };
  },

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
      // H1 · SEO Sweep — Directiva por defecto para crawlers y AI (indexable).
      {
        name: "robots",
        content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
      },
      { name: "googlebot", content: "index, follow, max-image-preview:large, max-snippet:-1" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/png", href: "/favicon.png", sizes: "64x64" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      // Tipografía centralizada vía tokens. Cargada por <link> según Tailwind v4.
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=Tangerine:wght@400;700&display=swap",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        // SEO.A1.1 · PR-1 — WebSite (fuente única, sin SearchAction).
        // SearchAction queda **postponed**: no existe superficie pública
        // indexable y sin auth en /buscar. Reintroducir cuando aplique.
        children: JSON.stringify(websiteJsonLd()),
      },
      {
        type: "application/ld+json",
        // SEO.A1.1 · PR-1 — Organization con @id estable reutilizable
        // como publisher/brand/provider por otras entidades del grafo.
        children: JSON.stringify(organizationJsonLd()),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  const { omxdsVisualFoundationsEnabled, brandSettings, siteDomains } = Route.useLoaderData();
  // Mantiene el origen canónico sincronizado también tras hidratar.
  setCanonicalDomain(siteDomains.primaryDomain);
  return (
    <html
      lang="es"
      suppressHydrationWarning
      data-tourism-brand={ACTIVE_BRAND.key}
      style={{
        ...ACTIVE_BRAND_THEME_STYLE,
        ...brandPaletteStyle(brandSettings.palette),
        ...aluxPaletteStyle(brandSettings.aluxPalette),
      }}
      data-omxds-visual-foundations={omxdsVisualFoundationsEnabled ? "enabled" : undefined}
    >
      <head>
        <HeadContent />
        {omxdsVisualFoundationsEnabled ? (
          <script dangerouslySetInnerHTML={{ __html: OMXDS_THEME_BOOTSTRAP }} />
        ) : null}
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
  const { omxdsVisualFoundationsEnabled, brandSettings } = Route.useLoaderData();
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
    pathname.startsWith("/empresa") ||
    (pathname.startsWith("/lovable/founder-") &&
      pathname !== "/lovable/founder-home-premium-preview" &&
      pathname !== "/lovable/founder-zazil-premium-preview");
  const showPublicAlux = !isAppShellRoute;

  // La infraestructura PWA y el runner de sincronización son capacidades
  // post-hidratación. Se cargan en idle para no formar parte del camino
  // crítico público; la cola durable y su comportamiento permanecen intactos.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    let checkForUpdate: (() => Promise<boolean>) | null = null;
    const startPwa = async () => {
      const [{ registerServiceWorker, checkForUpdate: check }, { startSyncRunner }] =
        await Promise.all([import("@/pwa/register-sw"), import("@/pwa/sync-runner")]);
      if (cancelled) return;
      checkForUpdate = check;
      void registerServiceWorker();
      startSyncRunner();
    };
    const idle = window.requestIdleCallback?.(() => void startPwa(), { timeout: 2_500 });
    const fallback = idle == null ? window.setTimeout(() => void startPwa(), 1_200) : null;
    // Graceful Upgrade · comprobación oportunista al recuperar visibilidad.
    const onVisible = () => {
      if (document.visibilityState === "visible" && checkForUpdate) void checkForUpdate();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      if (idle != null) window.cancelIdleCallback?.(idle);
      if (fallback != null) window.clearTimeout(fallback);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // H2·P3 — Prefetch idle de los widgets diferidos. Se invoca en el
  // primer `requestIdleCallback` (o setTimeout fallback) tras la
  // hidratación para que estén listos antes de la primera
  // interacción. Nunca bloquea el primer paint.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefetch = () => {
      void import("@/components/layout/AluxFloatingTrigger");
      void import("@/components/travel-plan/FloatingTravelPlanDock");
      void import("@/components/travel-plan/ConciergeProposalObserver");
      void import("@/components/protected-actions/SignInPromptSheet");
    };
    const ric = (
      window as unknown as {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      }
    ).requestIdleCallback;
    if (typeof ric === "function") {
      ric(prefetch, { timeout: 2500 });
    } else {
      window.setTimeout(prefetch, 1200);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <BrandProvider initialBrand={brandSettings}>
          <InstitutionalAuthoritySync />
          <AuthProvider>
            {!isAppShellRoute ? <SkipLink /> : null}
            {!isAppShellRoute && omxdsVisualFoundationsEnabled ? <ThemeToggle /> : null}
            {!isAppShellRoute ? (
              <PublicChrome pathname={pathname} headerVariant={headerVariant} position="header" />
            ) : null}
            {!isAppShellRoute ? <OfflineBanner /> : null}
            <React.Suspense fallback={null}>
              <SyncStatusBanner />
              <UpdateBanner />
            </React.Suspense>
            <Outlet />
            {!isAppShellRoute ? (
              <PublicChrome pathname={pathname} headerVariant={headerVariant} position="footer" />
            ) : null}
            {showPublicAlux ? (
              <React.Suspense fallback={null}>
                <AluxFloatingTrigger />
              </React.Suspense>
            ) : null}
            <React.Suspense fallback={null}>
              <FloatingTravelPlanDock />
            </React.Suspense>
            <React.Suspense fallback={null}>
              <AluxMemorySyncRunner />
            </React.Suspense>
            <React.Suspense fallback={null}>
              <ConciergeProposalObserver />
            </React.Suspense>
            <LazyToasterHost />
            {!isAppShellRoute ? (
              <React.Suspense fallback={null}>
                <EditThisPageButton pathname={pathname} />
              </React.Suspense>
            ) : null}
            {/* OLA H-01 · Épica 1 · I1 — no-op mientras no haya consumidores. */}
            <ProtectedActionResumeRunner />
            {/* OLA H-01 · Épica 1 · I2 — host global del gate de identidad. */}
            <React.Suspense fallback={null}>
              <SignInPromptSheet />
            </React.Suspense>
            <React.Suspense fallback={null}>
              <AnonymousDraftImportRunner />
            </React.Suspense>
            {/*
          Navigation Blueprint · N3 — Único punto de suscripción global
          al Context Engine para persistir la cadena territorial en
          sessionStorage (deep-links, refresh, back/forward).
        */}
            <GlobalNavigationSessionBridge />
            {!isAppShellRoute ? (
              <React.Suspense fallback={null}>
                <PageSignalsProbe />
              </React.Suspense>
            ) : null}
          </AuthProvider>
        </BrandProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

function PublicChrome({
  pathname,
  headerVariant,
  position,
}: {
  pathname: string;
  headerVariant: "solid" | "overlay";
  position: "header" | "footer";
}) {
  // El encabezado y pie del sitio se leen desde la composición publicada de la
  // Home y se reutilizan en TODAS las páginas públicas. Esto permite editar
  // menú, botón destacado y columnas del footer una sola vez desde el
  // Experience Builder y verlo aplicado en cualquier ruta.
  void pathname;
  const { publishedHome } = Route.useLoaderData();
  const config = publishedHome?.snapshot?.chrome?.[position];

  if (position === "header") {
    return <PublicHeader variant={headerVariant} config={config} />;
  }

  return <PublicFooter config={config} />;
}
