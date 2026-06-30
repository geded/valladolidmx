/**
 * Definiciones declarativas iniciales de workspaces para 15.10.5a.
 *
 * IMPORTANTE: estas definiciones NO migran aún las superficies
 * existentes (Founder, Portal, Concierge, CMS, Cuenta siguen viviendo
 * en sus rutas actuales). Sólo establecen el contrato declarativo que
 * la adenda 15.10.5c utilizará para migrarlas al Workspace Engine.
 */
import {
  Sparkles,
  Compass,
  Building2,
  ConciergeBell,
  FileCog,
  UserRound,
  LayoutDashboard,
  Bell,
  Calendar,
  ListChecks,
  Settings,
  Inbox,
  MapPin,
  Image as ImageIcon,
  CreditCard,
  Users,
  HeartHandshake,
  BookOpenText,
  ShoppingCart,
  Activity,
} from "lucide-react";

import type { WorkspaceDefinition } from "../types";
import { registerWorkspace } from "../workspace-registry";

const founder: WorkspaceDefinition = {
  id: "founder",
  label: "Panel Fundador",
  shortLabel: "Fundador",
  description: "Pulso operativo y dirección de plataforma.",
  icon: Compass,
  accent: "atardecer",
  rootPath: "/admin",
  roles: ["founder", "admin"],
  navigation: [
    { id: "founder.today", workspaceId: "founder", label: "Hoy", icon: LayoutDashboard, to: "/admin", group: "pulso", order: 1, surfaces: ["sidebar", "bottom", "palette"], primary: true },
    { id: "founder.ops", workspaceId: "founder", label: "Operación", icon: ListChecks, to: "/admin/operaciones", group: "pulso", order: 2, surfaces: ["sidebar", "bottom", "palette"] },
    { id: "founder.alerts", workspaceId: "founder", label: "Alertas", icon: Bell, to: "/admin/operaciones", group: "pulso", order: 3, surfaces: ["sidebar", "palette"] },
    { id: "founder.sistema", workspaceId: "founder", label: "Sistema", icon: Settings, to: "/admin/sistema", group: "config", order: 10, surfaces: ["sidebar", "palette"] },
  ],
  alux: {
    headline: "Hoy hay 3 decisiones de alto impacto esperándote.",
    summary: "Resumen del pulso del negocio: reservas, alertas y empresas pendientes de revisión.",
    suggestedActions: () => [
      {
        id: "approve-pending-reviews",
        label: "Aprobar 3 reseñas pendientes",
        impact: "high",
        rationale:
          "Hay 3 reseñas con sentimiento positivo y sin riesgo detectado por moderación automática.",
        sources: [
          { id: "src.queue", label: "Cola de moderación", kind: "metric", value: 3 },
          { id: "src.sent", label: "Sentimiento", kind: "rule", value: "positivo" },
        ],
        effect: "Las reseñas quedarán publicadas inmediatamente en el sitio.",
        reversible: true,
        confirm: "soft",
        run: () => void 0,
        undo: () => void 0,
      },
      {
        id: "open-today",
        label: "Abrir vista Hoy",
        impact: "low",
        rationale: "Atajo a la vista operativa principal.",
        effect: "Navega a /admin.",
        run: () => void 0,
      },
    ],
  },
  aluxCapabilities: [
    { id: "founder.pulse.read", label: "Leer pulso del día" },
  ],
  context: {
    workspaceId: "founder",
    entities: [
      { type: "review", label: "Reseña" },
      { type: "business", label: "Empresa" },
      { type: "alert", label: "Alerta" },
    ],
    selectionModes: ["single", "multi"],
    views: [
      { id: "today", label: "Hoy", kind: "list" },
      { id: "board", label: "Tablero", kind: "board" },
    ],
    inspectors: [
      {
        entityType: "review",
        render: (e) => `Inspector de reseña ${e.label ?? e.id}`,
      },
    ],
    quickActions: [
      {
        id: "founder.approve",
        label: "Aprobar selección",
        scope: "selection",
        run: () => void 0,
      },
      {
        id: "founder.open",
        label: "Abrir detalle",
        scope: "entity",
        entityTypes: ["review", "business"],
        run: () => void 0,
      },
    ],
  },
};

const portal: WorkspaceDefinition = {
  id: "portal",
  label: "Portal Empresarial",
  shortLabel: "Portal",
  description: "Operación diaria del empresario turístico.",
  icon: Building2,
  accent: "primary",
  rootPath: "/portal",
  roles: ["business_owner", "business_staff"],
  navigation: [
    { id: "portal.today", workspaceId: "portal", label: "Hoy", icon: LayoutDashboard, to: "/portal", group: "pulso", order: 1, surfaces: ["sidebar", "bottom", "palette"], primary: true },
    { id: "portal.ficha", workspaceId: "portal", label: "Ficha", icon: BookOpenText, to: "/portal/ficha", group: "presencia", order: 2, surfaces: ["sidebar", "bottom", "palette"] },
    { id: "portal.galeria", workspaceId: "portal", label: "Galería", icon: ImageIcon, to: "/portal/galeria", group: "presencia", order: 3, surfaces: ["sidebar", "bottom", "palette"] },
    { id: "portal.catalogo", workspaceId: "portal", label: "Catálogo", icon: ListChecks, to: "/portal/catalogo", group: "operacion", order: 4, surfaces: ["sidebar", "palette"] },
    { id: "portal.pagos", workspaceId: "portal", label: "Pagos", icon: CreditCard, to: "/portal/pagos", group: "operacion", order: 5, surfaces: ["sidebar", "palette"] },
  ],
  alux: {
    headline: "Tu ficha tiene 2 oportunidades de visibilidad.",
    summary: "Sugerencias para subir tu presencia esta semana.",
    suggestedActions: () => [
      { id: "complete-profile", label: "Completar ficha al 100%", impact: "high", run: () => void 0 },
      { id: "add-photos", label: "Subir 3 fotos en alta calidad", impact: "medium", run: () => void 0 },
    ],
  },
};

const concierge: WorkspaceDefinition = {
  id: "concierge",
  label: "Centro Concierge",
  shortLabel: "Concierge",
  description: "Expedientes y atención personalizada al viajero.",
  icon: ConciergeBell,
  accent: "cenote",
  rootPath: "/concierge",
  roles: ["concierge", "admin"],
  navigation: [
    { id: "concierge.inbox", workspaceId: "concierge", label: "Bandeja", icon: Inbox, to: "/concierge", group: "trabajo", order: 1, surfaces: ["sidebar", "bottom", "palette"], primary: true },
  ],
  alux: {
    headline: "Hay 4 expedientes que requieren atención hoy.",
    summary:
      "Pulso de expedientes: priorización por SLA, casos sin asignar y carga personal.",
    suggestedActions: () => [
      {
        id: "respond-oldest",
        label: "Responder el caso más antiguo sin respuesta",
        impact: "high",
        rationale:
          "Reduce el riesgo de incumplimiento SLA al atender primero el expediente con mayor tiempo sin actividad.",
        sources: [
          { id: "src.sla", label: "Estado SLA", kind: "metric" },
          { id: "src.idle", label: "Tiempo sin actividad", kind: "metric" },
        ],
        effect: "Abre el expediente con mayor antigüedad sin respuesta.",
        reversible: true,
        confirm: "none",
        run: () => void 0,
      },
    ],
  },
  aluxCapabilities: [
    { id: "concierge.cases.read", label: "Leer expedientes asignados" },
    { id: "concierge.workload.read", label: "Leer carga personal" },
  ],
  context: {
    workspaceId: "concierge",
    entities: [
      { type: "case", label: "Expediente" },
      { type: "traveler", label: "Viajero" },
      { type: "message", label: "Mensaje" },
    ],
    selectionModes: ["single", "multi"],
    views: [
      { id: "inbox", label: "Bandeja", kind: "list" },
      { id: "case", label: "Expediente", kind: "detail" },
    ],
  },
};

const cms: WorkspaceDefinition = {
  id: "cms",
  label: "CMS Studio",
  shortLabel: "CMS",
  description: "Contenido, moderación y Experience Builder.",
  icon: FileCog,
  accent: "selva",
  rootPath: "/cms",
  roles: ["editor", "admin"],
  navigation: [
    { id: "cms.today", workspaceId: "cms", label: "Hoy", icon: LayoutDashboard, to: "/cms", group: "vista", order: 1, surfaces: ["sidebar", "bottom", "palette"], primary: true },
    { id: "cms.empresas", workspaceId: "cms", label: "Empresas", icon: Building2, to: "/cms/empresas", group: "contenido", order: 2, surfaces: ["sidebar", "bottom", "palette"] },
    { id: "cms.destinos", workspaceId: "cms", label: "Destinos", icon: MapPin, to: "/cms/destinos", group: "contenido", order: 3, surfaces: ["sidebar", "palette"] },
    { id: "cms.reviews", workspaceId: "cms", label: "Reseñas", icon: Bell, to: "/cms/reviews", group: "moderacion", order: 4, surfaces: ["sidebar", "bottom", "palette"] },
    { id: "cms.media", workspaceId: "cms", label: "Media", icon: ImageIcon, to: "/cms/media", group: "contenido", order: 5, surfaces: ["sidebar", "palette"] },
    { id: "cms.eb", workspaceId: "cms", label: "Experience Builder", icon: Sparkles, to: "/cms/experience-builder", group: "estudio", order: 6, surfaces: ["sidebar", "palette"] },
  ],
  alux: {
    headline: "12 reseñas esperan moderación. 3 son urgentes.",
    suggestedActions: () => [
      { id: "moderate-urgent", label: "Moderar las 3 reseñas urgentes", impact: "high", run: () => void 0 },
    ],
  },
};

const cuenta: WorkspaceDefinition = {
  id: "cuenta",
  label: "Mi Cuenta",
  shortLabel: "Cuenta",
  description: "Viajes, favoritos, pagos y concierge personal.",
  icon: UserRound,
  accent: "muted",
  rootPath: "/cuenta",
  roles: ["traveler", "authenticated"],
  navigation: [
    { id: "cuenta.home", workspaceId: "cuenta", label: "Resumen", icon: LayoutDashboard, to: "/cuenta", group: "viaje", order: 1, surfaces: ["sidebar", "bottom", "palette"], primary: true },
    { id: "cuenta.fav", workspaceId: "cuenta", label: "Favoritos", icon: HeartHandshake, to: "/cuenta/favoritos", group: "viaje", order: 2, surfaces: ["sidebar", "bottom", "palette"] },
    { id: "cuenta.cart", workspaceId: "cuenta", label: "Carrito", icon: ShoppingCart, to: "/cuenta/carrito", group: "viaje", order: 3, surfaces: ["sidebar", "bottom", "palette"] },
    { id: "cuenta.hist", workspaceId: "cuenta", label: "Historial", icon: ListChecks, to: "/cuenta/historial", group: "viaje", order: 4, surfaces: ["sidebar", "palette"] },
    { id: "cuenta.act", workspaceId: "cuenta", label: "Actividad", icon: Activity, to: "/cuenta/actividad", group: "viaje", order: 5, surfaces: ["sidebar", "palette"] },
    { id: "cuenta.conc", workspaceId: "cuenta", label: "Concierge", icon: ConciergeBell, to: "/cuenta/concierge", group: "viaje", order: 6, surfaces: ["sidebar", "bottom", "palette"] },
    { id: "cuenta.notif", workspaceId: "cuenta", label: "Notificaciones", icon: Bell, to: "/cuenta/notificaciones", group: "config", order: 8, surfaces: ["sidebar", "palette"] },
    { id: "cuenta.perfil", workspaceId: "cuenta", label: "Perfil", icon: Users, to: "/cuenta/perfil", group: "config", order: 9, surfaces: ["sidebar", "palette"] },
  ],
  alux: {
    headline: "Tienes 1 viaje próximo. Te sugiero 2 experiencias en ruta.",
    summary:
      "Resumen personal: favoritos guardados, items en carrito y expedientes concierge abiertos.",
    suggestedActions: () => [
      {
        id: "cuenta.review-cart",
        label: "Revisar items en carrito",
        impact: "medium",
        rationale:
          "Tienes items en tu carrito sin confirmar; revisarlos evita perder disponibilidad.",
        sources: [{ id: "src.cart", label: "Carrito personal", kind: "entity" }],
        effect: "Abre la vista del carrito.",
        reversible: true,
        confirm: "none",
        run: () => void 0,
      },
    ],
  },
  aluxCapabilities: [
    { id: "cuenta.profile.read", label: "Leer perfil de viajero" },
    { id: "cuenta.favorites.read", label: "Leer favoritos" },
  ],
  context: {
    workspaceId: "cuenta",
    entities: [
      { type: "favorite", label: "Favorito" },
      { type: "cart-item", label: "Item de carrito" },
      { type: "case", label: "Expediente Concierge" },
      { type: "order", label: "Reserva/Compra" },
    ],
    selectionModes: ["single"],
    views: [
      { id: "summary", label: "Resumen", kind: "list" },
      { id: "favorites", label: "Favoritos", kind: "list" },
      { id: "history", label: "Historial", kind: "list" },
    ],
  },
};

let bootstrapped = false;

/** Registra las definiciones base. Idempotente. */
export function bootstrapWorkspaceDefinitions(): void {
  if (bootstrapped) return;
  bootstrapped = true;
  [founder, portal, concierge, cms, cuenta].forEach(registerWorkspace);
}

export const baseWorkspaceDefinitions = {
  founder,
  portal,
  concierge,
  cms,
  cuenta,
};