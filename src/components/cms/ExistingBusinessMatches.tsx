import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { findMatchingBusinesses } from "@/lib/cms/business-match.functions";

const STATUS_LABEL: Record<string, string> = {
  draft: "Borrador",
  in_review: "En revisión",
  approved: "Aprobada",
  published: "Publicada",
};

/** Aviso en el alta: muestra empresas ya existentes con nombre parecido. */
export function ExistingBusinessMatches({ name }: { name: string }) {
  const [q, setQ] = useState(name);
  useEffect(() => {
    const t = setTimeout(() => setQ(name.trim()), 350);
    return () => clearTimeout(t);
  }, [name]);
  const fn = useServerFn(findMatchingBusinesses);
  const res = useQuery({
    queryKey: ["cms", "business-matches", q],
    queryFn: () => fn({ data: { query: q } }),
    enabled: q.length >= 3,
    staleTime: 30_000,
  });
  const matches = res.data ?? [];
  if (q.length < 3 || matches.length === 0) return null;

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
      <p className="font-semibold">
        {matches.length === 1 ? "Ya existe una ficha parecida" : "Ya existen fichas parecidas"}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Para no duplicar la empresa, carga la ficha existente y complétala: datos, logo, portada,
        galería y publicación.
      </p>
      <ul className="mt-3 space-y-2">
        {matches.map((m) => (
          <li
            key={m.id}
            className="grid gap-3 rounded-lg border border-border bg-card p-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-2 sm:p-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold leading-snug sm:text-sm">
                {m.display_name}
              </p>
              <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                {[STATUS_LABEL[m.status] ?? m.status, m.category, m.destination]
                  .filter(Boolean)
                  .join(" · ")}
                {!m.hasLogo || !m.hasCover ? " · Faltan fotos" : ""}
              </p>
              {m.status === "published" && (
                <p className="mt-0.5 text-xs font-medium leading-snug text-warning">
                  Ya se ve en la página pública. Edita esta ficha en lugar de crear otra.
                </p>
              )}
            </div>
            <Link
              to="/cms/empresas/$businessId/editar"
              params={{ businessId: m.id }}
              className="inline-flex h-10 w-full items-center justify-center rounded-pill bg-primary px-3 text-sm font-semibold text-primary-foreground sm:h-8 sm:w-auto sm:text-xs"
            >
              Cargar esta ficha
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Si es otro negocio distinto, continúa llenando el formulario.
      </p>
    </div>
  );
}
