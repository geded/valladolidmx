/**
 * auth.ts — Roles oficiales del sistema (alineado con 11.2).
 *
 * NO se almacenan en users; viven en user_roles con has_role().
 * "Visitante" NO es rol almacenado: es el estado anónimo (role = null).
 * En Fase 0 sirve sólo como contrato de tipos para UI.
 */

export type AppRole =
  | "super_admin"
  | "admin"
  | "editor"
  | "concierge"
  | "business_owner"
  | "traveler";

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Administrador",
  admin: "Administrador",
  editor: "Editor",
  concierge: "Concierge",
  business_owner: "Empresa",
  traveler: "Viajero",
};

/** Prioridad oficial (mayor índice = más privilegio). Útil para elegir el rol primario. */
export const ROLE_PRIORITY: AppRole[] = [
  "traveler",
  "business_owner",
  "concierge",
  "editor",
  "admin",
  "super_admin",
];

export interface AuthUserShape {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  role: AppRole | null;
}
