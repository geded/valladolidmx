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
} from "@/components/workspace";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
              tone={w.accent === "muted" ? "muted" : (w.accent ?? "primary")}
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
    </div>
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