/**
 * Playground interno — OLA H-02 · I1.
 *
 * NO afecta navegación pública, SEO ni UX del sitio.
 * - Ruta bajo `/lovable/*` (namespace interno).
 * - `noindex, nofollow`.
 * - No monta el Context Engine en rutas reales; sólo lo ejercita aquí.
 */
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ContextEngineProvider,
  clearPreviousContext,
  defineRouteContext,
  subscribeContextEngineEvents,
  useResolvedContext,
  type ContextEngineEvent,
  type ContextEngineEventMeta,
  type RouteContextDeclaration,
} from "@/lib/context-engine";
import { PublicShell } from "@/components/discovery";

export const Route = createFileRoute("/lovable/context-engine-preview")({
  head: () => ({
    meta: [
      { title: "Context Engine · Playground (H-02 · I1)" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: PlaygroundPage,
});

type Scenario = "destination" | "category_from_destination" | "detail_from_category";

function buildDeclaration(scenario: Scenario): RouteContextDeclaration {
  switch (scenario) {
    case "destination":
      return defineRouteContext({
        current: {
          kind: "destination",
          slug: "valladolid",
          label: "Valladolid",
          href: "/oriente-maya/valladolid",
        },
        ancestors: [
          {
            kind: "region",
            slug: "oriente-maya",
            label: "Oriente Maya",
            href: "/oriente-maya",
          },
        ],
        canonical: "/oriente-maya/valladolid",
      });
    case "category_from_destination":
      return defineRouteContext({
        current: {
          kind: "category",
          slug: "hoteles",
          label: "Hoteles",
          href: "/hoteles",
        },
        // Sin ancestros explícitos → intentará heredar destino/región del recorrido previo.
        inherit: ["region", "destination"],
        canonical: "/hoteles",
        kindDefaults: [], // sin fallback: si no hay previo, ancestros vacíos
      });
    case "detail_from_category":
      return defineRouteContext({
        current: {
          kind: "hotel",
          slug: "hacienda-selva",
          label: "Hacienda Selva",
          href: "/marketplace/hacienda-selva",
        },
        inherit: ["region", "destination", "category"],
        canonical: "/marketplace/hacienda-selva",
        kindDefaults: [
          { kind: "marketplace", label: "Marketplace", href: "/marketplace" },
        ],
      });
  }
}

interface LogRow {
  ts: number;
  event: ContextEngineEvent;
  meta: ContextEngineEventMeta;
}

function PlaygroundPage() {
  const [scenario, setScenario] = useState<Scenario>("destination");
  const [log, setLog] = useState<LogRow[]>([]);

  useEffect(() => {
    return subscribeContextEngineEvents((event, meta) => {
      setLog((prev) => [{ ts: Date.now(), event, meta }, ...prev].slice(0, 40));
    });
  }, []);

  const declaration = buildDeclaration(scenario);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Playground interno · H-02 · I1
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Context Engine</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ejercita el resolver, la herencia por whitelist y la persistencia del
          recorrido previo. Cero impacto en el sitio público.
        </p>
      </header>

      <section className="mb-6 flex flex-wrap gap-2">
        <ScenarioButton current={scenario} value="destination" onSelect={setScenario}>
          1. Ir a destino (Valladolid)
        </ScenarioButton>
        <ScenarioButton
          current={scenario}
          value="category_from_destination"
          onSelect={setScenario}
        >
          2. Ir a categoría (Hoteles)
        </ScenarioButton>
        <ScenarioButton
          current={scenario}
          value="detail_from_category"
          onSelect={setScenario}
        >
          3. Ir a detalle (Hacienda Selva)
        </ScenarioButton>
        <button
          type="button"
          onClick={() => {
            clearPreviousContext();
            setLog([]);
          }}
          className="rounded-md border px-3 py-1 text-xs"
        >
          Reset recorrido previo
        </button>
      </section>

      <ContextEngineProvider declaration={declaration}>
        <ContextDebugPanel />
      </ContextEngineProvider>

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-semibold">
          PublicShell real · <code>useContextCrumbs</code>
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Este bloque monta un <code>PublicShell</code> de producción con
          <code> contextDeclaration</code> y <code>useContextCrumbs</code>.
          El breadcrumb refleja ancestros + herencia del recorrido previo.
        </p>
        <div className="rounded-lg border">
          <PublicShell
            eyebrow="Playground"
            title={declaration.current.label}
            description="Breadcrumb derivado del Context Engine."
            contextDeclaration={declaration}
            useContextCrumbs
          >
            <p className="text-sm text-muted-foreground">
              Cambia de escenario arriba y observa cómo cambian las migas.
            </p>
          </PublicShell>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-semibold">Eventos emitidos</h2>
        <ul className="space-y-1 text-xs font-mono">
          {log.length === 0 ? (
            <li className="text-muted-foreground">— sin eventos aún —</li>
          ) : (
            log.map((row, i) => (
              <li key={i} className="rounded bg-muted/40 px-2 py-1">
                <span className="font-semibold">{row.event}</span>{" "}
                <span className="text-muted-foreground">
                  {JSON.stringify(row.meta)}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </main>
  );
}

function ScenarioButton({
  current,
  value,
  onSelect,
  children,
}: {
  current: Scenario;
  value: Scenario;
  onSelect: (v: Scenario) => void;
  children: React.ReactNode;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={
        "rounded-md border px-3 py-1 text-xs " +
        (active ? "bg-primary text-primary-foreground" : "bg-background")
      }
    >
      {children}
    </button>
  );
}

function ContextDebugPanel() {
  const ctx = useResolvedContext();
  if (!ctx) {
    return <p className="text-sm text-muted-foreground">Sin contexto.</p>;
  }
  return (
    <div className="rounded-lg border p-4 text-sm">
      <div className="mb-2">
        <span className="font-semibold">source:</span> {ctx.source}
      </div>
      <div className="mb-2">
        <span className="font-semibold">canonical:</span> {ctx.canonical}
      </div>
      <div className="mb-2">
        <span className="font-semibold">current:</span>{" "}
        {ctx.current.kind} · {ctx.current.label}
      </div>
      <div className="mb-2">
        <span className="font-semibold">ancestors:</span>{" "}
        {ctx.ancestors.length === 0
          ? "—"
          : ctx.ancestors.map((a) => `${a.kind}:${a.label}`).join(" › ")}
      </div>
      <div className="mb-2">
        <span className="font-semibold">region:</span>{" "}
        {ctx.region?.label ?? "—"} · <span className="font-semibold">destination:</span>{" "}
        {ctx.destination?.label ?? "—"} · <span className="font-semibold">category:</span>{" "}
        {ctx.category?.label ?? "—"}
      </div>
      <div>
        <span className="font-semibold">previous:</span>{" "}
        {ctx.previous
          ? `${ctx.previous.from.kind}:${ctx.previous.from.label} (@${new Date(
              ctx.previous.at,
            ).toLocaleTimeString()})`
          : "—"}
      </div>
    </div>
  );
}