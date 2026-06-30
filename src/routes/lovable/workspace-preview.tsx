/**
 * 15.10.5 — Workspace UX Prototype (navegable)
 *
 * Prototipo de validación previo a la implementación del Workspace.
 * Combina 3 dispositivos × 5 workspaces = 15 mockups wireframe.
 * Ruta aislada — no modifica ninguna superficie existente.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Home,
  LayoutDashboard,
  Users,
  Settings,
  Bell,
  Search,
  Plus,
  Command,
  ChevronRight,
  Building2,
  Headphones,
  FileText,
  Layers,
  Sparkles,
  Calendar,
  BarChart3,
  Inbox,
  Filter,
  MoreHorizontal,
  PanelLeft,
  Smartphone,
  Tablet,
  Monitor,
} from "lucide-react";

export const Route = createFileRoute("/lovable/workspace-preview")({
  component: WorkspacePreview,
  head: () => ({
    meta: [
      { title: "Workspace UX Prototype · Valladolid.mx" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type Device = "iphone" | "ipad" | "desktop";
type WorkspaceId = "founder" | "portal" | "concierge" | "cms" | "eb";

const DEVICES: { id: Device; label: string; icon: typeof Smartphone; w: number; h: number }[] = [
  { id: "iphone", label: "iPhone", icon: Smartphone, w: 390, h: 780 },
  { id: "ipad", label: "iPad", icon: Tablet, w: 900, h: 680 },
  { id: "desktop", label: "Desktop", icon: Monitor, w: 1280, h: 760 },
];

const WORKSPACES: {
  id: WorkspaceId;
  label: string;
  short: string;
  icon: typeof Home;
  accent: string;
  areas: { icon: typeof Home; label: string }[];
  primary: string;
}[] = [
  {
    id: "founder",
    label: "Founder Workspace",
    short: "Fundador",
    icon: LayoutDashboard,
    accent: "#e9a23b",
    areas: [
      { icon: Home, label: "Hoy" },
      { icon: BarChart3, label: "Operación" },
      { icon: Bell, label: "Alertas" },
      { icon: Sparkles, label: "IA / Alux" },
      { icon: Settings, label: "Sistema" },
    ],
    primary: "Exportar panel",
  },
  {
    id: "portal",
    label: "Portal Empresarial",
    short: "Portal",
    icon: Building2,
    accent: "#2563eb",
    areas: [
      { icon: Home, label: "Resumen" },
      { icon: FileText, label: "Ficha" },
      { icon: Layers, label: "Catálogo" },
      { icon: Calendar, label: "Reservas" },
      { icon: Users, label: "Equipo" },
    ],
    primary: "Publicar cambios",
  },
  {
    id: "concierge",
    label: "Concierge Workspace",
    short: "Concierge",
    icon: Headphones,
    accent: "#0ea5e9",
    areas: [
      { icon: Inbox, label: "Bandeja" },
      { icon: FileText, label: "Expedientes" },
      { icon: Calendar, label: "Agenda" },
      { icon: Sparkles, label: "Alux" },
      { icon: BarChart3, label: "Métricas" },
    ],
    primary: "Nuevo expediente",
  },
  {
    id: "cms",
    label: "CMS Studio",
    short: "CMS",
    icon: FileText,
    accent: "#7c3aed",
    areas: [
      { icon: Home, label: "Resumen" },
      { icon: Building2, label: "Empresas" },
      { icon: Layers, label: "Territorio" },
      { icon: FileText, label: "Reseñas" },
      { icon: BarChart3, label: "Observabilidad" },
    ],
    primary: "Nueva entidad",
  },
  {
    id: "eb",
    label: "Experience Builder",
    short: "EB",
    icon: Layers,
    accent: "#059669",
    areas: [
      { icon: Layers, label: "Páginas" },
      { icon: Sparkles, label: "Bloques" },
      { icon: FileText, label: "Plantillas" },
      { icon: Settings, label: "Tokens" },
      { icon: BarChart3, label: "Publicaciones" },
    ],
    primary: "Publicar página",
  },
];

function WorkspacePreview() {
  const [device, setDevice] = useState<Device>("desktop");
  const [ws, setWs] = useState<WorkspaceId>("founder");
  const workspace = WORKSPACES.find((w) => w.id === ws)!;

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900">
      {/* Toolbar */}
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-5 py-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">
              15.10.5 · Prototype
            </p>
            <h1 className="text-sm font-semibold">Workspace UX · Navegable</h1>
          </div>
          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800">
            Wireframe · No implementación
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1 rounded-full bg-neutral-100 p-1">
              {DEVICES.map((d) => {
                const Icon = d.icon;
                const active = d.id === device;
                return (
                  <button
                    key={d.id}
                    onClick={() => setDevice(d.id)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      active ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-800"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {d.label}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-1 rounded-full bg-neutral-100 p-1">
              {WORKSPACES.map((w) => {
                const active = w.id === ws;
                return (
                  <button
                    key={w.id}
                    onClick={() => setWs(w.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      active ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-800"
                    }`}
                    style={active ? { boxShadow: `inset 0 -2px 0 ${w.accent}` } : undefined}
                  >
                    {w.short}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Stage */}
      <main className="flex flex-col items-center px-4 py-8">
        <p className="mb-4 text-xs text-neutral-500">
          {workspace.label} · {DEVICES.find((d) => d.id === device)!.label} ·
          <span className="ml-1 font-mono">
            {DEVICES.find((d) => d.id === device)!.w}×{DEVICES.find((d) => d.id === device)!.h}
          </span>
        </p>
        <DeviceFrame device={device}>
          {device === "iphone" && <IPhoneMock workspace={workspace} />}
          {device === "ipad" && <IPadMock workspace={workspace} />}
          {device === "desktop" && <DesktopMock workspace={workspace} />}
        </DeviceFrame>

        <section className="mt-10 grid w-full max-w-[1100px] gap-4 md:grid-cols-3">
          <Legend title="Sidebar adaptable" body="Expanded / Rail / Hidden / Floating según breakpoint y preferencia." />
          <Legend title="Inspector contextual" body="Acoplado (desktop), drawer (iPad portrait), bottom sheet (móvil)." />
          <Legend title="Composición declarativa" body="Workspace central renderizado vía Experience Builder (CompositionTree)." />
        </section>
      </main>
    </div>
  );
}

/* ───────────── Device Frame ───────────── */

function DeviceFrame({ device, children }: { device: Device; children: React.ReactNode }) {
  if (device === "iphone") {
    return (
      <div className="relative" style={{ width: 390, height: 780 }}>
        <div className="absolute inset-0 rounded-[48px] border-[10px] border-neutral-900 bg-neutral-900 shadow-2xl">
          <div className="absolute left-1/2 top-2 z-20 h-6 w-28 -translate-x-1/2 rounded-full bg-neutral-900" />
          <div className="h-full w-full overflow-hidden rounded-[38px] bg-white">{children}</div>
        </div>
      </div>
    );
  }
  if (device === "ipad") {
    return (
      <div className="rounded-[28px] border-[12px] border-neutral-900 bg-neutral-900 shadow-2xl" style={{ width: 900, height: 680 }}>
        <div className="h-full w-full overflow-hidden rounded-[16px] bg-white">{children}</div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-neutral-300 bg-neutral-900 shadow-2xl" style={{ width: 1280, height: 760 }}>
      <div className="flex items-center gap-1.5 border-b border-neutral-800 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
        <span className="ml-3 rounded bg-neutral-800 px-2 py-0.5 text-[10px] font-mono text-neutral-400">
          valladolid.mx/workspace
        </span>
      </div>
      <div className="h-[calc(100%-32px)] w-full overflow-hidden rounded-b-lg bg-white">{children}</div>
    </div>
  );
}

/* ───────────── Shared primitives ───────────── */

type WS = (typeof WORKSPACES)[number];

function Dash({ className = "", children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div className={`rounded-md border border-dashed border-neutral-300 bg-neutral-50 ${className}`}>{children}</div>
  );
}

function Bar({ w = "100%", h = 8, opacity = 1 }: { w?: string | number; h?: number; opacity?: number }) {
  return <div style={{ width: w, height: h, opacity }} className="rounded-full bg-neutral-300" />;
}

function KpiCard({ accent }: { accent: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <Bar w={48} h={6} />
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
      </div>
      <div className="mt-2 text-lg font-semibold text-neutral-900">$ —</div>
      <Bar w={64} h={5} opacity={0.6} />
    </div>
  );
}

function EntityCard({ accent }: { accent: string }) {
  return (
    <div className="flex gap-3 rounded-lg border border-neutral-200 bg-white p-3">
      <div className="h-12 w-12 shrink-0 rounded-md bg-neutral-100" />
      <div className="flex flex-1 flex-col gap-1.5 py-0.5">
        <Bar w="70%" h={8} />
        <Bar w="45%" h={6} opacity={0.6} />
        <div className="mt-1 flex gap-1">
          <span className="rounded-full px-1.5 py-px text-[9px] font-medium" style={{ background: `${accent}22`, color: accent }}>
            Estado
          </span>
          <span className="rounded-full bg-neutral-100 px-1.5 py-px text-[9px] text-neutral-500">Meta</span>
        </div>
      </div>
    </div>
  );
}

/* ───────────── iPhone ───────────── */

function IPhoneMock({ workspace }: { workspace: WS }) {
  const Icon = workspace.icon;
  return (
    <div className="flex h-full flex-col bg-neutral-50">
      {/* status bar */}
      <div className="flex items-center justify-between px-6 pt-3 text-[10px] font-semibold text-neutral-900">
        <span>9:41</span>
        <span>•••</span>
      </div>
      {/* header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <button className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${workspace.accent}1a` }}>
            <Icon className="h-4 w-4" style={{ color: workspace.accent }} />
          </div>
          <div className="text-left">
            <p className="text-[9px] uppercase tracking-wider text-neutral-500">Workspace</p>
            <p className="text-xs font-semibold leading-tight">{workspace.short}</p>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <button className="rounded-full bg-white p-1.5 ring-1 ring-neutral-200">
            <Search className="h-3.5 w-3.5" />
          </button>
          <button className="rounded-full bg-white p-1.5 ring-1 ring-neutral-200">
            <Bell className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* command palette hint */}
      <div className="mx-4 flex items-center gap-2 rounded-full bg-white px-3 py-2 text-[11px] text-neutral-500 ring-1 ring-neutral-200">
        <Command className="h-3 w-3" />
        <span>Buscar o ejecutar…</span>
      </div>

      {/* view title */}
      <div className="px-4 pt-4 pb-3">
        <h2 className="text-xl font-semibold leading-tight">{workspace.areas[0].label}</h2>
        <p className="text-[11px] text-neutral-500">Vista principal · Workspace móvil</p>
      </div>

      {/* content cards */}
      <div className="flex-1 space-y-2.5 overflow-hidden px-4">
        <div className="grid grid-cols-2 gap-2.5">
          <KpiCard accent={workspace.accent} />
          <KpiCard accent={workspace.accent} />
        </div>
        <EntityCard accent={workspace.accent} />
        <EntityCard accent={workspace.accent} />
        <EntityCard accent={workspace.accent} />
      </div>

      {/* bottom nav */}
      <div className="mx-3 mb-4 mt-3 flex items-center justify-around rounded-2xl bg-white px-2 py-2 shadow-lg ring-1 ring-neutral-200">
        {workspace.areas.slice(0, 2).map((a, i) => {
          const A = a.icon;
          return (
            <button key={i} className="flex flex-col items-center gap-0.5 px-2 py-1">
              <A className="h-4 w-4" style={{ color: i === 0 ? workspace.accent : "#737373" }} />
              <span className="text-[9px]" style={{ color: i === 0 ? workspace.accent : "#737373" }}>{a.label}</span>
            </button>
          );
        })}
        <button className="-mt-6 flex h-12 w-12 items-center justify-center rounded-full shadow-lg" style={{ background: workspace.accent }}>
          <Plus className="h-5 w-5 text-white" />
        </button>
        {workspace.areas.slice(3, 5).map((a, i) => {
          const A = a.icon;
          return (
            <button key={i} className="flex flex-col items-center gap-0.5 px-2 py-1">
              <A className="h-4 w-4 text-neutral-500" />
              <span className="text-[9px] text-neutral-500">{a.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────── iPad ───────────── */

function IPadMock({ workspace }: { workspace: WS }) {
  const Icon = workspace.icon;
  return (
    <div className="flex h-full bg-neutral-50">
      {/* rail sidebar */}
      <aside className="flex w-16 flex-col items-center gap-1 border-r border-neutral-200 bg-white py-4">
        <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${workspace.accent}1a` }}>
          <Icon className="h-4 w-4" style={{ color: workspace.accent }} />
        </div>
        {workspace.areas.map((a, i) => {
          const A = a.icon;
          const active = i === 0;
          return (
            <button
              key={i}
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${active ? "" : "text-neutral-400 hover:text-neutral-700"}`}
              style={active ? { background: `${workspace.accent}1a`, color: workspace.accent } : undefined}
            >
              <A className="h-4 w-4" />
            </button>
          );
        })}
        <div className="mt-auto flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200 text-[10px] font-semibold">
          U
        </div>
      </aside>

      {/* main */}
      <section className="flex flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-neutral-200 bg-white px-5 py-3">
          <PanelLeft className="h-4 w-4 text-neutral-400" />
          <span className="text-[11px] text-neutral-500">{workspace.short}</span>
          <ChevronRight className="h-3 w-3 text-neutral-400" />
          <span className="text-[11px] font-semibold">{workspace.areas[0].label}</span>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1.5 text-[11px] text-neutral-500">
              <Command className="h-3 w-3" /> Buscar
            </div>
            <button
              className="rounded-full px-3 py-1.5 text-[11px] font-semibold text-white"
              style={{ background: workspace.accent }}
            >
              {workspace.primary}
            </button>
          </div>
        </header>

        <div className="flex flex-1">
          <div className="flex-1 overflow-hidden px-5 py-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{workspace.areas[0].label}</h2>
              <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                <Filter className="h-3 w-3" /> Filtros
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <KpiCard accent={workspace.accent} />
              <KpiCard accent={workspace.accent} />
              <KpiCard accent={workspace.accent} />
              <KpiCard accent={workspace.accent} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Dash className="h-32 p-3">
                <Bar w={60} h={6} />
                <div className="mt-2 grid h-20 grid-cols-7 items-end gap-1">
                  {[40, 70, 55, 80, 35, 60, 90].map((h, i) => (
                    <div key={i} className="rounded-sm" style={{ height: `${h}%`, background: `${workspace.accent}66` }} />
                  ))}
                </div>
              </Dash>
              <Dash className="h-32 p-3 space-y-2">
                <Bar w={48} h={6} />
                <EntityCard accent={workspace.accent} />
              </Dash>
            </div>
            <div className="mt-3 space-y-2">
              <EntityCard accent={workspace.accent} />
              <EntityCard accent={workspace.accent} />
            </div>
          </div>

          {/* inspector drawer */}
          <aside className="w-64 border-l border-neutral-200 bg-white p-4">
            <p className="text-[10px] uppercase tracking-wider text-neutral-500">Inspector</p>
            <h3 className="mt-1 text-sm font-semibold">Detalle seleccionado</h3>
            <div className="mt-3 space-y-2">
              <Bar w="80%" h={6} />
              <Bar w="60%" h={6} opacity={0.6} />
              <Bar w="90%" h={6} opacity={0.6} />
            </div>
            <div className="mt-4 flex gap-2 border-b border-neutral-200 text-[10px]">
              {["Detalles", "Actividad", "Historial"].map((t, i) => (
                <span key={t} className={`pb-1.5 ${i === 0 ? "border-b-2 font-semibold" : "text-neutral-500"}`} style={i === 0 ? { borderColor: workspace.accent } : undefined}>
                  {t}
                </span>
              ))}
            </div>
            <div className="mt-3 space-y-2">
              <Dash className="h-10" />
              <Dash className="h-10" />
              <Dash className="h-20" />
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

/* ───────────── Desktop ───────────── */

function DesktopMock({ workspace }: { workspace: WS }) {
  const Icon = workspace.icon;
  return (
    <div className="flex h-full bg-neutral-50">
      {/* expanded sidebar */}
      <aside className="flex w-60 flex-col border-r border-neutral-200 bg-white">
        <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${workspace.accent}1a` }}>
            <Icon className="h-4 w-4" style={{ color: workspace.accent }} />
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-neutral-500">Workspace</p>
            <p className="text-xs font-semibold leading-tight">{workspace.short}</p>
          </div>
          <ChevronRight className="ml-auto h-3 w-3 text-neutral-400" />
        </div>
        <nav className="flex-1 space-y-0.5 px-2 py-3">
          <p className="px-2 pb-1 text-[9px] uppercase tracking-wider text-neutral-400">Áreas</p>
          {workspace.areas.map((a, i) => {
            const A = a.icon;
            const active = i === 0;
            return (
              <button
                key={i}
                className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-xs ${
                  active ? "font-semibold" : "text-neutral-600 hover:bg-neutral-50"
                }`}
                style={active ? { background: `${workspace.accent}14`, color: workspace.accent } : undefined}
              >
                <A className="h-3.5 w-3.5" />
                {a.label}
              </button>
            );
          })}
          <p className="px-2 pb-1 pt-3 text-[9px] uppercase tracking-wider text-neutral-400">Favoritos</p>
          {["Reseñas pendientes", "Equipo", "Reportes"].map((s) => (
            <button key={s} className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs text-neutral-600 hover:bg-neutral-50">
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
              {s}
            </button>
          ))}
        </nav>
        <div className="border-t border-neutral-200 p-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-neutral-200 text-[10px]" />
            <div className="flex-1">
              <Bar w="80%" h={6} />
              <div className="mt-1"><Bar w="50%" h={5} opacity={0.5} /></div>
            </div>
            <MoreHorizontal className="h-3.5 w-3.5 text-neutral-400" />
          </div>
        </div>
      </aside>

      {/* main */}
      <section className="flex flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-neutral-200 bg-white px-6 py-3">
          <span className="text-[11px] text-neutral-500">{workspace.short}</span>
          <ChevronRight className="h-3 w-3 text-neutral-400" />
          <span className="text-[11px] font-semibold">{workspace.areas[0].label}</span>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-md bg-neutral-100 px-3 py-1.5 text-[11px] text-neutral-500 ring-1 ring-neutral-200">
              <Command className="h-3 w-3" /> Buscar o ejecutar
              <kbd className="rounded bg-white px-1 font-mono text-[9px] text-neutral-500 ring-1 ring-neutral-200">⌘K</kbd>
            </div>
            <button className="rounded-full bg-neutral-100 p-1.5"><Bell className="h-3.5 w-3.5" /></button>
            <button
              className="rounded-full px-3 py-1.5 text-[11px] font-semibold text-white"
              style={{ background: workspace.accent }}
            >
              {workspace.primary}
            </button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-semibold">{workspace.areas[0].label}</h2>
                <p className="text-xs text-neutral-500">Composición declarativa · Experience Builder</p>
              </div>
              <div className="flex items-center gap-1.5">
                {["Hoy", "7 días", "30 días", "Trimestre"].map((p, i) => (
                  <button
                    key={p}
                    className={`rounded-full px-2.5 py-1 text-[11px] ${i === 1 ? "bg-neutral-900 text-white" : "bg-white text-neutral-600 ring-1 ring-neutral-200"}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <KpiCard accent={workspace.accent} />
              <KpiCard accent={workspace.accent} />
              <KpiCard accent={workspace.accent} />
              <KpiCard accent={workspace.accent} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <Dash className="col-span-2 h-48 p-4">
                <div className="flex items-center justify-between">
                  <Bar w={80} h={7} />
                  <span className="text-[10px] text-neutral-400">vmx.chart.timeseries</span>
                </div>
                <div className="mt-3 grid h-32 grid-cols-12 items-end gap-1.5">
                  {[35, 50, 42, 65, 55, 72, 60, 80, 68, 88, 74, 92].map((h, i) => (
                    <div key={i} className="rounded-sm" style={{ height: `${h}%`, background: `${workspace.accent}80` }} />
                  ))}
                </div>
              </Dash>
              <Dash className="h-48 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Bar w={60} h={7} />
                  <span className="text-[10px] text-neutral-400">vmx.alerts</span>
                </div>
                <EntityCard accent={workspace.accent} />
                <EntityCard accent={workspace.accent} />
              </Dash>
            </div>
            <div className="mt-4">
              <Dash className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <Bar w={120} h={7} />
                  <span className="text-[10px] text-neutral-400">vmx.activity-stream</span>
                </div>
                <div className="space-y-2">
                  <EntityCard accent={workspace.accent} />
                  <EntityCard accent={workspace.accent} />
                  <EntityCard accent={workspace.accent} />
                </div>
              </Dash>
            </div>
          </div>

          {/* inspector acoplado */}
          <aside className="w-80 shrink-0 border-l border-neutral-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-wider text-neutral-500">Inspector contextual</p>
              <MoreHorizontal className="h-4 w-4 text-neutral-400" />
            </div>
            <h3 className="mt-2 text-base font-semibold">Detalle seleccionado</h3>
            <p className="text-[11px] text-neutral-500">Edición sin abandonar la lista</p>
            <div className="mt-4 flex gap-3 border-b border-neutral-200 text-[11px]">
              {["Detalles", "Actividad", "Comentarios", "Historial"].map((t, i) => (
                <span key={t} className={`pb-2 ${i === 0 ? "border-b-2 font-semibold" : "text-neutral-500"}`} style={i === 0 ? { borderColor: workspace.accent } : undefined}>
                  {t}
                </span>
              ))}
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-neutral-400">Nombre</p>
                <Dash className="mt-1 h-8" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-neutral-400">Estado</p>
                <Dash className="mt-1 h-8" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-neutral-400">Notas</p>
                <Dash className="mt-1 h-24" />
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button className="flex-1 rounded-md px-3 py-2 text-[11px] font-semibold text-white" style={{ background: workspace.accent }}>
                Guardar
              </button>
              <button className="rounded-md px-3 py-2 text-[11px] font-semibold text-neutral-700 ring-1 ring-neutral-200">
                Cancelar
              </button>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

/* ───────────── Legend ───────────── */

function Legend({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h3 className="text-xs font-semibold">{title}</h3>
      <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">{body}</p>
    </div>
  );
}
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/lovable/workspace-preview')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/lovable/workspace-preview"!</div>
}
