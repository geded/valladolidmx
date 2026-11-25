/** Bloquea el menú contextual y el arrastre sobre fotos (disuasión de guardado).
 *  No aplica a campos de edición ni a enlaces de descarga explícitos. */
export function installPhotoGuard(): () => void {
  const block = (e: Event) => {
    const t = e.target as HTMLElement | null;
    if (t && t.tagName === "IMG" && !t.closest("[data-allow-photo-save]")) e.preventDefault();
  };
  document.addEventListener("contextmenu", block, { capture: true });
  document.addEventListener("dragstart", block, { capture: true });
  return () => {
    document.removeEventListener("contextmenu", block, { capture: true });
    document.removeEventListener("dragstart", block, { capture: true });
  };
}
