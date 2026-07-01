/**
 * /admin/sistema/usuarios — Gestión segmentada de usuarios y roles.
 *
 * Pestañas: Viajeros · Staff · Empresas · Permisos por rol.
 * Acceso exclusivo super_admin. Autorización dura en backend vía
 * RPCs SECURITY DEFINER. No usa service_role. Toda escritura queda
 * auditada en `permissions_audit_log`.
 */
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABELS, type AppRole } from "@/types/auth";
import {
  inviteUser,
  updateUserEmail,
  updateUserPassword,
  updateUserDisplayName,
  sendPasswordReset,
  deleteUser,
} from "@/lib/admin/user-management.functions";
import {
  listPermissions,
  listRoles,
  createRole,
  updateRole,
  deleteRole,
} from "@/lib/admin/roles-catalog.functions";
import { toast } from "sonner";

interface AdminUserRow {
  user_id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  roles: AppRole[];
  custom_roles: CustomRoleRef[];
}

interface CustomRoleRef {
  id: string;
  slug: string;
  name: string;
  color: string;
}

const STAFF_ROLES: AppRole[] = ["admin", "editor", "concierge", "concierge_lead"];
const BUSINESS_ROLES: AppRole[] = ["business_owner"];

type TabKey = "travelers" | "staff" | "business" | "roles" | "permissions";

const TABS: { key: TabKey; label: string; hint: string }[] = [
  { key: "travelers", label: "Viajeros", hint: "Cuentas con rol de viajero (uso final del sitio)." },
  { key: "staff", label: "Staff interno", hint: "Administradores, editores y concierge." },
  { key: "business", label: "Empresas", hint: "Dueños y colaboradores de negocios." },
  { key: "roles", label: "Roles y permisos", hint: "Crea roles personalizados y marca qué puede hacer cada uno." },
  { key: "permissions", label: "Matriz operativa", hint: "Matriz oficial derivada del Blueprint 11.2 (solo consulta)." },
];

async function fetchIsSuperAdmin(): Promise<boolean> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return false;
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userData.user.id,
    _role: "super_admin",
  });
  if (error) throw new Error(`No se pudo validar autorización: ${error.message}`);
  return Boolean(data);
}

async function fetchUsersWithRoles(): Promise<AdminUserRow[]> {
  const { data, error } = await supabase.rpc("admin_list_users_with_roles");
  if (error) throw new Error(`No se pudieron cargar usuarios: ${error.message}`);
  return ((data ?? []) as unknown as Array<Omit<AdminUserRow, "custom_roles"> & { custom_roles: unknown }>).map((r) => ({
    ...r,
    custom_roles: Array.isArray(r.custom_roles) ? (r.custom_roles as CustomRoleRef[]) : [],
  }));
}

async function assignUserRole(userId: string, role: AppRole) {
  const { error } = await supabase.rpc("admin_assign_role", {
    _target_user_id: userId,
    _role: role,
  });
  if (error) throw new Error(`No se pudo asignar el rol: ${error.message}`);
}

async function revokeUserRole(userId: string, role: AppRole) {
  const { error } = await supabase.rpc("admin_revoke_role", {
    _target_user_id: userId,
    _role: role,
  });
  if (error) throw new Error(`No se pudo revocar el rol: ${error.message}`);
}

async function assignCustomRoleRpc(userId: string, roleId: string) {
  const { error } = await supabase.rpc("admin_assign_custom_role", {
    _target_user_id: userId,
    _role_id: roleId,
  });
  if (error) throw new Error(`No se pudo asignar el rol personalizado: ${error.message}`);
}

async function revokeCustomRoleRpc(userId: string, roleId: string) {
  const { error } = await supabase.rpc("admin_revoke_custom_role", {
    _target_user_id: userId,
    _role_id: roleId,
  });
  if (error) throw new Error(`No se pudo revocar el rol personalizado: ${error.message}`);
}

export const Route = createFileRoute("/_authenticated/admin/sistema/usuarios")({
  component: AdminUsuariosPage,
  head: () => ({
    meta: [
      { title: "Admin · Usuarios y roles · Valladolid.mx" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function AdminUsuariosPage() {
  const [tab, setTab] = useState<TabKey>("travelers");
  const gate = useQuery({
    queryKey: ["admin", "is-super-admin"],
    queryFn: fetchIsSuperAdmin,
    retry: false,
  });
  const users = useQuery({
    queryKey: ["admin", "users-roles"],
    queryFn: fetchUsersWithRoles,
    enabled: gate.data === true,
    retry: false,
  });

  if (gate.isLoading) {
    return <p className="text-sm text-muted-foreground">Verificando autorización…</p>;
  }
  if (gate.error) {
    return (
      <div className="max-w-xl rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
        <h1 className="text-lg font-semibold text-destructive">No se pudo abrir Usuarios y roles</h1>
        <p className="mt-2 text-sm text-muted-foreground">{(gate.error as Error).message}</p>
      </div>
    );
  }
  if (!gate.data) {
    return (
      <div className="max-w-xl rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
        <h1 className="text-lg font-semibold text-destructive">Acceso restringido</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta superficie es exclusiva del rol <code>super_admin</code>. La autorización se valida en el servidor.
        </p>
      </div>
    );
  }

  const all = users.data ?? [];
  const travelers = all.filter(
    (u) => u.roles.includes("traveler") && !u.roles.some((r) => STAFF_ROLES.includes(r) || BUSINESS_ROLES.includes(r) || r === "super_admin"),
  );
  const staff = all.filter((u) => u.roles.some((r) => STAFF_ROLES.includes(r) || r === "super_admin"));
  const business = all.filter((u) => u.roles.some((r) => BUSINESS_ROLES.includes(r)));

  const counts: Record<TabKey, number | null> = {
    travelers: travelers.length,
    staff: staff.length,
    business: business.length,
    roles: null,
    permissions: null,
  };

  const active = TABS.find((t) => t.key === tab)!;

  return (
    <div className="max-w-6xl">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
          Panel Fundador · Sistema
        </p>
        <h1 className="mt-2 text-3xl">Usuarios y roles</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Gestión segmentada por tipo de cuenta. Toda asignación o revocación queda
          registrada en <code>permissions_audit_log</code>. El rol{" "}
          <code>super_admin</code> no puede modificarse desde esta superficie.
        </p>
      </header>

      <nav className="mt-6 flex flex-wrap gap-1 border-b border-border" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm transition ${
              tab === t.key
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {counts[t.key] !== null ? (
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">{counts[t.key]}</span>
            ) : null}
          </button>
        ))}
      </nav>
      <p className="mt-3 text-xs text-muted-foreground">{active.hint}</p>

      {tab === "permissions" ? (
        <PermissionsMatrix />
      ) : tab === "roles" ? (
        <RolesManager />
      ) : users.isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Cargando usuarios…</p>
      ) : users.error ? (
        <p className="mt-6 text-sm text-destructive">Error: {(users.error as Error).message}</p>
      ) : (
        <UsersTable
          rows={tab === "travelers" ? travelers : tab === "staff" ? staff : business}
          variant={tab}
        />
      )}
    </div>
  );
}

function UsersTable({ rows, variant }: { rows: AdminUserRow[]; variant: "travelers" | "staff" | "business" }) {
  const [filter, setFilter] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const assignableForTab: AppRole[] =
    variant === "travelers"
      ? ["traveler"]
      : variant === "staff"
        ? ["admin", "editor", "concierge", "concierge_lead"]
        : ["business_owner"];

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        (r.email ?? "").toLowerCase().includes(q) ||
        (r.display_name ?? "").toLowerCase().includes(q),
    );
  }, [rows, filter]);

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          type="search"
          placeholder="Buscar por correo o nombre…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full max-w-sm rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          className="rounded-md border border-primary bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
        >
          + Invitar usuario
        </button>
      </div>
      {inviteOpen ? (
        <InviteDialog
          defaultRole={assignableForTab[0]}
          allowedRoles={assignableForTab}
          onClose={() => setInviteOpen(false)}
        />
      ) : null}
      <div className="overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Usuario</th>
              <th className="px-4 py-2">Roles actuales</th>
              <th className="px-4 py-2">Asignar</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <UserRow key={row.user_id} row={row} assignable={assignableForTab} />
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                  Sin resultados en esta pestaña.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserRow({ row, assignable }: { row: AdminUserRow; assignable: AppRole[] }) {
  const qc = useQueryClient();
  const [pending, setPending] = useState<AppRole | "">("");
  const [editOpen, setEditOpen] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "users-roles"] });

  const assignMut = useMutation({
    mutationFn: (role: AppRole) => assignUserRole(row.user_id, role),
    onSuccess: (_d, role) => {
      toast.success(`Rol asignado: ${ROLE_LABELS[role]}`);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeMut = useMutation({
    mutationFn: (role: AppRole) => revokeUserRole(row.user_id, role),
    onSuccess: (_d, role) => {
      toast.success(`Rol revocado: ${ROLE_LABELS[role]}`);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const available = assignable.filter((r) => !row.roles.includes(r));

  return (
    <tr className="border-t border-border align-top">
      <td className="px-4 py-3">
        <div className="font-medium">{row.display_name ?? "—"}</div>
        <div className="text-xs text-muted-foreground">{row.email}</div>
        <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
          {new Date(row.created_at).toLocaleDateString()}
        </div>
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="mt-2 rounded-md border border-border px-2 py-0.5 text-[11px] hover:bg-muted"
        >
          Editar
        </button>
        {editOpen ? <EditUserDialog row={row} onClose={() => setEditOpen(false)} /> : null}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {row.roles.length === 0 ? (
            <span className="text-xs text-muted-foreground">Sin roles</span>
          ) : (
            row.roles.map((r) => {
              const locked = r === "super_admin";
              return (
                <span
                  key={r}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs"
                >
                  {ROLE_LABELS[r]}
                  {locked ? (
                    <span title="Protegido" className="text-muted-foreground">🔒</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => revokeMut.mutate(r)}
                      disabled={revokeMut.isPending}
                      className="text-destructive hover:underline"
                      aria-label={`Revocar ${ROLE_LABELS[r]}`}
                    >
                      ×
                    </button>
                  )}
                </span>
              );
            })
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        {available.length === 0 ? (
          <span className="text-xs text-muted-foreground">Sin roles disponibles en esta pestaña.</span>
        ) : (
          <div className="flex gap-2">
            <select
              value={pending}
              onChange={(e) => setPending(e.target.value as AppRole | "")}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs"
            >
              <option value="">Selecciona rol…</option>
              {available.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!pending || assignMut.isPending}
              onClick={() => {
                if (!pending) return;
                assignMut.mutate(pending);
                setPending("");
              }}
              className="rounded-md border border-primary bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              Asignar
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

// ---------------- Edición de usuario ----------------

function EditUserDialog({ row, onClose }: { row: AdminUserRow; onClose: () => void }) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "users-roles"] });
  const isSuper = row.roles.includes("super_admin");

  const emailFn = useServerFn(updateUserEmail);
  const passFn = useServerFn(updateUserPassword);
  const nameFn = useServerFn(updateUserDisplayName);
  const resetFn = useServerFn(sendPasswordReset);
  const delFn = useServerFn(deleteUser);

  const [email, setEmail] = useState(row.email ?? "");
  const [displayName, setDisplayName] = useState(row.display_name ?? "");
  const [password, setPassword] = useState("");
  const [confirmDel, setConfirmDel] = useState("");

  const nameMut = useMutation({
    mutationFn: () => nameFn({ data: { userId: row.user_id, displayName: displayName.trim() } }),
    onSuccess: () => { toast.success("Nombre actualizado"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const emailMut = useMutation({
    mutationFn: () => emailFn({ data: { userId: row.user_id, email: email.trim() } }),
    onSuccess: () => { toast.success("Correo actualizado"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const passMut = useMutation({
    mutationFn: () => passFn({ data: { userId: row.user_id, password } }),
    onSuccess: () => { toast.success("Contraseña actualizada"); setPassword(""); },
    onError: (e: Error) => toast.error(e.message),
  });
  const resetMut = useMutation({
    mutationFn: () => resetFn({ data: { userId: row.user_id, email: row.email ?? "" } }),
    onSuccess: () => toast.success("Enlace de recuperación generado y enviado"),
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: () => delFn({ data: { userId: row.user_id } }),
    onSuccess: () => { toast.success("Usuario eliminado"); invalidate(); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Editar usuario</h2>
            <p className="text-xs text-muted-foreground">{row.email}</p>
          </div>
          <button type="button" onClick={onClose} className="text-sm text-muted-foreground">✕</button>
        </header>

        {isSuper ? (
          <div className="mt-3 rounded-md border border-amber-300/50 bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            Cuenta super_admin: la eliminación está bloqueada por seguridad.
          </div>
        ) : null}

        <section className="mt-4 space-y-2">
          <label className="block text-sm">
            Nombre a mostrar
            <div className="mt-1 flex gap-2">
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={nameMut.isPending || !displayName.trim()}
                onClick={() => nameMut.mutate()}
                className="rounded-md border border-primary bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
              >
                Guardar
              </button>
            </div>
          </label>
        </section>

        <section className="mt-4 space-y-2">
          <label className="block text-sm">
            Correo electrónico
            <div className="mt-1 flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={emailMut.isPending || !email.trim() || email.trim() === row.email}
                onClick={() => emailMut.mutate()}
                className="rounded-md border border-primary bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
              >
                Actualizar
              </button>
            </div>
          </label>
          <p className="text-[11px] text-muted-foreground">
            El correo se marca como confirmado. Notifica al usuario del cambio.
          </p>
        </section>

        <section className="mt-4 space-y-2">
          <label className="block text-sm">
            Nueva contraseña
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={passMut.isPending || password.length < 8}
                onClick={() => passMut.mutate()}
                className="rounded-md border border-primary bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
              >
                Cambiar
              </button>
            </div>
          </label>
          <button
            type="button"
            disabled={resetMut.isPending || !row.email}
            onClick={() => resetMut.mutate()}
            className="text-xs text-primary underline disabled:opacity-50"
          >
            …o enviar enlace de recuperación al usuario
          </button>
        </section>

        {!isSuper ? (
          <section className="mt-6 rounded-md border border-destructive/40 bg-destructive/5 p-3">
            <h3 className="text-sm font-medium text-destructive">Eliminar cuenta</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Acción irreversible. Escribe <code>ELIMINAR</code> para confirmar.
            </p>
            <div className="mt-2 flex gap-2">
              <input
                value={confirmDel}
                onChange={(e) => setConfirmDel(e.target.value)}
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={delMut.isPending || confirmDel !== "ELIMINAR"}
                onClick={() => delMut.mutate()}
                className="rounded-md border border-destructive bg-destructive px-3 py-2 text-xs font-medium text-destructive-foreground disabled:opacity-50"
              >
                Eliminar
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

// ---------------- Matriz de permisos (read-only, Blueprint 11.2) ----------------

type Capability = {
  area: string;
  action: string;
  roles: Partial<Record<AppRole | "visitor", boolean>>;
};

const PERMISSIONS: Capability[] = [
  { area: "Contenido público", action: "Leer contenido publicado", roles: { visitor: true, traveler: true, business_owner: true, concierge: true, concierge_lead: true, editor: true, admin: true, super_admin: true } },
  { area: "Perfil", action: "Editar perfil propio", roles: { traveler: true, business_owner: true, concierge: true, concierge_lead: true, editor: true, admin: true, super_admin: true } },
  { area: "Viaje", action: "Crear/editar planes de viaje", roles: { traveler: true, admin: true, super_admin: true } },
  { area: "Viaje", action: "Solicitar concierge", roles: { traveler: true, admin: true, super_admin: true } },
  { area: "Reseñas", action: "Escribir reseñas propias", roles: { traveler: true, business_owner: true, concierge: true, editor: true, admin: true, super_admin: true } },
  { area: "Reseñas", action: "Moderar reseñas", roles: { admin: true, super_admin: true } },
  { area: "Empresas", action: "Editar empresa propia y catálogo", roles: { business_owner: true, admin: true, super_admin: true } },
  { area: "Empresas", action: "Invitar colaboradores a empresa", roles: { business_owner: true, admin: true, super_admin: true } },
  { area: "Concierge", action: "Ver expedientes asignados", roles: { concierge: true, concierge_lead: true, admin: true, super_admin: true } },
  { area: "Concierge", action: "Preparar propuestas", roles: { concierge: true, concierge_lead: true, admin: true, super_admin: true } },
  { area: "CMS", action: "Editar contenido editorial y geográfico", roles: { editor: true, admin: true, super_admin: true } },
  { area: "CMS", action: "Publicar contenido", roles: { editor: true, admin: true, super_admin: true } },
  { area: "Sistema", action: "Asignar/revocar roles", roles: { super_admin: true } },
  { area: "Sistema", action: "Ver auditoría de permisos", roles: { admin: true, super_admin: true } },
  { area: "Sistema", action: "Configuración global", roles: { super_admin: true } },
];

const MATRIX_ROLES: (AppRole | "visitor")[] = [
  "visitor",
  "traveler",
  "business_owner",
  "concierge",
  "concierge_lead",
  "editor",
  "admin",
  "super_admin",
];

const MATRIX_LABELS: Record<AppRole | "visitor", string> = {
  visitor: "Visitante",
  ...ROLE_LABELS,
};

function PermissionsMatrix() {
  return (
    <div className="mt-6 space-y-3">
      <div className="rounded-xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
        Matriz oficial derivada del <strong>Blueprint 11.2 — Users, Roles & Security</strong>.
        Los permisos se aplican vía RLS en la base de datos; esta vista es sólo consulta.
        Cualquier cambio requiere migración aprobada.
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Área</th>
              <th className="px-4 py-2">Acción</th>
              {MATRIX_ROLES.map((r) => (
                <th key={r} className="px-2 py-2 text-center">{MATRIX_LABELS[r]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((cap, i) => (
              <tr key={i} className="border-t border-border">
                <td className="px-4 py-2 text-xs text-muted-foreground">{cap.area}</td>
                <td className="px-4 py-2">{cap.action}</td>
                {MATRIX_ROLES.map((r) => (
                  <td key={r} className="px-2 py-2 text-center">
                    {cap.roles[r] ? (
                      <span className="text-primary" aria-label="permitido">✓</span>
                    ) : (
                      <span className="text-muted-foreground/30" aria-label="denegado">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------- Invitación por email ----------------

function InviteDialog({
  defaultRole,
  allowedRoles,
  onClose,
}: {
  defaultRole: AppRole;
  allowedRoles: AppRole[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const invite = useServerFn(inviteUser);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<AppRole>(defaultRole);

  const mut = useMutation({
    mutationFn: () =>
      invite({
        data: {
          email: email.trim(),
          role,
          displayName: displayName.trim() || undefined,
        },
      }),
    onSuccess: (res) => {
      toast.success(`Invitación enviada a ${res.email}`);
      qc.invalidateQueries({ queryKey: ["admin", "users-roles"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Invitar nuevo usuario</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Enviaremos un enlace de acceso al correo. El usuario definirá su contraseña al aceptar.
        </p>

        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!email.trim()) return;
            mut.mutate();
          }}
        >
          <label className="block text-sm">
            Correo electrónico
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="persona@dominio.com"
            />
          </label>

          <label className="block text-sm">
            Nombre a mostrar (opcional)
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="Ej. María López"
            />
          </label>

          <label className="block text-sm">
            Rol inicial
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as AppRole)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {allowedRoles.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-3 py-2 text-sm"
              disabled={mut.isPending}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mut.isPending || !email.trim()}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {mut.isPending ? "Enviando…" : "Enviar invitación"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Roles y Permisos — gestor dinámico
// ────────────────────────────────────────────────────────────────────────────

interface RoleRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  is_system: boolean;
  system_role: AppRole | null;
  sort_order: number;
  permissionIds: string[];
}

interface PermissionRow {
  id: string;
  key: string;
  resource: string;
  action: string;
  category: string;
  label: string;
  description: string | null;
  is_dangerous: boolean;
}

function RolesManager() {
  const qc = useQueryClient();
  const fetchRoles = useServerFn(listRoles);
  const fetchPerms = useServerFn(listPermissions);

  const roles = useQuery({
    queryKey: ["admin", "roles-catalog"],
    queryFn: () => fetchRoles() as Promise<RoleRow[]>,
    retry: false,
  });
  const perms = useQuery({
    queryKey: ["admin", "permissions-catalog"],
    queryFn: () => fetchPerms() as Promise<PermissionRow[]>,
    retry: false,
  });

  const [editing, setEditing] = useState<RoleRow | null>(null);
  const [creating, setCreating] = useState(false);

  if (roles.isLoading || perms.isLoading) {
    return <p className="mt-6 text-sm text-muted-foreground">Cargando roles…</p>;
  }
  if (roles.error || perms.error) {
    return (
      <p className="mt-6 text-sm text-destructive">
        Error: {((roles.error ?? perms.error) as Error).message}
      </p>
    );
  }

  const permList = perms.data ?? [];
  const roleList = roles.data ?? [];

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {roleList.length} roles ({roleList.filter((r) => r.is_system).length} de sistema,{" "}
          {roleList.filter((r) => !r.is_system).length} personalizados) · {permList.length} permisos
          disponibles.
        </p>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded-md border border-primary bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
        >
          + Crear rol personalizado
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {roleList.map((role) => (
          <button
            key={role.id}
            type="button"
            onClick={() => setEditing(role)}
            className="group rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: role.color }}
                />
                <span className="text-sm font-medium">{role.name}</span>
              </div>
              {role.is_system ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  Sistema
                </span>
              ) : (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-primary">
                  Custom
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              <code className="text-[11px]">{role.slug}</code>
            </p>
            {role.description ? (
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{role.description}</p>
            ) : null}
            <p className="mt-3 text-xs">
              {role.slug === "super_admin"
                ? "Todos los permisos (bypass)"
                : `${role.permissionIds.length} permisos asignados`}
            </p>
          </button>
        ))}
      </div>

      {editing ? (
        <RoleEditor
          role={editing}
          permissions={permList}
          onClose={() => setEditing(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["admin", "roles-catalog"] });
            setEditing(null);
          }}
        />
      ) : null}
      {creating ? (
        <RoleEditor
          role={null}
          permissions={permList}
          onClose={() => setCreating(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["admin", "roles-catalog"] });
            setCreating(false);
          }}
        />
      ) : null}
    </div>
  );
}

function RoleEditor({
  role,
  permissions,
  onClose,
  onSaved,
}: {
  role: RoleRow | null;
  permissions: PermissionRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = role === null;
  const isSystem = role?.is_system ?? false;
  const isSuperAdmin = role?.slug === "super_admin";

  const [name, setName] = useState(role?.name ?? "");
  const [slug, setSlug] = useState(role?.slug ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [color, setColor] = useState(role?.color ?? "#64748b");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(role?.permissionIds ?? []),
  );
  const [confirmDel, setConfirmDel] = useState("");

  const createFn = useServerFn(createRole);
  const updateFn = useServerFn(updateRole);
  const deleteFn = useServerFn(deleteRole);

  const createMut = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          slug,
          name,
          description,
          color,
          icon: "shield",
          permissionIds: [...selected],
        },
      }),
    onSuccess: () => {
      toast.success("Rol creado.");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: () =>
      updateFn({
        data: {
          roleId: role!.id,
          name,
          description,
          color,
          permissionIds: [...selected],
        },
      }),
    onSuccess: () => {
      toast.success("Rol actualizado.");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteFn({ data: { roleId: role!.id } }),
    onSuccess: () => {
      toast.success("Rol eliminado.");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const byCategory = useMemo(() => {
    const map = new Map<string, PermissionRow[]>();
    for (const p of permissions) {
      const arr = map.get(p.category) ?? [];
      arr.push(p);
      map.set(p.category, arr);
    }
    return [...map.entries()];
  }, [permissions]);

  function togglePerm(id: string) {
    if (isSystem && !isSuperAdmin) {
      // Permitimos editar permisos de roles de sistema (excepto super_admin)
      // porque el linter dice "protege slug/is_system/system_role", no permisos.
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const disabled = isSuperAdmin; // super_admin siempre tiene todo, no se edita
  const canDelete = !isNew && !isSystem;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">
              {isNew ? "Crear rol personalizado" : `Editar rol: ${role!.name}`}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {isSuperAdmin
                ? "El super administrador tiene todos los permisos por diseño. Sólo se muestra como referencia."
                : isSystem
                  ? "Rol de sistema. Puedes ajustar permisos pero no renombrar ni eliminar."
                  : "Rol personalizado. Puedes editar todo o eliminarlo."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-3 py-1 text-sm"
          >
            Cerrar
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="block text-sm">
            Nombre
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSystem}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm disabled:opacity-60"
            />
          </label>
          <label className="block text-sm">
            Identificador (slug)
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              disabled={!isNew}
              placeholder="ej. editor_destinos"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm disabled:opacity-60"
            />
          </label>
          <label className="block text-sm md:col-span-2">
            Descripción
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSystem}
              rows={2}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm disabled:opacity-60"
            />
          </label>
          <label className="flex items-center gap-3 text-sm">
            Color
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              disabled={isSystem}
              className="h-9 w-16 rounded border border-border bg-background disabled:opacity-60"
            />
            <code className="text-xs text-muted-foreground">{color}</code>
          </label>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-medium">Permisos</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {disabled
              ? "Editable sólo para roles que no son super_admin."
              : "Marca las acciones que este rol podrá ejecutar. Los permisos marcados con ⚠ son sensibles."}
          </p>
          <div className="mt-3 space-y-4">
            {byCategory.map(([cat, list]) => (
              <div key={cat} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">{cat}</h4>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      setSelected((prev) => {
                        const next = new Set(prev);
                        const allOn = list.every((p) => next.has(p.id));
                        for (const p of list) {
                          if (allOn) next.delete(p.id);
                          else next.add(p.id);
                        }
                        return next;
                      })
                    }
                    className="text-xs text-primary underline-offset-2 hover:underline disabled:opacity-50"
                  >
                    {list.every((p) => selected.has(p.id)) ? "Quitar todos" : "Marcar todos"}
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {list.map((p) => (
                    <label
                      key={p.id}
                      className="flex items-start gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted/40"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => togglePerm(p.id)}
                        disabled={disabled}
                        className="mt-1"
                      />
                      <span>
                        <span className="font-medium">
                          {p.label}
                          {p.is_dangerous ? <span className="ml-1 text-destructive">⚠</span> : null}
                        </span>
                        <span className="block text-[11px] text-muted-foreground">
                          <code>{p.key}</code>
                          {p.description ? ` · ${p.description}` : ""}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          {canDelete ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={confirmDel}
                onChange={(e) => setConfirmDel(e.target.value)}
                placeholder='Escribe "ELIMINAR" para borrar'
                className="w-56 rounded-md border border-destructive/40 bg-background px-3 py-2 text-xs"
              />
              <button
                type="button"
                disabled={confirmDel !== "ELIMINAR" || deleteMut.isPending}
                onClick={() => deleteMut.mutate()}
                className="rounded-md border border-destructive px-3 py-2 text-xs text-destructive disabled:opacity-50"
              >
                {deleteMut.isPending ? "Eliminando…" : "Eliminar rol"}
              </button>
            </div>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-3 py-2 text-sm"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={
                disabled ||
                createMut.isPending ||
                updateMut.isPending ||
                (isNew && (!name.trim() || !slug.trim()))
              }
              onClick={() => (isNew ? createMut.mutate() : updateMut.mutate())}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {createMut.isPending || updateMut.isPending
                ? "Guardando…"
                : isNew
                  ? "Crear rol"
                  : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
