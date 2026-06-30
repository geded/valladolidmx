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
  | "concierge_lead"
  | "business_owner"
  | "traveler";

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Administrador",
  admin: "Administrador",
  editor: "Editor",
  concierge: "Concierge",
  concierge_lead: "Concierge (Lead)",
  business_owner: "Empresa",
  traveler: "Viajero",
};

/** Prioridad oficial (mayor índice = más privilegio). Útil para elegir el rol primario. */
export const ROLE_PRIORITY: AppRole[] = [
  "traveler",
  "business_owner",
  "concierge",
  "concierge_lead",
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

/**
 * Mapeo Adenda 15.10.4 — nomenclatura funcional → enum `app_role`.
 *   founder  ↔ super_admin
 *   admin    ↔ admin
 *   editor   ↔ editor
 *   business ↔ business_owner
 *   concierge ↔ concierge | concierge_lead
 *   traveler ↔ traveler
 *
 * Destino del panel principal por rol (`/auth` redirige aquí tras SIGNED_IN).
 */
export const ROLE_HOME: Record<AppRole, "/admin" | "/empresa" | "/concierge" | "/cms" | "/mi-viaje"> = {
  super_admin: "/admin",
  admin: "/admin",
  editor: "/cms",
  business_owner: "/empresa",
  concierge: "/concierge",
  concierge_lead: "/concierge",
  traveler: "/mi-viaje",
};

export function resolveRoleHome(roles: AppRole[]): "/admin" | "/empresa" | "/concierge" | "/cms" | "/mi-viaje" {
  // Orden de prioridad operativa (no jerárquico): founder/admin > business > concierge > editor > traveler.
  const order: AppRole[] = [
    "super_admin", "admin", "business_owner", "concierge_lead", "concierge", "editor", "traveler",
  ];
  for (const r of order) if (roles.includes(r)) return ROLE_HOME[r];
  return "/mi-viaje";
}
