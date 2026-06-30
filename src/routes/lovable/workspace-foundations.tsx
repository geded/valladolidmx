/**
 * 15.10.5a — Workspace Foundations · Showcase interno (dev-only).
 *
 * Galería viva de cada primitive del Workspace Engine en los 6
 * breakpoints. Permite cambiar workspace activo, densidad y tema.
 * No es la migración de superficies (eso es 15.10.5c). Sirve como
 * verificación de los cimientos aprobados en la adenda.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Bell,
  Sparkles,
  Inbox,
  Building2,
  Image as ImageIcon,
  Wand2,
  Sun,
  Moon,
  Type,
  ArrowLeft,
  ArrowRight,
  Hand,
  Layers,
} from "lucide-react";
import {
  WorkspaceProvider,
  WorkspaceShell,
  EntityCard,
  MetricCard,
  ActionCard,
  EmptyState,
  SkeletonGrid,
  useWorkspace,
  useWorkspaceBreakpoint,
  useWorkspaceContext,
  useSelection,
  useFocusedEntity,
  useAvailableActions,
  useSheetStack,
  useSwipeActions,
  useLongPress,
} from "@/components/workspace";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { workspaceToast } from "@/lib/workspace/toast-bus";
import {
  listEntitiesFor,
  listQuickActionsFor,
} from "@/lib/workspace/context-registry";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/lovable/workspace-foundations")({
  component: Page,
});

function Page() {
  return (
    <WorkspaceProvider initialWorkspaceId="founder">
      <WorkspaceShell title="Workspace Foundations">
        <FoundationsContent />
      </WorkspaceShell>
    </WorkspaceProvider>
  );
}

function FoundationsContent() {
  const { workspace, density, setDensity, workspaces, setActiveWorkspace } = useWorkspace();
  const bp = useWorkspaceBreakpoint();
  const [dark, setDark] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <div className="space-y-8">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Adenda 15.10.5a · Workspace Foundations
          </div>
          <h1 className="mt-1 truncate font-display text-2xl">
            {workspace?.label ?? "Workspace"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Breakpoint actual: <code className="rounded bg-muted px-1.5 py-0.5">{bp}</code> · Densidad: <code className="rounded bg-muted px-1.5 py-0.5">{density}</code>
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDensity(density === "compact" ? "comfortable" : "compact")}
          >
            <Type className="h-4 w-4" aria-hidden /> {density === "compact" ? "Cómoda" : "Compacta"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDark((d) => !d)}>
            {dark ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
            {dark ? "Claro" : "Oscuro"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setLoading((l) => !l)}>
            {loading ? "Mostrar contenido" : "Mostrar skeleton"}
          </Button>
        </div>
      </header>

      <section>
        <SectionTitle>Workspaces registrados</SectionTitle>
        <p className="mb-3 text-sm text-muted-foreground">
          Cada workspace está declarado como <code>WorkspaceDefinition</code>. El Engine los descubre por el registry — sin acoplamientos.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((w) => (
            <ActionCard
              key={w.id}
              icon={w.icon}
              title={w.label}
              description={w.description}
              tone={w.accent === "caliza" || w.accent === undefined ? "muted" : w.accent}
              onClick={() => setActiveWorkspace(w.id)}
            />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Narrativa · Hoy · Pulso · Cambió</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard label="Reservas hoy" value="124" delta={12.4} intent="positive" hint="vs. ayer" />
          <MetricCard label="Reseñas pendientes" value="12" delta={-3.1} intent="warning" hint="moderación" />
          <MetricCard label="Empresas activas" value="318" delta={0} hint="sin cambio" />
        </div>
      </section>

      <section>
        <SectionTitle>Cards de entidad</SectionTitle>
        {loading ? (
          <SkeletonGrid count={6} />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SAMPLE_ENTITIES.map((e) => (
              <EntityCard
                key={e.id}
                eyebrow={e.eyebrow}
                title={e.title}
                meta={e.meta}
                description={e.description}
                badge={<Badge variant="secondary">{e.badge}</Badge>}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle>Estados vacíos</SectionTitle>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <EmptyState
            icon={Inbox}
            title="Sin actividad por ahora"
            description="Cuando lleguen nuevas reservas las verás aquí en tiempo real."
            variant="first-run"
            action={<Button size="sm">Crear ejemplo</Button>}
          />
          <EmptyState
            icon={Bell}
            title="Sin alertas con los filtros actuales"
            description="Prueba quitar el filtro de severidad o cambia el rango de fechas."
            variant="filtered"
            secondary={
              <Button size="sm" variant="outline">
                Limpiar filtros
              </Button>
            }
          />
        </div>
      </section>

      <section>
        <SectionTitle>Acciones rápidas</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ActionCard icon={Sparkles} title="Hablar con Alux" tone="primary" />
          <ActionCard icon={Building2} title="Nueva empresa" tone="selva" />
          <ActionCard icon={ImageIcon} title="Subir media" tone="cenote" />
          <ActionCard icon={Wand2} title="Experience Builder" tone="atardecer" />
        </div>
      </section>

      <ContextualLayerShowcase />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  15.10.5b — Contextual Layer showcase                                  */
/* ─────────────────────────────────────────────────────────────────────── */

function ContextualLayerShowcase() {
  const { workspace } = useWorkspace();
  if (!workspace) return null;

  return (
    <section className="space-y-6 rounded-2xl border border-dashed border-primary/40 bg-primary/[0.03] p-4">
      <header>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          Adenda 15.10.5b · Contextual Layer
        </div>
        <h2 className="mt-1 font-display text-xl">Capa contextual transversal</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Selección, foco, Inspector, Sheets, Gestos, Toast/Undo y Alux Explicable.
        </p>
      </header>

      <ContextRegistryPreview workspaceId={workspace.id} />
      <SelectionShowcase />
      <GesturesShowcase />
      <SheetStackShowcase />
      <ToastUndoShowcase />
      <ContextSnapshotPreview />
    </section>
  );
}

function ContextRegistryPreview({ workspaceId }: { workspaceId: string }) {
  const entities = listEntitiesFor(workspaceId);
  const actions = listQuickActionsFor(workspaceId);

  return (
    <div>
      <SubTitle>Context Registry</SubTitle>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Entidades declaradas
          </div>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {entities.length === 0 ? (
              <li className="text-sm text-muted-foreground">
                Sin entidades declaradas para este workspace.
              </li>
            ) : (
              entities.map((e) => (
                <li
                  key={e.type}
                  className="rounded-full border border-border bg-surface-raised px-2 py-0.5 text-xs"
                >
                  {e.label}{" "}
                  <span className="text-muted-foreground">·{e.type}</span>
                </li>
              ))
            )}
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Quick actions
          </div>
          <ul className="mt-2 space-y-1 text-sm">
            {actions.length === 0 ? (
              <li className="text-muted-foreground">Sin acciones rápidas.</li>
            ) : (
              actions.map((a) => (
                <li key={a.id} className="flex justify-between gap-2">
                  <span>{a.label}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {a.scope}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

const DEMO_ENTITIES = [
  { type: "review", id: "r1", label: "“Excelente atención”" },
  { type: "review", id: "r2", label: "“Volveríamos sin dudarlo”" },
  { type: "business", id: "b1", label: "Casa Hipil" },
  { type: "business", id: "b2", label: "Tours Sak-Lu" },
];

function SelectionShowcase() {
  const { selection, mode, setMode, toggle, clear, isSelected } = useSelection();
  const { setFocused } = useFocusedEntity();
  const available = useAvailableActions();

  const longPress = useLongPress(() => setMode("multi"));

  return (
    <div>
      <SubTitle>Selection Model + Foco</SubTitle>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">Modo:</span>
        {(["single", "multi"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "rounded-full border border-border px-2 py-0.5",
              mode === m ? "bg-primary text-primary-foreground" : "bg-surface",
            )}
          >
            {m}
          </button>
        ))}
        <span className="ml-auto text-muted-foreground">
          Selección: {selection.length} · Acciones disponibles: {available.length}
        </span>
        {selection.length > 0 ? (
          <Button size="sm" variant="ghost" onClick={clear}>
            Limpiar
          </Button>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {DEMO_ENTITIES.map((e) => {
          const selected = isSelected(e);
          return (
            <button
              key={`${e.type}:${e.id}`}
              type="button"
              {...longPress}
              onClick={() => {
                toggle(e);
                setFocused(e);
              }}
              className={cn(
                "flex items-center justify-between gap-2 rounded-xl border bg-surface p-3 text-left text-sm transition",
                selected
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-surface-raised",
              )}
            >
              <span className="min-w-0">
                <span className="block truncate font-semibold">{e.label}</span>
                <span className="text-[11px] text-muted-foreground">{e.type}</span>
              </span>
              {selected ? (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase text-primary-foreground">
                  Sel.
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Long-press en cualquier tarjeta activa el modo multi. La selección y el
        foco persisten en <code>sessionStorage</code> por workspace.
      </p>
    </div>
  );
}

function GesturesShowcase() {
  const swipe = useSwipeActions({
    onSwipeLeft: () =>
      workspaceToast.info("Swipe ←", { description: "Posponer ejemplo" }),
    onSwipeRight: () =>
      workspaceToast.success("Swipe →", { description: "Aprobado ejemplo" }),
  });
  return (
    <div>
      <SubTitle>Gestos universales</SubTitle>
      <div
        {...swipe}
        className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-border bg-surface p-4 text-sm"
      >
        <ArrowLeft className="h-4 w-4 text-muted-foreground" aria-hidden />
        <span className="flex items-center gap-2 text-muted-foreground">
          <Hand className="h-4 w-4" aria-hidden /> Swipe horizontal sobre esta
          tarjeta (touch o mouse)
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
      </div>
    </div>
  );
}

function SheetStackShowcase() {
  const sheets = useSheetStack();
  return (
    <div>
      <SubTitle>Sheet Stack (push/pop)</SubTitle>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            sheets.push({
              title: "Sheet · peek",
              snap: "peek",
              content: <p className="text-sm">Contenido en snap peek.</p>,
            })
          }
        >
          <Layers className="h-4 w-4" /> Abrir peek
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            sheets.push({
              title: "Sheet · half",
              snap: "half",
              content: (
                <div className="space-y-2 text-sm">
                  <p>Hoja a media altura.</p>
                  <Button
                    size="sm"
                    onClick={() =>
                      sheets.push({
                        title: "Sheet · full",
                        snap: "full",
                        content: <p className="text-sm">Hoja en snap full.</p>,
                      })
                    }
                  >
                    Apilar otra hoja
                  </Button>
                </div>
              ),
            })
          }
        >
          Abrir half
        </Button>
        <Button size="sm" variant="ghost" onClick={() => sheets.clear()}>
          Cerrar todas
        </Button>
      </div>
    </div>
  );
}

function ToastUndoShowcase() {
  return (
    <div>
      <SubTitle>Toast & Undo bus</SubTitle>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            workspaceToast.success("Elemento archivado", {
              description: "Puedes deshacer en los próximos 5s.",
              undo: {
                run: () => workspaceToast.info("Restaurado"),
              },
            })
          }
        >
          Acción reversible
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            workspaceToast.error("No se pudo completar", {
              description: "Reintenta más tarde.",
            })
          }
        >
          Error
        </Button>
      </div>
    </div>
  );
}

function ContextSnapshotPreview() {
  const ctx = useWorkspaceContext();
  return (
    <div>
      <SubTitle>Context Snapshot (Zero Loss)</SubTitle>
      <pre className="overflow-x-auto rounded-xl border border-border bg-surface p-3 text-[11px] leading-relaxed">
        {JSON.stringify(ctx.snapshot(), null, 2)}
      </pre>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Este snapshot se persiste en <code>sessionStorage</code> y se restaura al
        volver al workspace — la selección, el foco y los filtros sobreviven a
        recargas, cambios de inspector y aperturas de sheets.
      </p>
    </div>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 font-display text-sm uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 font-display text-lg">{children}</h2>
  );
}

const SAMPLE_ENTITIES = [
  { id: "1", eyebrow: "Hotel boutique", title: "Casa Hipil", meta: "Centro Histórico · 4.8 ★", description: "Hospedaje de autor con patio colonial y cenote privado.", badge: "Premium" },
  { id: "2", eyebrow: "Experiencia", title: "Sendero Ek Balam al amanecer", meta: "Temozón · 3 h", description: "Ruta guiada con desayuno regional y baño en cenote.", badge: "Hoy" },
  { id: "3", eyebrow: "Restaurante", title: "Cocina de la Plaza", meta: "Valladolid · $$", description: "Cocina yucateca contemporánea con producto local.", badge: "Top" },
  { id: "4", eyebrow: "Reseña", title: "“Una experiencia inolvidable”", meta: "Hace 2 h · pendiente moderar", description: "Excelente trato y guías locales muy preparados.", badge: "Mod." },
  { id: "5", eyebrow: "Ruta", title: "Oriente Maya en 3 días", meta: "Ruta sugerida · 12 paradas", description: "Selección curada de cenotes, ruinas y mercados.", badge: "Ruta" },
  { id: "6", eyebrow: "Empresa", title: "Tours Sak-Lu", meta: "Operador local · verificado", description: "Operador de excursiones a cenotes y sitios mayas.", badge: "Verif." },
];