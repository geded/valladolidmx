/**
 * Enlaces internos dentro de la app: los `<a href>` simples de tarjetas,
 * bloques del Constructor y contenido CMS recargaban el sitio completo
 * (varios segundos de pantalla en espera). Aquí se convierten en navegación
 * interna del router, y al tocarlos o pasar el cursor se adelanta la carga.
 * Los `<Link>` del router ya resuelven el clic y no pasan por aquí.
 */
import { useEffect } from "react";
import type { AnyRouter } from "@tanstack/react-router";

/** Prefijos que responde el servidor, no páginas de la app. */
const SERVER_ONLY_PREFIXES = [
  "/api/",
  "/_serverFn",
  "/mcp",
  "/.mcp",
  "/.well-known",
  "/lovable/email",
  "/splash/",
  "/brand/",
  "/assets/",
];

export type AnchorLike = {
  href: string;
  target?: string | null;
  download?: boolean;
  rel?: string | null;
  reload?: boolean;
};

/** Devuelve la dirección interna a navegar, o null si el navegador debe
 *  encargarse (otro sitio, archivo, nueva pestaña, sólo ancla, servidor). */
export function inAppPath(anchor: AnchorLike, current: { origin: string; href: string }): string | null {
  if (anchor.reload || anchor.download) return null;
  if (anchor.target && anchor.target !== "_self") return null;
  if (anchor.rel && /\bexternal\b/i.test(anchor.rel)) return null;
  let url: URL;
  try {
    url = new URL(anchor.href, current.href);
  } catch {
    return null;
  }
  if (url.origin !== current.origin) return null;
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const here = new URL(current.href);
  // Sólo cambia el ancla en la misma página: el navegador hace el desplazamiento.
  if (url.pathname === here.pathname && url.search === here.search && url.hash) return null;
  const path = url.pathname;
  if (SERVER_ONLY_PREFIXES.some((p) => path === p.replace(/\/$/, "") || path.startsWith(p))) {
    return null;
  }
  // Archivos (pdf, xml, txt, imágenes…) los entrega el servidor.
  if (/\.[a-z0-9]{2,5}$/i.test(path)) return null;
  return `${path}${url.search}${url.hash}`;
}

function anchorFrom(target: EventTarget | null): HTMLAnchorElement | null {
  const el = target instanceof Element ? target.closest("a[href]") : null;
  return el instanceof HTMLAnchorElement ? el : null;
}

function describe(a: HTMLAnchorElement): AnchorLike {
  return {
    href: a.getAttribute("href") ?? "",
    target: a.getAttribute("target"),
    download: a.hasAttribute("download"),
    rel: a.getAttribute("rel"),
    reload: a.hasAttribute("data-reload-document"),
  };
}

export function useInAppLinks(router: AnyRouter) {
  useEffect(() => {
    const current = () => ({ origin: window.location.origin, href: window.location.href });
    const preloaded = new Set<string>();

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = anchorFrom(e.target);
      if (!a) return;
      const path = inAppPath(describe(a), current());
      if (!path) return;
      e.preventDefault();
      void router.navigate({ href: path });
    };

    const onIntent = (e: Event) => {
      const a = anchorFrom(e.target);
      if (!a) return;
      const path = inAppPath(describe(a), current());
      if (!path || preloaded.has(path)) return;
      preloaded.add(path);
      // Adelantar es opcional: si falla, el clic carga normalmente.
      router.preloadRoute({ href: path } as never).catch(() => preloaded.delete(path));
    };

    document.addEventListener("click", onClick);
    document.addEventListener("mouseover", onIntent, { passive: true });
    document.addEventListener("touchstart", onIntent, { passive: true });
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("mouseover", onIntent);
      document.removeEventListener("touchstart", onIntent);
    };
  }, [router]);
}
