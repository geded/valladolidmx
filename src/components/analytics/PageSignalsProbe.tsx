/**
 * Monitor de visitantes · Sonda de señales.
 *
 * No pinta nada. Publica HITOS, no clics:
 *  · `page_view` al entrar a una página y `page_engaged` al leer más de la mitad;
 *  · inicio de sesión anónima (T1 Extraño → Anónimo), una vez por sesión;
 *  · exploración profunda (varias superficies o permanencia), una vez por sesión;
 *  · primera intención anónima (guardar o agregar a Mi Viaje), una vez por sesión.
 *
 * Respeta la pausa de personalización y jamás envía datos personales.
 */
import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { useAuth } from "@/hooks/useAuth";
import { emitPageSignal } from "@/lib/visitor-intel/page-signals";
import {
  trackFirstIntent,
  trackSessionStart,
  trackSurfaceVisited,
} from "@/lib/visitor-intel/session-signals";

export function PageSignalsProbe() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { user } = useAuth();
  const isAuthenticated = Boolean(user);
  const engagedRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const locale = document.documentElement.lang || undefined;
    const timer = window.setTimeout(() => {
      void trackSessionStart({ pathname, isAuthenticated, locale });
      void emitPageSignal({ action: "page_view", pathname, isAuthenticated, locale });
      void trackSurfaceVisited({ pathname, isAuthenticated, locale });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [pathname, isAuthenticated]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    engagedRef.current = null;
    const onScroll = () => {
      if (engagedRef.current === pathname) return;
      const scrolled = window.scrollY + window.innerHeight;
      const total = document.body.scrollHeight || 1;
      if (scrolled / total < 0.5) return;
      engagedRef.current = pathname;
      void emitPageSignal({
        action: "page_engaged",
        pathname,
        isAuthenticated,
        locale: document.documentElement.lang || undefined,
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname, isAuthenticated]);

  // Primera intención anónima: se observa el borrador local existente, sin
  // instrumentar cada botón y sin duplicar la autoridad de Mi Viaje.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    let previous = -1;

    void (async () => {
      const store = await import("@/lib/traveler/anonymous-draft/store");
      if (cancelled) return;
      const size = (draft: { favorites?: unknown[]; plannedItems?: unknown[] } | null) =>
        (draft?.favorites?.length ?? 0) + (draft?.plannedItems?.length ?? 0);
      previous = size(store.getAnonymousTripSnapshot());
      const unsubscribe = store.subscribeAnonymousTrip((draft) => {
        const next = size(draft);
        if (next > previous && next > 0) {
          void trackFirstIntent({
            pathname: window.location.pathname,
            isAuthenticated,
            locale: document.documentElement.lang || undefined,
          });
        }
        previous = next;
      });
      if (cancelled) unsubscribe();
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  return null;
}
