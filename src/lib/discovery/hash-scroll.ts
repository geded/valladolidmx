/**
 * Llegada a anclas dentro de una ficha pública.
 *
 * Al abrir `.../copalli-cafe#reservar-mesa` el cuadro de reserva se dibuja
 * después de cargar sus datos, así que el navegador no puede hacer el salto
 * solo. Se espera breve y proporcionalmente al bloque pedido.
 */
import { useEffect } from "react";

const MAX_MS = 3000;
const STEP_MS = 150;

export function useHashTargetScroll(when?: string) {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    if (!id) return;
    let elapsed = 0;
    const timer = window.setInterval(() => {
      const el = document.getElementById(id);
      if (el) {
        window.clearInterval(timer);
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      elapsed += STEP_MS;
      if (elapsed >= MAX_MS) window.clearInterval(timer);
    }, STEP_MS);
    return () => window.clearInterval(timer);
  }, [when]);
}
