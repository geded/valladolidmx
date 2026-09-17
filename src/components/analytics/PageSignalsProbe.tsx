/**
 * Monitor de usuarios · M1 — Sonda de señales de página.
 *
 * No pinta nada. Escucha los cambios de ruta pública y publica:
 *  · `page_view` al entrar a una página,
 *  · `page_engaged` cuando la persona lee más de la mitad del contenido.
 *
 * Respeta la pausa de personalización y jamás envía datos personales.
 */
import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { useAuth } from "@/hooks/useAuth";
import { emitPageSignal } from "@/lib/visitor-intel/page-signals";

export function PageSignalsProbe() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { user } = useAuth();
  const isAuthenticated = Boolean(user);
  const engagedRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const locale = document.documentElement.lang || undefined;
    const timer = window.setTimeout(() => {
      void emitPageSignal({ action: "page_view", pathname, isAuthenticated, locale });
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

  return null;
}
