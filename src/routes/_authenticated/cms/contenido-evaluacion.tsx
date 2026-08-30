/**
 * G8-R1-F1G · Administración → Contenido de evaluación.
 *
 * Herramienta interna aprobada para gestionar el lote
 * `G8-R1-F1G-EVALUATION-CONTENT`: ver el inventario completo, retirar
 * fichas de forma reversible y restaurarlas. Ruta noindex.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { StatusBadge } from "@/components/cms/EntityListView";
import {
  listEvaluationLot,
  setEvaluationLotStatus,
  type EvaluationLotRow,
} from "@/lib/omxds/evaluation-lot-admin.functions";

export const Route = createFileRoute("/_authenticated/cms/contenido-evaluacion")({
  head: () => ({
    meta: [
      { title: "Contenido de evaluación · CMS Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EvaluationContentPage,
});

const FAMILY_LABEL: Record<string, string> = {
  destination: "Destino",
  business: "Empresa",
  product: "Producto",
  event: "Evento",
  place: "Lugar",
};

function EvaluationContentPage() {
  const listFn = useServerFn(listEvaluationLot);
  const setStatusFn = useServerFn(setEvaluationLotStatus);
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["cms", "evaluation-lot"],
    queryFn: () => listFn(),
  });

  const mutation = useMutation({
    mutationFn: (input: { family: string; id: string; action: "withdraw" | "restore" }) =>
      setStatusFn({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cms", "evaluation-lot"] }),
  });

  const rows = (list.data?.rows ?? []) as EvaluationLotRow[];
  const published = rows.filter((r) => r.status === "published").length;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <header className="border-b border-border pb-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
          G8-R1-F1G · Lote interno
        </p>
        <h1 className="mt-1 font-serif text-2xl text-foreground">Contenido de evaluación</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Inventario del lote <code className="text-xs">{list.data?.lotId ?? "—"}</code>. Este lote
          está excluido del sitemap, marcado <code className="text-xs">noindex</code> en las fichas
          públicas y fuera del catálogo que consume Alux. El retiro es reversible: la ficha pasa a
          borrador conservando datos, relaciones e historial. Las fichas con propietario activo,
          reclamación o venta quedan protegidas.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {list.isFetching ? "Actualizando…" : `${rows.length} fichas · ${published} publicadas`}
        </p>
      </header>

      {mutation.isError && (
        <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {(mutation.error as Error).message}
        </p>
      )}

      <div className="mt-5 overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Familia</th>
                <th className="px-3 py-2 font-medium">Ficha</th>
                <th className="px-3 py-2 font-medium">Estado</th>
                <th className="px-3 py-2 font-medium">Origen</th>
                <th className="px-3 py-2 text-right font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    {list.isLoading ? "Cargando…" : "El lote de evaluación está vacío."}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={`${row.family}:${row.id}`}
                    className="border-t border-border hover:bg-accent/30"
                  >
                    <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                      {FAMILY_LABEL[row.family] ?? row.family}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span className="font-medium text-foreground">{row.label}</span>
                      <span className="ml-2 text-xs text-muted-foreground">/{row.slug}</span>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <StatusBadge value={row.status} />
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                      {row.isDemoSeed ? "Sin acreditar" : "Real acreditado"}
                      {row.protected && " · protegida"}
                    </td>
                    <td className="px-3 py-2 text-right align-top">
                      {row.status === "published" ? (
                        <button
                          type="button"
                          disabled={row.protected || mutation.isPending}
                          onClick={() =>
                            mutation.mutate({
                              family: row.family,
                              id: row.id,
                              action: "withdraw",
                            })
                          }
                          className="rounded-pill border border-border px-3 py-1 text-xs font-medium hover:bg-accent disabled:opacity-40"
                        >
                          Retirar
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={mutation.isPending}
                          onClick={() =>
                            mutation.mutate({ family: row.family, id: row.id, action: "restore" })
                          }
                          className="rounded-pill border border-border px-3 py-1 text-xs font-medium hover:bg-accent disabled:opacity-40"
                        >
                          Restaurar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
