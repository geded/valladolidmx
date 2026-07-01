/**
 * UpdateBanner — Adenda 15.10.6.5 · Update Lifecycle.
 *
 * Banner no bloqueante que se muestra cuando el Service Worker principal
 * detecta una nueva versión en espera (evento `pwa:update-available`).
 * La activación es explícita del usuario (Graceful Upgrade) y ejecuta
 * `applyPendingUpdate()`, único mecanismo oficial de activación
 * (Single Update Lifecycle). Tras `SKIP_WAITING`, `controllerchange`
 * dispara una recarga controlada para preservar Version Consistency.
 *
 * Se autoexcluye en preview Lovable / iframe y respeta el kill-switch
 * `?sw=off` a través de las guardas del propio wrapper.
 */
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { applyPendingUpdate } from "@/pwa/register-sw";

export function UpdateBanner() {
  const [available, setAvailable] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.top !== window.self) return;
    const onAvailable = () => setAvailable(true);
    const onApplied = () => setApplying(true);
    window.addEventListener("pwa:update-available", onAvailable);
    window.addEventListener("pwa:update-applied", onApplied);
    return () => {
      window.removeEventListener("pwa:update-available", onAvailable);
      window.removeEventListener("pwa:update-applied", onApplied);
    };
  }, []);

  if (!available) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-3 border-b border-border bg-primary/10 px-4 py-2 text-xs text-foreground"
    >
      <span className="flex items-center gap-2">
        <RefreshCw className="h-3.5 w-3.5" aria-hidden />
        Nueva versión disponible.
      </span>
      <button
        type="button"
        disabled={applying}
        onClick={() => {
          setApplying(true);
          void applyPendingUpdate();
        }}
        className="inline-flex items-center justify-center rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:opacity-95 disabled:opacity-60"
      >
        {applying ? "Actualizando…" : "Actualizar ahora"}
      </button>
    </div>
  );
}