/**
 * Route Inventory Panel — Destination OS · SSC-01·P2
 *
 * Vista de sólo lectura que expone el inventario oficial de rutas del
 * producto Valladolid.mx dentro del Experience Builder. Presenta:
 *
 *   - Tabs por categoría: Studio · Plantillas · Pendientes · Técnicas · Sistema
 *   - Columnas: URL, Madurez, Prioridad, Estado, Propietario, Revisión, Versión
 *   - Vista Roadmap: agregada por prioridad × madurez × estado
 *
 * Aditivo. No modifica rutas, contenido ni SSR.
 */

import { useMemo, useState } from "react";
import {
  getRouteInventory,
  getRouteInventoryByCategory,
  type RouteCategory,
  type RouteInventoryEntry,
} from "@/lib/experience-builder/route-inventory";

const TABS: Array<{ id: RouteCategory | "roadmap"; label: string }> = [
  { id: "studio", label: "Studio" },
  { id: "dynamic-template", label: "Plantillas" },
  { id: "pending-migration", label: "Pendientes" },
  { id: "technical", label: "Técnicas" },
  { id: "system", label: "Sistema" },
  { id: "roadmap", label: "Roadmap" },
];

const PRIORITY_COLOR: Record<RouteInventoryEntry["businessPriority"], string> = {
  critical: "bg-destructive/10 text-destructive",
  high: "bg-warning/10 text-warning-foreground",
  medium: "bg-muted text-muted-foreground",
  low: "bg-muted/50 text-muted-foreground",
};

const STATUS_LABEL: Record<RouteInventoryEntry["migrationStatus"], string> = {
  "native-studio": "Nativo Studio",
  "template-cms": "Plantilla + CMS",
  planned: "Planeada",
  "in-progress": "En progreso",
  blocked: "Bloqueada",
  "technical-exception": "Excepción técnica",
  deprecated: "Deprecada",
};

function InventoryTable({ entries }: { entries: readonly RouteInventoryEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        No hay rutas en esta categoría.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-xs">
        <thead className="bg-muted/40 text-left">
          <tr>
            <th className="px-3 py-2 font-medium">Ruta</th>
            <th className="px-3 py-2 font-medium">Madurez</th>
            <th className="px-3 py-2 font-medium">Prioridad</th>
            <th className="px-3 py-2 font-medium">Estado</th>
            <th className="px-3 py-2 font-medium">Propietario</th>
            <th className="px-3 py-2 font-medium">Revisión</th>
            <th className="px-3 py-2 font-medium">Versión</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.routeId} className="border-t align-top hover:bg-muted/20">
              <td className="px-3 py-2 font-mono">
                <div className="text-foreground">{e.publicPath}</div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">
                  {e.routeId.replace("src/routes/", "")}
                </div>
                {e.notes && (
                  <div className="mt-1 text-[11px] italic text-muted-foreground">
                    {e.notes}
                  </div>
                )}
              </td>
              <td className="px-3 py-2">
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                  {e.maturity}
                </span>
              </td>
              <td className="px-3 py-2">
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${PRIORITY_COLOR[e.businessPriority]}`}
                >
                  {e.businessPriority}
                </span>
              </td>
              <td className="px-3 py-2 text-[11px]">
                {STATUS_LABEL[e.migrationStatus]}
              </td>
              <td className="px-3 py-2 text-[11px]">{e.functionalOwner}</td>
              <td className="px-3 py-2 text-[11px] text-muted-foreground">
                {e.lastReviewed}
              </td>
              <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">
                {e.productVersion}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RoadmapView({ entries }: { entries: readonly RouteInventoryEntry[] }) {
  const byPriority = useMemo(() => {
    const groups: Record<string, RouteInventoryEntry[]> = {
      critical: [],
      high: [],
      medium: [],
      low: [],
    };
    for (const e of entries) groups[e.businessPriority].push(e);
    return groups;
  }, [entries]);

  return (
    <div className="space-y-6">
      {(["critical", "high", "medium", "low"] as const).map((p) => (
        <section key={p}>
          <h3 className="mb-2 text-sm font-semibold capitalize">
            Prioridad {p}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              ({byPriority[p].length} rutas)
            </span>
          </h3>
          <InventoryTable entries={byPriority[p]} />
        </section>
      ))}
    </div>
  );
}

export function RouteInventoryPanel() {
  const [tab, setTab] = useState<RouteCategory | "roadmap">("studio");
  const inventory = useMemo(() => getRouteInventory(), []);
  const byCategory = useMemo(() => getRouteInventoryByCategory(), []);

  const totals = {
    studio: byCategory.studio.length,
    "dynamic-template": byCategory["dynamic-template"].length,
    "pending-migration": byCategory["pending-migration"].length,
    technical: byCategory.technical.length,
    system: byCategory.system.length,
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">Inventario de Rutas · Destination OS</h2>
        <p className="text-xs text-muted-foreground">
          Fuente única del producto Valladolid.mx. {inventory.length} rutas
          registradas · {totals.studio} en Studio · {totals["dynamic-template"]}{" "}
          plantillas · {totals["pending-migration"]} pendientes ·{" "}
          {totals.technical + totals.system} técnicas/sistema.
        </p>
      </header>

      <nav className="flex flex-wrap gap-1 border-b">
        {TABS.map((t) => {
          const active = tab === t.id;
          const count =
            t.id === "roadmap"
              ? inventory.length
              : byCategory[t.id as RouteCategory].length;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-px border-b-2 px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              <span className="ml-1.5 rounded bg-muted px-1 py-0.5 text-[10px]">
                {count}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="flex-1 overflow-auto">
        {tab === "roadmap" ? (
          <RoadmapView entries={inventory} />
        ) : (
          <InventoryTable entries={byCategory[tab]} />
        )}
      </div>
    </div>
  );
}

export default RouteInventoryPanel;