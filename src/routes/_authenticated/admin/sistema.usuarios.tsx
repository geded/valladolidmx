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
import { toast } from "sonner";

interface AdminUserRow {
  user_id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  roles: AppRole[];
}

const STAFF_ROLES: AppRole[] = ["admin", "editor", "concierge", "concierge_lead"];
const BUSINESS_ROLES: AppRole[] = ["business_owner"];

type TabKey = "travelers" | "staff" | "business" | "permissions";

const TABS: { key: TabKey; label: string; hint: string }[] = [
  { key: "travelers", label: "Viajeros", hint: "Cuentas con rol de viajero (uso final del sitio)." },
  { key: "staff", label: "Staff interno", hint: "Administradores, editores y concierge." },
  { key: "business", label: "Empresas", hint: "Dueños y colaboradores de negocios." },
  { key: "permissions", label: "Permisos por rol", hint: "Matriz oficial derivada del Blueprint 11.2 (solo consulta)." },
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
  return (data ?? []) as AdminUserRow[];
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
