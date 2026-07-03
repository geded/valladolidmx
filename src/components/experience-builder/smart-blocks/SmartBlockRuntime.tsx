/**
 * SmartBlockRuntime — puente entre el `CompositionRenderer` y los
 * renderers presentacionales de Smart Blocks (15.10.8.4).
 *
 * Toma el nodo de composición, arma la `SmartBlockQuery` combinando la
 * query base declarada en el Block Contract con overrides del editor
 * (`limit`, `only_featured`), invoca `resolveSmartBlock` server-side
 * (con caché de 60s en memoria + TanStack Query 30s stale) y despacha
 * al renderer correcto. Falla cerrada: cualquier error muestra un
 * estado vacío sin romper la página.
 */
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { resolveSmartBlock } from "@/lib/experience-builder/smart-blocks.functions";
import { getBlock } from "@/lib/experience-builder/block-registry";
import type {
  SmartBlockFilter,
  SmartBlockQuery,
} from "@/lib/experience-builder/block-contract";
import type { CompositionNode } from "@/lib/experience-builder/composition-tree";
import {
  SmartDestinationsGrid,
  SmartBusinessesGrid,
  SmartProductsGrid,
  SmartEventsList,
  SmartEmpty,
} from "./index";

type RendererKey =
  | "vmx.smart.destinations-grid"
  | "vmx.smart.businesses-grid"
  | "vmx.smart.products-grid"
  | "vmx.smart.events-list";

export function SmartBlockRuntime({ node }: { node: CompositionNode }) {
  const contract = getBlock(node.type);
  const baseQuery = contract?.data_sources?.[0]?.query;
  const cfg = node.config as Record<string, unknown>;

  const title = typeof cfg.title === "string" ? cfg.title : undefined;
  const limit =
    typeof cfg.limit === "number" && cfg.limit > 0 && cfg.limit <= 24
      ? Math.floor(cfg.limit)
      : baseQuery?.limit ?? 6;
  const onlyFeatured = cfg.only_featured === true;

  const query: SmartBlockQuery | null = baseQuery
    ? {
        ...baseQuery,
        limit,
        filters: mergeFeaturedFilter(baseQuery.filters, node.type, onlyFeatured),
      }
    : null;

  const resolve = useServerFn(resolveSmartBlock);
  const { data, isLoading, error } = useQuery({
    queryKey: ["smart-block", node.type, query],
    queryFn: () => resolve({ data: { query: query as SmartBlockQuery } }),
    enabled: !!query,
    staleTime: 30_000,
  });

  if (!query) {
    return <SmartEmpty message="Smart Block sin fuente de datos configurada." />;
  }
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: Math.min(limit, 6) }).map((_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }
  if (error || data?.error) {
    return <SmartEmpty message="No se pudieron cargar los datos ahora." />;
  }
  const items = data?.items ?? [];

  switch (node.type as RendererKey) {
    case "vmx.smart.destinations-grid":
      return <SmartDestinationsGrid items={items as never} title={title} />;
    case "vmx.smart.businesses-grid":
      return <SmartBusinessesGrid items={items as never} title={title} />;
    case "vmx.smart.products-grid":
      return <SmartProductsGrid items={items as never} title={title} />;
    case "vmx.smart.events-list":
      return <SmartEventsList items={items as never} title={title} />;
    default:
      return <SmartEmpty message={`Smart Block sin renderer: ${node.type}`} />;
  }
}

function mergeFeaturedFilter(
  filters: SmartBlockFilter[] | undefined,
  type: string,
  onlyFeatured: boolean,
): SmartBlockFilter[] | undefined {
  if (!onlyFeatured) return filters;
  // events publican estado; is_featured aplica a destinos, empresas y productos.
  if (type === "vmx.smart.events-list") return filters;
  const extra: SmartBlockFilter = { column: "is_featured", op: "eq", value: true };
  return [...(filters ?? []), extra];
}