/**
 * 15.10.7.1 · Diálogo para asignar/revocar permisos por zona (region/destination).
 * Sólo super_admin/admin pueden operar (validado en RPCs SECURITY DEFINER).
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABELS, type AppRole } from "@/types/auth";
import {
  assignUserZoneScope,
  listUserZoneScopes,
  revokeUserZoneScope,
  type UserZoneScope,
} from "@/lib/admin/zone-scopes.functions";

type ZoneOption = { id: string; name: string };

const SCOPED_ROLES: AppRole[] = [
  "editor",
  "admin",
  "concierge",
  "concierge_lead",
  "business_owner",
];

async function fetchRegions(): Promise<ZoneOption[]> {
  const { data, error } = await supabase
    .from("tourism_regions")
    .select("id,name")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ZoneOption[];
}

async function fetchDestinations(): Promise<ZoneOption[]> {
  const { data, error } = await supabase
    .from("destinations")
    .select("id,name")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ZoneOption[];
}

export function ZoneScopesDialog({
  userId,
  userLabel,
  onClose,
}: {
  userId: string;
  userLabel: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const listFn = useServerFn(listUserZoneScopes);
  const assignFn = useServerFn(assignUserZoneScope);
  const revokeFn = useServerFn(revokeUserZoneScope);

  const scopesQ = useQuery({
    queryKey: ["admin", "user-zone-scopes", userId],
    queryFn: () => listFn({ data: { userId } }),
    retry: false,
  });
  const regionsQ = useQuery({ queryKey: ["admin", "zones", "regions"], queryFn: fetchRegions });
  const destsQ = useQuery({ queryKey: ["admin", "zones", "destinations"], queryFn: fetchDestinations });

  const [scopeType, setScopeType] = useState<"region" | "destination">("region");
  const [scopeId, setScopeId] = useState<string>("");
  const [role, setRole] = useState<AppRole>("editor");
  const [notes, setNotes] = useState<string>("");

  const options = scopeType === "region" ? regionsQ.data ?? [] : destsQ.data ?? [];

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of regionsQ.data ?? []) m.set(`region:${r.id}`, r.name);
    for (const d of destsQ.data ?? []) m.set(`destination:${d.id}`, d.name);
    return m;
  }, [regionsQ.data, destsQ.data]);

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["admin", "user-zone-scopes", userId] });

  const assignMut = useMutation({
    mutationFn: () =>
      assignFn({
        data: {
          userId,
          scopeType,
          scopeId,
          role,
          notes: notes.trim() || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Zona asignada");
      setScopeId("");
      setNotes("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeMut = useMutation({
    mutationFn: (id: string) => revokeFn({ data: { scopeId: id } }),
    onSuccess: () => {
      toast.success("Zona revocada");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const scopes: UserZoneScope[] = scopesQ.data ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-border bg-background p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Permisos por zona</h2>
            <p className="text-xs text-muted-foreground">{userLabel}</p>
          </div>
          <button type="button" onClick={onClose} className="text-sm text-muted-foreground">
            ✕
          </button>
        </header>

        <p className="mt-2 text-xs text-muted-foreground">
          Acota lo que este usuario puede editar/operar a regiones o destinos específicos.
          Los roles globales del usuario no cambian.
        </p>

        <section className="mt-4">
          <h3 className="text-sm font-medium">Zonas asignadas</h3>
          {scopesQ.isLoading ? (
            <p className="mt-2 text-xs text-muted-foreground">Cargando…</p>
          ) : scopes.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">Sin zonas asignadas.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {scopes.map((s) => {
                const label =
                  nameById.get(`${s.scope_type}:${s.scope_id}`) ?? s.scope_id;
                return (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-1.5 text-xs"
                  >
                    <span>
                      <span className="uppercase tracking-wide text-[10px] text-muted-foreground">
                        {s.scope_type === "region" ? "Región" : "Destino"}
                      </span>{" "}
                      · <strong>{label}</strong>{" "}
                      <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5">
                        {ROLE_LABELS[s.role as AppRole] ?? s.role}
                      </span>
                      {s.notes ? <em className="ml-2 text-muted-foreground">— {s.notes}</em> : null}
                    </span>
                    <button
                      type="button"
                      disabled={revokeMut.isPending}
                      onClick={() => revokeMut.mutate(s.id)}
                      className="text-destructive hover:underline"
                      aria-label="Revocar"
                    >
                      Revocar
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="mt-6 rounded-lg border border-border p-3">
          <h3 className="text-sm font-medium">Asignar nueva zona</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label className="text-xs">
              Tipo
              <select
                value={scopeType}
                onChange={(e) => {
                  setScopeType(e.target.value as "region" | "destination");
                  setScopeId("");
                }}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              >
                <option value="region">Región turística</option>
                <option value="destination">Destino</option>
              </select>
            </label>
            <label className="text-xs">
              Rol acotado
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as AppRole)}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              >
                {SCOPED_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs sm:col-span-2">
              {scopeType === "region" ? "Región" : "Destino"}
              <select
                value={scopeId}
                onChange={(e) => setScopeId(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              >
                <option value="">Selecciona…</option>
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs sm:col-span-2">
              Nota (opcional)
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej. Cobertura editorial temporal"
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              />
            </label>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              disabled={!scopeId || assignMut.isPending}
              onClick={() => assignMut.mutate()}
              className="rounded-md border border-primary bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              Asignar zona
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
