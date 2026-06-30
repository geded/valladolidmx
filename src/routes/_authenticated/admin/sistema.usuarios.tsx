/**
 * /admin/sistema/usuarios — Gestión de roles (15.10.4R · Paso E).
 *
 * Acceso exclusivo super_admin. Autorización dura en el servidor:
 * `isSuperAdmin` y RPCs SECURITY DEFINER. La UI sólo media.
 * No usa SUPABASE_SERVICE_ROLE_KEY; toda escritura queda auditada
 * en `permissions_audit_log`.
 */
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  isSuperAdmin,
  listUsersWithRoles,
  assignRole,
  revokeRole,
  ASSIGNABLE_ROLES,
  type AdminUserRow,
  type AppRole,
} from "@/lib/admin/users.functions";
import { ROLE_LABELS } from "@/types/auth";
import { toast } from "sonner";

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
  const checkSuper = useServerFn(isSuperAdmin);
  const fetchUsers = useServerFn(listUsersWithRoles);

  const gate = useQuery({ queryKey: ["admin", "is-super-admin"], queryFn: () => checkSuper() });
  const users = useQuery({
    queryKey: ["admin", "users-roles"],
    queryFn: () => fetchUsers(),
    enabled: gate.data === true,
  });

  if (gate.isLoading) {
    return <p className="text-sm text-muted-foreground">Verificando autorización…</p>;
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

  return (
    <div className="max-w-6xl">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
          Panel Fundador · Sistema · 15.10.4R · Paso E
        </p>
        <h1 className="mt-2 text-3xl">Usuarios y roles</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Lista global de cuentas con sus roles. La asignación y revocación quedan
          registradas en <code>permissions_audit_log</code>. Por seguridad, el rol{" "}
          <code>super_admin</code> no puede asignarse ni revocarse desde esta superficie.
        </p>
      </header>

      {users.isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Cargando usuarios…</p>
      ) : users.error ? (
        <p className="mt-6 text-sm text-destructive">Error: {(users.error as Error).message}</p>
      ) : (
        <UsersTable rows={users.data ?? []} />
      )}
    </div>
  );
}

function UsersTable({ rows }: { rows: AdminUserRow[] }) {
  const [filter, setFilter] = useState("");
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
      <input
        type="search"
        placeholder="Buscar por correo o nombre…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full max-w-sm rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
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
              <UserRow key={row.user_id} row={row} />
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                  Sin resultados.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserRow({ row }: { row: AdminUserRow }) {
  const qc = useQueryClient();
  const doAssign = useServerFn(assignRole);
  const doRevoke = useServerFn(revokeRole);
  const [pending, setPending] = useState<AppRole | "">("");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "users-roles"] });

  const assignMut = useMutation({
    mutationFn: (role: AppRole) => doAssign({ data: { user_id: row.user_id, role } }),
    onSuccess: (_d, role) => {
      toast.success(`Rol asignado: ${ROLE_LABELS[role]}`);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeMut = useMutation({
    mutationFn: (role: AppRole) => doRevoke({ data: { user_id: row.user_id, role } }),
    onSuccess: (_d, role) => {
      toast.success(`Rol revocado: ${ROLE_LABELS[role]}`);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const available = ASSIGNABLE_ROLES.filter((r) => !row.roles.includes(r));

  return (
    <tr className="border-t border-border align-top">
      <td className="px-4 py-3">
        <div className="font-medium">{row.display_name ?? "—"}</div>
        <div className="text-xs text-muted-foreground">{row.email}</div>
        <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
          {new Date(row.created_at).toLocaleDateString()}
        </div>
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
      </td>
    </tr>
  );
}