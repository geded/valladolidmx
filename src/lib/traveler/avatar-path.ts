/**
 * Fotos de perfil: el perfil guarda la ruta dentro del almacén privado
 * `avatars` y cada lectura firma un enlace corto. Los enlaces largos que se
 * guardaron antes se convierten de nuevo a su ruta para volver a firmarlos.
 */
const MARKERS = ["/object/sign/avatars/", "/object/public/avatars/", "/object/authenticated/avatars/"];

/** Ruta dentro de `avatars`, o null si el valor es una foto externa (p. ej. Google). */
export function avatarStoragePath(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) return value.includes("..") ? null : value;
  for (const m of MARKERS) {
    const i = value.indexOf(m);
    if (i >= 0) {
      const rest = value.slice(i + m.length).split("?")[0] ?? "";
      try {
        const p = decodeURIComponent(rest);
        return p && !p.includes("..") ? p : null;
      } catch {
        return null;
      }
    }
  }
  return null;
}

export const AVATAR_LINK_SECONDS = 60 * 60;
