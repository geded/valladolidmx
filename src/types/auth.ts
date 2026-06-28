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
  | "concierge"
  | "business_owner"
  | "business_staff"
  | "traveler";

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Administrador",
  admin: "Administrador",
  concierge: "Concierge",
  business_owner: "Empresa",
  business_staff: "Equipo Empresa",
  traveler: "Viajero",
};

export interface AuthUserShape {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  role: AppRole | null;
}
