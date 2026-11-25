import { avatarStoragePath, AVATAR_LINK_SECONDS } from "./avatar-path";

/** Enlace corto para mostrar una foto de perfil (fotos externas pasan igual). */
export async function signAvatarForDisplay(value: string | null): Promise<string | null> {
  if (!value) return null;
  const path = avatarStoragePath(value);
  if (!path) return /^https?:\/\//i.test(value) ? value : null;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.storage
      .from("avatars")
      .createSignedUrl(path, AVATAR_LINK_SECONDS);
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}
