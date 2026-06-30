/**
 * 15.10.5 — Workspace UX Prototype v2.0
 *
 * Itera sobre la v1 incorporando los requisitos P0/P1/P2 emitidos por
 * Product Design. Objetivo: validar que el Workspace funciona como
 * herramienta de operación diaria (no como dashboard) en iPhone, iPad y
 * Desktop, antes de tocar cualquier superficie administrativa real.
 *
 * Esta ruta es aislada y no modifica ninguna interfaz existente.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Home,
  LayoutDashboard,
  Bell,
  Search,
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
  PanelRight,
  Smartphone,
  Tablet,
  Monitor,
  Wifi,
  CloudCheck,
  ArrowUpRight,
  ArrowDownRight,
  Coffee,
  Pencil,
  Hand,
  MoveHorizontal,
  ChevronLeft,
  CheckCircle2,
  CircleDollarSign,
  MessageSquare,
  ArrowRight,
  Eye,
  Wand2,
} from "lucide-react";

export const Route = createFileRoute("/lovable/workspace-preview")({
  component: WorkspacePreview,
  head: () => ({
    meta: [
      { title: "Workspace UX Prototype v2.0 · Valladolid.mx" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

const T = {
  cal: "#F6F1E7",
  bone: "#FBF7EE",
  ink: "#1B1410",
  ink2: "#5A4A3D",
  line: "rgba(27,20,16,0.08)",
  line2: "rgba(27,20,16,0.14)",
  terra: "#B5462A",
  sisal: "#A8843A",
  cenote: "#1F6F7B",
  jungla: "#3B6B3A",
  cielo: "#5B6BB0",
  ok: "#3B6B3A",
  warn: "#B5462A",
  cash: "#0E5A3A",
};

type Device = "iphone" | "ipad" | "desktop";
type WorkspaceId = "founder" | "portal" | "concierge" | "cms" | "eb";
type ContextMode = "inspector" | "alux";

const DEVICES: { id: Device; label: string; icon: typeof Smartphone; w: number; h: number }[] = [
  { id: "iphone", label: "iPhone", icon: Smartphone, w: 390, h: 820 },
  { id: "ipad", label: "iPad", icon: Tablet, w: 820, h: 1120 },
  { id: "desktop", label: "Desktop", icon: Monitor, w: 1280, h: 800 },
];

type WS = {
  id: WorkspaceId;
  label: string;
  short: string;
  icon: typeof Home;
  accent: string;
  voice: string;
  rail: { icon: typeof Home; label: string }[];
  tabs: { icon: typeof Home; label: string }[];
};

const WORKSPACES: WS[] = [
  {
    id: "founder",
    label: "Founder Workspace",
    short: "Fundador",
    icon: LayoutDashboard,
    accent: T.terra,
    voice: "Centro de control diario del negocio",
    rail: [
      { icon: Home, label: "Hoy" },
      { icon: CircleDollarSign, label: "Dinero" },
      { icon: Bell, label: "Atención" },
      { icon: BarChart3, label: "Pulso" },
      { icon: Sparkles, label: "Alux" },
    ],
    tabs: [
      { icon: Home, label: "Hoy" },
      { icon: CircleDollarSign, label: "Dinero" },
      { icon: Bell, label: "Atención" },
      { icon: Sparkles, label: "Alux" },
      { icon: PanelRight, label: "Más" },
    ],
  },
  {
    id: "portal",
    label: "Portal Empresarial",
    short: "Portal",
    icon: Building2,
    accent: T.sisal,
    voice: "Tu negocio, hoy",
    rail: [
      { icon: Home, label: "Hoy" },
      { icon: Calendar, label: "Reservas" },
      { icon: CircleDollarSign, label: "Cobros" },
      { icon: MessageSquare, label: "Huéspedes" },
      { icon: Sparkles, label: "Alux" },
    ],
    tabs: [
      { icon: Home, label: "Hoy" },
      { icon: Calendar, label: "Reservas" },
      { icon: CircleDollarSign, label: "Cobros" },
      { icon: MessageSquare, label: "Chat" },
      { icon: PanelRight, label: "Más" },
    ],
  },
  {
    id: "concierge",
    label: "Concierge Workspace",
    short: "Concierge",
    icon: Headphones,
    accent: T.cenote,
    voice: "Conversaciones que esperan respuesta",
    rail: [
      { icon: Inbox, label: "Bandeja" },
      { icon: MessageSquare, label: "Casos" },
      { icon: FileText, label: "Propuestas" },
      { icon: Calendar, label: "Agenda" },
      { icon: Sparkles, label: "Alux" },
    ],
    tabs: [
      { icon: Inbox, label: "Bandeja" },
      { icon: MessageSquare, label: "Casos" },
      { icon: FileText, label: "Propuestas" },
      { icon: Sparkles, label: "Alux" },
      { icon: PanelRight, label: "Más" },
    ],
  },
  {
    id: "cms",
    label: "CMS Studio",
    short: "CMS",
    icon: FileText,
    accent: T.jungla,
    voice: "El contenido que define la ciudad",
    rail: [
      { icon: Home, label: "Hoy" },
      { icon: FileText, label: "Borradores" },
      { icon: CheckCircle2, label: "Aprobación" },
      { icon: BarChart3, label: "Publicado" },
      { icon: Sparkles, label: "Alux" },
    ],
    tabs: [
      { icon: Home, label: "Hoy" },
      { icon: FileText, label: "Drafts" },
      { icon: CheckCircle2, label: "Aprobar" },
      { icon: Sparkles, label: "Alux" },
      { icon: PanelRight, label: "Más" },
    ],
  },
  {
    id: "eb",
    label: "Experience Builder",
    short: "Builder",
    icon: Layers,
    accent: T.cielo,
    voice: "Cómo se ve Valladolid hoy",
    rail: [
      { icon: Home, label: "Home" },
      { icon: Layers, label: "Secciones" },
      { icon: Eye, label: "Previa" },
      { icon: BarChart3, label: "A/B" },
      { icon: Sparkles, label: "Alux" },
    ],
    tabs: [
      { icon: Home, label: "Home" },
      { icon: Layers, label: "Secciones" },
      { icon: Eye, label: "Previa" },
      { icon: Sparkles, label: "Alux" },
      { icon: PanelRight, label: "Más" },
    ],
  },
];

type Narrative = {
  greeting: string;
  hoy: { title: string; body: string; cta: string; tone?: "cash" | "warn" | "ok" }[];
  pulso: { label: string; value: string; delta?: string; up?: boolean }[];
  pulsoLine: string;
  cambio: { dot: string; text: string }[];
  money: { in: string; pending: string; action: string };
  next: string;
};

const NARRATIVE: Record<WorkspaceId, Narrative> = {
  founder: {
    greeting: "3 cosas requieren tu atención antes del mediodía.",
    hoy: [
      { title: "Cobrar $4,820 MXN a Hotel Zaci", body: "Factura vence hoy · 14 días de mora", cta: "Cobrar ahora", tone: "cash" },
      { title: "Aprobar respuesta de Alux a queja de huésped", body: "Tour Cenote Suytun · 2★ · Borrador listo", cta: "Revisar", tone: "warn" },
      { title: "Confirmar tour privado 14:00", body: "Familia Pérez · 4 pax · sin guía asignado", cta: "Asignar guía" },
    ],
    pulso: [
      { label: "Ingresos hoy", value: "$28,940", delta: "+12%", up: true },
      { label: "Reservas confirmadas", value: "8", delta: "vs 6 ayer", up: true },
      { label: "Huéspedes activos", value: "2", delta: "en cenote ahora" },
    ],
    pulsoLine: "Vas mejor que un martes promedio. El cuello de botella sigue siendo el cobro.",
    cambio: [
      { dot: T.ok, text: "+1 reseña 5★ de Carla M. — Tour Ek Balam" },
      { dot: T.warn, text: "−1 cancelación — Reembolso $1,200 procesado" },
      { dot: T.cenote, text: "Alux resolvió 2 tickets sin tu intervención" },
      { dot: T.sisal, text: "3 mensajes nuevos en bandeja del Portal" },
    ],
    money: { in: "$28,940 hoy", pending: "$12,400 por cobrar", action: "Cobrar Hotel Zaci" },
    next: "Cobrar la factura de Hotel Zaci ($4,820)",
  },
  portal: {
    greeting: "Tienes 2 reservas sin confirmar y 1 cobro pendiente.",
    hoy: [
      { title: "Confirmar reserva — Familia García", body: "Tour cenotes · sábado 09:00 · 5 pax", cta: "Confirmar" },
      { title: "Cobrar saldo — Reserva #4821", body: "$2,400 MXN · pago parcial el lunes", cta: "Enviar cobro", tone: "cash" },
      { title: "Responder chat — Huésped Lee", body: "Pregunta por transporte aeropuerto", cta: "Responder" },
    ],
    pulso: [
      { label: "Ocupación semana", value: "78%", delta: "+8%", up: true },
      { label: "Ticket promedio", value: "$1,840", delta: "−4%", up: false },
      { label: "Reseñas mes", value: "4.8★", delta: "32 reseñas" },
    ],
    pulsoLine: "Tu ocupación sube; el ticket promedio bajó por descuentos del fin de semana.",
    cambio: [
      { dot: T.ok, text: "2 reservas nuevas desde anoche" },
      { dot: T.sisal, text: "1 huésped pidió early check-in mañana" },
      { dot: T.cenote, text: "Alux respondió 4 preguntas frecuentes" },
    ],
    money: { in: "$14,200 confirmado", pending: "$5,640 por cobrar", action: "Enviar cobros" },
    next: "Confirmar las 2 reservas del sábado",
  },
  concierge: {
    greeting: "5 casos esperan respuesta. 1 lleva más de 4h sin tocar.",
    hoy: [
      { title: "Caso #882 sin tocar 4h 12m", body: "Huésped premium · solicitud transporte privado", cta: "Tomar caso", tone: "warn" },
      { title: "Propuesta vencida — Boda Méndez", body: "Esperando aprobación cliente 2 días", cta: "Empujar" },
      { title: "Confirmación de pago — Caso #874", body: "Cliente pagó $8,400 · falta confirmar al proveedor", cta: "Confirmar", tone: "cash" },
    ],
    pulso: [
      { label: "Casos abiertos", value: "12", delta: "−3 vs ayer", up: true },
      { label: "SLA respeto", value: "94%", delta: "objetivo 90%", up: true },
      { label: "TMO respuesta", value: "11m" },
    ],
    pulsoLine: "Cerraste casos más rápido que el equipo de la semana pasada.",
    cambio: [
      { dot: T.ok, text: "3 casos cerrados con NPS 9+" },
      { dot: T.warn, text: "1 caso escalado a tu atención" },
      { dot: T.cenote, text: "Alux redactó 6 borradores de respuesta" },
    ],
    money: { in: "$18,200 comisión semana", pending: "$3,400 por liquidar", action: "Revisar liquidaciones" },
    next: "Tomar el caso #882 antes de que rompa SLA",
  },
  cms: {
    greeting: "2 piezas listas para publicar · 1 borrador a punto de caducar.",
    hoy: [
      { title: "Publicar — Guía Cenotes Sur", body: "Aprobado por Editorial · esperando tu publish", cta: "Publicar" },
      { title: "Revisar — Pieza Día de Muertos", body: "Caduca relevancia en 6 días", cta: "Revisar", tone: "warn" },
      { title: "Aprobar imagen hero — Ek Balam", body: "Foto enviada por colaborador", cta: "Aprobar" },
    ],
    pulso: [
      { label: "Publicados mes", value: "24", delta: "+6", up: true },
      { label: "Tiempo lectura", value: "3:42", delta: "+12%", up: true },
      { label: "CTR a reservar", value: "5.8%" },
    ],
    pulsoLine: "Las guías largas convierten 2x mejor que las notas cortas este mes.",
    cambio: [
      { dot: T.ok, text: "1 pieza pasó revisión editorial" },
      { dot: T.sisal, text: "Colaborador subió 12 fotos nuevas" },
      { dot: T.cenote, text: "Alux sugirió 4 títulos SEO" },
    ],
    money: { in: "—", pending: "—", action: "Publicar Guía Cenotes Sur" },
    next: "Publicar la Guía Cenotes Sur ya aprobada",
  },
  eb: {
    greeting: "Test A/B del hero termina en 6 horas. Variante B va arriba.",
    hoy: [
      { title: "Decidir ganador A/B Hero", body: "Variante B +18% CTR · n=4,200", cta: "Promover B", tone: "ok" },
      { title: "Sección 'Cenotes' sin foto destacada", body: "Visible para 12,400 visitantes hoy", cta: "Asignar foto", tone: "warn" },
      { title: "Programar release nocturno", body: "3 cambios en cola", cta: "Programar" },
    ],
    pulso: [
      { label: "Sesiones hoy", value: "12,402", delta: "+9%", up: true },
      { label: "Rebote", value: "38%", delta: "−3%", up: true },
      { label: "Conversión a reservar", value: "4.2%" },
    ],
    pulsoLine: "El hero nuevo retiene mejor en mobile que en desktop.",
    cambio: [
      { dot: T.ok, text: "Sección 'Mercados' subió a top 3 vistas" },
      { dot: T.cielo, text: "Builder restauró 1 versión anterior por rollback" },
      { dot: T.cenote, text: "Alux propuso reorden de 2 secciones" },
    ],
    money: { in: "$92K atribuidos al Home", pending: "—", action: "Promover variante B" },
    next: "Promover la variante B del hero",
  },
};

function WorkspacePreview() {
  const [device, setDevice] = useState<Device>("desktop");
  const [wsId, setWsId] = useState<WorkspaceId>("founder");
  const [mode, setMode] = useState<ContextMode>("alux");

  const ws = WORKSPACES.find((w) => w.id === wsId)!;
  const d = DEVICES.find((x) => x.id === device)!;

  return (
    <div className="min-h-screen" style={{ background: T.cal, color: T.ink }}>
      <header
        className="sticky top-0 z-30 backdrop-blur border-b"
        style={{ background: "rgba(246,241,231,0.85)", borderColor: T.line2 }}
      >
        <div className="mx-auto max-w-[1400px] px-6 py-3 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className="h-7 w-7 rounded-md grid place-items-center text-[11px] font-bold text-white"
              style={{ background: T.terra }}
            >
              V
            </div>
            <div className="text-sm font-semibold">Workspace UX Prototype</div>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
              style={{ background: T.ink, color: T.cal }}
            >
              v2.0
            </span>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <SyncIndicator />
            <Pill>
              {DEVICES.map((x) => (
                <button
                  key={x.id}
                  onClick={() => setDevice(x.id)}
                  className="px-2.5 py-1.5 text-xs rounded-md flex items-center gap-1.5 transition"
                  style={{
                    background: device === x.id ? T.ink : "transparent",
                    color: device === x.id ? T.cal : T.ink2,
                  }}
                >
                  <x.icon className="h-3.5 w-3.5" />
                  {x.label}
                </button>
              ))}
            </Pill>
            <Pill>
              {WORKSPACES.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setWsId(w.id)}
                  className="px-2.5 py-1.5 text-xs rounded-md transition"
                  style={{
                    background: wsId === w.id ? w.accent : "transparent",
                    color: wsId === w.id ? "#fff" : T.ink2,
                  }}
                >
                  {w.short}
                </button>
              ))}
            </Pill>
            <Pill>
              <button
                onClick={() => setMode("inspector")}
                className="px-2.5 py-1.5 text-xs rounded-md flex items-center gap-1.5 transition"
                style={{
                  background: mode === "inspector" ? T.ink : "transparent",
                  color: mode === "inspector" ? T.cal : T.ink2,
                }}
              >
                <Eye className="h-3.5 w-3.5" /> Inspector
              </button>
              <button
                onClick={() => setMode("alux")}
                className="px-2.5 py-1.5 text-xs rounded-md flex items-center gap-1.5 transition"
                style={{
                  background: mode === "alux" ? T.ink : "transparent",
                  color: mode === "alux" ? T.cal : T.ink2,
                }}
              >
                <Sparkles className="h-3.5 w-3.5" /> Copiloto Alux
              </button>
            </Pill>
          </div>
        </div>
        <div
          className="mx-auto max-w-[1400px] px-6 pb-3 text-[11px] flex flex-wrap items-center gap-x-4 gap-y-1"
          style={{ color: T.ink2 }}
        >
          <span>Principio rector: <em>"la mejor interfaz reduce decisiones, no agrega información"</em>.</span>
          <span>· {ws.voice}</span>
          <span>· Mobile-first · Touch-first · PWA</span>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-8">
        <DeviceFrame device={device} w={d.w} h={d.h}>
          {device === "desktop" && <DesktopCanvas ws={ws} mode={mode} />}
          {device === "ipad" && <IpadCanvas ws={ws} mode={mode} />}
          {device === "iphone" && <IphoneCanvas ws={ws} mode={mode} />}
        </DeviceFrame>

        <Legend ws={ws} device={device} mode={mode} />
      </main>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="inline-flex items-center gap-0.5 p-0.5 rounded-lg border"
      style={{ background: T.bone, borderColor: T.line2 }}
    >
      {children}
    </div>
  );
}

function SyncIndicator() {
  return (
    <div
      className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px]"
      style={{ background: T.bone, borderColor: T.line2, color: T.ink2 }}
      title="PWA · sincronizado hace 12s"
    >
      <span className="relative flex h-2 w-2">
        <span
          className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
          style={{ background: T.ok }}
        />
        <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: T.ok }} />
      </span>
      <Wifi className="h-3 w-3" />
      <span>en línea · sync 12s</span>
      <CloudCheck className="h-3 w-3" />
    </div>
  );
}

function DeviceFrame({
  device,
  w,
  h,
  children,
}: {
  device: Device;
  w: number;
  h: number;
  children: React.ReactNode;
}) {
  const isPhone = device === "iphone";
  const isPad = device === "ipad";
  return (
    <div className="flex justify-center">
      <div
        className="relative shrink-0"
        style={{
          width: w,
          maxWidth: "100%",
          height: h,
          borderRadius: isPhone ? 44 : isPad ? 28 : 14,
          padding: isPhone ? 12 : isPad ? 16 : 0,
          background: isPhone || isPad ? "#0F0B08" : "transparent",
          boxShadow: isPhone || isPad ? "0 24px 60px -20px rgba(0,0,0,0.35)" : "0 12px 32px -16px rgba(0,0,0,0.18)",
        }}
      >
        <div
          className="relative overflow-hidden h-full w-full"
          style={{
            borderRadius: isPhone ? 34 : isPad ? 16 : 12,
            background: T.cal,
            border: device === "desktop" ? "1px solid " + T.line2 : "none",
          }}
        >
          {isPhone && (
            <div
              className="absolute left-1/2 -translate-x-1/2 top-1.5 z-20"
              style={{ width: 120, height: 28, background: "#0F0B08", borderRadius: 16 }}
            />
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

function HoySection({ ws }: { ws: WS }) {
  const n = NARRATIVE[ws.id];
  return (
    <section>
      <SectionHead title="Hoy" hint="lo que requiere tu atención" />
      <div className="grid gap-2">
        {n.hoy.map((h, i) => (
          <ActionCard key={i} item={h} accent={ws.accent} />
        ))}
      </div>
    </section>
  );
}

function PulsoSection({ ws }: { ws: WS }) {
  const n = NARRATIVE[ws.id];
  return (
    <section>
      <SectionHead title="Pulso" hint="cómo va el negocio" />
      <div className="rounded-xl p-4 border" style={{ background: T.bone, borderColor: T.line }}>
        <div className="grid grid-cols-3 gap-3 mb-3">
          {n.pulso.map((p, i) => (
            <div key={i} className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide" style={{ color: T.ink2 }}>
                {p.label}
              </div>
              <div className="text-lg font-bold truncate" style={{ fontFamily: "Fraunces, Georgia, serif" }}>
                {p.value}
              </div>
              {p.delta && (
                <div className="text-[11px] flex items-center gap-1" style={{ color: p.up ? T.ok : T.warn }}>
                  {p.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {p.delta}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="text-[12px] italic" style={{ color: T.ink2 }}>
          {n.pulsoLine}
        </div>
      </div>
    </section>
  );
}

function CambioSection({ ws }: { ws: WS }) {
  const n = NARRATIVE[ws.id];
  return (
    <section>
      <SectionHead title="Cambió desde tu última visita" hint="hace 3h 12m" />
      <ul className="space-y-1.5">
        {n.cambio.map((c, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-[13px] rounded-lg px-2.5 py-1.5"
            style={{ background: T.bone }}
          >
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" style={{ background: c.dot }} />
            <span>{c.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SectionHead({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between mb-2">
      <h2
        className="text-base font-semibold tracking-tight"
        style={{ fontFamily: "Fraunces, Georgia, serif", color: T.ink }}
      >
        {title}
      </h2>
      {hint && (
        <span className="text-[10px] uppercase tracking-wider" style={{ color: T.ink2 }}>
          {hint}
        </span>
      )}
    </div>
  );
}

function ActionCard({
  item,
  accent,
  swipeHint,
}: {
  item: { title: string; body: string; cta: string; tone?: "cash" | "warn" | "ok" };
  accent: string;
  swipeHint?: boolean;
}) {
  const toneBg =
    item.tone === "cash"
      ? T.cash
      : item.tone === "warn"
      ? T.warn
      : item.tone === "ok"
      ? T.ok
      : accent;
  return (
    <div
      className="rounded-xl border p-3 flex items-start gap-3 relative overflow-hidden"
      style={{ background: T.bone, borderColor: T.line }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: toneBg }} />
      <div className="pl-1 flex-1 min-w-0">
        <div className="text-[13px] font-semibold truncate">{item.title}</div>
        <div className="text-[11px] mt-0.5" style={{ color: T.ink2 }}>
          {item.body}
        </div>
        {swipeHint && (
          <div className="text-[10px] mt-1.5 flex items-center gap-1" style={{ color: T.ink2 }}>
            <ChevronLeft className="h-3 w-3" /> aprobar · posponer
            <ChevronRight className="h-3 w-3" />
          </div>
        )}
      </div>
      <button
        className="shrink-0 text-[11px] font-semibold px-2.5 py-1.5 rounded-md flex items-center gap-1"
        style={{ background: toneBg, color: "#fff" }}
      >
        {item.cta}
        <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}

function ContextoPanel({ ws, mode, compact }: { ws: WS; mode: ContextMode; compact?: boolean }) {
  const n = NARRATIVE[ws.id];
  return (
    <aside
      className="h-full flex flex-col border-l"
      style={{ background: T.bone, borderColor: T.line }}
    >
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: T.line }}>
        <div className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: T.ink2 }}>
          Contexto
        </div>
        <div className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: T.cal, color: T.ink2 }}>
          {mode === "alux" ? "Copiloto Alux" : "Inspector"}
        </div>
      </div>

      {mode === "alux" ? (
        <div className="flex-1 overflow-auto p-4 space-y-3">
          <div className="rounded-lg p-3" style={{ background: T.cal, border: "1px solid " + T.line }}>
            <div className="flex items-center gap-2 text-[11px] font-semibold" style={{ color: ws.accent }}>
              <Sparkles className="h-3.5 w-3.5" /> Siguiente acción de mayor impacto
            </div>
            <div className="mt-1.5 text-[13px] font-medium">{n.next}</div>
            <button
              className="mt-2 text-[11px] font-semibold px-2.5 py-1.5 rounded-md text-white"
              style={{ background: ws.accent }}
            >
              Hacerlo ahora
            </button>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: T.ink2 }}>
              Alux propone
            </div>
            <div className="space-y-1.5">
              {[
                "Redactar disculpa al huésped 2★ con cupón 15%",
                "Reasignar guía Mauricio al tour 14:00",
                "Cobrar Hotel Zaci por WhatsApp con link Stripe",
              ].map((s, i) => (
                <button
                  key={i}
                  className="w-full text-left rounded-md px-2.5 py-2 text-[12px] flex items-start gap-2"
                  style={{ background: T.cal, border: "1px solid " + T.line }}
                >
                  <Wand2 className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: ws.accent }} />
                  <span>{s}</span>
                </button>
              ))}
            </div>
          </div>

          {!compact && (
            <div
              className="rounded-lg p-3 text-[11px]"
              style={{ background: T.cal, border: "1px dashed " + T.line2, color: T.ink2 }}
            >
              Escribe a Alux o pulsa <kbd className="px-1 rounded border" style={{ borderColor: T.line2 }}>⌘K</kbd>{" "}
              para invocar el copiloto desde cualquier pantalla.
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-4 space-y-3 text-[12px]">
          <div>
            <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: T.ink2 }}>
              Selección
            </div>
            <div className="rounded-md p-2.5" style={{ background: T.cal, border: "1px solid " + T.line }}>
              <div className="font-semibold">Factura #4821 — Hotel Zaci</div>
              <div className="text-[11px]" style={{ color: T.ink2 }}>
                Emitida 16 jun · Vence hoy · $4,820 MXN
              </div>
            </div>
          </div>
          <KV k="Cliente" v="Hotel Zaci · 14 reservas activas" />
          <KV k="Mora" v="14 días" />
          <KV k="Método" v="Transferencia / Stripe link" />
          <KV k="Última gestión" v="Recordatorio email · 4 días" />
          <div className="pt-2 border-t" style={{ borderColor: T.line }}>
            <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: T.ink2 }}>
              Acciones
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["Enviar link Stripe", "WhatsApp", "Llamar", "Posponer 3d"].map((a) => (
                <button
                  key={a}
                  className="text-[11px] px-2 py-1 rounded-md"
                  style={{ background: T.cal, border: "1px solid " + T.line2 }}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span style={{ color: T.ink2 }} className="text-[11px] uppercase tracking-wide">
        {k}
      </span>
      <span className="text-[12px] text-right">{v}</span>
    </div>
  );
}

function Money({ n, accent }: { n: Narrative; accent: string }) {
  if (n.money.in === "—" && n.money.pending === "—") {
    return (
      <div
        className="px-3 py-1.5 rounded-md"
        style={{ background: T.bone, border: "1px solid " + T.line, color: T.ink2 }}
      >
        Dinero no aplica en este workspace
      </div>
    );
  }
  return (
    <div
      className="px-3 py-1.5 rounded-md flex items-center gap-3"
      style={{ background: T.bone, border: "1px solid " + T.line }}
    >
      <CircleDollarSign className="h-4 w-4" style={{ color: accent }} />
      <span>
        <strong style={{ color: T.cash }}>{n.money.in}</strong> entró ·{" "}
        <strong style={{ color: T.warn }}>{n.money.pending}</strong> esperando
      </span>
    </div>
  );
}

function DesktopCanvas({ ws, mode }: { ws: WS; mode: ContextMode }) {
  const n = NARRATIVE[ws.id];
  return (
    <div className="h-full grid" style={{ gridTemplateColumns: "220px 1fr 340px" }}>
      <nav className="border-r flex flex-col" style={{ background: T.bone, borderColor: T.line }}>
        <div className="px-4 py-3 flex items-center gap-2 border-b" style={{ borderColor: T.line }}>
          <div className="h-7 w-7 rounded-md grid place-items-center" style={{ background: ws.accent }}>
            <ws.icon className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-[12px] font-semibold truncate">{ws.label}</div>
            <div className="text-[10px] truncate" style={{ color: T.ink2 }}>
              {ws.voice}
            </div>
          </div>
        </div>
        <ul className="p-2 space-y-0.5">
          {ws.rail.map((it, i) => (
            <li key={i}>
              <button
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-[12px]"
                style={{
                  background: i === 0 ? T.cal : "transparent",
                  color: i === 0 ? T.ink : T.ink2,
                  fontWeight: i === 0 ? 600 : 400,
                  border: i === 0 ? "1px solid " + T.line : "1px solid transparent",
                }}
              >
                <it.icon className="h-3.5 w-3.5" />
                <span>{it.label}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-auto p-3 border-t" style={{ borderColor: T.line }}>
          <div
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px]"
            style={{ background: T.cal, border: "1px solid " + T.line, color: T.ink2 }}
          >
            <Command className="h-3 w-3" /> ⌘K · acciones rápidas
          </div>
        </div>
      </nav>

      <div className="overflow-auto">
        <div className="px-8 py-6 border-b" style={{ borderColor: T.line }}>
          <div className="text-[11px] uppercase tracking-wider" style={{ color: T.ink2 }}>
            Buenos días, Carlos · martes 10:42
          </div>
          <h1
            className="mt-1 text-[28px] leading-tight font-semibold"
            style={{ fontFamily: "Fraunces, Georgia, serif" }}
          >
            {n.greeting}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px]">
            <Money n={n} accent={ws.accent} />
            <div
              className="px-3 py-1.5 rounded-md flex items-center gap-2"
              style={{ background: T.bone, border: "1px solid " + T.line }}
            >
              <Sparkles className="h-3.5 w-3.5" style={{ color: ws.accent }} />
              <span>
                <strong>Siguiente acción:</strong> {n.next}
              </span>
            </div>
          </div>
        </div>
        <div className="px-8 py-6 space-y-6">
          <HoySection ws={ws} />
          <div className="grid grid-cols-2 gap-6">
            <PulsoSection ws={ws} />
            <CambioSection ws={ws} />
          </div>
        </div>
      </div>

      <ContextoPanel ws={ws} mode={mode} />
    </div>
  );
}

function IpadCanvas({ ws, mode }: { ws: WS; mode: ContextMode }) {
  const n = NARRATIVE[ws.id];
  return (
    <div className="h-full flex flex-col">
      <div
        className="flex flex-wrap items-center gap-3 px-4 py-2 border-b text-[10px]"
        style={{ background: T.bone, borderColor: T.line, color: T.ink2 }}
      >
        <div className="flex items-center gap-1">
          <Pencil className="h-3 w-3" /> Pencil: anotar tarjetas · marcar como hecho
        </div>
        <div className="flex items-center gap-1">
          <MoveHorizontal className="h-3 w-3" /> 2 dedos: cambiar workspace
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Hand className="h-3 w-3" /> Modo una mano: barra inferior
        </div>
      </div>

      <div className="flex-1 grid overflow-hidden" style={{ gridTemplateColumns: "76px 1fr 280px" }}>
        <nav
          className="border-r flex flex-col items-center py-3 gap-1"
          style={{ background: T.bone, borderColor: T.line }}
        >
          <div className="h-10 w-10 rounded-xl grid place-items-center mb-2" style={{ background: ws.accent }}>
            <ws.icon className="h-5 w-5 text-white" />
          </div>
          {ws.rail.map((it, i) => (
            <button
              key={i}
              className="h-12 w-12 rounded-xl grid place-items-center"
              style={{
                background: i === 0 ? T.cal : "transparent",
                border: i === 0 ? "1px solid " + T.line2 : "1px solid transparent",
              }}
              title={it.label}
            >
              <it.icon className="h-4 w-4" style={{ color: i === 0 ? ws.accent : T.ink2 }} />
            </button>
          ))}
        </nav>

        <div className="overflow-auto">
          <div className="px-6 pt-6 pb-4">
            <div className="text-[11px] uppercase tracking-wider" style={{ color: T.ink2 }}>
              {ws.voice} · martes 10:42
            </div>
            <h1
              className="mt-1 text-[24px] leading-tight font-semibold"
              style={{ fontFamily: "Fraunces, Georgia, serif" }}
            >
              {n.greeting}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
              <Money n={n} accent={ws.accent} />
              <div
                className="px-3 py-1.5 rounded-md flex items-center gap-2"
                style={{ background: T.bone, border: "1px solid " + T.line }}
              >
                <Sparkles className="h-3.5 w-3.5" style={{ color: ws.accent }} />
                <span>
                  <strong>Hacer ya:</strong> {n.next}
                </span>
              </div>
            </div>
          </div>
          <div className="px-6 pb-6 space-y-5">
            <HoySection ws={ws} />
            <PulsoSection ws={ws} />
            <CambioSection ws={ws} />
          </div>
        </div>

        <ContextoPanel ws={ws} mode={mode} compact />
      </div>

      <div
        className="flex items-center gap-2 px-4 py-2 border-t"
        style={{ background: T.bone, borderColor: T.line }}
      >
        <Search className="h-4 w-4" style={{ color: T.ink2 }} />
        <div
          className="flex-1 rounded-md px-3 py-1.5 text-[12px]"
          style={{ background: T.cal, color: T.ink2, border: "1px solid " + T.line }}
        >
          Buscar o decir a Alux qué hacer…
        </div>
        <button
          className="px-3 py-1.5 rounded-md text-[12px] text-white flex items-center gap-1"
          style={{ background: ws.accent }}
        >
          <Sparkles className="h-3.5 w-3.5" /> Alux
        </button>
      </div>
    </div>
  );
}

function IphoneCanvas({ ws, mode }: { ws: WS; mode: ContextMode }) {
  const n = NARRATIVE[ws.id];
  return (
    <div className="h-full flex flex-col">
      <div className="pt-10 px-5 pb-2">
        <div
          className="mx-auto text-center text-[10px] mb-2 flex items-center justify-center gap-1"
          style={{ color: T.ink2 }}
        >
          <ChevronRight className="h-3 w-3 rotate-90" />
          desliza para actualizar · sync hace 12s
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: T.ink2 }}>
              martes · 10:42
            </div>
            <div
              className="text-[18px] font-semibold leading-tight"
              style={{ fontFamily: "Fraunces, Georgia, serif" }}
            >
              Hola Carlos
            </div>
          </div>
          <div
            className="h-9 w-9 rounded-full grid place-items-center text-[11px] font-bold text-white"
            style={{ background: ws.accent }}
          >
            CV
          </div>
        </div>
        <div
          className="mt-2 text-[13px] leading-snug"
          style={{ fontFamily: "Fraunces, Georgia, serif" }}
        >
          {n.greeting}
        </div>
      </div>

      <div className="px-5">
        <div
          className="rounded-lg px-3 py-2 flex items-center gap-2 text-[11px]"
          style={{ background: T.bone, border: "1px solid " + T.line }}
        >
          <CircleDollarSign className="h-4 w-4 shrink-0" style={{ color: ws.accent }} />
          {n.money.in === "—" ? (
            <span style={{ color: T.ink2 }}>Workspace sin flujo de dinero</span>
          ) : (
            <span className="truncate">
              <strong style={{ color: T.cash }}>{n.money.in}</strong> ·{" "}
              <strong style={{ color: T.warn }}>{n.money.pending}</strong>
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-5 pt-3 pb-4 space-y-4">
        <section>
          <SectionHead title="Hoy" hint="desliza ← aprobar · posponer →" />
          <div className="space-y-2">
            {n.hoy.map((h, i) => (
              <ActionCard key={i} item={h} accent={ws.accent} swipeHint />
            ))}
          </div>
        </section>
        <section>
          <SectionHead title="Pulso" />
          <div
            className="rounded-xl p-3 border text-[12px]"
            style={{ background: T.bone, borderColor: T.line }}
          >
            <div className="grid grid-cols-3 gap-2 mb-1.5">
              {n.pulso.map((p, i) => (
                <div key={i}>
                  <div className="text-[9px] uppercase" style={{ color: T.ink2 }}>
                    {p.label}
                  </div>
                  <div className="text-[14px] font-bold" style={{ fontFamily: "Fraunces, Georgia, serif" }}>
                    {p.value}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-[11px] italic" style={{ color: T.ink2 }}>
              {n.pulsoLine}
            </div>
          </div>
        </section>
        <section>
          <SectionHead title="Cambió" hint="3h 12m" />
          <ul className="space-y-1">
            {n.cambio.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px]">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" style={{ background: c.dot }} />
                <span>{c.text}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <SectionHead title="Bandeja secundaria" />
          <div
            className="rounded-xl px-4 py-5 text-center text-[12px] border border-dashed"
            style={{ background: T.bone, borderColor: T.line2, color: T.ink2 }}
          >
            <Coffee className="h-5 w-5 mx-auto mb-1.5" style={{ color: ws.accent }} />
            Nada urgente. Ve por un café — Alux te avisa si algo cambia.
          </div>
        </section>
      </div>

      <div
        className="mx-3 mb-2 rounded-2xl shadow-lg border overflow-hidden"
        style={{ background: T.bone, borderColor: T.line2 }}
      >
        <div
          className="flex items-center justify-between px-3 py-1.5"
          style={{ borderBottom: "1px solid " + T.line }}
        >
          <div className="flex items-center gap-1.5 text-[10px]" style={{ color: T.ink2 }}>
            <div className="h-1 w-8 rounded-full mx-1" style={{ background: T.line2 }} />
            Contexto · {mode === "alux" ? "Alux" : "Inspector"} — desliza arriba
          </div>
          <Sparkles className="h-3.5 w-3.5" style={{ color: ws.accent }} />
        </div>
        <div className="px-3 py-2 text-[12px]">
          {mode === "alux" ? (
            <div className="flex items-start gap-2">
              <Wand2 className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: ws.accent }} />
              <span>
                <strong>Alux sugiere:</strong> {n.next}
              </span>
            </div>
          ) : (
            <div>
              <div className="font-semibold truncate">Factura #4821 — Hotel Zaci</div>
              <div className="text-[11px]" style={{ color: T.ink2 }}>
                Vence hoy · $4,820 MXN · 14 días mora
              </div>
            </div>
          )}
        </div>
      </div>

      <nav className="grid grid-cols-5 border-t" style={{ background: T.bone, borderColor: T.line2 }}>
        {ws.tabs.map((t, i) => (
          <button
            key={i}
            className="py-2.5 flex flex-col items-center gap-0.5 text-[10px]"
            style={{ color: i === 0 ? ws.accent : T.ink2, fontWeight: i === 0 ? 600 : 400 }}
          >
            <t.icon style={{ width: 18, height: 18 }} />
            {t.label}
          </button>
        ))}
      </nav>
      <div className="pb-1.5 flex justify-center">
        <div className="h-1 w-28 rounded-full" style={{ background: T.ink2, opacity: 0.4 }} />
      </div>
    </div>
  );
}

function Legend({ ws, device, mode }: { ws: WS; device: Device; mode: ContextMode }) {
  const checks = [
    { ok: true, t: "Founder Home en formato Hoy · Pulso · Cambió" },
    { ok: true, t: "Panel derecho dual-mode (ahora: " + (mode === "alux" ? "Copiloto Alux" : "Inspector") + ")" },
    { ok: device === "ipad", t: "iPad con layout propio (rail icónico, Pencil, dock, 2 dedos)" },
    { ok: device === "iphone", t: "iPhone con thumb-zone, sheets, swipe actions, sin FAB" },
    { ok: true, t: "Widgets narrativos accionables (no solo métricas)" },
    { ok: true, t: "Identidad propia Valladolid (cal, terracota, sisal, cenote, jungla, cielo)" },
    { ok: true, t: "Tipografía editorial Fraunces para títulos" },
    { ok: true, t: "Indicador permanente de conectividad PWA y sync" },
    { ok: true, t: "Estados vacíos con personalidad" },
    { ok: true, t: "Responde en <10s: atención · dinero · siguiente acción" },
  ];
  return (
    <section className="mt-8 max-w-3xl mx-auto">
      <div className="text-[11px] uppercase tracking-wider mb-2" style={{ color: T.ink2 }}>
        Evidencia · {ws.label} · {device}
      </div>
      <ul className="grid sm:grid-cols-2 gap-1.5 text-[12px]">
        {checks.map((c, i) => (
          <li
            key={i}
            className="flex items-start gap-2 rounded-md px-2.5 py-1.5"
            style={{ background: T.bone, border: "1px solid " + T.line }}
          >
            <CheckCircle2
              className="h-3.5 w-3.5 mt-0.5 shrink-0"
              style={{ color: c.ok ? T.ok : T.ink2, opacity: c.ok ? 1 : 0.3 }}
            />
            <span style={{ color: c.ok ? T.ink : T.ink2 }}>{c.t}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[12px]" style={{ color: T.ink2 }}>
        Documento con respuestas a las preguntas de aprobación:{" "}
        <code>docs/blueprint/15.10.5-PROTOTYPE-v2.0-EVIDENCE.md</code>
      </p>
    </section>
  );
}
