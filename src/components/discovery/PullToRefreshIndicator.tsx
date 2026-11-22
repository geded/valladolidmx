/**
 * PullToRefreshIndicator — «Jalar para actualizar» en las páginas públicas y
 * en los paneles (CMS, Portal, Concierge, Cuenta). Antes de actualizar pide a
 * los formularios del CMS que guarden su respaldo local.
 *
 * Reutiliza el gesto oficial `usePullToRefresh` del Workspace Engine sobre el
 * scroll de la ventana. Sólo se activa en pantallas táctiles cuando la app está
 * instalada (o dentro de la vista previa), donde el navegador no ofrece el
 * gesto nativo. Actualiza los datos sin recargar la página, conservando
 * scroll, filtros y Mi Viaje. El indicador es el símbolo de la marca girando.
 */
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { usePullToRefresh } from "@/components/workspace/hooks/gestures/usePullToRefresh";
import logoSymbol from "@/assets/brand/logo-symbol.png.asset.json";
import { cn } from "@/lib/utils";
import { requestDraftFlush } from "@/pwa/unsaved-work";

const THRESHOLD = 72;
const MIN_SPIN_MS = 900;
/* Zonas donde arrastrar hacia abajo ya significa otra cosa. */
const IGNORE_SELECTOR =
  '[role="dialog"], [data-vaul-drawer], [data-no-pull-refresh], [data-map-mounted], .gm-style, input, textarea, select';

function shouldEnable(): boolean {
  if (typeof window === "undefined") return false;
  const touch = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  if (!touch) return false;
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  let embedded = false;
  try {
    embedded = window.self !== window.top;
  } catch {
    embedded = true;
  }
  return Boolean(standalone || embedded);
}

/** Ningún contenedor interno desplazado ni modal abierto bajo el dedo. */
function canStartAt(event: TouchEvent): boolean {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return true;
  if (target.closest(IGNORE_SELECTOR)) return false;
  if (document.body.style.overflow === "hidden") return false;
  for (
    let node: Element | null = target;
    node && node !== document.body;
    node = node.parentElement
  ) {
    if (node instanceof HTMLElement && node.scrollTop > 0) return false;
  }
  return true;
}

export function PullToRefreshIndicator() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const ref = useRef<HTMLElement | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    ref.current = document.documentElement;
    setEnabled(shouldEnable());
  }, []);

  const { pull, refreshing } = usePullToRefresh({
    ref,
    enabled,
    threshold: THRESHOLD,
    canStart: canStartAt,
    onRefresh: async () => {
      const started = Date.now();
      requestDraftFlush();
      await Promise.allSettled([queryClient.invalidateQueries(), router.invalidate()]);
      const remaining = MIN_SPIN_MS - (Date.now() - started);
      if (remaining > 0) await new Promise((resolve) => window.setTimeout(resolve, remaining));
    },
  });

  if (!enabled || (pull <= 0 && !refreshing)) return null;

  const progress = Math.min(1, pull / THRESHOLD);
  const offset = refreshing ? THRESHOLD * 0.75 : pull;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex justify-center"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div
        className="mt-2 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card shadow-elevated transition-transform duration-150"
        style={{
          transform: `translateY(${offset}px) scale(${refreshing ? 1 : 0.6 + progress * 0.4})`,
          opacity: refreshing ? 1 : 0.4 + progress * 0.6,
        }}
      >
        <img
          src={logoSymbol.url}
          alt=""
          aria-hidden
          width={28}
          height={28}
          className={cn(
            "h-7 w-7 select-none",
            refreshing &&
              "animate-spin motion-reduce:animate-pulse motion-reduce:[animation-duration:1.5s]",
          )}
          style={
            refreshing
              ? { animationDuration: "1.5s" }
              : { transform: `rotate(${Math.round(pull * 4)}deg)` }
          }
          draggable={false}
        />
        <span className="sr-only">{refreshing ? "Actualizando…" : "Suelta para actualizar"}</span>
      </div>
    </div>
  );
}
