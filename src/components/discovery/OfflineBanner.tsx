/**
 * OfflineBanner — Adenda 15.10.6.2 · Offline First.
 *
 * Aviso no bloqueante que se muestra en superficies públicas cuando el
 * navegador entra en modo offline. Cumple la condición de la adenda:
 * "Toda respuesta offline deberá indicar claramente cuando el contenido
 * puede estar desactualizado."
 *
 * Se autoexcluye en preview Lovable / iframe para no contaminar la UX del
 * editor. Sólo observa `navigator.onLine` — no cachea, no persiste, no
 * sincroniza.
 */
import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return;
    // No contaminar preview Lovable / iframe.
    if (window.top !== window.self) return;
    const apply = () => setOffline(!navigator.onLine);
    apply();
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-40 flex items-center justify-center gap-2 border-b border-border bg-warning/10 px-4 py-2 text-xs text-warning-foreground"
    >
      <WifiOff className="h-3.5 w-3.5" aria-hidden />
      <span>
        Sin conexión — el contenido puede estar desactualizado hasta que
        recuperes conexión.
      </span>
    </div>
  );
}