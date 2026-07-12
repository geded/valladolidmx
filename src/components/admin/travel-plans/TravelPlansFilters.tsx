/**
 * CV1.1 · Filtros del listado.
 */
import { Search } from "lucide-react";

interface Props {
  search: string;
  onSearch: (v: string) => void;
  planStatus: string | null;
  onPlanStatus: (v: string | null) => void;
  priority: string | null;
  onPriority: (v: string | null) => void;
  onlyMine: boolean;
  onOnlyMine: (v: boolean) => void;
  includeClosed: boolean;
  onIncludeClosed: (v: boolean) => void;
  isAdmin: boolean;
}

export function TravelPlansFilters(p: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={p.search}
          onChange={(e) => p.onSearch(e.target.value)}
          placeholder="Buscar por viajero o título…"
          className="w-full rounded-pill border border-border bg-card py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>
      <select
        value={p.planStatus ?? ""}
        onChange={(e) => p.onPlanStatus(e.target.value || null)}
        className="rounded-pill border border-border bg-card px-3 py-2 text-sm"
      >
        <option value="">Estado del plan · todos</option>
        <option value="draft">Borrador</option>
        <option value="active">Activo</option>
        <option value="shared_with_concierge">Con concierge</option>
        <option value="archived">Archivado</option>
      </select>
      <select
        value={p.priority ?? ""}
        onChange={(e) => p.onPriority(e.target.value || null)}
        className="rounded-pill border border-border bg-card px-3 py-2 text-sm"
      >
        <option value="">Prioridad · todas</option>
        <option value="critical">Crítica</option>
        <option value="high">Alta</option>
        <option value="medium">Media</option>
        <option value="low">Baja</option>
      </select>
      {p.isAdmin ? (
        <label className="inline-flex items-center gap-2 rounded-pill border border-border bg-card px-3 py-2 text-sm">
          <input
            type="checkbox"
            checked={p.onlyMine}
            onChange={(e) => p.onOnlyMine(e.target.checked)}
          />
          Sólo míos
        </label>
      ) : null}
      <label className="inline-flex items-center gap-2 rounded-pill border border-border bg-card px-3 py-2 text-sm">
        <input
          type="checkbox"
          checked={p.includeClosed}
          onChange={(e) => p.onIncludeClosed(e.target.checked)}
        />
        Incluir cerrados
      </label>
    </div>
  );
}