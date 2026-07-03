/**
 * /portal/empresas — Listado administrativo de empresas con acceso al
 * detalle por empresa (configuración, paquetes de visibilidad, órdenes).
 */
import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyBusinesses } from "@/lib/portal/portal-reads.functions";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/portal/empresas/")({
  component: BusinessesIndex,
});

function BusinessesIndex() {
  const fetchBusinesses = useServerFn(listMyBusinesses);
  const { roles } = useAuth();
  const canCreateBusiness = roles.some((r) =>
    r === "admin" || r === "super_admin" || r === "editor",
  );
  const { data: businesses = [], isLoading, error } = useQuery({
    queryKey: ["portal", "my-businesses"],
    queryFn: () => fetchBusinesses(),
    staleTime: 60_000,
  });
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return businesses;
    return businesses.filter(
      (b) =>
        b.display_name.toLowerCase().includes(q) ||
        b.slug.toLowerCase().includes(q),
    );
  }, [businesses, query]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando empresas…</p>;
  }
  if (error) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : "Error desconocido."}
      </p>
    );
  }

  const isAdminContext = businesses.some((b) => b.role === "admin");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
            Portal Empresarial · Empresas
          </p>
          <h1 className="mt-2 text-3xl font-semibold">
            {isAdminContext ? "Todas las empresas" : "Tus empresas"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Selecciona una empresa para ver su configuración, paquetes de
            visibilidad detectados y sus órdenes y pagos.
          </p>
        </div>
        {canCreateBusiness ? (
          <Link
            to="/cms/empresas/nueva"
            className="inline-flex items-center justify-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95"
          >
            + Registrar nueva empresa
          </Link>
        ) : null}
      </header>

      <div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre o slug…"
          className="w-full max-w-sm rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-5 py-3 font-medium">Empresa</th>
              <th className="px-5 py-3 font-medium">Slug</th>
              <th className="px-5 py-3 font-medium">Estado</th>
              <th className="px-5 py-3 font-medium">Rol</th>
              <th className="px-5 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr key={b.business_id} className="border-b border-border last:border-0">
                <td className="px-5 py-3 font-medium">{b.display_name}</td>
                <td className="px-5 py-3 text-muted-foreground">/{b.slug}</td>
                <td className="px-5 py-3">
                  <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] uppercase">
                    {b.status}
                  </span>
                  {b.verified ? (
                    <span className="ml-2 text-[11px] text-emerald-600">verificada</span>
                  ) : null}
                </td>
                <td className="px-5 py-3 text-xs uppercase tracking-wide text-muted-foreground">
                  {b.role}
                </td>
                <td className="px-5 py-3 text-right">
                  <Link
                    to="/portal/empresas/$businessId"
                    params={{ businessId: b.business_id }}
                    className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
                  >
                    Ver detalle
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-sm text-muted-foreground">
                  Sin coincidencias.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}