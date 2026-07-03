/**
 * /admin — Cockpit Fundador (Cockpit del Fundador).
 *
 * El Cockpit se renderiza íntegramente vía Experience Builder
 * (`CompositionRenderer`) sobre un árbol declarativo de bloques
 * `vmx.cockpit.*` registrados en el Block Registry.
 *
 * Cero JSX hardcodeado para paneles: para añadir, reordenar o quitar
 * widgets basta con modificar `DEFAULT_COCKPIT_TREE` (o, en el futuro,
 * persistirlo en una composición editable desde el Studio).
 */
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CompositionRenderer } from "@/lib/experience-builder/composition-renderer";
import type { CompositionTree } from "@/lib/experience-builder/composition-tree";
import {
  exportCockpitPanel,
  type CockpitPanel,
  type ExportFormat,
} from "@/lib/admin/cockpit.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminCockpit,
  head: () => ({
    meta: [
      { title: "Cockpit Fundador · Valladolid.mx" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type Window = "7d" | "30d" | "90d" | "ytd";
type Domain = "all" | "marketplace" | "concierge" | "portal" | "cms";

function buildCockpitTree(window: Window, domain: Domain): CompositionTree {
  return {
    root: {
      children: [
        {
          id: "cockpit-kpis",
          type: "vmx.cockpit.kpi-grid",
          version: "1.0.0",
          config: { title: "Visión global", window, domain },
          children: [],
        },
        {
          id: "cockpit-alerts",
          type: "vmx.cockpit.alerts",
          version: "1.0.0",
          config: { title: "Alertas", limit: 10 },
          children: [],
        },
        {
          id: "cockpit-activity",
          type: "vmx.cockpit.activity-stream",
          version: "1.0.0",
          config: { title: "Actividad reciente", limit: 20 },
          children: [],
        },
      ],
    },
  };
}

function AdminCockpit() {
  const [window, setWindow] = useState<Window>("30d");
  const [domain, setDomain] = useState<Domain>("all");
  const tree = useMemo(() => buildCockpitTree(window, domain), [window, domain]);

  const exportFn = useServerFn(exportCockpitPanel);
  const [exporting, setExporting] = useState(false);

  async function handleExport(panel: CockpitPanel, format: ExportFormat) {
    setExporting(true);
    try {
      const result = await exportFn({ data: { panel, format } });
      const blob = new Blob([result.content], {
        type: format === "csv" ? "text/csv" : "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cockpit-${panel}-${result.generated_at}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="max-w-6xl space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
          Cockpit del Fundador
        </p>
        <h1 className="mt-2 text-3xl">Cockpit del Fundador</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Compuesto en su totalidad mediante el Experience Builder. Para añadir
          un nuevo widget basta con registrar un Block Contract; este Cockpit
          se reorganiza por composición.
        </p>
      </header>

      <section className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card/40 p-4">
        <label className="flex flex-col text-xs text-muted-foreground">
          Ventana
          <select
            value={window}
            onChange={(e) => setWindow(e.target.value as Window)}
            className="mt-1 rounded-md border border-border bg-background px-2 py-1 text-sm"
          >
            <option value="7d">7 días</option>
            <option value="30d">30 días</option>
            <option value="90d">90 días</option>
            <option value="ytd">Año en curso</option>
          </select>
        </label>
        <label className="flex flex-col text-xs text-muted-foreground">
          Dominio
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value as Domain)}
            className="mt-1 rounded-md border border-border bg-background px-2 py-1 text-sm"
          >
            <option value="all">Todos</option>
            <option value="marketplace">Marketplace</option>
            <option value="concierge">Concierge</option>
            <option value="portal">Portal</option>
            <option value="cms">CMS</option>
          </select>
        </label>
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleExport("kpis", "csv")}
            disabled={exporting}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
          >
            Export KPIs (CSV)
          </button>
          <button
            type="button"
            onClick={() => handleExport("kpis", "json")}
            disabled={exporting}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
          >
            Export KPIs (JSON)
          </button>
          <button
            type="button"
            onClick={() => handleExport("alerts", "csv")}
            disabled={exporting}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
          >
            Export Alertas (CSV)
          </button>
        </div>
      </section>

      <div className="space-y-4">
        <CompositionRenderer tree={tree} pageType="cockpit" />
      </div>
    </div>
  );
}