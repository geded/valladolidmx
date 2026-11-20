/**
 * Aviso por correo a la administración cuando un viajero se registra.
 * Reglas puras (sin red) para poder probarlas.
 */

/** Ventana en la que una cuenta todavía cuenta como "recién registrada". */
export const NEW_SIGNUP_WINDOW_MS = 72 * 60 * 60 * 1000;

/** Una cuenta es un registro nuevo de viajero si tiene rol viajero y es reciente. */
export function isNewTravelerSignup(
  createdAtIso: string | null | undefined,
  roles: readonly string[],
  now = Date.now(),
): boolean {
  if (!createdAtIso || !roles.includes("traveler")) return false;
  const created = Date.parse(createdAtIso);
  if (Number.isNaN(created)) return false;
  const age = now - created;
  return age >= -5 * 60 * 1000 && age <= NEW_SIGNUP_WINDOW_MS;
}

function asEmailList(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  return [];
}

/**
 * Destinatarios: lista dedicada → correo interno → correos de administradores.
 * Nunca se avisa al propio viajero.
 */
export function resolveSignupAdminRecipients(input: {
  signupSetting?: unknown;
  internalSetting?: unknown;
  adminEmails?: readonly (string | null | undefined)[];
  travelerEmail?: string | null;
}): string[] {
  let list = asEmailList(input.signupSetting);
  if (list.length === 0) list = asEmailList(input.internalSetting);
  if (list.length === 0) list = (input.adminEmails ?? []).filter((e): e is string => Boolean(e));
  const own = (input.travelerEmail ?? "").toLowerCase().trim();
  return Array.from(
    new Set(list.map((e) => e.toLowerCase().trim()).filter((e) => e.includes("@") && e !== own)),
  );
}

export function signupMethodLabel(provider: unknown): string | undefined {
  if (provider === "google") return "Google";
  if (provider === "email") return "Correo y contraseña";
  if (typeof provider === "string" && provider) return provider;
  return undefined;
}

export function savedItemsLabel(count: number): string {
  if (count <= 0) return "Todavía no guarda lugares";
  return `${count} ${count === 1 ? "lugar guardado" : "lugares guardados"}`;
}
